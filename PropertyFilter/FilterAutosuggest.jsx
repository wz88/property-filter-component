import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Input, List, ListItem, Typography, Spinner } from '@material-tailwind/react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

/**
 * FilterAutosuggest component - input with dropdown suggestions
 * @param {Object} props - Component props
 * @param {string} props.value - Current input value
 * @param {Function} props.onChange - Value change handler
 * @param {Function} props.onOptionSelect - Option selection handler
 * @param {Array} props.options - Grouped options for suggestions
 * @param {string} props.filterText - Text to filter options
 * @param {string} props.placeholder - Input placeholder
 * @param {string} props.ariaLabel - Aria label for input
 * @param {boolean} props.disabled - Whether input is disabled
 * @param {boolean} props.loading - Whether options are loading
 * @param {string} props.loadingText - Loading state text
 * @param {string} props.emptyText - Empty state text
 * @param {Function} props.onLoadItems - Load more items handler
 * @param {Object} props.i18nStrings - Internationalization strings
 */
export default function FilterAutosuggest({
  value = '',
  onChange,
  onOptionSelect,
  options = [],
  filterText = '',
  placeholder = 'Filter by property or value',
  ariaLabel = 'Property filter',
  disabled = false,
  loading = false,
  loadingText = 'Loading...',
  emptyText = 'No matches found',
  onLoadItems,
  i18nStrings = {},
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  const { enteredTextLabel = (text) => `Use: "${text}"` } = i18nStrings;

  // Flatten options for keyboard navigation
  const flattenedOptions = options.reduce((acc, group) => {
    if (group.options) {
      return [...acc, ...group.options.map(opt => ({ ...opt, groupLabel: group.label }))];
    }
    return acc;
  }, []);

  // Filter options based on filterText
  const filteredOptions = filterText
    ? options.map(group => ({
        ...group,
        options: group.options?.filter(opt => {
          const searchText = filterText.toLowerCase();
          return (
            opt.label?.toLowerCase().includes(searchText) ||
            opt.value?.toLowerCase().includes(searchText)
          );
        }),
      })).filter(group => group.options?.length > 0)
    : options;

  // Handle input change
  const handleInputChange = (e) => {
    const newValue = e.target.value;
    onChange?.(newValue);
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  // Handle option selection
  const handleOptionClick = (option, e) => {
    if (option.keepOpenOnSelect) {
      e?.preventDefault();
      onChange?.(option.value);
      onOptionSelect?.({ ...option, preventDefault: () => {} });
    } else {
      onOptionSelect?.(option);
      setIsOpen(false);
    }
    inputRef.current?.focus();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    const flatOptions = filteredOptions.reduce((acc, group) => {
      return [...acc, ...(group.options || [])];
    }, []);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setIsOpen(true);
        setHighlightedIndex(prev =>
          prev < flatOptions.length - 1 ? prev + 1 : 0
        );
        break;

      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev > 0 ? prev - 1 : flatOptions.length - 1
        );
        break;

      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && flatOptions[highlightedIndex]) {
          handleOptionClick(flatOptions[highlightedIndex], e);
        } else if (value.trim()) {
          onOptionSelect?.({ value: value.trim(), isEnteredText: true });
          setIsOpen(false);
        }
        break;

      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;

      case 'Tab':
        setIsOpen(false);
        break;

      default:
        break;
    }
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        !inputRef.current?.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus handler
  const handleFocus = () => {
    setIsOpen(true);
    onLoadItems?.({ filteringText: value, firstPage: true, samePage: false });
  };

  const hasOptions = filteredOptions.some(group => group.options?.length > 0);
  const showEnteredTextOption = value.trim() && !disabled;

  return (
    <div className="relative w-full">
      {/* Input field */}
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          aria-label={ariaLabel}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          className="!border-gray-300 focus:!border-blue-500 pr-10"
          labelProps={{ className: 'hidden' }}
          containerProps={{ className: 'min-w-0' }}
          icon={<MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />}
        />
      </div>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg 
                     max-h-80 overflow-y-auto"
          role="listbox"
        >
          {loading ? (
            <div className="flex items-center justify-center py-4 gap-2">
              <Spinner className="h-5 w-5" />
              <span className="text-gray-500 text-sm">{loadingText}</span>
            </div>
          ) : (
            <>
              {/* Entered text option */}
              {showEnteredTextOption && (
                <ListItem
                  className="py-2 px-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100"
                  onClick={(e) => {
                    onOptionSelect?.({ value: value.trim(), isEnteredText: true });
                    setIsOpen(false);
                  }}
                >
                  <Typography variant="small" className="text-blue-600 font-medium">
                    {enteredTextLabel(value.trim())}
                  </Typography>
                </ListItem>
              )}

              {/* Grouped options */}
              {filteredOptions.map((group, groupIndex) => (
                <div key={group.label || groupIndex}>
                  {group.label && (
                    <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                      <Typography variant="small" className="font-semibold text-gray-600 uppercase text-xs">
                        {group.label}
                      </Typography>
                    </div>
                  )}
                  <List className="p-0">
                    {group.options?.map((option, optionIndex) => {
                      const flatIndex = filteredOptions
                        .slice(0, groupIndex)
                        .reduce((acc, g) => acc + (g.options?.length || 0), 0) + optionIndex;

                      return (
                        <ListItem
                          key={option.value || optionIndex}
                          className={`py-2 px-3 cursor-pointer transition-colors
                            ${highlightedIndex === flatIndex ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                          onClick={(e) => handleOptionClick(option, e)}
                          role="option"
                          aria-selected={highlightedIndex === flatIndex}
                        >
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1">
                              {option.labelPrefix && (
                                <Typography variant="small" className="text-gray-500">
                                  {option.labelPrefix}
                                </Typography>
                              )}
                              <Typography variant="small" className="font-medium text-gray-900">
                                {option.label || option.value}
                              </Typography>
                            </div>
                            {option.description && (
                              <Typography variant="small" className="text-gray-500 text-xs">
                                {option.description}
                              </Typography>
                            )}
                          </div>
                        </ListItem>
                      );
                    })}
                  </List>
                </div>
              ))}

              {/* Empty state */}
              {!hasOptions && !showEnteredTextOption && (
                <div className="py-4 px-3 text-center">
                  <Typography variant="small" className="text-gray-500">
                    {emptyText}
                  </Typography>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
