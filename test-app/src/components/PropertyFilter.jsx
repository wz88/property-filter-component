import React, { useState, useRef, useImperativeHandle, forwardRef, useMemo, useCallback } from 'react';
import { Button, Typography } from '@material-tailwind/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

import FilterAutosuggest from './FilterAutosuggest';
import FilterToken from './FilterToken';
import { getQueryActions, parseText, getAutosuggestOptions, formatToken } from './controller';
import { getAllowedOperators, generateId } from './utils';

/**
 * Default i18n strings
 */
const defaultI18nStrings = {
  filteringAriaLabel: 'Filter',
  filteringPlaceholder: 'Filter by property or value',
  groupPropertiesText: 'Properties',
  groupValuesText: 'Values',
  operatorsText: 'Operators',
  operationAndText: 'and',
  operationOrText: 'or',
  clearFiltersText: 'Clear filters',
  removeTokenAriaLabel: 'Remove filter',
  tokenLimitShowMore: 'Show more',
  tokenLimitShowFewer: 'Show fewer',
  enteredTextLabel: (text) => `Use: "${text}"`,
  allPropertiesLabel: 'All properties',
};

/**
 * PropertyFilter component - A powerful filtering component for tables and lists
 * 
 * @param {Object} props - Component props
 * @param {Array} props.filteringProperties - Array of filterable properties
 * @param {Array} props.filteringOptions - Array of available filter options
 * @param {Object} props.query - Current query state { tokens: [], operation: 'and' | 'or' }
 * @param {Function} props.onChange - Query change handler
 * @param {boolean} props.disabled - Disable the filter
 * @param {boolean} props.disableFreeTextFiltering - Disable free text filtering
 * @param {boolean} props.hideOperations - Hide AND/OR operations
 * @param {boolean} props.readOnlyOperations - Make operations read-only
 * @param {number} props.tokenLimit - Maximum visible tokens before "show more"
 * @param {string} props.countText - Result count text (e.g., "25 matches")
 * @param {boolean} props.loading - Loading state
 * @param {Object} props.i18nStrings - Internationalization strings
 * @param {React.ReactNode} props.customControl - Custom control slot (before input)
 * @param {React.ReactNode} props.customFilterActions - Custom filter actions slot
 * @param {string} props.filteringPlaceholder - Input placeholder
 * @param {string} props.filteringAriaLabel - Input aria label
 * @param {React.ReactNode} props.filteringEmpty - Empty state content
 * @param {string} props.filteringLoadingText - Loading text
 * @param {React.ReactNode} props.filteringConstraintText - Constraint text below input
 * @param {Function} props.onLoadItems - Load items handler for async options
 * @param {string} props.className - Additional CSS classes
 */
const PropertyFilter = forwardRef(function PropertyFilter(
  {
    filteringProperties = [],
    filteringOptions = [],
    query = { tokens: [], operation: 'and' },
    onChange,
    disabled = false,
    disableFreeTextFiltering = false,
    hideOperations = false,
    readOnlyOperations = false,
    tokenLimit,
    countText,
    loading = false,
    i18nStrings: userI18nStrings = {},
    customControl,
    customFilterActions,
    filteringPlaceholder,
    filteringAriaLabel,
    filteringEmpty,
    filteringLoadingText,
    filteringConstraintText,
    onLoadItems,
    className = '',
    ...rest
  },
  ref
) {
  const inputRef = useRef(null);
  const [filteringText, setFilteringText] = useState('');
  const [showAllTokens, setShowAllTokens] = useState(false);

  // Merge i18n strings
  const i18nStrings = useMemo(
    () => ({ ...defaultI18nStrings, ...userI18nStrings }),
    [userI18nStrings]
  );

  // Expose focus method
  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus?.(),
  }), []);

  // Process filtering properties to internal format
  const internalProperties = useMemo(() => {
    return filteringProperties.map(property => ({
      ...property,
      key: property.key,
      propertyLabel: property.propertyLabel || property.key,
      groupValuesLabel: property.groupValuesLabel || i18nStrings.groupValuesText,
      operators: (property.operators || ['=', '!=']).map(op =>
        typeof op === 'string' ? op : op.operator
      ),
      defaultOperator: property.defaultOperator || '=',
      getValueFormatter: (operator) => {
        const extOp = (property.operators || []).find(
          op => typeof op === 'object' && op.operator === operator
        );
        return extOp?.format || null;
      },
    }));
  }, [filteringProperties, i18nStrings.groupValuesText]);

  // Process filtering options to internal format
  const internalOptions = useMemo(() => {
    return filteringOptions.map(option => ({
      ...option,
      property: internalProperties.find(p => p.key === option.propertyKey) || null,
      label: option.label || option.value || '',
    }));
  }, [filteringOptions, internalProperties]);

  // Free text filtering config
  const freeTextFiltering = useMemo(() => ({
    disabled: disableFreeTextFiltering,
    operators: [':', '!:'],
    defaultOperator: ':',
  }), [disableFreeTextFiltering]);

  // Internal query with property references
  const internalQuery = useMemo(() => ({
    operation: query.operation || 'and',
    tokens: (query.tokens || []).map(token => ({
      ...token,
      property: token.propertyKey
        ? internalProperties.find(p => p.key === token.propertyKey) || null
        : null,
    })),
  }), [query, internalProperties]);

  // Query actions
  const { addToken, updateToken, updateOperation, removeToken, removeAllTokens } = useMemo(
    () => getQueryActions({
      query: internalQuery,
      onChange: (newQuery) => onChange?.(newQuery),
      filteringOptions: internalOptions,
    }),
    [internalQuery, onChange, internalOptions]
  );

  // Parse current text
  const parsedText = useMemo(
    () => parseText(filteringText, internalProperties, freeTextFiltering),
    [filteringText, internalProperties, freeTextFiltering]
  );

  // Get autosuggest options
  const autosuggestOptions = useMemo(
    () => getAutosuggestOptions(parsedText, internalProperties, internalOptions, i18nStrings),
    [parsedText, internalProperties, internalOptions, i18nStrings]
  );

  // Create token from text
  const createToken = useCallback((currentText) => {
    const parsed = parseText(currentText, internalProperties, freeTextFiltering);
    let newToken;

    switch (parsed.step) {
      case 'property':
        newToken = {
          property: parsed.property,
          propertyKey: parsed.property.key,
          operator: parsed.operator,
          value: parsed.value,
        };
        break;

      case 'free-text':
        if (freeTextFiltering.disabled) return;
        newToken = {
          property: null,
          propertyKey: undefined,
          operator: parsed.operator || freeTextFiltering.defaultOperator,
          value: parsed.value,
        };
        break;

      case 'operator':
        if (freeTextFiltering.disabled) return;
        newToken = {
          property: null,
          propertyKey: undefined,
          operator: freeTextFiltering.defaultOperator,
          value: currentText,
        };
        break;

      default:
        return;
    }

    if (newToken.value?.trim()) {
      addToken(newToken);
      setFilteringText('');
    }
  }, [internalProperties, freeTextFiltering, addToken]);

  // Handle option selection
  const handleOptionSelect = useCallback((option) => {
    if (!option.value) return;

    if (option.isEnteredText) {
      createToken(option.value);
      return;
    }

    if (option.keepOpenOnSelect) {
      setFilteringText(option.value);
      return;
    }

    createToken(option.value);
  }, [createToken]);

  // Handle load items
  const handleLoadItems = useCallback((detail) => {
    const parsed = parseText(detail.filteringText, internalProperties, freeTextFiltering);
    const loadDetail = {
      filteringText: detail.filteringText,
      filteringProperty: parsed.step === 'property' ? parsed.property : undefined,
      filteringOperator: parsed.step === 'property' ? parsed.operator : undefined,
      firstPage: detail.firstPage,
      samePage: detail.samePage,
    };
    onLoadItems?.(loadDetail);
  }, [internalProperties, freeTextFiltering, onLoadItems]);

  // Format tokens for display
  const formattedTokens = useMemo(() => {
    return internalQuery.tokens.map(token => formatToken(token, internalProperties));
  }, [internalQuery.tokens, internalProperties]);

  // Token visibility
  const visibleTokens = useMemo(() => {
    if (!tokenLimit || showAllTokens) return formattedTokens;
    return formattedTokens.slice(0, tokenLimit);
  }, [formattedTokens, tokenLimit, showAllTokens]);

  const hasHiddenTokens = tokenLimit && formattedTokens.length > tokenLimit;
  const hiddenCount = formattedTokens.length - (tokenLimit || 0);

  return (
    <div className={`property-filter ${className}`} {...rest}>
      {/* Search field row */}
      <div className="flex items-center gap-2">
        {/* Custom control slot */}
        {customControl && (
          <div className="flex-shrink-0">{customControl}</div>
        )}

        {/* Input wrapper */}
        <div className="flex-1 relative">
          <FilterAutosuggest
            ref={inputRef}
            value={filteringText}
            onChange={setFilteringText}
            onOptionSelect={handleOptionSelect}
            options={autosuggestOptions.options}
            filterText={autosuggestOptions.filterText}
            placeholder={filteringPlaceholder || i18nStrings.filteringPlaceholder}
            ariaLabel={filteringAriaLabel || i18nStrings.filteringAriaLabel}
            disabled={disabled}
            loading={loading}
            loadingText={filteringLoadingText}
            emptyText={filteringEmpty}
            onLoadItems={handleLoadItems}
            i18nStrings={i18nStrings}
          />

          {/* Results count */}
          {countText && internalQuery.tokens.length > 0 && !disabled && (
            <div className="absolute right-10 top-1/2 -translate-y-1/2">
              <Typography variant="small" className="text-gray-500">
                {countText}
              </Typography>
            </div>
          )}
        </div>
      </div>

      {/* Constraint text */}
      {filteringConstraintText && (
        <div className="mt-1">
          <Typography variant="small" className="text-gray-500">
            {filteringConstraintText}
          </Typography>
        </div>
      )}

      {/* Tokens row */}
      {internalQuery.tokens.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mt-3">
          {visibleTokens.map((token, index) => (
            <FilterToken
              key={`${token.propertyKey || 'free'}-${token.operator}-${token.value}-${index}`}
              token={token}
              index={index}
              showOperation={index > 0 && !hideOperations}
              operation={internalQuery.operation}
              onRemove={removeToken}
              onOperationChange={updateOperation}
              disabled={disabled}
              readOnlyOperations={readOnlyOperations}
              i18nStrings={i18nStrings}
            />
          ))}

          {/* Show more/fewer button */}
          {hasHiddenTokens && (
            <Button
              variant="text"
              size="sm"
              className="text-blue-600 hover:text-blue-800 px-2 py-1 normal-case font-medium"
              onClick={() => setShowAllTokens(!showAllTokens)}
            >
              {showAllTokens
                ? i18nStrings.tokenLimitShowFewer
                : `${i18nStrings.tokenLimitShowMore} (+${hiddenCount})`}
            </Button>
          )}

          {/* Clear filters button or custom actions */}
          {customFilterActions || (
            <Button
              variant="text"
              size="sm"
              className="text-gray-600 hover:text-gray-900 px-2 py-1 normal-case font-medium
                         flex items-center gap-1"
              onClick={() => {
                removeAllTokens();
                inputRef.current?.focus?.();
              }}
              disabled={disabled}
            >
              <XMarkIcon className="h-4 w-4" />
              {i18nStrings.clearFiltersText}
            </Button>
          )}
        </div>
      )}
    </div>
  );
});

export default PropertyFilter;
