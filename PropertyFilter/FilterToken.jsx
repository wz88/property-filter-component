import React from 'react';
import { Chip, IconButton, Menu, MenuHandler, MenuList, MenuItem } from '@material-tailwind/react';
import { XMarkIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

/**
 * FilterToken component - displays a single filter token
 * @param {Object} props - Component props
 * @param {Object} props.token - Token data with propertyLabel, operator, value
 * @param {number} props.index - Token index
 * @param {boolean} props.showOperation - Whether to show AND/OR operation
 * @param {string} props.operation - Current operation ('and' or 'or')
 * @param {Function} props.onRemove - Remove token handler
 * @param {Function} props.onOperationChange - Operation change handler
 * @param {boolean} props.disabled - Whether the token is disabled
 * @param {boolean} props.readOnlyOperations - Whether operations are read-only
 * @param {Object} props.i18nStrings - Internationalization strings
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
  const {
    operationAndText = 'and',
    operationOrText = 'or',
    removeTokenAriaLabel = 'Remove filter',
  } = i18nStrings;

  const { propertyLabel, operator, value, formattedText } = token;

  // Determine display text
  const isAllProperties = !propertyLabel;
  const isFreeTextContains = operator === ':' && isAllProperties;
  const operatorText = isFreeTextContains ? '' : `${operator} `;
  const displayText = isAllProperties
    ? `${operatorText}${value}`
    : `${propertyLabel} ${operator} ${value}`;

  return (
    <div className="flex items-center gap-1">
      {/* Operation selector (AND/OR) */}
      {showOperation && (
        <div className="mr-1">
          {readOnlyOperations ? (
            <span className="text-xs font-medium text-gray-500 uppercase px-2">
              {operation === 'and' ? operationAndText : operationOrText}
            </span>
          ) : (
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

      {/* Token chip */}
      <Chip
        value={
          <span className="flex items-center gap-1">
            {!isAllProperties && (
              <span className="font-medium">{propertyLabel}</span>
            )}
            {!isFreeTextContains && (
              <span className="text-blue-600 font-semibold">{operator}</span>
            )}
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
          <IconButton
            variant="text"
            size="sm"
            className="!absolute right-1 top-1/2 -translate-y-1/2 rounded-full h-5 w-5 p-0
                       hover:bg-gray-200 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
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
