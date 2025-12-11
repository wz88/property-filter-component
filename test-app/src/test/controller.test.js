import { describe, it, expect, vi } from 'vitest';
import {
  getQueryActions,
  parseText,
  getAutosuggestOptions,
  formatToken,
} from '../components/controller';

describe('controller', () => {
  describe('parseText', () => {
    const filteringProperties = [
      {
        key: 'name',
        propertyLabel: 'Name',
        operators: ['=', '!=', ':', '!:'],
        defaultOperator: '=',
      },
      {
        key: 'status',
        propertyLabel: 'Status',
        operators: ['=', '!='],
        defaultOperator: '=',
      },
    ];

    const freeTextFiltering = {
      disabled: false,
      operators: [':', '!:'],
      defaultOperator: ':',
    };

    it('should parse property with operator and value', () => {
      const result = parseText('Name = John', filteringProperties, freeTextFiltering);
      expect(result.step).toBe('property');
      expect(result.property.key).toBe('name');
      expect(result.operator).toBe('=');
      expect(result.value).toBe('John');
    });

    it('should parse property with contains operator', () => {
      const result = parseText('Name : Jo', filteringProperties, freeTextFiltering);
      expect(result.step).toBe('property');
      expect(result.operator).toBe(':');
      expect(result.value).toBe('Jo');
    });

    it('should detect operator step when typing operator', () => {
      const result = parseText('Name !', filteringProperties, freeTextFiltering);
      expect(result.step).toBe('operator');
      expect(result.property.key).toBe('name');
      expect(result.operatorPrefix).toBe('!');
    });

    it('should parse free text', () => {
      const result = parseText('search term', filteringProperties, freeTextFiltering);
      expect(result.step).toBe('free-text');
      expect(result.value).toBe('search term');
    });

    it('should parse free text with operator', () => {
      const result = parseText(': contains this', filteringProperties, freeTextFiltering);
      expect(result.step).toBe('free-text');
      expect(result.operator).toBe(':');
      expect(result.value).toBe('contains this');
    });

    it('should parse free text with not-contains operator', () => {
      const result = parseText('!: exclude', filteringProperties, freeTextFiltering);
      expect(result.step).toBe('free-text');
      expect(result.operator).toBe('!:');
      expect(result.value).toBe('exclude');
    });

    it('should handle empty text', () => {
      const result = parseText('', filteringProperties, freeTextFiltering);
      expect(result.step).toBe('free-text');
      expect(result.value).toBe('');
    });

    it('should fall back to free text for unknown property', () => {
      const result = parseText('Unknown = value', filteringProperties, freeTextFiltering);
      expect(result.step).toBe('free-text');
      expect(result.value).toBe('Unknown = value');
    });
  });

  describe('getQueryActions', () => {
    it('should add a token', () => {
      const onChange = vi.fn();
      const query = { tokens: [], operation: 'and' };
      const { addToken } = getQueryActions({ query, onChange, filteringOptions: [] });

      addToken({ property: null, operator: ':', value: 'test' });

      // Now outputs API format
      expect(onChange).toHaveBeenCalledWith({
        filter: {
          and: [{ field: null, op: 'contains', value: 'test' }],
          or: [],
        },
      });
    });

    it('should remove a token', () => {
      const onChange = vi.fn();
      const query = {
        tokens: [
          { property: null, operator: ':', value: 'first' },
          { property: null, operator: ':', value: 'second' },
        ],
        operation: 'and',
      };
      const { removeToken } = getQueryActions({ query, onChange, filteringOptions: [] });

      removeToken(0);

      expect(onChange).toHaveBeenCalledWith({
        filter: {
          and: [{ field: null, op: 'contains', value: 'second' }],
          or: [],
        },
      });
    });

    it('should remove all tokens', () => {
      const onChange = vi.fn();
      const query = {
        tokens: [
          { property: null, operator: ':', value: 'first' },
          { property: null, operator: ':', value: 'second' },
        ],
        operation: 'and',
      };
      const { removeAllTokens } = getQueryActions({ query, onChange, filteringOptions: [] });

      removeAllTokens();

      expect(onChange).toHaveBeenCalledWith({
        filter: { and: [], or: [] },
      });
    });

    it('should update operation', () => {
      const onChange = vi.fn();
      const query = { tokens: [], operation: 'and' };
      const { updateOperation } = getQueryActions({ query, onChange, filteringOptions: [] });

      updateOperation('or');

      expect(onChange).toHaveBeenCalledWith({
        filter: { and: [], or: [] },
      });
    });
  });

  describe('getAutosuggestOptions', () => {
    const filteringProperties = [
      {
        key: 'status',
        propertyLabel: 'Status',
        groupValuesLabel: 'Status values',
        operators: ['=', '!='],
        defaultOperator: '=',
      },
    ];

    const filteringOptions = [
      { property: filteringProperties[0], value: 'active', label: 'Active' },
      { property: filteringProperties[0], value: 'inactive', label: 'Inactive' },
    ];

    it('should return property suggestions for free text step', () => {
      const parsedText = { step: 'free-text', value: '' };
      const result = getAutosuggestOptions(parsedText, filteringProperties, filteringOptions);

      expect(result.options).toHaveLength(1);
      expect(result.options[0].label).toBe('Properties');
      expect(result.options[0].options).toHaveLength(1);
      expect(result.options[0].options[0].label).toBe('Status');
    });

    it('should return value suggestions for property step', () => {
      const parsedText = {
        step: 'property',
        property: filteringProperties[0],
        operator: '=',
        value: '',
      };
      const result = getAutosuggestOptions(parsedText, filteringProperties, filteringOptions);

      expect(result.options).toHaveLength(1);
      expect(result.options[0].options).toHaveLength(2);
      expect(result.options[0].options[0].label).toBe('Active');
    });

    it('should return operator suggestions for operator step', () => {
      const parsedText = {
        step: 'operator',
        property: filteringProperties[0],
        operatorPrefix: '',
      };
      const result = getAutosuggestOptions(parsedText, filteringProperties, filteringOptions);

      const operatorGroup = result.options.find(g => g.label === 'Operators');
      expect(operatorGroup).toBeDefined();
      expect(operatorGroup.options.length).toBeGreaterThan(0);
    });
  });

  describe('formatToken', () => {
    const filteringProperties = [
      { key: 'status', propertyLabel: 'Status' },
    ];

    it('should format token with property', () => {
      const token = { propertyKey: 'status', operator: '=', value: 'active' };
      const result = formatToken(token, filteringProperties);

      expect(result.propertyLabel).toBe('Status');
      expect(result.operator).toBe('=');
      expect(result.value).toBe('active');
      expect(result.formattedText).toBe('Status = active');
    });

    it('should format free text token', () => {
      const token = { propertyKey: undefined, operator: ':', value: 'search' };
      const result = formatToken(token, filteringProperties);

      expect(result.propertyLabel).toBe('');
      expect(result.formattedText).toBe(': search');
    });

    it('should handle null value', () => {
      const token = { propertyKey: 'status', operator: '=', value: null };
      const result = formatToken(token, filteringProperties);

      expect(result.value).toBe('');
    });
  });

  describe('getQueryActions - addTokens', () => {
    it('should add multiple tokens at once', () => {
      const onChange = vi.fn();
      const query = { tokens: [], operation: 'and' };
      const { addTokens } = getQueryActions({ query, onChange, filteringOptions: [] });

      addTokens([
        { property: null, propertyKey: 'protocol', operator: '=', value: 'icmp' },
        { property: null, propertyKey: 'types-and-codes', operator: '=', value: 'echo' },
      ]);

      expect(onChange).toHaveBeenCalledWith({
        filter: {
          and: [
            { field: 'protocol', op: 'equals', value: 'icmp' },
            { field: 'types-and-codes', op: 'equals', value: 'echo' },
          ],
          or: [],
        },
      });
    });

    it('should append multiple tokens to existing tokens', () => {
      const onChange = vi.fn();
      const query = {
        tokens: [{ property: null, operator: ':', value: 'existing' }],
        operation: 'and',
      };
      const { addTokens } = getQueryActions({ query, onChange, filteringOptions: [] });

      addTokens([
        { property: null, propertyKey: 'field1', operator: '=', value: 'value1' },
        { property: null, propertyKey: 'field2', operator: '=', value: 'value2' },
      ]);

      expect(onChange).toHaveBeenCalledWith({
        filter: {
          and: [
            { field: null, op: 'contains', value: 'existing' },
            { field: 'field1', op: 'equals', value: 'value1' },
            { field: 'field2', op: 'equals', value: 'value2' },
          ],
          or: [],
        },
      });
    });
  });

  describe('getQueryActions - updateToken', () => {
    it('should update a token at specific index', () => {
      const onChange = vi.fn();
      const query = {
        tokens: [
          { property: null, operator: ':', value: 'first' },
          { property: null, operator: ':', value: 'second' },
        ],
        operation: 'and',
      };
      const { updateToken } = getQueryActions({ query, onChange, filteringOptions: [] });

      updateToken(1, { property: null, operator: '=', value: 'updated' });

      expect(onChange).toHaveBeenCalledWith({
        filter: {
          and: [
            { field: null, op: 'contains', value: 'first' },
            { field: null, op: 'equals', value: 'updated' },
          ],
          or: [],
        },
      });
    });
  });

  describe('getAutosuggestOptions - nested options', () => {
    const filteringProperties = [
      {
        key: 'protocol',
        propertyLabel: 'Protocol',
        groupValuesLabel: 'Protocol values',
        operators: ['=', '!='],
        defaultOperator: '=',
      },
    ];

    const filteringOptions = [
      { property: filteringProperties[0], propertyKey: 'protocol', value: 'tcp', label: 'TCP' },
      { property: filteringProperties[0], propertyKey: 'protocol', value: 'udp', label: 'UDP' },
      {
        property: filteringProperties[0],
        propertyKey: 'protocol',
        value: 'icmp',
        label: 'ICMP',
        nestedOptions: {
          groupLabel: 'ICMP Types',
          additionalTokenField: 'types-and-codes',
          options: [
            { value: 'echo', label: 'Echo' },
            { value: 'echo-reply', label: 'Echo Reply' },
          ],
        },
      },
    ];

    it('should preserve nestedOptions in value suggestions', () => {
      const parsedText = {
        step: 'property',
        property: filteringProperties[0],
        operator: '=',
        value: '',
      };
      const result = getAutosuggestOptions(parsedText, filteringProperties, filteringOptions);

      // Find the ICMP option
      const icmpOption = result.options[0].options.find(opt => opt.label === 'ICMP');
      expect(icmpOption).toBeDefined();
      expect(icmpOption.nestedOptions).toBeDefined();
      expect(icmpOption.nestedOptions.groupLabel).toBe('ICMP Types');
      expect(icmpOption.originalOption).toBeDefined();
      expect(icmpOption.keepOpenOnSelect).toBe(true);
    });

    it('should not add keepOpenOnSelect for options without nestedOptions', () => {
      const parsedText = {
        step: 'property',
        property: filteringProperties[0],
        operator: '=',
        value: '',
      };
      const result = getAutosuggestOptions(parsedText, filteringProperties, filteringOptions);

      // Find the TCP option (no nested options)
      const tcpOption = result.options[0].options.find(opt => opt.label === 'TCP');
      expect(tcpOption).toBeDefined();
      expect(tcpOption.nestedOptions).toBeUndefined();
      expect(tcpOption.keepOpenOnSelect).toBe(false);
    });
  });

  describe('getAutosuggestOptions - hidden properties', () => {
    const filteringProperties = [
      {
        key: 'status',
        propertyLabel: 'Status',
        operators: ['=', '!='],
        defaultOperator: '=',
      },
      {
        key: 'types-and-codes',
        propertyLabel: 'Types & Codes',
        operators: ['=', '!='],
        defaultOperator: '=',
        hidden: true,
      },
    ];

    it('should not show hidden properties in suggestions', () => {
      const parsedText = { step: 'free-text', value: '' };
      const result = getAutosuggestOptions(parsedText, filteringProperties, []);

      const propertyGroup = result.options.find(g => g.label === 'Properties');
      expect(propertyGroup.options).toHaveLength(1);
      expect(propertyGroup.options[0].label).toBe('Status');
    });
  });
});
