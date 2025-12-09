/**
 * PropertyFilter Component
 * 
 * A powerful filtering component for tables and lists, built with
 * Material Tailwind and TailwindCSS.
 * 
 * @example
 * ```jsx
 * import PropertyFilter from './PropertyFilter';
 * 
 * const filteringProperties = [
 *   { key: 'name', propertyLabel: 'Name', operators: ['=', '!=', ':', '!:'] },
 *   { key: 'status', propertyLabel: 'Status', operators: ['=', '!='] },
 * ];
 * 
 * const filteringOptions = [
 *   { propertyKey: 'status', value: 'active', label: 'Active' },
 *   { propertyKey: 'status', value: 'inactive', label: 'Inactive' },
 * ];
 * 
 * function MyComponent() {
 *   const [query, setQuery] = useState({ tokens: [], operation: 'and' });
 * 
 *   return (
 *     <PropertyFilter
 *       filteringProperties={filteringProperties}
 *       filteringOptions={filteringOptions}
 *       query={query}
 *       onChange={setQuery}
 *     />
 *   );
 * }
 * ```
 */

export { default } from './PropertyFilter';
export { default as PropertyFilter } from './PropertyFilter';
export { default as FilterToken } from './FilterToken';
export { default as FilterAutosuggest } from './FilterAutosuggest';

// Export utilities
export * from './utils';
export * from './controller';
