/**
 * =============================================================================
 * controller.js - Business Logic for PropertyFilter
 * =============================================================================
 * 
 * This file contains the "controller" layer - functions that orchestrate
 * the filter's behavior without dealing with React state or rendering.
 * 
 * RESPONSIBILITIES:
 * 1. QUERY ACTIONS - Functions to add/remove/update tokens
 * 2. TEXT PARSING - Analyze user input to determine current step
 * 3. SUGGESTION GENERATION - Build dropdown options based on context
 * 4. TOKEN FORMATTING - Convert tokens to display format
 * 
 * PARSING FLOW:
 * -------------
 * User types "Status = act" → parseText() analyzes:
 * 1. Does it start with a property? Yes, "Status"
 * 2. Is there an operator after? Yes, "="
 * 3. What's the value? "act"
 * Result: { step: 'property', property: {...}, operator: '=', value: 'act' }
 * 
 * This parsed result then drives getAutosuggestOptions() to show
 * matching values for the Status property.
 * 
 * TO ADD NEW FUNCTIONALITY:
 * -------------------------
 * - New operator: Add to operatorDescriptions below
 * - New suggestion type: Modify getAutosuggestOptions()
 * - New parsing behavior: Modify parseText()
 */

import {
  matchFilteringProperty,
  matchOperator,
  matchOperatorPrefix,
  matchTokenValue,
  trimStart,
  removeOperator,
  tokenGroupToTokens,
  getAllowedOperators,
  operatorToApi,
  queryToApiFormat,
} from './utils';

/**
 * Human-readable descriptions for each operator.
 * Shown in the operator selection dropdown.
 * 
 * TO ADD A NEW OPERATOR:
 * Add entry here, then also update operatorToApiMap in utils.js
 */
const operatorDescriptions = {
  '=': 'Equals',               // Exact match
  '!=': 'Does not equal',      // Not equal
  ':': 'Contains',             // Substring match
  '!:': 'Does not contain',    // Does not contain substring
  '^': 'Starts with',          // Prefix match
  '!^': 'Does not start with', // Does not start with prefix
  '>=': 'Greater than or equal', // Numeric comparison
  '<=': 'Less than or equal',
  '>': 'Greater than',
  '<': 'Less than',
};

// =============================================================================
// QUERY ACTIONS
// =============================================================================
// These functions modify the query state. They're returned as an object
// so PropertyFilter can destructure and use them: { addToken, removeToken, ... }

/**
 * Creates action handlers for modifying the query.
 * 
 * This is a factory function that returns action functions bound to the
 * current query state and onChange callback. Each action:
 * 1. Modifies the query
 * 2. Transforms tokens (matches values to options)
 * 3. Converts to API format
 * 4. Calls onChange with the result
 * 
 * WHY A FACTORY?
 * The actions need access to the current query, onChange, and filteringOptions.
 * By creating them in a factory, we can close over these values.
 * 
 * @param {Object} params.query - Current internal query state
 * @param {Function} params.onChange - Callback to notify parent of changes
 * @param {Array} params.filteringOptions - Available filter options (for value matching)
 * @returns {Object} Object containing action functions
 */
export function getQueryActions({ query, onChange, filteringOptions }) {
  /**
   * Internal helper to update the query.
   * Handles token transformation and format conversion.
   */
  const setQuery = (newQuery) => {
    /**
     * Recursively transforms tokens to match their values against options.
     * This ensures typed values like "Active" get normalized to "active"
     * if that's what the option value is.
     */
    const transformToken = (token) => {
      // Simple token (has operator, not a group)
      if ('operator' in token && !('operation' in token)) {
        return matchTokenValue(token, filteringOptions);
      }
      // Token group - recursively transform nested tokens
      return { ...token, tokens: token.tokens.map(transformToken) };
    };

    // Transform all tokens
    const tokens = newQuery.tokens.map(transformToken);
    
    // Flatten any token groups into a simple array
    const internalQuery = {
      tokens: tokenGroupToTokens(tokens),
      operation: newQuery.operation,
    };
    
    // Convert to API format and notify parent
    onChange(queryToApiFormat(internalQuery));
  };

  /**
   * Adds a new token to the end of the query.
   * @param {Object} token - Token to add { property, operator, value }
   */
  const addToken = (token) => {
    setQuery({ ...query, tokens: [...query.tokens, token] });
  };

  /**
   * Adds multiple tokens at once.
   * 
   * IMPORTANT: This function is required for nested selections (e.g., ICMP protocol)
   * where selecting a single option creates multiple tokens. Using addToken() twice
   * in succession doesn't work due to React's state batching - the second call
   * would use stale state and overwrite the first token.
   * 
   * @param {Array} newTokens - Array of tokens to add
   * 
   * @example
   * // When user selects "ICMP > Echo", creates two tokens:
   * addTokens([
   *   { propertyKey: 'protocol', operator: '=', value: 'icmp' },
   *   { propertyKey: 'types-and-codes', operator: '=', value: 'echo' }
   * ]);
   */
  const addTokens = (newTokens) => {
    setQuery({
      ...query,
      tokens: [...query.tokens, ...newTokens],
    });
  };

  /**
   * Updates an existing token at a specific index.
   * @param {number} updateIndex - Index of token to update
   * @param {Object} updatedToken - New token data
   */
  const updateToken = (updateIndex, updatedToken) => {
    const tokens = query.tokens.map((token, index) =>
      index === updateIndex ? updatedToken : token
    );
    setQuery({ ...query, tokens });
  };

  /**
   * Removes a token at a specific index.
   * @param {number} removeIndex - Index of token to remove
   */
  const removeToken = (removeIndex) => {
    setQuery({
      ...query,
      tokens: query.tokens.filter((_, index) => index !== removeIndex),
    });
  };

  /**
   * Removes all tokens, clearing the filter.
   */
  const removeAllTokens = () => {
    setQuery({ ...query, tokens: [] });
  };

  /**
   * Changes the operation (AND/OR) between tokens.
   * @param {string} operation - 'and' or 'or'
   */
  const updateOperation = (operation) => {
    setQuery({ ...query, operation });
  };

  return { addToken, addTokens, updateToken, updateOperation, removeToken, removeAllTokens };
}

// =============================================================================
// TEXT PARSING
// =============================================================================
// The parser analyzes user input to determine what "step" they're at.
// This drives what suggestions to show and how to create tokens.

/**
 * Parses the current filter input text to determine the user's intent.
 * 
 * PARSING STEPS:
 * 1. Try to match a property name at the start
 * 2. If property found, look for an operator after it
 * 3. If operator found, extract the value
 * 4. If no property match, treat as free-text search
 * 
 * RETURN VALUES (step field):
 * - 'property': User has typed "PropertyName operator value"
 *   Returns: { step: 'property', property, operator, value }
 * 
 * - 'operator': User has typed "PropertyName " and is selecting operator
 *   Returns: { step: 'operator', property, operatorPrefix }
 * 
 * - 'free-text': User is typing free text (no property match)
 *   Returns: { step: 'free-text', value, operator? }
 * 
 * @param {string} filteringText - Current text in the input
 * @param {Array} filteringProperties - Available property definitions
 * @param {Object} freeTextFiltering - Config { disabled, operators, defaultOperator }
 * @returns {Object} Parsed result with step and relevant data
 * 
 * @example
 * parseText('Status = active', properties, config)
 * // Returns: { step: 'property', property: {...}, operator: '=', value: 'active' }
 * 
 * parseText('hello world', properties, config)
 * // Returns: { step: 'free-text', value: 'hello world' }
 */
export function parseText(filteringText, filteringProperties, freeTextFiltering) {
  // STEP 1: Try to match a property name
  const property = matchFilteringProperty(filteringProperties, filteringText);

  // NO PROPERTY MATCH - treat as free text
  if (!property) {
    // Check if free text starts with an operator (e.g., ": searchterm")
    if (!freeTextFiltering.disabled) {
      // Support "!" as shorthand for "!:" (does not contain)
      const freeTextOperators =
        freeTextFiltering.operators.indexOf('!:') >= 0
          ? ['!', ...freeTextFiltering.operators]
          : freeTextFiltering.operators;

      const operator = matchOperator(freeTextOperators, filteringText);
      if (operator) {
        return {
          step: 'free-text',
          operator: operator === '!' ? '!:' : operator, // Expand "!" to "!:"
          value: removeOperator(filteringText, operator),
        };
      }
    }

    // Plain free text without operator
    return {
      step: 'free-text',
      value: filteringText,
    };
  }

  // PROPERTY MATCHED - look for operator
  const allowedOps = getAllowedOperators(property);
  const textWithoutProperty = filteringText.substring(property.propertyLabel.length);
  const operator = matchOperator(allowedOps, trimStart(textWithoutProperty));

  // OPERATOR FOUND - we have property + operator + value
  if (operator) {
    return {
      step: 'property',
      property,
      operator,
      value: removeOperator(textWithoutProperty, operator),
    };
  }

  // Check if user is typing an operator (partial match)
  const operatorPrefix = matchOperatorPrefix(allowedOps, trimStart(textWithoutProperty));
  if (operatorPrefix !== null) {
    // User is in operator selection step
    return { step: 'operator', property, operatorPrefix };
  }

  // Property matched but no valid operator - fall back to free text
  // This handles cases like "Status xyz" where "xyz" isn't a valid operator
  return {
    step: 'free-text',
    value: filteringText,
  };
}

// =============================================================================
// SUGGESTION GENERATION
// =============================================================================
// Based on the parsed text, generate appropriate dropdown suggestions.

/**
 * Generates dropdown suggestions based on the current parsing state.
 * 
 * This is the main function that determines what appears in the dropdown.
 * It examines the parsed text step and builds appropriate option groups.
 * 
 * SUGGESTION STRATEGIES BY STEP:
 * 
 * 'property' step (user has typed "Status = "):
 * - Show values for that specific property
 * - Each option completes the filter: "Status = active"
 * 
 * 'operator' step (user has typed "Status "):
 * - Show available operators for that property
 * - Also show other properties (in case they want to switch)
 * - Options have keepOpenOnSelect so dropdown stays open
 * 
 * 'free-text' step (user is typing without property):
 * - Show all properties (so they can select one)
 * - Show matching values across all properties
 * 
 * RETURN FORMAT:
 * {
 *   filterText: string,  // Text to filter options by
 *   options: [           // Grouped options for dropdown
 *     { label: 'Group Name', options: [...] }
 *   ]
 * }
 * 
 * @param {Object} parsedText - Result from parseText()
 * @param {Array} filteringProperties - Available properties
 * @param {Array} filteringOptions - Available filter values
 * @param {Object} i18nStrings - Localized strings for group labels
 * @returns {Object} { filterText, options }
 */
export function getAutosuggestOptions(
  parsedText,
  filteringProperties,
  filteringOptions,
  i18nStrings = {}
) {
  // Extract localized group labels with defaults
  const {
    groupPropertiesText = 'Properties',
    groupValuesText = 'Values',
    operatorsText = 'Operators',
  } = i18nStrings;

  switch (parsedText.step) {
    // USER HAS SELECTED PROPERTY + OPERATOR, NOW TYPING VALUE
    // Show values for this specific property
    case 'property': {
      const { propertyLabel, groupValuesLabel } = parsedText.property;
      // Filter options to only those belonging to this property
      const options = filteringOptions.filter(o => o.property === parsedText.property);
      
      return {
        filterText: parsedText.value, // Filter by what user typed after operator
        options: [
          {
            label: groupValuesLabel || groupValuesText,
            options: options.map((opt) => ({
                // Full value that will be used to create token
                value: `${propertyLabel} ${parsedText.operator} ${opt.value}`,
                label: opt.label || opt.value,
                // Prefix shown in gray before the value
                labelPrefix: `${propertyLabel} ${parsedText.operator}`,
                // NESTED OPTIONS SUPPORT:
                // Some options (e.g., ICMP protocol) have sub-options that create multiple tokens.
                // We preserve the nestedOptions config and original option data so PropertyFilter
                // can show the nested dropdown and create the appropriate tokens.
                nestedOptions: opt.nestedOptions,
                originalOption: opt.nestedOptions ? opt : undefined,
                // Keep dropdown open for options with nested selections so user can pick sub-option
                keepOpenOnSelect: !!opt.nestedOptions,
            })),
          },
        ],
      };
    }

    // USER HAS SELECTED PROPERTY, NOW SELECTING OPERATOR
    // Show operators for this property + other properties
    case 'operator': {
      // Show other properties in case user wants to switch
      const propertyOptions = getPropertySuggestions(filteringProperties, groupPropertiesText);
      
      // Show operators for the current property
      const operatorOptions = getAllowedOperators(parsedText.property).map(op => ({
        value: `${parsedText.property.propertyLabel} ${op} `, // Note trailing space
        label: `${parsedText.property.propertyLabel} ${op}`,
        description: operatorDescriptions[op] || op, // "Equals", "Contains", etc.
        keepOpenOnSelect: true, // Don't close dropdown, user still needs to type value
      }));

      return {
        filterText: `${parsedText.property.propertyLabel} ${parsedText.operatorPrefix}`,
        options: [
          ...propertyOptions,
          {
            label: operatorsText,
            options: operatorOptions,
          },
        ],
      };
    }

    // USER IS TYPING FREE TEXT (no property selected)
    // Show properties and matching values
    case 'free-text': {
      const needsValueSuggestions = !!parsedText.value; // Only if they've typed something
      // Don't show properties if user explicitly chose "does not contain" operator
      const needsPropertySuggestions = !(parsedText.step === 'free-text' && parsedText.operator === '!:');

      const options = [];

      // Add property suggestions (so user can select a property)
      if (needsPropertySuggestions) {
        options.push(...getPropertySuggestions(filteringProperties, groupPropertiesText));
      }

      // Add value suggestions (matching values across all properties)
      if (needsValueSuggestions) {
        options.push(...getAllValueSuggestions(filteringOptions, parsedText.operator, groupValuesText));
      }

      return {
        filterText: parsedText.value,
        options,
      };
    }

    default:
      return { filterText: '', options: [] };
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generates property suggestions for the dropdown.
 * Each property option has keepOpenOnSelect so the dropdown stays open
 * after selection (user still needs to select operator and value).
 * 
 * HIDDEN PROPERTIES:
 * Properties with `hidden: true` are filtered out from suggestions.
 * This is used for properties that should only be created programmatically
 * (e.g., 'types-and-codes' which is created via nested ICMP selection).
 * 
 * @param {Array} filteringProperties - Available properties
 * @param {string} groupLabel - Label for the group header
 * @returns {Array} Array with single group object, or empty array
 */
function getPropertySuggestions(filteringProperties, groupLabel) {
  // Filter out hidden properties (only created via nested selection, not direct user input)
  const visibleProperties = filteringProperties.filter(p => !p.hidden);
  
  const options = visibleProperties.map(property => ({
    value: property.propertyLabel,
    label: property.propertyLabel,
    keepOpenOnSelect: true, // Clicking property updates input but keeps dropdown open
  }));

  // Return as grouped options (or empty if no properties)
  return options.length > 0
    ? [{ label: groupLabel, options }]
    : [];
}

/**
 * Generates value suggestions across all properties.
 * Used in free-text mode to show all possible values the user might want.
 * 
 * Each suggestion includes the full filter string (property + operator + value)
 * so clicking it creates a complete filter.
 * 
 * @param {Array} filteringOptions - All available filter options
 * @param {string} operator - Preferred operator (falls back to '=')
 * @param {string} groupLabel - Label for the group header
 * @returns {Array} Array with single group object, or empty array
 */
function getAllValueSuggestions(filteringOptions, operator = '=', groupLabel) {
  const options = [];

  filteringOptions.forEach(filteringOption => {
    const property = filteringOption.property;
    if (!property) return; // Skip options without property reference

    // Check if this property supports the current operator
    const allowedOps = getAllowedOperators(property);
    if (allowedOps.indexOf(operator) === -1 && allowedOps.indexOf('=') === -1) return;

    // Use requested operator if allowed, otherwise fall back to '='
    const op = allowedOps.includes(operator) ? operator : '=';
    
    options.push({
      // Full filter string for token creation
      value: `${property.propertyLabel} ${op} ${filteringOption.value}`,
      label: filteringOption.label || filteringOption.value,
      labelPrefix: `${property.propertyLabel} ${op}`, // Shown in gray
    });
  });

  return options.length > 0
    ? [{ label: groupLabel, options }]
    : [];
}

// =============================================================================
// TOKEN FORMATTING
// =============================================================================

/**
 * Formats a token for display in the UI.
 * 
 * Converts internal token format to display format with:
 * - Property label (human-readable name)
 * - Formatted value (using property's formatter if defined)
 * - Full formatted text for display
 * 
 * @param {Object} token - Internal token { propertyKey, operator, value }
 * @param {Array} filteringProperties - Property definitions for lookup
 * @returns {Object} Formatted token for display
 * 
 * @example
 * formatToken({ propertyKey: 'status', operator: '=', value: 'active' }, properties)
 * // Returns: {
 * //   propertyKey: 'status',
 * //   propertyLabel: 'Status',
 * //   operator: '=',
 * //   value: 'active',
 * //   formattedText: 'Status = active'
 * // }
 */
export function formatToken(token, filteringProperties) {
  // Find property definition (may be attached to token or need lookup)
  const property = token.property || filteringProperties.find(p => p.key === token.propertyKey);
  const propertyLabel = property?.propertyLabel || '';
  
  // Apply value formatter if property defines one for this operator
  const valueFormatter = property?.getValueFormatter?.(token.operator);
  const formattedValue = valueFormatter ? valueFormatter(token.value) : String(token.value ?? '');

  return {
    propertyKey: token.propertyKey || property?.key,
    propertyLabel,
    operator: token.operator,
    value: formattedValue,
    // Full display text: "Status = active" or ": searchterm" for free text
    formattedText: propertyLabel
      ? `${propertyLabel} ${token.operator} ${formattedValue}`
      : `${token.operator} ${formattedValue}`,
  };
}
