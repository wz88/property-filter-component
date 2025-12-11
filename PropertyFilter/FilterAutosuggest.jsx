/**
 * =============================================================================
 * FilterAutosuggest.jsx - Input with Dropdown Suggestions
 * =============================================================================
 * 
 * This component provides the main input field for the PropertyFilter with
 * an autocomplete dropdown. It handles:
 * 
 * - Text input with change tracking
 * - Dropdown display with grouped options
 * - Keyboard navigation (arrow keys, Enter, Escape)
 * - Option selection with different behaviors (keepOpenOnSelect)
 * - Free text entry ("Use: text" option)
 * - Loading and empty states
 * 
 * OPTION TYPES:
 * -------------
 * Options can have special behaviors:
 * - keepOpenOnSelect: true - Clicking updates input but keeps dropdown open
 *   Used for property/operator selection where user continues typing
 * - isEnteredText: true - Marks option as free text entry
 *   Used for the "Use: text" option
 * 
 * KEYBOARD NAVIGATION:
 * --------------------
 * - ArrowDown/Up: Navigate through options
 * - Enter: Select highlighted option OR submit free text
 * - Escape: Close dropdown
 * - Tab: Close dropdown and move focus
 * 
 * TO CUSTOMIZE:
 * -------------
 * - Styling: Modify className props on Input, ListItem, etc.
 * - Behavior: Modify handleKeyDown for different keyboard handling
 * - Display: Modify the JSX in the render section
 */

import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Input, List, ListItem, Typography, Spinner } from '@material-tailwind/react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

/**
 * FilterAutosuggest - Autocomplete input for property filtering.
 * 
 * @param {string} value - Current input value (controlled)
 * @param {Function} onChange - Called when input value changes
 * @param {Function} onOptionSelect - Called when user selects an option
 * @param {Array} options - Grouped options: [{ label: 'Group', options: [...] }]
 * @param {string} filterText - Text to filter options by (may differ from value)
 * @param {string} placeholder - Input placeholder text
 * @param {string} ariaLabel - Accessibility label
 * @param {boolean} disabled - Disable the input
 * @param {boolean} loading - Show loading spinner
 * @param {string} loadingText - Text shown during loading
 * @param {string} emptyText - Text shown when no options match
 * @param {Function} onLoadItems - Called to load options (async support)
 * @param {Object} i18nStrings - Localization strings
 */
const FilterAutosuggest = forwardRef(function FilterAutosuggest({
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
}, ref) {
  // ==========================================================================
  // LOCAL STATE
  // ==========================================================================
  
  const [isOpen, setIsOpen] = useState(false);           // Dropdown visibility
  const [highlightedIndex, setHighlightedIndex] = useState(-1); // Keyboard nav index
  const inputRef = useRef(null);   // Reference to input container
  const dropdownRef = useRef(null); // Reference to dropdown for click-outside

  /**
   * Expose focus() method to parent via ref.
   * Allows PropertyFilter to focus this input programmatically.
   */
  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus?.(),
  }), []);

  // Extract i18n string for free text option label
  const { enteredTextLabel = (text) => `Use: "${text}"` } = i18nStrings;

  // ==========================================================================
  // COMPUTED VALUES
  // ==========================================================================

  /**
   * Filter options based on filterText.
   * Only shows options whose label or value contains the search text.
   * Groups with no matching options are removed entirely.
   */
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

  // ==========================================================================
  // EVENT HANDLERS
  // ==========================================================================

  /**
   * Handle input text changes.
   * Opens dropdown and resets keyboard navigation.
   */
  const handleInputChange = (e) => {
    const newValue = e.target.value;
    onChange?.(newValue);
    setIsOpen(true);
    setHighlightedIndex(-1); // Reset highlight when typing
  };

  /**
   * Helper to focus the actual input element.
   * Material Tailwind wraps inputs, so we may need to find the real input.
   */
  const focusInput = () => {
    const input = inputRef.current?.querySelector?.('input') || inputRef.current;
    input?.focus?.();
  };

  /**
   * Handle option click/selection.
   * 
   * BEHAVIOR DEPENDS ON OPTION TYPE:
   * - keepOpenOnSelect: true - Update input, keep dropdown open
   *   Used for property/operator selection (user continues typing)
   * - keepOpenOnSelect: false - Select option, close dropdown
   *   Used for value selection (filter is complete)
   */
  const handleOptionClick = (option, e) => {
    if (option.keepOpenOnSelect) {
      // Property/operator selection - update input but keep dropdown open
      e?.preventDefault();
      e?.stopPropagation(); // Prevent click from bubbling to document
      // For nested options, don't call onChange - let onOptionSelect handle the text
      // This prevents the pending selection from being cleared
      if (!option.nestedOptions) {
        onChange?.(option.value);
      }
      onOptionSelect?.({ ...option, preventDefault: () => {} });
      // Don't refocus for nested options - it can cause issues
      if (!option.nestedOptions) {
        setTimeout(focusInput, 10); // Refocus after React updates
      }
    } else {
      // Value selection - complete the filter
      onOptionSelect?.(option);
      setIsOpen(false);
      setTimeout(focusInput, 10);
    }
  };

  /**
   * Handle keyboard navigation.
   * 
   * SUPPORTED KEYS:
   * - ArrowDown: Move highlight down (wraps to top)
   * - ArrowUp: Move highlight up (wraps to bottom)
   * - Enter: Select highlighted option OR submit free text
   * - Escape: Close dropdown
   * - Tab: Close dropdown (default tab behavior continues)
   */
  const handleKeyDown = (e) => {
    // Flatten grouped options for keyboard navigation
    const flatOptions = filteredOptions.reduce((acc, group) => {
      return [...acc, ...(group.options || [])];
    }, []);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setIsOpen(true);
        // Move down, wrap to top if at end
        setHighlightedIndex(prev =>
          prev < flatOptions.length - 1 ? prev + 1 : 0
        );
        break;

      case 'ArrowUp':
        e.preventDefault();
        // Move up, wrap to bottom if at start
        setHighlightedIndex(prev =>
          prev > 0 ? prev - 1 : flatOptions.length - 1
        );
        break;

      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && flatOptions[highlightedIndex]) {
          // Select highlighted option
          handleOptionClick(flatOptions[highlightedIndex], e);
        } else if (value.trim()) {
          // No option highlighted - submit as free text
          onOptionSelect?.({ value: value.trim(), isEnteredText: true });
          setIsOpen(false);
        }
        break;

      case 'Escape':
        // Close dropdown without selecting
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;

      case 'Tab':
        // Close dropdown, let default tab behavior continue
        setIsOpen(false);
        break;

      default:
        break;
    }
  };

  // ==========================================================================
  // EFFECTS
  // ==========================================================================

  /**
   * Close dropdown when clicking outside.
   * Listens for mousedown events on the document.
   */
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

  /**
   * Handle input focus - open dropdown and trigger load.
   */
  const handleFocus = () => {
    setIsOpen(true);
    // Notify parent to load options (for async loading)
    onLoadItems?.({ filteringText: value, firstPage: true, samePage: false });
  };

  // ==========================================================================
  // DISPLAY HELPERS
  // ==========================================================================

  // Check if there are any options to display
  const hasOptions = filteredOptions.some(group => group.options?.length > 0);
  
  /**
   * Determine whether to show the "Use: text" free text option.
   * 
   * Show it when:
   * - User has typed something (value.trim())
   * - Input is not disabled
   * - No keepOpenOnSelect options are showing (those are property/operator selections)
   * 
   * This prevents showing "Use: Status" when user is selecting a property.
   */
  const hasKeepOpenOptions = filteredOptions.some(group => 
    group.options?.some(opt => opt.keepOpenOnSelect)
  );
  const showEnteredTextOption = value.trim() && !disabled && !hasKeepOpenOptions;

  // ==========================================================================
  // RENDER
  // ==========================================================================
  //
  // STRUCTURE:
  // ┌─────────────────────────────────────────┐
  // │ [🔍] [Input field.....................]  │
  // └─────────────────────────────────────────┘
  // ┌─────────────────────────────────────────┐
  // │ Use: "typed text"                       │  ← Free text option
  // ├─────────────────────────────────────────┤
  // │ PROPERTIES                              │  ← Group header
  // │   Status                                │
  // │   Name                                  │
  // ├─────────────────────────────────────────┤
  // │ VALUES                                  │  ← Group header
  // │   Status = active                       │
  // │   Status = inactive                     │
  // └─────────────────────────────────────────┘

  return (
    <div className="relative w-full">
      {/* INPUT FIELD with search icon */}
      <div className="relative" ref={inputRef}>
        <Input
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
      {isOpen && !disabled && (hasOptions || showEnteredTextOption || !value.trim()) && (
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
              {/* Entered text option - for free text filtering */}
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

              {/* Empty state - only show when no value typed (not for free text filtering) */}
              {!hasOptions && !value.trim() && (
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
});

export default FilterAutosuggest;
