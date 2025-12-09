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
      
      // Use getAllByText since Status appears in both dropdown and token
      expect(screen.getAllByText('Status').length).toBeGreaterThan(0);
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

  describe('token limit toggle', () => {
    it('should toggle between show more and show fewer', async () => {
      const user = userEvent.setup();
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
      
      // Should show "Show more"
      const showMoreButton = screen.getByText(/Show more/);
      expect(showMoreButton).toBeInTheDocument();
      
      // Click to show all
      await user.click(showMoreButton);
      
      // Should now show "Show fewer"
      expect(screen.getByText(/Show fewer/)).toBeInTheDocument();
    });
  });

  describe('option selection', () => {
    it('should handle keepOpenOnSelect option', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      
      render(<PropertyFilter {...defaultProps} onChange={onChange} />);
      
      const input = screen.getByRole('textbox');
      await user.click(input);
      
      // Click on a property (keepOpenOnSelect)
      await waitFor(() => {
        expect(screen.getByText('Name')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('Name'));
      
      // Input should be updated with the property name
      expect(input).toHaveValue('Name');
    });

    it('should handle empty option value', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      
      render(<PropertyFilter {...defaultProps} onChange={onChange} />);
      
      const input = screen.getByRole('textbox');
      await user.click(input);
      
      // onChange should not be called for empty values
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('onLoadItems', () => {
    it('should call onLoadItems when focusing input', async () => {
      const user = userEvent.setup();
      const onLoadItems = vi.fn();
      
      render(<PropertyFilter {...defaultProps} onLoadItems={onLoadItems} />);
      
      const input = screen.getByRole('textbox');
      await user.click(input);
      
      expect(onLoadItems).toHaveBeenCalledWith(
        expect.objectContaining({
          filteringText: '',
          firstPage: true,
          samePage: false,
        })
      );
    });
  });

  describe('custom filter actions', () => {
    it('should render custom filter actions instead of clear button', () => {
      const query = {
        tokens: [{ propertyKey: 'status', operator: '=', value: 'active' }],
        operation: 'and',
      };
      
      render(
        <PropertyFilter
          {...defaultProps}
          query={query}
          customFilterActions={<button>Custom Action</button>}
        />
      );
      
      expect(screen.getByText('Custom Action')).toBeInTheDocument();
      expect(screen.queryByText('Clear filters')).not.toBeInTheDocument();
    });
  });

  describe('operator step parsing', () => {
    it('should handle operator step when typing property with partial operator', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      
      render(<PropertyFilter {...defaultProps} onChange={onChange} />);
      
      const input = screen.getByRole('textbox');
      // Type property name followed by partial operator
      await user.type(input, 'Name !{Enter}');
      
      // Should create a free text token since operator is incomplete
      expect(onChange).toHaveBeenCalled();
    });
  });

  describe('loading state', () => {
    it('should show loading state', () => {
      render(<PropertyFilter {...defaultProps} loading />);
      
      // Component should render without errors in loading state
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });
  });

  describe('empty token value', () => {
    it('should not create token with empty value', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      
      render(<PropertyFilter {...defaultProps} onChange={onChange} />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, '   {Enter}');
      
      // Should not call onChange for whitespace-only input
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('ref forwarding', () => {
    it('should expose focus method via ref', () => {
      const ref = React.createRef();
      render(<PropertyFilter {...defaultProps} ref={ref} />);
      
      expect(ref.current).toBeDefined();
      expect(typeof ref.current.focus).toBe('function');
    });
  });
});
