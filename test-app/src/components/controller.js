/**
 * Controller functions for PropertyFilter component
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
 * Operator descriptions for display
 */
const operatorDescriptions = {
  '=': 'Equals',
  '!=': 'Does not equal',
  ':': 'Contains',
  '!:': 'Does not contain',
  '^': 'Starts with',
  '!^': 'Does not start with',
  '>=': 'Greater than or equal',
  '<=': 'Less than or equal',
  '>': 'Greater than',
  '<': 'Less than',
};

/**
 * Get query action handlers
 * @param {Object} params - Parameters
 * @param {Object} params.query - Current query state
 * @param {Function} params.onChange - Change handler
 * @param {Array} params.filteringOptions - Filtering options
 * @returns {Object} Action handlers
 */
export function getQueryActions({ query, onChange, filteringOptions }) {
  const setQuery = (newQuery) => {
    const transformToken = (token) => {
      if ('operator' in token && !('operation' in token)) {
        return matchTokenValue(token, filteringOptions);
      }
      return { ...token, tokens: token.tokens.map(transformToken) };
    };

    const tokens = newQuery.tokens.map(transformToken);
    const internalQuery = {
      tokens: tokenGroupToTokens(tokens),
      operation: newQuery.operation,
    };
    
    // Convert to API format before calling onChange
    onChange(queryToApiFormat(internalQuery));
  };

  const addToken = (token) => {
    setQuery({ ...query, tokens: [...query.tokens, token] });
  };

  const updateToken = (updateIndex, updatedToken) => {
    const tokens = query.tokens.map((token, index) =>
      index === updateIndex ? updatedToken : token
    );
    setQuery({ ...query, tokens });
  };

  const removeToken = (removeIndex) => {
    setQuery({
      ...query,
      tokens: query.tokens.filter((_, index) => index !== removeIndex),
    });
  };

  const removeAllTokens = () => {
    setQuery({ ...query, tokens: [] });
  };

  const updateOperation = (operation) => {
    setQuery({ ...query, operation });
  };

  return { addToken, updateToken, updateOperation, removeToken, removeAllTokens };
}

/**
 * Parse filtering text to determine current step
 * @param {string} filteringText - Current filter text
 * @param {Array} filteringProperties - Available properties
 * @param {Object} freeTextFiltering - Free text filtering config
 * @returns {Object} Parsed text result
 */
export function parseText(filteringText, filteringProperties, freeTextFiltering) {
  const property = matchFilteringProperty(filteringProperties, filteringText);

  if (!property) {
    if (!freeTextFiltering.disabled) {
      const freeTextOperators =
        freeTextFiltering.operators.indexOf('!:') >= 0
          ? ['!', ...freeTextFiltering.operators]
          : freeTextFiltering.operators;

      const operator = matchOperator(freeTextOperators, filteringText);
      if (operator) {
        return {
          step: 'free-text',
          operator: operator === '!' ? '!:' : operator,
          value: removeOperator(filteringText, operator),
        };
      }
    }

    return {
      step: 'free-text',
      value: filteringText,
    };
  }

  const allowedOps = getAllowedOperators(property);
  const textWithoutProperty = filteringText.substring(property.propertyLabel.length);
  const operator = matchOperator(allowedOps, trimStart(textWithoutProperty));

  if (operator) {
    return {
      step: 'property',
      property,
      operator,
      value: removeOperator(textWithoutProperty, operator),
    };
  }

  const operatorPrefix = matchOperatorPrefix(allowedOps, trimStart(textWithoutProperty));
  if (operatorPrefix !== null) {
    return { step: 'operator', property, operatorPrefix };
  }

  return {
    step: 'free-text',
    value: filteringText,
  };
}

/**
 * Get autosuggest options based on parsed text
 * @param {Object} parsedText - Parsed text result
 * @param {Array} filteringProperties - Available properties
 * @param {Array} filteringOptions - Available options
 * @param {Object} i18nStrings - Internationalization strings
 * @returns {Object} Autosuggest options
 */
export function getAutosuggestOptions(
  parsedText,
  filteringProperties,
  filteringOptions,
  i18nStrings = {}
) {
  const {
    groupPropertiesText = 'Properties',
    groupValuesText = 'Values',
    operatorsText = 'Operators',
  } = i18nStrings;

  switch (parsedText.step) {
    case 'property': {
      const { propertyLabel, groupValuesLabel } = parsedText.property;
      const options = filteringOptions.filter(o => o.property === parsedText.property);

      return {
        filterText: parsedText.value,
        options: [
          {
            label: groupValuesLabel || groupValuesText,
            options: options.map(({ label, value }) => ({
              value: `${propertyLabel} ${parsedText.operator} ${value}`,
              label: label || value,
              labelPrefix: `${propertyLabel} ${parsedText.operator}`,
            })),
          },
        ],
      };
    }

    case 'operator': {
      const propertyOptions = getPropertySuggestions(filteringProperties, groupPropertiesText);
      const operatorOptions = getAllowedOperators(parsedText.property).map(op => ({
        value: `${parsedText.property.propertyLabel} ${op} `,
        label: `${parsedText.property.propertyLabel} ${op}`,
        description: operatorDescriptions[op] || op,
        keepOpenOnSelect: true,
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

    case 'free-text': {
      const needsValueSuggestions = !!parsedText.value;
      const needsPropertySuggestions = !(parsedText.step === 'free-text' && parsedText.operator === '!:');

      const options = [];

      if (needsPropertySuggestions) {
        options.push(...getPropertySuggestions(filteringProperties, groupPropertiesText));
      }

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

/**
 * Get property suggestions
 * @param {Array} filteringProperties - Available properties
 * @param {string} groupLabel - Group label
 * @returns {Array} Property suggestions
 */
function getPropertySuggestions(filteringProperties, groupLabel) {
  const options = filteringProperties.map(property => ({
    value: property.propertyLabel,
    label: property.propertyLabel,
    keepOpenOnSelect: true,
  }));

  return options.length > 0
    ? [{ label: groupLabel, options }]
    : [];
}

/**
 * Get all value suggestions
 * @param {Array} filteringOptions - Available options
 * @param {string} operator - Current operator
 * @param {string} groupLabel - Group label
 * @returns {Array} Value suggestions
 */
function getAllValueSuggestions(filteringOptions, operator = '=', groupLabel) {
  const options = [];

  filteringOptions.forEach(filteringOption => {
    const property = filteringOption.property;
    if (!property) return;

    const allowedOps = getAllowedOperators(property);
    if (allowedOps.indexOf(operator) === -1 && allowedOps.indexOf('=') === -1) return;

    const op = allowedOps.includes(operator) ? operator : '=';
    options.push({
      value: `${property.propertyLabel} ${op} ${filteringOption.value}`,
      label: filteringOption.label || filteringOption.value,
      labelPrefix: `${property.propertyLabel} ${op}`,
    });
  });

  return options.length > 0
    ? [{ label: groupLabel, options }]
    : [];
}

/**
 * Format token for display
 * @param {Object} token - Token to format
 * @param {Array} filteringProperties - Available properties
 * @returns {Object} Formatted token
 */
export function formatToken(token, filteringProperties) {
  const property = token.property || filteringProperties.find(p => p.key === token.propertyKey);
  const propertyLabel = property?.propertyLabel || '';
  const valueFormatter = property?.getValueFormatter?.(token.operator);
  const formattedValue = valueFormatter ? valueFormatter(token.value) : String(token.value ?? '');

  return {
    propertyKey: token.propertyKey || property?.key,
    propertyLabel,
    operator: token.operator,
    value: formattedValue,
    formattedText: propertyLabel
      ? `${propertyLabel} ${token.operator} ${formattedValue}`
      : `${token.operator} ${formattedValue}`,
  };
}
