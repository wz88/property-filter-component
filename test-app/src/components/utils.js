/**
 * Utility functions for PropertyFilter component
 */

/**
 * Finds the longest property the filtering text starts from.
 * @param {Array} filteringProperties - Array of filtering properties
 * @param {string} filteringText - Current filter text
 * @returns {Object|null} Matched property or null
 */
export function matchFilteringProperty(filteringProperties, filteringText) {
  let maxLength = 0;
  let matchedProperty = null;

  for (const property of filteringProperties) {
    const propertyLabel = property.propertyLabel || '';
    if (
      (propertyLabel.length >= maxLength && startsWith(filteringText, propertyLabel)) ||
      (propertyLabel.length > maxLength &&
        startsWith(filteringText.toLowerCase(), propertyLabel.toLowerCase()))
    ) {
      maxLength = propertyLabel.length;
      matchedProperty = property;
    }
  }

  return matchedProperty;
}

/**
 * Finds the longest operator the filtering text starts from.
 * @param {Array} allowedOperators - Array of allowed operators
 * @param {string} filteringText - Current filter text
 * @returns {string|null} Matched operator or null
 */
export function matchOperator(allowedOperators, filteringText) {
  const text = filteringText.toLowerCase();

  let maxLength = 0;
  let matchedOperator = null;

  for (const operator of allowedOperators) {
    if (operator.length > maxLength && startsWith(text, operator.toLowerCase())) {
      maxLength = operator.length;
      matchedOperator = operator;
    }
  }

  return matchedOperator;
}

/**
 * Finds if the filtering text matches any operator prefix.
 * @param {Array} allowedOperators - Array of allowed operators
 * @param {string} filteringText - Current filter text
 * @returns {string|null} Matched prefix or null
 */
export function matchOperatorPrefix(allowedOperators, filteringText) {
  if (filteringText.trim().length === 0) {
    return '';
  }
  for (const operator of allowedOperators) {
    if (startsWith(operator.toLowerCase(), filteringText.toLowerCase())) {
      return filteringText;
    }
  }
  return null;
}

/**
 * Match token value against filtering options
 * @param {Object} token - Token with property, operator, value
 * @param {Array} filteringOptions - Available filtering options
 * @returns {Object} Matched token
 */
export function matchTokenValue({ property, operator, value }, filteringOptions) {
  const propertyOptions = filteringOptions.filter(option => option.property === property);
  const bestMatch = { propertyKey: property?.key, operator, value };

  for (const option of propertyOptions) {
    if ((option.label && option.label === value) || (!option.label && option.value === value)) {
      return { propertyKey: property?.key, operator, value: option.value };
    }

    if (typeof value === 'string' && value.toLowerCase() === (option.label ?? option.value ?? '').toLowerCase()) {
      bestMatch.value = option.value;
    }
  }

  return bestMatch;
}

/**
 * Trim leading spaces from a string
 * @param {string} source - Source string
 * @returns {string} Trimmed string
 */
export function trimStart(source) {
  let spacesLength = 0;
  for (let i = 0; i < source.length; i++) {
    if (source[i] === ' ') {
      spacesLength++;
    } else {
      break;
    }
  }
  return source.slice(spacesLength);
}

/**
 * Remove operator from source string
 * @param {string} source - Source string
 * @param {string} operator - Operator to remove
 * @returns {string} String without operator
 */
export function removeOperator(source, operator) {
  const operatorLastIndex = source.indexOf(operator) + operator.length;
  const textWithoutOperator = source.slice(operatorLastIndex);
  return textWithoutOperator[0] === ' ' ? textWithoutOperator.slice(1) : textWithoutOperator;
}

/**
 * Check if source string starts with target
 * @param {string} source - Source string
 * @param {string} target - Target string
 * @returns {boolean} True if starts with target
 */
function startsWith(source, target) {
  return source.indexOf(target) === 0;
}

/**
 * Transforms query token groups to flat tokens array
 * @param {Array} tokenGroups - Array of tokens or token groups
 * @returns {Array} Flat array of tokens
 */
export function tokenGroupToTokens(tokenGroups) {
  const tokens = [];
  for (const tokenOrGroup of tokenGroups) {
    if ('operator' in tokenOrGroup) {
      tokens.push(tokenOrGroup);
    } else if (tokenOrGroup.tokens) {
      for (const nestedTokenOrGroup of tokenOrGroup.tokens) {
        if ('operator' in nestedTokenOrGroup) {
          tokens.push(nestedTokenOrGroup);
        }
      }
    }
  }
  return tokens;
}

/**
 * Get allowed operators for a property
 * @param {Object} property - Filtering property
 * @returns {Array} Array of allowed operators
 */
export function getAllowedOperators(property) {
  const { operators = [], defaultOperator = '=' } = property;
  const operatorOrder = ['=', '!=', ':', '!:', '^', '!^', '>=', '<=', '<', '>'];
  const operatorSet = new Set([defaultOperator, ...operators]);
  return operatorOrder.filter(op => operatorSet.has(op));
}

/**
 * Generate unique ID
 * @param {string} prefix - ID prefix
 * @returns {string} Unique ID
 */
export function generateId(prefix = 'pf') {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}
