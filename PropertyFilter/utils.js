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

/**
 * Validate IP address with CIDR notation
 * Format: x.x.x.x/y where x is 0-255 and y is 22-32
 * @param {string} value - IP address string
 * @returns {{ valid: boolean, error?: string }} Validation result
 */
export function validateIPAddress(value) {
  if (!value || typeof value !== 'string') {
    return { valid: false, error: 'IP address is required' };
  }

  const trimmed = value.trim();
  
  // Check for CIDR notation
  const cidrMatch = trimmed.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/);
  if (cidrMatch) {
    const [, o1, o2, o3, o4, cidr] = cidrMatch;
    const octets = [parseInt(o1), parseInt(o2), parseInt(o3), parseInt(o4)];
    const cidrNum = parseInt(cidr);

    // Validate octets (0-255)
    for (const octet of octets) {
      if (octet < 0 || octet > 255) {
        return { valid: false, error: 'Each octet must be between 0 and 255' };
      }
    }

    // Validate CIDR (22-32)
    if (cidrNum < 22 || cidrNum > 32) {
      return { valid: false, error: 'CIDR must be between 22 and 32' };
    }

    return { valid: true };
  }

  // Check for plain IP address (without CIDR)
  const ipMatch = trimmed.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipMatch) {
    const [, o1, o2, o3, o4] = ipMatch;
    const octets = [parseInt(o1), parseInt(o2), parseInt(o3), parseInt(o4)];

    for (const octet of octets) {
      if (octet < 0 || octet > 255) {
        return { valid: false, error: 'Each octet must be between 0 and 255' };
      }
    }

    return { valid: true };
  }

  return { valid: false, error: 'Invalid IP address format. Use x.x.x.x or x.x.x.x/22-32' };
}

/**
 * Validate port number or port range
 * Formats: 
 *   - Single port: 21, 22, 80, 443
 *   - Range: 445-500 (start must be less than end)
 *   - List: 21, 22, 80, 443
 * @param {string} value - Port value string
 * @returns {{ valid: boolean, error?: string }} Validation result
 */
export function validatePortNumber(value) {
  if (!value || typeof value !== 'string') {
    return { valid: false, error: 'Port number is required' };
  }

  const trimmed = value.trim();

  // Check for single port number
  const singlePortMatch = trimmed.match(/^(\d+)$/);
  if (singlePortMatch) {
    const port = parseInt(singlePortMatch[1]);
    if (port < 1 || port > 65535) {
      return { valid: false, error: 'Port must be between 1 and 65535' };
    }
    return { valid: true };
  }

  // Check for port range start-end (e.g., 445-500)
  const rangeMatch = trimmed.match(/^(\d+)-(\d+)$/);
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1]);
    const end = parseInt(rangeMatch[2]);

    if (start < 1 || start > 65535 || end < 1 || end > 65535) {
      return { valid: false, error: 'Ports must be between 1 and 65535' };
    }

    if (start >= end) {
      return { valid: false, error: 'Range start must be less than end (e.g., 445-500, not 500-445)' };
    }

    return { valid: true };
  }

  // Check for port list (e.g., 21, 22, 80, 443)
  if (trimmed.includes(',')) {
    const ports = trimmed.split(',').map(p => p.trim());

    for (const portStr of ports) {
      const port = parseInt(portStr);
      if (isNaN(port) || port < 1 || port > 65535) {
        return { valid: false, error: `Invalid port "${portStr}". Ports must be between 1 and 65535` };
      }
    }

    return { valid: true };
  }

  return { valid: false, error: 'Invalid port format. Use: 80, 445-500, or 21, 22, 80, 443' };
}

/**
 * Validate a token value based on property type
 * @param {string} value - Value to validate
 * @param {Object} property - Property definition with optional validationType
 * @returns {{ valid: boolean, error?: string }} Validation result
 */
export function validateTokenValue(value, property) {
  if (!property || !property.validationType) {
    return { valid: true };
  }

  switch (property.validationType) {
    case 'ip':
    case 'ipAddress':
      return validateIPAddress(value);
    case 'port':
    case 'portNumber':
      return validatePortNumber(value);
    default:
      return { valid: true };
  }
}
