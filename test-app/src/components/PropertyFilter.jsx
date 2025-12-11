/**
 * =============================================================================
 * PropertyFilter.jsx - Main Filter Component
 * =============================================================================
 * 
 * This is the main entry point for the PropertyFilter component. It provides a
 * powerful filtering interface similar to AWS CloudWatch or Cloudscape filters.
 * 
 * ARCHITECTURE OVERVIEW:
 * ----------------------
 * The component works in three main stages:
 * 
 * 1. INPUT STAGE: User types in FilterAutosuggest input
 *    - Text is parsed to determine current "step" (property, operator, or value)
 *    - Suggestions are shown based on the current step
 * 
 * 2. TOKEN CREATION: When user selects an option or presses Enter
 *    - Input text is parsed into a structured token
 *    - Token is validated (e.g., IP address format)
 *    - Token is added to the query
 * 
 * 3. QUERY OUTPUT: Tokens are converted to API format
 *    - Internal format: { tokens: [...], operation: 'and'|'or' }
 *    - API format: { filter: { and: [...], or: [...] } }
 * 
 * DATA FLOW:
 * ----------
 * filteringProperties (config) → internalProperties (processed)
 * filteringOptions (values) → internalOptions (with property refs)
 * query (API format) → internalQuery (with property refs)
 * user input → parsedText → autosuggestOptions → token → onChange(API format)
 * 
 * TO ADD A NEW PROPERTY:
 * ----------------------
 * Add to filteringProperties array:
 * {
 *   key: 'myField',           // Field name in your data
 *   propertyLabel: 'My Field', // Display label
 *   operators: ['=', '!=', ':'], // Supported operators
 *   defaultOperator: '=',
 *   validationType: 'ip' | 'port' | undefined, // Optional validation
 * }
 * 
 * TO ADD A NEW VALIDATION TYPE:
 * -----------------------------
 * 1. Add case in utils.js validateTokenValue()
 * 2. Create validation function (see validateIPAddress as example)
 * 3. Return { valid: boolean, error?: string, normalizedValue?: string }
 */

import React, { useState, useRef, useImperativeHandle, forwardRef, useMemo, useCallback, useEffect } from 'react';
import { Button, Typography } from '@material-tailwind/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

// Child components
import FilterAutosuggest from './FilterAutosuggest'; // Input with dropdown suggestions
import FilterToken from './FilterToken';             // Individual filter chip/tag

// Controller functions handle parsing and suggestion generation
import { getQueryActions, parseText, getAutosuggestOptions, formatToken } from './controller';

// Utility functions for validation and format conversion
import { validateTokenValue, apiToQueryFormat } from './utils';

/**
 * Default internationalization strings.
 * Override any of these by passing i18nStrings prop.
 * 
 * TO ADD A NEW STRING:
 * Add the key here with default value, then use i18nStrings.yourKey in the component.
 */
const defaultI18nStrings = {
  filteringAriaLabel: 'Filter',
  filteringPlaceholder: 'Filter by property or value',
  groupPropertiesText: 'Properties',      // Dropdown group header for properties
  groupValuesText: 'Values',              // Dropdown group header for values
  operatorsText: 'Operators',             // Dropdown group header for operators
  operationAndText: 'and',                // Text shown between tokens for AND
  operationOrText: 'or',                  // Text shown between tokens for OR
  clearFiltersText: 'Clear filters',      // Clear all button text
  removeTokenAriaLabel: 'Remove filter',  // Accessibility label for remove button
  tokenLimitShowMore: 'Show more',        // Show more tokens button
  tokenLimitShowFewer: 'Show fewer',      // Show fewer tokens button
  enteredTextLabel: (text) => `Use: "${text}"`, // Free text option in dropdown
  allPropertiesLabel: 'All properties',   // Label for searching all properties
};

/**
 * PropertyFilter component - A powerful filtering component for tables and lists
 * 
 * @param {Object} props - Component props
 * @param {Array} props.filteringProperties - Array of filterable properties
 * @param {Array} props.filteringOptions - Array of available filter options
 * @param {Object} props.query - Current query state { tokens: [], operation: 'and' | 'or' }
 * @param {Function} props.onChange - Query change handler
 * @param {boolean} props.disabled - Disable the filter
 * @param {boolean} props.disableFreeTextFiltering - Disable free text filtering
 * @param {boolean} props.hideOperations - Hide AND/OR operations
 * @param {boolean} props.readOnlyOperations - Make operations read-only
 * @param {number} props.tokenLimit - Maximum visible tokens before "show more"
 * @param {string} props.countText - Result count text (e.g., "25 matches")
 * @param {boolean} props.loading - Loading state
 * @param {Object} props.i18nStrings - Internationalization strings
 * @param {React.ReactNode} props.customControl - Custom control slot (before input)
 * @param {React.ReactNode} props.customFilterActions - Custom filter actions slot
 * @param {string} props.filteringPlaceholder - Input placeholder
 * @param {string} props.filteringAriaLabel - Input aria label
 * @param {React.ReactNode} props.filteringEmpty - Empty state content
 * @param {string} props.filteringLoadingText - Loading text
 * @param {React.ReactNode} props.filteringConstraintText - Constraint text below input
 * @param {Function} props.onLoadItems - Load items handler for async options
 * @param {string} props.className - Additional CSS classes
 */
const PropertyFilter = forwardRef(function PropertyFilter(
  {
    // ==========================================================================
    // REQUIRED PROPS
    // ==========================================================================
    
    /**
     * Array of filterable properties (columns/fields).
     * Each property defines what can be filtered and how.
     * Example: [{ key: 'status', propertyLabel: 'Status', operators: ['=', '!='] }]
     */
    filteringProperties = [],
    
    /**
     * Array of available filter values for autocomplete.
     * Links values to properties via propertyKey.
     * Example: [{ propertyKey: 'status', value: 'active', label: 'Active' }]
     */
    filteringOptions = [],
    
    /**
     * Current query state in API format.
     * Format: { filter: { and: [...filters], or: [...filters] } }
     * Each filter: { field: 'propertyKey', op: 'equals', value: 'someValue' }
     */
    query = { tokens: [], operation: 'and' },
    
    /**
     * Callback when query changes. Receives new query in API format.
     * Use this to update your state and trigger data fetching.
     */
    onChange,
    
    // ==========================================================================
    // OPTIONAL BEHAVIOR PROPS
    // ==========================================================================
    
    disabled = false,                    // Disable entire filter
    disableFreeTextFiltering = false,    // Only allow property-based filters
    hideOperations = false,              // Hide AND/OR between tokens
    readOnlyOperations = false,          // Show AND/OR but don't allow changing
    tokenLimit,                          // Max visible tokens before "show more"
    countText,                           // Result count (e.g., "25 matches")
    loading = false,                     // Show loading state in dropdown
    
    // ==========================================================================
    // CUSTOMIZATION PROPS
    // ==========================================================================
    
    i18nStrings: userI18nStrings = {},   // Override default strings
    customControl,                        // React node before input (e.g., dropdown)
    customFilterActions,                  // Replace clear button with custom actions
    filteringPlaceholder,                 // Override input placeholder
    filteringAriaLabel,                   // Override input aria-label
    filteringEmpty,                       // Empty state content
    filteringLoadingText,                 // Loading state text
    filteringConstraintText,              // Help text below input
    onLoadItems,                          // Async loading callback
    className = '',                       // Additional CSS classes
    ...rest                               // Pass through to root div
  },
  ref
) {
  // ==========================================================================
  // LOCAL STATE
  // ==========================================================================
  
  const inputRef = useRef(null);                           // Reference to FilterAutosuggest
  const [filteringText, setFilteringText] = useState('');  // Current input text
  const [showAllTokens, setShowAllTokens] = useState(false); // Token limit toggle
  const [validationError, setValidationError] = useState(null); // Validation error message

  // ==========================================================================
  // MEMOIZED VALUES - Computed values that update when dependencies change
  // ==========================================================================
  // 
  // WHY useMemo?
  // These computations can be expensive and we don't want to re-run them on
  // every render. useMemo caches the result and only recomputes when the
  // dependencies (items in the array) change.
  //
  // DEPENDENCY ARRAYS:
  // The second argument to useMemo is the dependency array. The memoized
  // value will only be recalculated when one of these values changes.
  // ==========================================================================

  /**
   * Merge user-provided i18n strings with defaults.
   * User strings override defaults, allowing partial customization.
   */
  const i18nStrings = useMemo(
    () => ({ ...defaultI18nStrings, ...userI18nStrings }),
    [userI18nStrings]
  );

  /**
   * Expose focus() method to parent components via ref.
   * Usage: const filterRef = useRef(); filterRef.current.focus();
   */
  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus?.(),
  }), []);

  /**
   * Auto-focus the input when component mounts (if not disabled).
   * This provides a better UX by allowing immediate typing.
   */
  useEffect(() => {
    if (!disabled) {
      inputRef.current?.focus?.();
    }
  }, [disabled]);

  /**
   * INTERNAL PROPERTIES - Normalized property definitions.
   * 
   * Transforms the user-provided filteringProperties into a consistent internal
   * format with defaults applied. This ensures all properties have the expected
   * shape regardless of what the user provided.
   * 
   * Each property gets:
   * - key: Unique identifier (matches field name in data)
   * - propertyLabel: Display name (falls back to key)
   * - groupValuesLabel: Header text for values dropdown group
   * - operators: Array of operator strings (extracts from objects if needed)
   * - defaultOperator: Operator to use when none specified
   * - getValueFormatter: Function to format values for display
   * 
   * TO MODIFY: Add new fields here if properties need additional metadata.
   */
  const internalProperties = useMemo(() => {
    return filteringProperties.map(property => ({
      ...property,
      key: property.key,
      propertyLabel: property.propertyLabel || property.key,
      groupValuesLabel: property.groupValuesLabel || i18nStrings.groupValuesText,
      // Operators can be strings or objects with {operator, format}
      // Extract just the operator string for matching
      operators: (property.operators || ['=', '!=']).map(op =>
        typeof op === 'string' ? op : op.operator
      ),
      defaultOperator: property.defaultOperator || '=',
      // Returns a formatter function for a specific operator, if defined
      getValueFormatter: (operator) => {
        const extOp = (property.operators || []).find(
          op => typeof op === 'object' && op.operator === operator
        );
        return extOp?.format || null;
      },
    }));
  }, [filteringProperties, i18nStrings.groupValuesText]);

  /**
   * INTERNAL OPTIONS - Filter values with property references.
   * 
   * Links each filter option to its parent property object.
   * This allows quick access to property metadata when displaying options.
   * 
   * TO MODIFY: Add computed fields here if options need additional processing.
   */
  const internalOptions = useMemo(() => {
    return filteringOptions.map(option => ({
      ...option,
      // Find the property this option belongs to
      property: internalProperties.find(p => p.key === option.propertyKey) || null,
      label: option.label || option.value || '',
    }));
  }, [filteringOptions, internalProperties]);

  /**
   * FREE TEXT FILTERING CONFIG
   * 
   * Configuration for free-text search (searching without selecting a property).
   * Uses 'contains' (:) and 'does not contain' (!:) operators.
   * 
   * TO MODIFY: Change operators array to support different free-text operators.
   */
  const freeTextFiltering = useMemo(() => ({
    disabled: disableFreeTextFiltering,
    operators: [':', '!:'],      // Supported operators for free text
    defaultOperator: ':',         // Default to 'contains'
  }), [disableFreeTextFiltering]);

  /**
   * INTERNAL QUERY - Converted from API format with property references.
   * 
   * The external API uses: { filter: { and: [...], or: [...] } }
   * Internally we use: { tokens: [...], operation: 'and'|'or' }
   * 
   * This conversion:
   * 1. Calls apiToQueryFormat() to convert structure
   * 2. Attaches property object references to each token
   * 
   * Property references allow quick access to property metadata
   * (label, operators, validation) without repeated lookups.
   */
  const internalQuery = useMemo(() => {
    // Convert from API format {filter: {and: [], or: []}} to internal format
    const converted = apiToQueryFormat(query);
    
    return {
      operation: converted.operation || 'and',
      tokens: (converted.tokens || []).map(token => ({
        ...token,
        // Attach property reference for easy access to property metadata
        property: token.propertyKey
          ? internalProperties.find(p => p.key === token.propertyKey) || null
          : null,
      })),
    };
  }, [query, internalProperties]);

  /**
   * QUERY ACTIONS - Functions to modify the query.
   * 
   * Returns an object with action functions:
   * - addToken(token): Add a new filter token
   * - updateToken(index, token): Update existing token
   * - updateOperation(op): Change AND/OR operation
   * - removeToken(index): Remove a specific token
   * - removeAllTokens(): Clear all tokens
   * 
   * These functions handle the conversion back to API format
   * and call onChange() with the new query.
   * 
   * NOTE: This returns NEW function references when dependencies change,
   * which is why we memoize it - to avoid unnecessary re-renders.
   */
  const { addToken, updateToken, updateOperation, removeToken, removeAllTokens } = useMemo(
    () => getQueryActions({
      query: internalQuery,
      onChange: (newQuery) => onChange?.(newQuery),
      filteringOptions: internalOptions,
    }),
    [internalQuery, onChange, internalOptions]
  );

  /**
   * PARSED TEXT - Analyzes current input to determine filter step.
   * 
   * As the user types, this determines what "step" they're at:
   * - 'property': User has typed a property name + operator + partial value
   *   Example: "Status = act" → { step: 'property', property: {...}, operator: '=', value: 'act' }
   * 
   * - 'operator': User has typed a property name, now selecting operator
   *   Example: "Status " → { step: 'operator', property: {...}, operatorPrefix: '' }
   * 
   * - 'free-text': User is typing free text (no property match)
   *   Example: "hello" → { step: 'free-text', value: 'hello' }
   * 
   * This parsed result drives what suggestions are shown in the dropdown.
   */
  const parsedText = useMemo(
    () => parseText(filteringText, internalProperties, freeTextFiltering),
    [filteringText, internalProperties, freeTextFiltering]
  );

  /**
   * AUTOSUGGEST OPTIONS - Dropdown suggestions based on current input.
   * 
   * Generates grouped options for the dropdown based on parsedText:
   * - If at 'property' step: Show matching values for that property
   * - If at 'operator' step: Show available operators
   * - If at 'free-text' step: Show properties and matching values
   * 
   * Returns: { filterText: string, options: Array<{label, options}> }
   */
  const autosuggestOptions = useMemo(
    () => getAutosuggestOptions(parsedText, internalProperties, internalOptions, i18nStrings),
    [parsedText, internalProperties, internalOptions, i18nStrings]
  );

  // ==========================================================================
  // CALLBACKS - Event handlers wrapped in useCallback for performance
  // ==========================================================================
  //
  // WHY useCallback?
  // Without useCallback, these functions would be recreated on every render,
  // causing child components to re-render unnecessarily. useCallback memoizes
  // the function and only creates a new one when dependencies change.
  // ==========================================================================

  /**
   * CREATE TOKEN - Converts input text into a filter token.
   * 
   * This is the core function that transforms user input into a structured
   * filter token. It's called when:
   * - User presses Enter
   * - User clicks on a value suggestion
   * - User clicks "Use: text" option
   * 
   * FLOW:
   * 1. Parse the text to determine what type of filter it is
   * 2. Create token object based on parsed step (property, free-text, operator)
   * 3. Validate the value if property has validationType
   * 4. Apply normalization if needed (e.g., IP → IP/32)
   * 5. Add token to query and clear input
   * 
   * @param {string} currentText - The full text to parse into a token
   */
  const createToken = useCallback((currentText) => {
    // Parse the text to understand what the user entered
    const parsed = parseText(currentText, internalProperties, freeTextFiltering);
    let newToken;
    let propertyForValidation = null;

    // Build token based on what step the parser detected
    switch (parsed.step) {
      // PROPERTY FILTER: "Status = active" → property-based filter
      case 'property':
        propertyForValidation = parsed.property; // May have validationType
        newToken = {
          property: parsed.property,
          propertyKey: parsed.property.key,
          operator: parsed.operator,
          value: parsed.value,
        };
        break;

      // FREE TEXT: "hello" → search across all fields
      case 'free-text':
        if (freeTextFiltering.disabled) return; // Bail if free text disabled
        newToken = {
          property: null,
          propertyKey: undefined,
          operator: parsed.operator || freeTextFiltering.defaultOperator,
          value: parsed.value,
        };
        break;

      // OPERATOR STEP: User typed property but incomplete operator
      // Treat as free text search
      case 'operator':
        if (freeTextFiltering.disabled) return;
        newToken = {
          property: null,
          propertyKey: undefined,
          operator: freeTextFiltering.defaultOperator,
          value: currentText,
        };
        break;

      default:
        return; // Unknown step, do nothing
    }

    // Only create token if there's actual content
    if (newToken.value?.trim()) {
      // VALIDATION: Check if property has validation rules (e.g., IP format)
      if (propertyForValidation) {
        const validation = validateTokenValue(newToken.value, propertyForValidation);
        if (!validation.valid) {
          // Show error and don't create token
          setValidationError(validation.error);
          return;
        }
        // NORMALIZATION: Use normalized value if provided
        // Example: "1.2.3.4" becomes "1.2.3.4/32" for IP addresses
        if (validation.normalizedValue) {
          newToken.value = validation.normalizedValue;
        }
      }
      
      // Success! Clear error, add token, reset input
      setValidationError(null);
      addToken(newToken);
      setFilteringText('');
    }
  }, [internalProperties, freeTextFiltering, addToken]);

  /**
   * HANDLE OPTION SELECT - Called when user clicks/selects a dropdown option.
   * 
   * Different options have different behaviors:
   * - isEnteredText: User clicked "Use: text" → create free text token
   * - keepOpenOnSelect: User clicked property/operator → update input, keep dropdown
   * - Regular option: User clicked value → create token, close dropdown
   * 
   * @param {Object} option - The selected option from dropdown
   */
  const handleOptionSelect = useCallback((option) => {
    if (!option.value) return; // Ignore empty options

    // "Use: text" option - create free text token
    if (option.isEnteredText) {
      createToken(option.value);
      return;
    }

    // Property or operator selection - update input but keep typing
    // This allows: click "Status" → input becomes "Status" → show operators
    if (option.keepOpenOnSelect) {
      setFilteringText(option.value);
      return;
    }

    // Regular value selection - create the token
    createToken(option.value);
  }, [createToken]);

  /**
   * HANDLE LOAD ITEMS - Called for async/paginated option loading.
   * 
   * Passes context to parent's onLoadItems callback so it can fetch
   * appropriate data based on what the user is filtering.
   * 
   * @param {Object} detail - Load request details from FilterAutosuggest
   */
  const handleLoadItems = useCallback((detail) => {
    const parsed = parseText(detail.filteringText, internalProperties, freeTextFiltering);
    const loadDetail = {
      filteringText: detail.filteringText,
      // Include property/operator context if user is filtering a specific property
      filteringProperty: parsed.step === 'property' ? parsed.property : undefined,
      filteringOperator: parsed.step === 'property' ? parsed.operator : undefined,
      firstPage: detail.firstPage,
      samePage: detail.samePage,
    };
    onLoadItems?.(loadDetail);
  }, [internalProperties, freeTextFiltering, onLoadItems]);

  // ==========================================================================
  // DISPLAY HELPERS - Computed values for rendering
  // ==========================================================================

  /**
   * Format tokens for display in the UI.
   * Converts internal token format to display format with labels.
   */
  const formattedTokens = useMemo(() => {
    return internalQuery.tokens.map(token => formatToken(token, internalProperties));
  }, [internalQuery.tokens, internalProperties]);

  /**
   * Apply token limit - only show first N tokens if limit is set.
   * User can click "Show more" to see all tokens.
   */
  const visibleTokens = useMemo(() => {
    if (!tokenLimit || showAllTokens) return formattedTokens;
    return formattedTokens.slice(0, tokenLimit);
  }, [formattedTokens, tokenLimit, showAllTokens]);

  // Calculate if there are hidden tokens and how many
  const hasHiddenTokens = tokenLimit && formattedTokens.length > tokenLimit;
  const hiddenCount = formattedTokens.length - (tokenLimit || 0);

  // ==========================================================================
  // RENDER - Component JSX
  // ==========================================================================
  //
  // LAYOUT STRUCTURE:
  // ┌─────────────────────────────────────────────────────────────────────────┐
  // │ [Custom Control] [═══════════ Filter Input ═══════════] [Count Text]   │
  // ├─────────────────────────────────────────────────────────────────────────┤
  // │ Validation Error / Constraint Text                                      │
  // ├─────────────────────────────────────────────────────────────────────────┤
  // │ [Token 1] AND [Token 2] AND [Token 3] [Show more] [Clear filters]      │
  // └─────────────────────────────────────────────────────────────────────────┘
  //
  // TO MODIFY LAYOUT: Edit the JSX below. Each section is clearly marked.
  // ==========================================================================

  return (
    <div className={`property-filter ${className}`} {...rest}>
      {/* ================================================================
          ROW 1: SEARCH INPUT
          Contains: custom control slot, filter input, results count
          ================================================================ */}
      <div className="flex items-center gap-2">
        {/* CUSTOM CONTROL SLOT - Renders before input (e.g., property dropdown) */}
        {customControl && (
          <div className="flex-shrink-0">{customControl}</div>
        )}

        {/* INPUT WRAPPER - Contains FilterAutosuggest and count overlay */}
        <div className="flex-1 relative">
          {/* 
            FilterAutosuggest - The main input with dropdown suggestions.
            See FilterAutosuggest.jsx for implementation details.
          */}
          <FilterAutosuggest
            ref={inputRef}
            value={filteringText}
            onChange={(text) => {
              setFilteringText(text);
              // Clear validation error when user starts typing again
              if (validationError) setValidationError(null);
            }}
            onOptionSelect={handleOptionSelect}
            options={autosuggestOptions.options}
            filterText={autosuggestOptions.filterText}
            placeholder={filteringPlaceholder || i18nStrings.filteringPlaceholder}
            ariaLabel={filteringAriaLabel || i18nStrings.filteringAriaLabel}
            disabled={disabled}
            loading={loading}
            loadingText={filteringLoadingText}
            emptyText={filteringEmpty}
            onLoadItems={handleLoadItems}
            i18nStrings={i18nStrings}
          />

          {/* RESULTS COUNT - Shows "X matches" inside input area */}
          {countText && internalQuery.tokens.length > 0 && !disabled && (
            <div className="absolute right-10 top-1/2 -translate-y-1/2">
              <Typography variant="small" className="text-gray-500">
                {countText}
              </Typography>
            </div>
          )}
        </div>
      </div>

      {/* ================================================================
          ROW 2: FEEDBACK MESSAGES
          Shows validation errors or help text (not both)
          ================================================================ */}
      
      {/* VALIDATION ERROR - Red error message when token validation fails */}
      {validationError && (
        <div className="mt-1">
          <Typography variant="small" className="text-red-500 font-medium">
            {validationError}
          </Typography>
        </div>
      )}

      {/* CONSTRAINT TEXT - Help text when no error (e.g., "Use property:value format") */}
      {filteringConstraintText && !validationError && (
        <div className="mt-1">
          <Typography variant="small" className="text-gray-500">
            {filteringConstraintText}
          </Typography>
        </div>
      )}

      {/* ================================================================
          ROW 3: ACTIVE FILTER TOKENS
          Shows filter chips with AND/OR between them
          ================================================================ */}
      {internalQuery.tokens.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mt-3">
          {/* TOKENS - Each FilterToken shows one active filter */}
          {visibleTokens.map((token, index) => (
            <FilterToken
              // Key includes all token data to ensure proper re-rendering
              key={`${token.propertyKey || 'free'}-${token.operator}-${token.value}-${index}`}
              token={token}
              index={index}
              // Show AND/OR selector for all tokens except the first
              showOperation={index > 0 && !hideOperations}
              operation={internalQuery.operation}
              onRemove={removeToken}
              onOperationChange={updateOperation}
              disabled={disabled}
              readOnlyOperations={readOnlyOperations}
              i18nStrings={i18nStrings}
            />
          ))}

          {/* SHOW MORE/FEWER - Toggle to expand/collapse token list */}
          {hasHiddenTokens && (
            <Button
              variant="text"
              size="sm"
              className="text-blue-600 hover:text-blue-800 px-2 py-1 normal-case font-medium"
              onClick={() => setShowAllTokens(!showAllTokens)}
            >
              {showAllTokens
                ? i18nStrings.tokenLimitShowFewer
                : `${i18nStrings.tokenLimitShowMore} (+${hiddenCount})`}
            </Button>
          )}

          {/* CLEAR FILTERS - Button to remove all tokens (or custom actions) */}
          {customFilterActions || (
            <Button
              variant="text"
              size="sm"
              className="text-gray-600 hover:text-gray-900 px-2 py-1 normal-case font-medium
                         flex items-center gap-1"
              onClick={() => {
                removeAllTokens();
                inputRef.current?.focus?.(); // Return focus to input
              }}
              disabled={disabled}
            >
              <XMarkIcon className="h-4 w-4" />
              {i18nStrings.clearFiltersText}
            </Button>
          )}
        </div>
      )}
    </div>
  );
});

export default PropertyFilter;
