import { describe, it, expect } from 'vitest';
import {
  matchFilteringProperty,
  matchOperator,
  matchOperatorPrefix,
  matchTokenValue,
  trimStart,
  removeOperator,
  tokenGroupToTokens,
  getAllowedOperators,
  validateIPAddress,
  validatePortNumber,
  validateTokenValue,
  operatorToApi,
  apiToOperator,
  queryToApiFormat,
  apiToQueryFormat,
} from '../components/utils';

describe('utils', () => {
  describe('matchFilteringProperty', () => {
    const properties = [
      { key: 'name', propertyLabel: 'Name' },
      { key: 'status', propertyLabel: 'Status' },
      { key: 'firstName', propertyLabel: 'First Name' },
    ];

    it('should match property by exact label', () => {
      const result = matchFilteringProperty(properties, 'Name = John');
      expect(result).toEqual(properties[0]);
    });

    it('should match property case-insensitively', () => {
      const result = matchFilteringProperty(properties, 'status = active');
      expect(result).toEqual(properties[1]);
    });

    it('should match the longest property label', () => {
      const result = matchFilteringProperty(properties, 'First Name = John');
      expect(result).toEqual(properties[2]);
    });

    it('should return null for no match', () => {
      const result = matchFilteringProperty(properties, 'Unknown = value');
      expect(result).toBeNull();
    });

    it('should return null for empty text', () => {
      const result = matchFilteringProperty(properties, '');
      expect(result).toBeNull();
    });
  });

  describe('matchOperator', () => {
    const operators = ['=', '!=', ':', '!:', '>=', '<='];

    it('should match equals operator', () => {
      expect(matchOperator(operators, '= value')).toBe('=');
    });

    it('should match not equals operator', () => {
      expect(matchOperator(operators, '!= value')).toBe('!=');
    });

    it('should match contains operator', () => {
      expect(matchOperator(operators, ': value')).toBe(':');
    });

    it('should match the longest operator', () => {
      expect(matchOperator(operators, '>= 10')).toBe('>=');
    });

    it('should return null for no match', () => {
      expect(matchOperator(operators, 'value')).toBeNull();
    });
  });

  describe('matchOperatorPrefix', () => {
    const operators = ['=', '!=', ':', '!:'];

    it('should match partial operator', () => {
      expect(matchOperatorPrefix(operators, '!')).toBe('!');
    });

    it('should return empty string for empty input', () => {
      expect(matchOperatorPrefix(operators, '')).toBe('');
      expect(matchOperatorPrefix(operators, '   ')).toBe('');
    });

    it('should return null for invalid prefix', () => {
      expect(matchOperatorPrefix(operators, 'x')).toBeNull();
    });
  });

  describe('matchTokenValue', () => {
    const property = { key: 'status' };
    const filteringOptions = [
      { property, value: 'active', label: 'Active' },
      { property, value: 'inactive', label: 'Inactive' },
    ];

    it('should match by exact value', () => {
      const result = matchTokenValue(
        { property, operator: '=', value: 'active' },
        filteringOptions
      );
      expect(result.value).toBe('active');
    });

    it('should match by label', () => {
      const result = matchTokenValue(
        { property, operator: '=', value: 'Active' },
        filteringOptions
      );
      expect(result.value).toBe('active');
    });

    it('should match case-insensitively', () => {
      const result = matchTokenValue(
        { property, operator: '=', value: 'ACTIVE' },
        filteringOptions
      );
      expect(result.value).toBe('active');
    });

    it('should return original value if no match', () => {
      const result = matchTokenValue(
        { property, operator: '=', value: 'unknown' },
        filteringOptions
      );
      expect(result.value).toBe('unknown');
    });
  });

  describe('trimStart', () => {
    it('should trim leading spaces', () => {
      expect(trimStart('   hello')).toBe('hello');
    });

    it('should not trim trailing spaces', () => {
      expect(trimStart('hello   ')).toBe('hello   ');
    });

    it('should handle empty string', () => {
      expect(trimStart('')).toBe('');
    });

    it('should handle string with no leading spaces', () => {
      expect(trimStart('hello')).toBe('hello');
    });
  });

  describe('removeOperator', () => {
    it('should remove operator and first space', () => {
      expect(removeOperator('= value', '=')).toBe('value');
    });

    it('should handle operator without space', () => {
      expect(removeOperator('=value', '=')).toBe('value');
    });

    it('should preserve additional spaces', () => {
      expect(removeOperator('=  value', '=')).toBe(' value');
    });
  });

  describe('tokenGroupToTokens', () => {
    it('should flatten simple tokens', () => {
      const tokens = [
        { operator: '=', value: 'a' },
        { operator: '!=', value: 'b' },
      ];
      expect(tokenGroupToTokens(tokens)).toEqual(tokens);
    });

    it('should flatten nested token groups', () => {
      const tokens = [
        { operator: '=', value: 'a' },
        {
          operation: 'or',
          tokens: [
            { operator: ':', value: 'b' },
            { operator: ':', value: 'c' },
          ],
        },
      ];
      const result = tokenGroupToTokens(tokens);
      expect(result).toHaveLength(3);
      expect(result[0].value).toBe('a');
      expect(result[1].value).toBe('b');
      expect(result[2].value).toBe('c');
    });

    it('should handle empty array', () => {
      expect(tokenGroupToTokens([])).toEqual([]);
    });
  });

  describe('getAllowedOperators', () => {
    it('should return operators in correct order', () => {
      const property = {
        operators: ['!=', ':', '='],
        defaultOperator: '=',
      };
      const result = getAllowedOperators(property);
      expect(result).toEqual(['=', '!=', ':']);
    });

    it('should include default operator', () => {
      const property = {
        operators: ['!='],
        defaultOperator: '=',
      };
      const result = getAllowedOperators(property);
      expect(result).toContain('=');
    });

    it('should handle empty operators', () => {
      const property = { defaultOperator: '=' };
      const result = getAllowedOperators(property);
      expect(result).toEqual(['=']);
    });
  });

  describe('validateIPAddress', () => {
    it('should validate valid IP address and append /32', () => {
      expect(validateIPAddress('192.168.1.1')).toEqual({ valid: true, normalizedValue: '192.168.1.1/32' });
      expect(validateIPAddress('10.0.0.1')).toEqual({ valid: true, normalizedValue: '10.0.0.1/32' });
      expect(validateIPAddress('255.255.255.255')).toEqual({ valid: true, normalizedValue: '255.255.255.255/32' });
      expect(validateIPAddress('0.0.0.0')).toEqual({ valid: true, normalizedValue: '0.0.0.0/32' });
    });

    it('should validate valid IP with CIDR and preserve it', () => {
      expect(validateIPAddress('192.168.1.0/24')).toEqual({ valid: true, normalizedValue: '192.168.1.0/24' });
      expect(validateIPAddress('10.0.0.0/22')).toEqual({ valid: true, normalizedValue: '10.0.0.0/22' });
      expect(validateIPAddress('172.16.0.0/32')).toEqual({ valid: true, normalizedValue: '172.16.0.0/32' });
    });

    it('should reject invalid CIDR range', () => {
      const result1 = validateIPAddress('192.168.1.0/21');
      expect(result1.valid).toBe(false);
      expect(result1.error).toContain('CIDR must be between 22 and 32');

      const result2 = validateIPAddress('192.168.1.0/33');
      expect(result2.valid).toBe(false);
    });

    it('should reject invalid octets', () => {
      const result1 = validateIPAddress('256.168.1.1');
      expect(result1.valid).toBe(false);
      expect(result1.error).toContain('octet');

      const result2 = validateIPAddress('192.168.1.300');
      expect(result2.valid).toBe(false);
    });

    it('should reject invalid format', () => {
      expect(validateIPAddress('192.168.1').valid).toBe(false);
      expect(validateIPAddress('192.168.1.1.1').valid).toBe(false);
      expect(validateIPAddress('abc.def.ghi.jkl').valid).toBe(false);
      expect(validateIPAddress('').valid).toBe(false);
      expect(validateIPAddress(null).valid).toBe(false);
    });
  });

  describe('validatePortNumber', () => {
    it('should validate single port number', () => {
      expect(validatePortNumber('80')).toEqual({ valid: true });
      expect(validatePortNumber('443')).toEqual({ valid: true });
      expect(validatePortNumber('21')).toEqual({ valid: true });
      expect(validatePortNumber('65535')).toEqual({ valid: true });
    });

    it('should reject invalid single port', () => {
      const result1 = validatePortNumber('0');
      expect(result1.valid).toBe(false);

      const result2 = validatePortNumber('65536');
      expect(result2.valid).toBe(false);
    });

    it('should validate port range', () => {
      expect(validatePortNumber('445-500')).toEqual({ valid: true });
      expect(validatePortNumber('1-65535')).toEqual({ valid: true });
      expect(validatePortNumber('80-443')).toEqual({ valid: true });
    });

    it('should reject invalid port range (start >= end)', () => {
      const result1 = validatePortNumber('500-445');
      expect(result1.valid).toBe(false);
      expect(result1.error).toContain('start must be less than end');

      const result2 = validatePortNumber('500-500');
      expect(result2.valid).toBe(false);
    });

    it('should validate port list', () => {
      expect(validatePortNumber('21, 22, 80, 443')).toEqual({ valid: true });
      expect(validatePortNumber('80,443,8080')).toEqual({ valid: true });
    });

    it('should reject invalid port in list', () => {
      const result = validatePortNumber('21, 0, 80');
      expect(result.valid).toBe(false);
    });

    it('should reject invalid format', () => {
      expect(validatePortNumber('abc').valid).toBe(false);
      expect(validatePortNumber('').valid).toBe(false);
      expect(validatePortNumber(null).valid).toBe(false);
    });
  });

  describe('validateTokenValue', () => {
    it('should return valid for no validation type', () => {
      expect(validateTokenValue('anything', {})).toEqual({ valid: true });
      expect(validateTokenValue('anything', null)).toEqual({ valid: true });
    });

    it('should validate IP address type', () => {
      const property = { validationType: 'ip' };
      expect(validateTokenValue('192.168.1.1', property).valid).toBe(true);
      expect(validateTokenValue('invalid', property).valid).toBe(false);
    });

    it('should validate port type', () => {
      const property = { validationType: 'port' };
      expect(validateTokenValue('80', property).valid).toBe(true);
      expect(validateTokenValue('445-500', property).valid).toBe(true);
      expect(validateTokenValue('invalid', property).valid).toBe(false);
    });

    it('should handle ipAddress alias', () => {
      const property = { validationType: 'ipAddress' };
      expect(validateTokenValue('192.168.1.1', property).valid).toBe(true);
    });

    it('should handle portNumber alias', () => {
      const property = { validationType: 'portNumber' };
      expect(validateTokenValue('80', property).valid).toBe(true);
    });
  });

  describe('operatorToApi', () => {
    it('should convert internal operators to API format', () => {
      expect(operatorToApi('=')).toBe('equals');
      expect(operatorToApi('!=')).toBe('does-not-equal');
      expect(operatorToApi(':')).toBe('contains');
      expect(operatorToApi('!:')).toBe('does-not-contain');
      expect(operatorToApi('^')).toBe('starts-with');
      expect(operatorToApi('!^')).toBe('does-not-start-with');
      expect(operatorToApi('>')).toBe('greater-than');
      expect(operatorToApi('<')).toBe('less-than');
      expect(operatorToApi('>=')).toBe('greater-than-or-equal');
      expect(operatorToApi('<=')).toBe('less-than-or-equal');
    });

    it('should return original value for unknown operators', () => {
      expect(operatorToApi('unknown')).toBe('unknown');
    });
  });

  describe('apiToOperator', () => {
    it('should convert API operators to internal format', () => {
      expect(apiToOperator('equals')).toBe('=');
      expect(apiToOperator('does-not-equal')).toBe('!=');
      expect(apiToOperator('contains')).toBe(':');
      expect(apiToOperator('does-not-contain')).toBe('!:');
      expect(apiToOperator('starts-with')).toBe('^');
      expect(apiToOperator('does-not-start-with')).toBe('!^');
      expect(apiToOperator('greater-than')).toBe('>');
      expect(apiToOperator('less-than')).toBe('<');
      expect(apiToOperator('greater-than-or-equal')).toBe('>=');
      expect(apiToOperator('less-than-or-equal')).toBe('<=');
    });

    it('should return original value for unknown operators', () => {
      expect(apiToOperator('unknown')).toBe('unknown');
    });
  });

  describe('queryToApiFormat', () => {
    it('should convert internal query to API format with AND', () => {
      const internalQuery = {
        tokens: [
          { propertyKey: 'name', operator: '=', value: 'abc' },
          { propertyKey: 'email', operator: '!=', value: 'def@example.com' },
        ],
        operation: 'and',
      };

      const result = queryToApiFormat(internalQuery);

      expect(result).toEqual({
        filter: {
          and: [
            { field: 'name', op: 'equals', value: 'abc' },
            { field: 'email', op: 'does-not-equal', value: 'def@example.com' },
          ],
          or: [],
        },
      });
    });

    it('should convert internal query to API format with OR', () => {
      const internalQuery = {
        tokens: [
          { propertyKey: 'status', operator: ':', value: 'active' },
        ],
        operation: 'or',
      };

      const result = queryToApiFormat(internalQuery);

      expect(result).toEqual({
        filter: {
          and: [],
          or: [
            { field: 'status', op: 'contains', value: 'active' },
          ],
        },
      });
    });

    it('should handle empty tokens', () => {
      const result = queryToApiFormat({ tokens: [], operation: 'and' });
      expect(result).toEqual({ filter: { and: [], or: [] } });
    });

    it('should handle free text filters (null propertyKey)', () => {
      const internalQuery = {
        tokens: [{ propertyKey: undefined, operator: ':', value: 'search' }],
        operation: 'and',
      };

      const result = queryToApiFormat(internalQuery);

      expect(result.filter.and[0].field).toBeNull();
    });
  });

  describe('apiToQueryFormat', () => {
    it('should convert API format to internal query with AND', () => {
      const apiQuery = {
        filter: {
          and: [
            { field: 'name', op: 'equals', value: 'abc' },
            { field: 'email', op: 'does-not-equal', value: 'def@example.com' },
          ],
          or: [],
        },
      };

      const result = apiToQueryFormat(apiQuery);

      expect(result).toEqual({
        tokens: [
          { propertyKey: 'name', operator: '=', value: 'abc' },
          { propertyKey: 'email', operator: '!=', value: 'def@example.com' },
        ],
        operation: 'and',
      });
    });

    it('should convert API format to internal query with OR', () => {
      const apiQuery = {
        filter: {
          and: [],
          or: [
            { field: 'status', op: 'contains', value: 'active' },
          ],
        },
      };

      const result = apiToQueryFormat(apiQuery);

      expect(result).toEqual({
        tokens: [
          { propertyKey: 'status', operator: ':', value: 'active' },
        ],
        operation: 'or',
      });
    });

    it('should handle empty filter', () => {
      const result = apiToQueryFormat({ filter: { and: [], or: [] } });
      expect(result).toEqual({ tokens: [], operation: 'and' });
    });

    it('should handle missing filter property', () => {
      const result = apiToQueryFormat({});
      expect(result).toEqual({ tokens: [], operation: 'and' });
    });
  });
});
