# PropertyFilter Component

A powerful, customizable filtering component for React applications, built with **Material Tailwind** and **TailwindCSS**. This component provides an intuitive interface for filtering data by properties with support for multiple operators, free-text search, and AND/OR logic.

## Features

- 🔍 **Property-based filtering** - Filter by specific properties with type-ahead suggestions
- ✨ **Multiple operators** - Support for =, !=, :, !:, ^, !^, >, <, >=, <= operators
- 🔤 **Free-text search** - Search across all properties
- 🔗 **AND/OR logic** - Combine filters with customizable join operations
- 🏷️ **Token-based UI** - Visual filter tokens with easy removal
- ⌨️ **Keyboard navigation** - Full keyboard support for accessibility
- 🎨 **Material Tailwind styling** - Beautiful, modern UI out of the box
- 📱 **Responsive** - Works on all screen sizes

## Installation

### Prerequisites

Make sure you have the following dependencies installed:

```bash
npm install @material-tailwind/react @heroicons/react tailwindcss
```

### Setup

1. Copy the `PropertyFilter` folder to your components directory
2. Ensure TailwindCSS is configured in your project
3. Configure Material Tailwind in your `tailwind.config.js`:

```js
// tailwind.config.js
const withMT = require("@material-tailwind/react/utils/withMT");

module.exports = withMT({
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./node_modules/@material-tailwind/react/components/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@material-tailwind/react/theme/simple/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
});
```

## Usage

### Basic Example

```jsx
import React, { useState } from 'react';
import PropertyFilter from './PropertyFilter';

const filteringProperties = [
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
];

const filteringOptions = [
  { propertyKey: 'status', value: 'active', label: 'Active' },
  { propertyKey: 'status', value: 'inactive', label: 'Inactive' },
];

function MyComponent() {
  const [query, setQuery] = useState({
    tokens: [],
    operation: 'and',
  });

  return (
    <PropertyFilter
      filteringProperties={filteringProperties}
      filteringOptions={filteringOptions}
      query={query}
      onChange={setQuery}
      filteringPlaceholder="Filter items..."
    />
  );
}
```

### With Data Filtering

```jsx
function applyFilters(data, query) {
  if (!query.tokens?.length) return data;

  return data.filter(item => {
    const results = query.tokens.map(token => {
      const { propertyKey, operator, value } = token;
      
      // Free text search
      if (!propertyKey) {
        return Object.values(item).some(val =>
          String(val).toLowerCase().includes(String(value).toLowerCase())
        );
      }

      const itemValue = String(item[propertyKey] || '').toLowerCase();
      const filterValue = String(value).toLowerCase();

      switch (operator) {
        case '=': return itemValue === filterValue;
        case '!=': return itemValue !== filterValue;
        case ':': return itemValue.includes(filterValue);
        case '!:': return !itemValue.includes(filterValue);
        case '^': return itemValue.startsWith(filterValue);
        case '!^': return !itemValue.startsWith(filterValue);
        default: return true;
      }
    });

    return query.operation === 'and'
      ? results.every(Boolean)
      : results.some(Boolean);
  });
}
```

## API Reference

### PropertyFilter Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `filteringProperties` | `Array` | `[]` | Array of filterable property definitions |
| `filteringOptions` | `Array` | `[]` | Array of available filter value options |
| `query` | `Object` | `{ tokens: [], operation: 'and' }` | Current query state |
| `onChange` | `Function` | - | Callback when query changes |
| `disabled` | `boolean` | `false` | Disable the filter input |
| `disableFreeTextFiltering` | `boolean` | `false` | Disable free-text search |
| `hideOperations` | `boolean` | `false` | Hide AND/OR operation selectors |
| `readOnlyOperations` | `boolean` | `false` | Make operations read-only |
| `tokenLimit` | `number` | - | Max visible tokens before "show more" |
| `countText` | `string` | - | Result count text (e.g., "25 matches") |
| `loading` | `boolean` | `false` | Show loading state |
| `i18nStrings` | `Object` | `{}` | Internationalization strings |
| `customControl` | `ReactNode` | - | Custom control before input |
| `customFilterActions` | `ReactNode` | - | Custom actions after tokens |
| `filteringPlaceholder` | `string` | `'Filter by property or value'` | Input placeholder |
| `filteringAriaLabel` | `string` | `'Property filter'` | Aria label for input |
| `filteringConstraintText` | `ReactNode` | - | Help text below input |
| `onLoadItems` | `Function` | - | Async options loader |
| `className` | `string` | `''` | Additional CSS classes |

### Filtering Property Definition

```js
{
  key: 'propertyKey',           // Unique identifier
  propertyLabel: 'Display Name', // Label shown in UI
  groupValuesLabel: 'Values',    // Label for values group
  operators: ['=', '!=', ':'],   // Allowed operators
  defaultOperator: '=',          // Default operator
}
```

### Filtering Option Definition

```js
{
  propertyKey: 'status',  // Links to property.key
  value: 'active',        // Actual filter value
  label: 'Active',        // Display label (optional)
}
```

### Query Object

```js
{
  tokens: [
    {
      propertyKey: 'status',  // Property to filter (undefined for free-text)
      operator: '=',          // Comparison operator
      value: 'active',        // Filter value
    }
  ],
  operation: 'and',  // 'and' or 'or'
}
```

### i18nStrings

```js
{
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
}
```

## Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `=` | Equals | `Status = active` |
| `!=` | Does not equal | `Status != inactive` |
| `:` | Contains | `Name : john` |
| `!:` | Does not contain | `Name !: test` |
| `^` | Starts with | `Name ^ J` |
| `!^` | Does not start with | `Name !^ X` |
| `>` | Greater than | `Age > 25` |
| `<` | Less than | `Age < 50` |
| `>=` | Greater than or equal | `Age >= 18` |
| `<=` | Less than or equal | `Age <= 65` |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `↓` | Navigate down in suggestions |
| `↑` | Navigate up in suggestions |
| `Enter` | Select highlighted option or create token |
| `Escape` | Close suggestions dropdown |
| `Tab` | Close dropdown and move focus |

## Customization

### Custom Styling

The component uses TailwindCSS classes that can be customized via the `className` prop or by modifying the component files directly.

### Custom Filter Actions

```jsx
<PropertyFilter
  customFilterActions={
    <div className="flex gap-2">
      <Button size="sm" onClick={handleSaveFilter}>
        Save Filter
      </Button>
      <Button size="sm" variant="outlined" onClick={handleClear}>
        Reset
      </Button>
    </div>
  }
/>
```

### Custom Control

```jsx
<PropertyFilter
  customControl={
    <Select value={category} onChange={setCategory}>
      <Option value="all">All Categories</Option>
      <Option value="users">Users</Option>
      <Option value="orders">Orders</Option>
    </Select>
  }
/>
```

## License

MIT
