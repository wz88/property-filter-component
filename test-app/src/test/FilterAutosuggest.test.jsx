import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FilterAutosuggest from '../components/FilterAutosuggest';

describe('FilterAutosuggest', () => {
  const defaultProps = {
    value: '',
    onChange: vi.fn(),
    onOptionSelect: vi.fn(),
    options: [
      {
        label: 'Properties',
        options: [
          { value: 'Name', label: 'Name', keepOpenOnSelect: true },
          { value: 'Status', label: 'Status', keepOpenOnSelect: true },
        ],
      },
      {
        label: 'Values',
        options: [
          { value: 'Status = active', label: 'Active', labelPrefix: 'Status =' },
          { value: 'Status = inactive', label: 'Inactive', labelPrefix: 'Status =', description: 'Not active' },
        ],
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render input with placeholder', () => {
      render(<FilterAutosuggest {...defaultProps} placeholder="Search..." />);
      expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    });

    it('should render disabled input', () => {
      render(<FilterAutosuggest {...defaultProps} disabled />);
      expect(screen.getByRole('textbox')).toBeDisabled();
    });

    it('should render with aria-label', () => {
      render(<FilterAutosuggest {...defaultProps} ariaLabel="Filter input" />);
      expect(screen.getByLabelText('Filter input')).toBeInTheDocument();
    });
  });

  describe('dropdown behavior', () => {
    it('should open dropdown on focus', async () => {
      const user = userEvent.setup();
      render(<FilterAutosuggest {...defaultProps} />);

      const input = screen.getByRole('textbox');
      await user.click(input);

      expect(screen.getByText('Properties')).toBeInTheDocument();
    });

    it('should show loading state', async () => {
      const user = userEvent.setup();
      render(<FilterAutosuggest {...defaultProps} loading loadingText="Loading options..." />);

      const input = screen.getByRole('textbox');
      await user.click(input);

      expect(screen.getByText('Loading options...')).toBeInTheDocument();
    });

    it('should show empty state when no options', async () => {
      const user = userEvent.setup();
      render(
        <FilterAutosuggest
          {...defaultProps}
          options={[]}
          emptyText="No results found"
        />
      );

      const input = screen.getByRole('textbox');
      await user.click(input);

      expect(screen.getByText('No results found')).toBeInTheDocument();
    });

    it('should not open dropdown when disabled', async () => {
      const user = userEvent.setup();
      render(<FilterAutosuggest {...defaultProps} disabled />);

      const input = screen.getByRole('textbox');
      await user.click(input);

      expect(screen.queryByText('Properties')).not.toBeInTheDocument();
    });

    it('should call onLoadItems on focus', async () => {
      const user = userEvent.setup();
      const onLoadItems = vi.fn();
      render(<FilterAutosuggest {...defaultProps} onLoadItems={onLoadItems} />);

      const input = screen.getByRole('textbox');
      await user.click(input);

      expect(onLoadItems).toHaveBeenCalledWith({
        filteringText: '',
        firstPage: true,
        samePage: false,
      });
    });
  });

  describe('keyboard navigation', () => {
    it('should navigate down with ArrowDown', async () => {
      const user = userEvent.setup();
      render(<FilterAutosuggest {...defaultProps} />);

      const input = screen.getByRole('textbox');
      await user.click(input);
      await user.keyboard('{ArrowDown}');

      // First option should be highlighted
      const options = screen.getAllByRole('option');
      expect(options[0]).toHaveAttribute('aria-selected', 'true');
    });

    it('should navigate up with ArrowUp', async () => {
      const user = userEvent.setup();
      render(<FilterAutosuggest {...defaultProps} />);

      const input = screen.getByRole('textbox');
      await user.click(input);
      await user.keyboard('{ArrowDown}{ArrowDown}{ArrowUp}');

      const options = screen.getAllByRole('option');
      expect(options[0]).toHaveAttribute('aria-selected', 'true');
    });

    it('should wrap around when navigating past last option', async () => {
      const user = userEvent.setup();
      render(<FilterAutosuggest {...defaultProps} />);

      const input = screen.getByRole('textbox');
      await user.click(input);
      
      // Navigate past all options
      for (let i = 0; i < 5; i++) {
        await user.keyboard('{ArrowDown}');
      }

      // Should wrap to first
      const options = screen.getAllByRole('option');
      expect(options[0]).toHaveAttribute('aria-selected', 'true');
    });

    it('should wrap around when navigating before first option', async () => {
      const user = userEvent.setup();
      render(<FilterAutosuggest {...defaultProps} />);

      const input = screen.getByRole('textbox');
      await user.click(input);
      await user.keyboard('{ArrowUp}');

      // Should wrap to last
      const options = screen.getAllByRole('option');
      expect(options[options.length - 1]).toHaveAttribute('aria-selected', 'true');
    });

    it('should select highlighted option on Enter', async () => {
      const user = userEvent.setup();
      const onOptionSelect = vi.fn();
      render(<FilterAutosuggest {...defaultProps} onOptionSelect={onOptionSelect} />);

      const input = screen.getByRole('textbox');
      await user.click(input);
      await user.keyboard('{ArrowDown}{Enter}');

      expect(onOptionSelect).toHaveBeenCalled();
    });

    it('should close dropdown on Escape', async () => {
      const user = userEvent.setup();
      render(<FilterAutosuggest {...defaultProps} />);

      const input = screen.getByRole('textbox');
      await user.click(input);
      expect(screen.getByText('Properties')).toBeInTheDocument();

      await user.keyboard('{Escape}');
      expect(screen.queryByText('Properties')).not.toBeInTheDocument();
    });

    it('should close dropdown on Tab', async () => {
      const user = userEvent.setup();
      render(<FilterAutosuggest {...defaultProps} />);

      const input = screen.getByRole('textbox');
      await user.click(input);
      expect(screen.getByText('Properties')).toBeInTheDocument();

      await user.keyboard('{Tab}');
      expect(screen.queryByText('Properties')).not.toBeInTheDocument();
    });

    it('should submit entered text on Enter when no option highlighted', async () => {
      const user = userEvent.setup();
      const onOptionSelect = vi.fn();
      render(
        <FilterAutosuggest
          {...defaultProps}
          value="search term"
          onOptionSelect={onOptionSelect}
        />
      );

      const input = screen.getByRole('textbox');
      await user.click(input);
      await user.keyboard('{Enter}');

      expect(onOptionSelect).toHaveBeenCalledWith({
        value: 'search term',
        isEnteredText: true,
      });
    });
  });

  describe('option selection', () => {
    it('should call onOptionSelect when clicking an option', async () => {
      const user = userEvent.setup();
      const onOptionSelect = vi.fn();
      render(<FilterAutosuggest {...defaultProps} onOptionSelect={onOptionSelect} />);

      const input = screen.getByRole('textbox');
      await user.click(input);

      const option = screen.getByText('Active');
      await user.click(option);

      expect(onOptionSelect).toHaveBeenCalled();
    });

    it('should keep dropdown open for keepOpenOnSelect options', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<FilterAutosuggest {...defaultProps} onChange={onChange} />);

      const input = screen.getByRole('textbox');
      await user.click(input);

      const option = screen.getByText('Name');
      await user.click(option);

      // Dropdown should still be visible
      expect(screen.getByText('Properties')).toBeInTheDocument();
      expect(onChange).toHaveBeenCalledWith('Name');
    });

    it('should render option with description', async () => {
      const user = userEvent.setup();
      render(<FilterAutosuggest {...defaultProps} />);

      const input = screen.getByRole('textbox');
      await user.click(input);

      expect(screen.getByText('Not active')).toBeInTheDocument();
    });

    it('should render option with labelPrefix', async () => {
      const user = userEvent.setup();
      render(<FilterAutosuggest {...defaultProps} />);

      const input = screen.getByRole('textbox');
      await user.click(input);

      // Multiple options have the same prefix, just check at least one exists
      expect(screen.getAllByText('Status =').length).toBeGreaterThan(0);
    });
  });

  describe('filtering', () => {
    it('should filter options based on input', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<FilterAutosuggest {...defaultProps} value="act" onChange={onChange} />);

      const input = screen.getByRole('textbox');
      await user.click(input);

      // Should show Active but filter out others
      expect(screen.getByText('Active')).toBeInTheDocument();
    });
  });

  describe('click outside', () => {
    it('should close dropdown when clicking outside', async () => {
      const user = userEvent.setup();
      render(
        <div>
          <FilterAutosuggest {...defaultProps} />
          <button>Outside</button>
        </div>
      );

      const input = screen.getByRole('textbox');
      await user.click(input);
      expect(screen.getByText('Properties')).toBeInTheDocument();

      const outsideButton = screen.getByText('Outside');
      await user.click(outsideButton);

      await waitFor(() => {
        expect(screen.queryByText('Properties')).not.toBeInTheDocument();
      });
    });
  });

  describe('input change', () => {
    it('should call onChange when typing', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<FilterAutosuggest {...defaultProps} onChange={onChange} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'test');

      expect(onChange).toHaveBeenCalled();
    });
  });
});
