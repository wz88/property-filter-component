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
});
