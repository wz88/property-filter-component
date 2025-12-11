/**
 * =============================================================================
 * utils.js - Utility Functions for PropertyFilter
 * =============================================================================
 * 
 * This file contains pure utility functions used throughout the PropertyFilter
 * component. These functions handle:
 * 
 * 1. TEXT PARSING - Matching user input to properties and operators
 * 2. STRING MANIPULATION - Trimming, removing operators from text
 * 3. TOKEN HANDLING - Converting between formats, flattening groups
 * 4. OPERATOR MAPPING - Converting between internal symbols and API names
 * 5. FORMAT CONVERSION - Converting between internal and API query formats
 * 6. VALIDATION - IP address, port number, and extensible validation
 * 
 * ADDING NEW FUNCTIONALITY:
 * -------------------------
 * - New validation type: Add case in validateTokenValue() and create validator
 * - New operator: Add to operatorToApiMap and apiToOperatorMap
 * - New string utility: Add function and export it
 * 
 * All functions are pure (no side effects) and can be unit tested independently.
 */

// =============================================================================
// TEXT PARSING FUNCTIONS
// =============================================================================
// These functions analyze user input to determine what they're typing
// (property name, operator, value, or free text)

/**
 * Finds the longest property that the filtering text starts with.
 * 
 * WHY LONGEST MATCH?
 * If you have properties "Status" and "Status Code", and user types
 * "Status Code = 200", we want to match "Status Code", not "Status".
 * 
 * CASE SENSITIVITY:
 * First tries exact case match, then falls back to case-insensitive.
 * This allows "status" to match "Status" property.
 * 
 * @param {Array} filteringProperties - Array of property definitions
 * @param {string} filteringText - Current text in the filter input
 * @returns {Object|null} The matched property object, or null if no match
 * 
 * @example
 * // Returns the Status property object
 * matchFilteringProperty([{propertyLabel: 'Status'}], 'Status = active')
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
 * Finds the longest operator that the filtering text starts with.
 * 
 * WHY LONGEST MATCH?
 * Operators like "!=" should be matched before "!" alone.
 * ">=" should be matched before ">".
 * 
 * @param {Array} allowedOperators - Array of operator strings ['=', '!=', ':', etc.]
 * @param {string} filteringText - Text to check for operator prefix
 * @returns {string|null} The matched operator, or null if no match
 * 
 * @example
 * matchOperator(['=', '!=', ':'], '!= active') // Returns '!='
 * matchOperator(['=', '!=', ':'], 'active')    // Returns null
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
 * Checks if the filtering text could be the START of any operator.
 * 
 * Used to detect when user is in the "operator step" - they've typed
 * a property name and are starting to type an operator.
 * 
 * @param {Array} allowedOperators - Array of operator strings
 * @param {string} filteringText - Text to check
 * @returns {string|null} The text if it's a valid prefix, '' if empty, null if invalid
 * 
 * @example
 * matchOperatorPrefix(['=', '!=', '>='], '!')  // Returns '!' (could become '!=')
 * matchOperatorPrefix(['=', '!=', '>='], 'x')  // Returns null (not a valid prefix)
 * matchOperatorPrefix(['=', '!=', '>='], '')   // Returns '' (empty is valid)
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
 * Matches a token's value against available filtering options.
 * 
 * When user types a value, this tries to find a matching option to get
 * the canonical value. For example, if user types "Active" but the option
 * value is "active", this returns "active".
 * 
 * MATCHING PRIORITY:
 * 1. Exact label match (case-sensitive)
 * 2. Exact value match (case-sensitive)
 * 3. Case-insensitive label/value match
 * 
 * @param {Object} token - Token with property, operator, value
 * @param {Array} filteringOptions - Available options with {property, value, label}
 * @returns {Object} Token with potentially corrected value
 * 
 * @example
 * // If options include {value: 'active', label: 'Active'}
 * matchTokenValue({value: 'Active'}, options) // Returns {value: 'active'}
 */
export function matchTokenValue({ property, propertyKey, operator, value }, filteringOptions) {
  const propertyOptions = filteringOptions.filter(option => option.property === property);
  // Use existing propertyKey if provided, otherwise derive from property
  const resolvedPropertyKey = propertyKey || property?.key;
  const bestMatch = { propertyKey: resolvedPropertyKey, operator, value };

  for (const option of propertyOptions) {
    if ((option.label && option.label === value) || (!option.label && option.value === value)) {
      return { propertyKey: resolvedPropertyKey, operator, value: option.value };
    }

    if (typeof value === 'string' && value.toLowerCase() === (option.label ?? option.value ?? '').toLowerCase()) {
      bestMatch.value = option.value;
    }
  }

  return bestMatch;
}

// =============================================================================
// STRING MANIPULATION FUNCTIONS
// =============================================================================

/**
 * Removes leading spaces from a string.
 * Similar to String.trimStart() but implemented manually for consistency.
 * 
 * @param {string} source - String to trim
 * @returns {string} String with leading spaces removed
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
 * Removes an operator from the beginning of a string.
 * Also removes a single trailing space after the operator if present.
 * 
 * Used when parsing "Status = active" to extract "active" after
 * finding the "=" operator.
 * 
 * @param {string} source - Full string containing operator
 * @param {string} operator - Operator to remove
 * @returns {string} Remaining string after operator
 * 
 * @example
 * removeOperator('= active', '=')  // Returns 'active'
 * removeOperator('=active', '=')   // Returns 'active'
 */
export function removeOperator(source, operator) {
  const operatorLastIndex = source.indexOf(operator) + operator.length;
  const textWithoutOperator = source.slice(operatorLastIndex);
  return textWithoutOperator[0] === ' ' ? textWithoutOperator.slice(1) : textWithoutOperator;
}

/**
 * Checks if source string starts with target string.
 * Internal helper function (not exported).
 * 
 * @param {string} source - String to check
 * @param {string} target - Prefix to look for
 * @returns {boolean} True if source starts with target
 */
function startsWith(source, target) {
  return source.indexOf(target) === 0;
}

// =============================================================================
// TOKEN HANDLING FUNCTIONS
// =============================================================================

/**
 * Flattens nested token groups into a simple array of tokens.
 * 
 * Tokens can be organized in groups for complex queries (e.g., nested AND/OR).
 * This function extracts all individual tokens regardless of grouping.
 * 
 * TOKEN STRUCTURE:
 * - Simple token: { operator: '=', value: 'x', propertyKey: 'field' }
 * - Token group: { tokens: [...], operation: 'and' }
 * 
 * @param {Array} tokenGroups - Array of tokens or token groups
 * @returns {Array} Flat array of token objects
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
 * Gets the list of allowed operators for a property, in display order.
 * 
 * Combines the property's configured operators with its default operator,
 * then returns them in a consistent order for the UI.
 * 
 * OPERATOR ORDER: =, !=, :, !:, ^, !^, >=, <=, <, >
 * This order is used in dropdown menus.
 * 
 * @param {Object} property - Property definition with operators array
 * @returns {Array} Ordered array of operator strings
 * 
 * @example
 * getAllowedOperators({ operators: ['!=', ':'], defaultOperator: '=' })
 * // Returns ['=', '!=', ':']
 */
export function getAllowedOperators(property) {
  const { operators = [], defaultOperator = '=' } = property;
  const operatorOrder = ['=', '!=', ':', '!:', '^', '!^', '>=', '<=', '<', '>'];
  const operatorSet = new Set([defaultOperator, ...operators]);
  return operatorOrder.filter(op => operatorSet.has(op));
}

// =============================================================================
// OPERATOR MAPPING
// =============================================================================
// Internal operators use symbols (=, !=, :) for compact display.
// API operators use descriptive names (equals, contains) for clarity.
//
// TO ADD A NEW OPERATOR:
// 1. Add to operatorToApiMap (internal → API)
// 2. Add to apiToOperatorMap (API → internal)
// 3. Add to operatorOrder in getAllowedOperators() for UI ordering
// 4. Add description in controller.js operatorDescriptions

/**
 * Maps internal operator symbols to human-readable API names.
 * Used when converting query to API format for backend/storage.
 */
const operatorToApiMap = {
  '=': 'equals',              // Exact match
  '!=': 'does-not-equal',     // Not equal
  ':': 'contains',            // Substring match
  '!:': 'does-not-contain',   // Does not contain substring
  '^': 'starts-with',         // Prefix match
  '!^': 'does-not-start-with', // Does not start with
  '>': 'greater-than',        // Numeric/date comparison
  '<': 'less-than',
  '>=': 'greater-than-or-equal',
  '<=': 'less-than-or-equal',
};

/**
 * Reverse mapping: API names back to internal symbols.
 * Used when loading query from API/storage.
 */
const apiToOperatorMap = {
  'equals': '=',
  'does-not-equal': '!=',
  'contains': ':',
  'does-not-contain': '!:',
  'starts-with': '^',
  'does-not-start-with': '!^',
  'greater-than': '>',
  'less-than': '<',
  'greater-than-or-equal': '>=',
  'less-than-or-equal': '<=',
};

/**
 * Converts internal operator symbol to API name.
 * @param {string} operator - Internal symbol (e.g., '=')
 * @returns {string} API name (e.g., 'equals')
 */
export function operatorToApi(operator) {
  return operatorToApiMap[operator] || operator;
}

/**
 * Converts API operator name to internal symbol.
 * @param {string} apiOp - API name (e.g., 'equals')
 * @returns {string} Internal symbol (e.g., '=')
 */
export function apiToOperator(apiOp) {
  return apiToOperatorMap[apiOp] || apiOp;
}

// =============================================================================
// FORMAT CONVERSION FUNCTIONS
// =============================================================================
// The component uses two query formats:
//
// INTERNAL FORMAT (used inside component):
// {
//   tokens: [{ propertyKey: 'status', operator: '=', value: 'active' }],
//   operation: 'and'
// }
//
// API FORMAT (used for onChange callback, storage, backend):
// {
//   filter: {
//     and: [{ field: 'status', op: 'equals', value: 'active' }],
//     or: []
//   }
// }
//
// WHY TWO FORMATS?
// - Internal: Optimized for UI manipulation (compact operators, property refs)
// - API: Optimized for serialization and backend compatibility

/**
 * Converts internal query format to API format.
 * Called when query changes to pass to onChange callback.
 * 
 * @param {Object} query - Internal format { tokens, operation }
 * @returns {Object} API format { filter: { and: [], or: [] } }
 * 
 * @example
 * queryToApiFormat({
 *   tokens: [{ propertyKey: 'status', operator: '=', value: 'active' }],
 *   operation: 'and'
 * })
 * // Returns: { filter: { and: [{ field: 'status', op: 'equals', value: 'active' }], or: [] } }
 */
export function queryToApiFormat(query) {
  const { tokens = [], operation = 'and' } = query;
  
  // Convert each token to API format
  const filterItems = tokens.map(token => ({
    field: token.propertyKey || null,  // null for free-text filters
    op: operatorToApi(token.operator), // Convert symbol to name
    value: token.value,
  }));

  // Place items in appropriate array based on operation
  return {
    filter: {
      and: operation === 'and' ? filterItems : [],
      or: operation === 'or' ? filterItems : [],
    },
  };
}

/**
 * Converts API format to internal query format.
 * Called when receiving query prop to prepare for internal use.
 * 
 * @param {Object} apiQuery - API format { filter: { and: [], or: [] } }
 * @returns {Object} Internal format { tokens, operation }
 * 
 * @example
 * apiToQueryFormat({
 *   filter: { and: [{ field: 'status', op: 'equals', value: 'active' }], or: [] }
 * })
 * // Returns: { tokens: [{ propertyKey: 'status', operator: '=', value: 'active' }], operation: 'and' }
 */
export function apiToQueryFormat(apiQuery) {
  const { filter = {} } = apiQuery;
  const { and = [], or = [] } = filter;

  // Determine operation: if OR has items, it's OR; otherwise AND
  const operation = or.length > 0 ? 'or' : 'and';
  const filterItems = operation === 'or' ? or : and;

  // Convert each filter item to internal token format
  const tokens = filterItems.map(item => ({
    propertyKey: item.field,
    operator: apiToOperator(item.op), // Convert name to symbol
    value: item.value,
  }));

  return { tokens, operation };
}

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================
// These functions validate token values based on property type.
// Each validator returns: { valid: boolean, error?: string, normalizedValue?: string }
//
// TO ADD A NEW VALIDATION TYPE:
// 1. Create a new validate function (e.g., validateEmail)
// 2. Add case in validateTokenValue() switch statement
// 3. Set validationType on property: { key: 'email', validationType: 'email' }
//
// NORMALIZATION:
// Validators can return normalizedValue to transform the input.
// Example: IP "1.2.3.4" becomes "1.2.3.4/32" (adds default CIDR)

/**
 * Validates an IP address, optionally with CIDR notation.
 * 
 * ACCEPTED FORMATS:
 * - Plain IP: "192.168.1.1" (normalized to "192.168.1.1/32")
 * - CIDR notation: "192.168.1.0/24" (kept as-is)
 * 
 * VALIDATION RULES:
 * - Each octet must be 0-255
 * - CIDR must be 22-32 (configurable range for your use case)
 * - Plain IPs get /32 appended (single host)
 * 
 * @param {string} value - IP address string to validate
 * @returns {{ valid: boolean, error?: string, normalizedValue?: string }}
 * 
 * @example
 * validateIPAddress('192.168.1.1')     // { valid: true, normalizedValue: '192.168.1.1/32' }
 * validateIPAddress('192.168.1.0/24')  // { valid: true, normalizedValue: '192.168.1.0/24' }
 * validateIPAddress('999.1.1.1')       // { valid: false, error: 'Each octet must be...' }
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

    return { valid: true, normalizedValue: trimmed };
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

    // Append /32 for host addresses without CIDR
    return { valid: true, normalizedValue: `${trimmed}/32` };
  }

  return { valid: false, error: 'Invalid IP address format. Use x.x.x.x or x.x.x.x/22-32' };
}

/**
 * Validates a port number, range, or comma-separated list.
 * 
 * ACCEPTED FORMATS:
 * - Single port: "80", "443", "8080"
 * - Port range: "445-500" (start must be less than end)
 * - Port list: "21, 22, 80, 443" (comma-separated)
 * 
 * VALIDATION RULES:
 * - All ports must be 1-65535
 * - Ranges must have start < end
 * 
 * @param {string} value - Port value string to validate
 * @returns {{ valid: boolean, error?: string }}
 * 
 * @example
 * validatePortNumber('80')        // { valid: true }
 * validatePortNumber('445-500')   // { valid: true }
 * validatePortNumber('21, 22')    // { valid: true }
 * validatePortNumber('99999')     // { valid: false, error: 'Port must be...' }
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
 * Main validation dispatcher - validates token value based on property type.
 * 
 * This is the entry point for all validation. It checks the property's
 * validationType and calls the appropriate validator.
 * 
 * SUPPORTED VALIDATION TYPES:
 * - 'ip' or 'ipAddress': IP address with optional CIDR
 * - 'port' or 'portNumber': Port number, range, or list
 * - undefined/other: No validation (always valid)
 * 
 * TO ADD NEW VALIDATION:
 * 1. Create validateXxx() function above
 * 2. Add case here: case 'xxx': return validateXxx(value);
 * 
 * @param {string} value - The value to validate
 * @param {Object} property - Property definition with validationType
 * @returns {{ valid: boolean, error?: string, normalizedValue?: string }}
 * 
 * @example
 * // Property with IP validation
 * validateTokenValue('1.2.3.4', { validationType: 'ip' })
 * // Returns: { valid: true, normalizedValue: '1.2.3.4/32' }
 */
export function validateTokenValue(value, property) {
  // No validation if property doesn't specify a type
  if (!property || !property.validationType) {
    return { valid: true };
  }

  // Dispatch to appropriate validator based on type
  switch (property.validationType) {
    case 'ip':
    case 'ipAddress':
      return validateIPAddress(value);
    case 'port':
    case 'portNumber':
      return validatePortNumber(value);
    default:
      // Unknown validation type - allow value through
      return { valid: true };
  }
}
