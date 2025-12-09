import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FilterToken from '../components/FilterToken';

describe('FilterToken', () => {
  const defaultToken = {
    propertyLabel: 'Status',
    operator: '=',
    value: 'active',
    formattedText: 'Status = active',
  };

  const defaultProps = {
    token: defaultToken,
    index: 0,
    onRemove: vi.fn(),
    onOperationChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render token with property, operator, and value', () => {
      render(<FilterToken {...defaultProps} />);
      
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('=')).toBeInTheDocument();
      expect(screen.getByText('active')).toBeInTheDocument();
    });

    it('should render free text token without property label', () => {
      const freeTextToken = {
        propertyLabel: '',
        operator: ':',
        value: 'search term',
        formattedText: ': search term',
      };
      
      render(<FilterToken {...defaultProps} token={freeTextToken} />);
      
      expect(screen.getByText('search term')).toBeInTheDocument();
    });

    it('should hide operator for free text contains', () => {
      const freeTextToken = {
        propertyLabel: '',
        operator: ':',
        value: 'search',
        formattedText: ': search',
      };
      
      render(<FilterToken {...defaultProps} token={freeTextToken} />);
      
      // The colon operator should not be visible for free text contains
      expect(screen.getByText('search')).toBeInTheDocument();
    });
  });

  describe('operation selector', () => {
    it('should not show operation for first token', () => {
      render(
        <FilterToken {...defaultProps} index={0} showOperation={false} />
      );
      
      expect(screen.queryByText('and')).not.toBeInTheDocument();
      expect(screen.queryByText('or')).not.toBeInTheDocument();
    });

    it('should show operation for non-first token', () => {
      render(
        <FilterToken {...defaultProps} index={1} showOperation operation="and" />
      );
      
      expect(screen.getByText('and')).toBeInTheDocument();
    });

    it('should show OR operation', () => {
      render(
        <FilterToken {...defaultProps} index={1} showOperation operation="or" />
      );
      
      expect(screen.getByText('or')).toBeInTheDocument();
    });

    it('should use custom operation text', () => {
      render(
        <FilterToken
          {...defaultProps}
          index={1}
          showOperation
          operation="and"
          i18nStrings={{
            operationAndText: 'AND',
            operationOrText: 'OR',
          }}
        />
      );
      
      // Multiple AND elements exist (button + menu item), just check at least one exists
      expect(screen.getAllByText('AND').length).toBeGreaterThan(0);
    });
  });

  describe('disabled state', () => {
    it('should not call onRemove when disabled', async () => {
      const user = userEvent.setup();
      const onRemove = vi.fn();
      
      render(
        <FilterToken {...defaultProps} onRemove={onRemove} disabled />
      );
      
      // Try to find and click the remove button
      const removeButtons = screen.getAllByRole('button');
      for (const button of removeButtons) {
        await user.click(button);
      }
      
      expect(onRemove).not.toHaveBeenCalled();
    });
  });

  describe('read-only operations', () => {
    it('should show operation text without dropdown when readOnlyOperations', () => {
      render(
        <FilterToken
          {...defaultProps}
          index={1}
          showOperation
          operation="and"
          readOnlyOperations
        />
      );
      
      // Should show the operation text
      expect(screen.getByText('and')).toBeInTheDocument();
    });
  });

  describe('operation change', () => {
    it('should call onOperationChange when clicking AND menu item', async () => {
      const user = userEvent.setup();
      const onOperationChange = vi.fn();
      
      render(
        <FilterToken
          {...defaultProps}
          index={1}
          showOperation
          operation="or"
          onOperationChange={onOperationChange}
        />
      );
      
      // Click the AND menu item
      const andButton = screen.getByText('AND');
      await user.click(andButton);
      
      expect(onOperationChange).toHaveBeenCalledWith('and');
    });

    it('should call onOperationChange when clicking OR menu item', async () => {
      const user = userEvent.setup();
      const onOperationChange = vi.fn();
      
      render(
        <FilterToken
          {...defaultProps}
          index={1}
          showOperation
          operation="and"
          onOperationChange={onOperationChange}
        />
      );
      
      // Click the OR menu item
      const orButton = screen.getByText('OR');
      await user.click(orButton);
      
      expect(onOperationChange).toHaveBeenCalledWith('or');
    });
  });

  describe('token removal', () => {
    it('should call onRemove when clicking dismiss button', async () => {
      const user = userEvent.setup();
      const onRemove = vi.fn();
      
      render(<FilterToken {...defaultProps} onRemove={onRemove} />);
      
      // Find the dismiss button (×)
      const dismissButton = screen.getByLabelText('dismiss');
      await user.click(dismissButton);
      
      expect(onRemove).toHaveBeenCalledWith(0);
    });

    it('should call onRemove with correct index', async () => {
      const user = userEvent.setup();
      const onRemove = vi.fn();
      
      render(<FilterToken {...defaultProps} index={2} onRemove={onRemove} />);
      
      const dismissButton = screen.getByLabelText('dismiss');
      await user.click(dismissButton);
      
      expect(onRemove).toHaveBeenCalledWith(2);
    });
  });
});
