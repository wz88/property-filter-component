/**
 * =============================================================================
 * FilterToken.jsx - Individual Filter Chip/Tag Component
 * =============================================================================
 * 
 * This component renders a single filter token as a chip/tag. Each token
 * represents one active filter condition (e.g., "Status = active").
 * 
 * VISUAL STRUCTURE:
 * -----------------
 * For tokens after the first one:
 * ┌─────┐ ┌──────────────────────────────┐
 * │ AND │ │ Status  =  active        [×] │
 * └─────┘ └──────────────────────────────┘
 *    ↑           ↑    ↑     ↑          ↑
 *    │           │    │     │          └─ Remove button
 *    │           │    │     └─ Value
 *    │           │    └─ Operator (highlighted)
 *    │           └─ Property label
 *    └─ Operation selector (AND/OR dropdown)
 * 
 * For free-text tokens (no property):
 * ┌──────────────────────────────┐
 * │ : searchterm             [×] │
 * └──────────────────────────────┘
 * 
 * FEATURES:
 * ---------
 * - AND/OR operation selector (dropdown or read-only text)
 * - Property label + operator + value display
 * - Remove button (X) to delete the token
 * - Disabled state support
 * - Customizable via i18nStrings
 * 
 * TO CUSTOMIZE STYLING:
 * ---------------------
 * - Chip appearance: Modify className on <Chip> component
 * - Operation button: Modify className on the button element
 * - Colors: Change text-blue-600, bg-gray-100, etc.
 */

import React from 'react';
import { Chip, IconButton, Menu, MenuHandler, MenuList, MenuItem } from '@material-tailwind/react';
import { XMarkIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

/**
 * FilterToken - Displays a single filter as a removable chip.
 * 
 * @param {Object} token - Token data { propertyLabel, operator, value }
 * @param {number} index - Token's position in the array (for removal)
 * @param {boolean} showOperation - Show AND/OR selector (false for first token)
 * @param {string} operation - Current operation: 'and' or 'or'
 * @param {Function} onRemove - Called with index when remove button clicked
 * @param {Function} onOperationChange - Called with new operation when changed
 * @param {boolean} disabled - Disable interactions
 * @param {boolean} readOnlyOperations - Show operation as text, not dropdown
 * @param {Object} i18nStrings - Localization strings
 */
export default function FilterToken({
  token,
  index,
  showOperation = false,
  operation = 'and',
  onRemove,
  onOperationChange,
  disabled = false,
  readOnlyOperations = false,
  i18nStrings = {},
}) {
  // Extract localized strings with defaults
  const {
    operationAndText = 'and',
    operationOrText = 'or',
    removeTokenAriaLabel = 'Remove filter',
  } = i18nStrings;

  // Destructure token data
  const { propertyLabel, operator, value, formattedText } = token;

  // ==========================================================================
  // DISPLAY LOGIC
  // ==========================================================================
  
  /**
   * Determine how to display the token based on its type:
   * - Property filter: "Status = active"
   * - Free text contains: "searchterm" (hide the : operator)
   * - Free text other: "!: searchterm"
   */
  const isAllProperties = !propertyLabel;  // No property = free text search
  const isFreeTextContains = operator === ':' && isAllProperties;
  
  // For free text "contains", hide the operator for cleaner display
  const operatorText = isFreeTextContains ? '' : `${operator} `;
  const displayText = isAllProperties
    ? `${operatorText}${value}`
    : `${propertyLabel} ${operator} ${value}`;

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="flex items-center gap-1">
      {/* ================================================================
          OPERATION SELECTOR (AND/OR)
          Shown between tokens (not on first token)
          ================================================================ */}
      {showOperation && (
        <div className="mr-1">
          {readOnlyOperations ? (
            // READ-ONLY: Just display the operation text
            <span className="text-xs font-medium text-gray-500 uppercase px-2">
              {operation === 'and' ? operationAndText : operationOrText}
            </span>
          ) : (
            // INTERACTIVE: Dropdown to change operation
            <Menu placement="bottom-start">
              <MenuHandler>
                <button
                  className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900 
                             bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition-colors uppercase"
                  disabled={disabled}
                >
                  {operation === 'and' ? operationAndText : operationOrText}
                  <ChevronDownIcon className="h-3 w-3" />
                </button>
              </MenuHandler>
              <MenuList className="min-w-[80px]">
                <MenuItem
                  onClick={() => onOperationChange?.('and')}
                  className={operation === 'and' ? 'bg-blue-50' : ''}
                >
                  {operationAndText.toUpperCase()}
                </MenuItem>
                <MenuItem
                  onClick={() => onOperationChange?.('or')}
                  className={operation === 'or' ? 'bg-blue-50' : ''}
                >
                  {operationOrText.toUpperCase()}
                </MenuItem>
              </MenuList>
            </Menu>
          )}
        </div>
      )}

      {/* ================================================================
          TOKEN CHIP
          The main filter display with property, operator, value, and remove
          ================================================================ */}
      <Chip
        value={
          <span className="flex items-center gap-1">
            {/* Property label (hidden for free text) */}
            {!isAllProperties && (
              <span className="font-medium">{propertyLabel}</span>
            )}
            {/* Operator (hidden for free text "contains") */}
            {!isFreeTextContains && (
              <span className="text-blue-600 font-semibold">{operator}</span>
            )}
            {/* Value */}
            <span>{value}</span>
          </span>
        }
        variant="outlined"
        className="rounded-full border-gray-300 bg-white py-1.5 px-3 text-sm font-normal text-gray-700
                   hover:border-gray-400 transition-colors"
        dismissible={{
          onClose: () => !disabled && onRemove?.(index),
        }}
        icon={
          // REMOVE BUTTON (X icon)
          <IconButton
            variant="text"
            size="sm"
            className="!absolute right-1 top-1/2 -translate-y-1/2 rounded-full h-5 w-5 p-0
                       hover:bg-gray-200 transition-colors"
            onClick={(e) => {
              e.stopPropagation(); // Prevent chip click
              if (!disabled) onRemove?.(index);
            }}
            disabled={disabled}
            aria-label={removeTokenAriaLabel}
          >
            <XMarkIcon className="h-3.5 w-3.5 text-gray-500" />
          </IconButton>
        }
      />
    </div>
  );
}
