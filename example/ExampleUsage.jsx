import React, { useState, useMemo } from 'react';
import { Card, Typography } from '@material-tailwind/react';
import PropertyFilter from '../PropertyFilter';

/**
 * Example data for demonstration
 */
const SAMPLE_DATA = [
  { id: 1, name: 'John Doe', status: 'active', role: 'admin', department: 'Engineering' },
  { id: 2, name: 'Jane Smith', status: 'active', role: 'user', department: 'Marketing' },
  { id: 3, name: 'Bob Johnson', status: 'inactive', role: 'user', department: 'Sales' },
  { id: 4, name: 'Alice Brown', status: 'active', role: 'manager', department: 'Engineering' },
  { id: 5, name: 'Charlie Wilson', status: 'pending', role: 'user', department: 'Support' },
];

/**
 * Define filterable properties
 */
const FILTERING_PROPERTIES = [
  {
    key: 'name',
    propertyLabel: 'Name',
    groupValuesLabel: 'Name values',
    operators: ['=', '!=', ':', '!:', '^', '!^'],
    defaultOperator: ':',
  },
  {
    key: 'status',
    propertyLabel: 'Status',
    groupValuesLabel: 'Status values',
    operators: ['=', '!='],
    defaultOperator: '=',
  },
  {
    key: 'role',
    propertyLabel: 'Role',
    groupValuesLabel: 'Role values',
    operators: ['=', '!='],
    defaultOperator: '=',
  },
  {
    key: 'department',
    propertyLabel: 'Department',
    groupValuesLabel: 'Department values',
    operators: ['=', '!=', ':'],
    defaultOperator: '=',
  },
];

/**
 * Define filtering options (suggestions)
 */
const FILTERING_OPTIONS = [
  // Status options
  { propertyKey: 'status', value: 'active', label: 'Active' },
  { propertyKey: 'status', value: 'inactive', label: 'Inactive' },
  { propertyKey: 'status', value: 'pending', label: 'Pending' },
  // Role options
  { propertyKey: 'role', value: 'admin', label: 'Administrator' },
  { propertyKey: 'role', value: 'manager', label: 'Manager' },
  { propertyKey: 'role', value: 'user', label: 'User' },
  // Department options
  { propertyKey: 'department', value: 'Engineering', label: 'Engineering' },
  { propertyKey: 'department', value: 'Marketing', label: 'Marketing' },
  { propertyKey: 'department', value: 'Sales', label: 'Sales' },
  { propertyKey: 'department', value: 'Support', label: 'Support' },
];

/**
 * Apply filters to data
 */
function applyFilters(data, query) {
  if (!query.tokens || query.tokens.length === 0) {
    return data;
  }

  return data.filter(item => {
    const tokenResults = query.tokens.map(token => {
      const { propertyKey, operator, value } = token;

      // Free text search (no property specified)
      if (!propertyKey) {
        const searchValue = String(value).toLowerCase();
        return Object.values(item).some(val =>
          String(val).toLowerCase().includes(searchValue)
        );
      }

      const itemValue = String(item[propertyKey] || '').toLowerCase();
      const filterValue = String(value).toLowerCase();

      switch (operator) {
        case '=':
          return itemValue === filterValue;
        case '!=':
          return itemValue !== filterValue;
        case ':':
          return itemValue.includes(filterValue);
        case '!:':
          return !itemValue.includes(filterValue);
        case '^':
          return itemValue.startsWith(filterValue);
        case '!^':
          return !itemValue.startsWith(filterValue);
        case '>':
          return itemValue > filterValue;
        case '<':
          return itemValue < filterValue;
        case '>=':
          return itemValue >= filterValue;
        case '<=':
          return itemValue <= filterValue;
        default:
          return true;
      }
    });

    // Apply AND/OR logic
    if (query.operation === 'and') {
      return tokenResults.every(Boolean);
    } else {
      return tokenResults.some(Boolean);
    }
  });
}

/**
 * Example component demonstrating PropertyFilter usage
 */
export default function ExampleUsage() {
  const [query, setQuery] = useState({
    tokens: [],
    operation: 'and',
  });

  // Apply filters to data
  const filteredData = useMemo(
    () => applyFilters(SAMPLE_DATA, query),
    [query]
  );

  // Generate count text
  const countText = useMemo(() => {
    const count = filteredData.length;
    return count === 1 ? '1 match' : `${count} matches`;
  }, [filteredData.length]);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Typography variant="h4" className="text-gray-900">
        PropertyFilter Example
      </Typography>

      <Typography variant="paragraph" className="text-gray-600">
        Try filtering the data below. You can:
      </Typography>
      <ul className="list-disc list-inside text-gray-600 space-y-1">
        <li>Type a property name (e.g., "Status") to filter by that property</li>
        <li>Use operators like =, !=, :, !: for different comparisons</li>
        <li>Type free text to search across all fields</li>
        <li>Combine multiple filters with AND/OR logic</li>
      </ul>

      {/* PropertyFilter component */}
      <Card className="p-4">
        <PropertyFilter
          filteringProperties={FILTERING_PROPERTIES}
          filteringOptions={FILTERING_OPTIONS}
          query={query}
          onChange={setQuery}
          countText={query.tokens.length > 0 ? countText : undefined}
          filteringPlaceholder="Filter users by property or value..."
          i18nStrings={{
            clearFiltersText: 'Clear all',
            operationAndText: 'AND',
            operationOrText: 'OR',
          }}
        />
      </Card>

      {/* Current query state (for debugging) */}
      <Card className="p-4 bg-gray-50">
        <Typography variant="h6" className="text-gray-700 mb-2">
          Current Query State:
        </Typography>
        <pre className="text-sm text-gray-600 overflow-x-auto">
          {JSON.stringify(query, null, 2)}
        </pre>
      </Card>

      {/* Filtered results */}
      <Card className="overflow-hidden">
        <table className="w-full min-w-max table-auto text-left">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-4 border-b border-gray-200">
                <Typography variant="small" className="font-semibold text-gray-700">
                  Name
                </Typography>
              </th>
              <th className="p-4 border-b border-gray-200">
                <Typography variant="small" className="font-semibold text-gray-700">
                  Status
                </Typography>
              </th>
              <th className="p-4 border-b border-gray-200">
                <Typography variant="small" className="font-semibold text-gray-700">
                  Role
                </Typography>
              </th>
              <th className="p-4 border-b border-gray-200">
                <Typography variant="small" className="font-semibold text-gray-700">
                  Department
                </Typography>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length > 0 ? (
              filteredData.map((item, index) => (
                <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="p-4 border-b border-gray-100">
                    <Typography variant="small" className="text-gray-900">
                      {item.name}
                    </Typography>
                  </td>
                  <td className="p-4 border-b border-gray-100">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                        ${item.status === 'active' ? 'bg-green-100 text-green-800' : ''}
                        ${item.status === 'inactive' ? 'bg-gray-100 text-gray-800' : ''}
                        ${item.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="p-4 border-b border-gray-100">
                    <Typography variant="small" className="text-gray-700">
                      {item.role}
                    </Typography>
                  </td>
                  <td className="p-4 border-b border-gray-100">
                    <Typography variant="small" className="text-gray-700">
                      {item.department}
                    </Typography>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="p-8 text-center">
                  <Typography variant="small" className="text-gray-500">
                    No results match your filters
                  </Typography>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
