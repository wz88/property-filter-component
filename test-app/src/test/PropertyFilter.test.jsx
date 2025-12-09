import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PropertyFilter from '../components';

describe('PropertyFilter', () => {
  const defaultProps = {
    filteringProperties: [
      {
        key: 'name',
        propertyLabel: 'Name',
        operators: ['=', '!=', ':', '!:'],
        defaultOperator: ':',
      },
      {
        key: 'status',
        propertyLabel: 'Status',
        operators: ['=', '!='],
        defaultOperator: '=',
      },
    ],
    filteringOptions: [
      { propertyKey: 'status', value: 'active', label: 'Active' },
      { propertyKey: 'status', value: 'inactive', label: 'Inactive' },
    ],
    query: { tokens: [], operation: 'and' },
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the filter input', () => {
      render(<PropertyFilter {...defaultProps} />);
      
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
    });

    it('should render with custom placeholder', () => {
      render(
        <PropertyFilter
          {...defaultProps}
          filteringPlaceholder="Search users..."
        />
      );
      
      const input = screen.getByPlaceholderText('Search users...');
      expect(input).toBeInTheDocument();
    });

    it('should render disabled state', () => {
      render(<PropertyFilter {...defaultProps} disabled />);
      
      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
    });

    it('should render existing tokens', () => {
      const query = {
        tokens: [
          { propertyKey: 'status', operator: '=', value: 'active' },
        ],
        operation: 'and',
      };
      
      render(<PropertyFilter {...defaultProps} query={query} />);
      
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('active')).toBeInTheDocument();
    });

    it('should render count text when tokens exist', () => {
      const query = {
        tokens: [{ propertyKey: 'status', operator: '=', value: 'active' }],
        operation: 'and',
      };
      
      render(
        <PropertyFilter {...defaultProps} query={query} countText="5 matches" />
      );
      
      expect(screen.getByText('5 matches')).toBeInTheDocument();
    });

    it('should render constraint text', () => {
      render(
        <PropertyFilter
          {...defaultProps}
          filteringConstraintText="Use property:value format"
        />
      );
      
      expect(screen.getByText('Use property:value format')).toBeInTheDocument();
    });
  });

  describe('input behavior', () => {
    it('should update input value on type', async () => {
      const user = userEvent.setup();
      render(<PropertyFilter {...defaultProps} />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'test');
      
      expect(input).toHaveValue('test');
    });

    it('should show dropdown on focus', async () => {
      const user = userEvent.setup();
      render(<PropertyFilter {...defaultProps} />);
      
      const input = screen.getByRole('textbox');
      await user.click(input);
      
      // Should show property suggestions
      await waitFor(() => {
        expect(screen.getByText('Properties')).toBeInTheDocument();
      });
    });

    it('should show property suggestions', async () => {
      const user = userEvent.setup();
      render(<PropertyFilter {...defaultProps} />);
      
      const input = screen.getByRole('textbox');
      await user.click(input);
      
      await waitFor(() => {
        expect(screen.getByText('Name')).toBeInTheDocument();
        expect(screen.getByText('Status')).toBeInTheDocument();
      });
    });
  });

  describe('token creation', () => {
    it('should create token on Enter with free text', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      
      render(<PropertyFilter {...defaultProps} onChange={onChange} />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'search term{Enter}');
      
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          tokens: expect.arrayContaining([
            expect.objectContaining({
              operator: ':',
              value: 'search term',
            }),
          ]),
        })
      );
    });

    it('should create property token', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      
      render(<PropertyFilter {...defaultProps} onChange={onChange} />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'Status = active{Enter}');
      
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          tokens: expect.arrayContaining([
            expect.objectContaining({
              propertyKey: 'status',
              operator: '=',
              value: 'active',
            }),
          ]),
        })
      );
    });

    it('should clear input after token creation', async () => {
      const user = userEvent.setup();
      render(<PropertyFilter {...defaultProps} />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'test{Enter}');
      
      expect(input).toHaveValue('');
    });
  });

  describe('token removal', () => {
    it('should call onChange when clear all is clicked', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const query = {
        tokens: [
          { propertyKey: 'status', operator: '=', value: 'active' },
        ],
        operation: 'and',
      };
      
      render(
        <PropertyFilter {...defaultProps} query={query} onChange={onChange} />
      );
      
      const clearButton = screen.getByText('Clear filters');
      await user.click(clearButton);
      
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          tokens: [],
        })
      );
    });
  });

  describe('operation toggle', () => {
    it('should render operation selector between tokens', () => {
      const query = {
        tokens: [
          { propertyKey: 'status', operator: '=', value: 'active' },
          { propertyKey: 'name', operator: ':', value: 'john' },
        ],
        operation: 'and',
      };
      
      render(<PropertyFilter {...defaultProps} query={query} />);
      
      expect(screen.getByText('AND')).toBeInTheDocument();
    });

    it('should hide operations when hideOperations is true', () => {
      const query = {
        tokens: [
          { propertyKey: 'status', operator: '=', value: 'active' },
          { propertyKey: 'name', operator: ':', value: 'john' },
        ],
        operation: 'and',
      };
      
      render(
        <PropertyFilter {...defaultProps} query={query} hideOperations />
      );
      
      expect(screen.queryByText('AND')).not.toBeInTheDocument();
    });
  });

  describe('token limit', () => {
    it('should show "Show more" when tokens exceed limit', () => {
      const query = {
        tokens: [
          { propertyKey: 'status', operator: '=', value: 'active' },
          { propertyKey: 'name', operator: ':', value: 'john' },
          { propertyKey: 'name', operator: ':', value: 'jane' },
        ],
        operation: 'and',
      };
      
      render(
        <PropertyFilter {...defaultProps} query={query} tokenLimit={2} />
      );
      
      expect(screen.getByText(/Show more/)).toBeInTheDocument();
    });
  });

  describe('free text filtering', () => {
    it('should not create free text token when disabled', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      
      render(
        <PropertyFilter
          {...defaultProps}
          onChange={onChange}
          disableFreeTextFiltering
        />
      );
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'free text{Enter}');
      
      // Should not call onChange for free text when disabled
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('custom control', () => {
    it('should render custom control', () => {
      render(
        <PropertyFilter
          {...defaultProps}
          customControl={<button>Custom</button>}
        />
      );
      
      expect(screen.getByText('Custom')).toBeInTheDocument();
    });
  });

  describe('i18n', () => {
    it('should use custom i18n strings', () => {
      const query = {
        tokens: [{ propertyKey: 'status', operator: '=', value: 'active' }],
        operation: 'and',
      };
      
      render(
        <PropertyFilter
          {...defaultProps}
          query={query}
          i18nStrings={{
            clearFiltersText: 'Remove all',
          }}
        />
      );
      
      expect(screen.getByText('Remove all')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have aria-label on input', () => {
      render(
        <PropertyFilter {...defaultProps} filteringAriaLabel="Filter users" />
      );
      
      const input = screen.getByLabelText('Filter users');
      expect(input).toBeInTheDocument();
    });
  });
});
