import React, { useState, useMemo } from 'react';
import { Card, Typography, Chip } from '@material-tailwind/react';
import PropertyFilter from './components/PropertyFilter';

// Sample data to filter
const USERS = [
  { id: 1, name: 'John Doe', email: 'john@example.com', status: 'active', role: 'admin', department: 'Engineering' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', status: 'active', role: 'user', department: 'Marketing' },
  { id: 3, name: 'Bob Johnson', email: 'bob@example.com', status: 'inactive', role: 'user', department: 'Sales' },
  { id: 4, name: 'Alice Brown', email: 'alice@example.com', status: 'active', role: 'manager', department: 'Engineering' },
  { id: 5, name: 'Charlie Wilson', email: 'charlie@example.com', status: 'pending', role: 'user', department: 'Support' },
  { id: 6, name: 'Diana Ross', email: 'diana@example.com', status: 'active', role: 'admin', department: 'HR' },
  { id: 7, name: 'Edward King', email: 'edward@example.com', status: 'inactive', role: 'user', department: 'Finance' },
  { id: 8, name: 'Fiona Green', email: 'fiona@example.com', status: 'active', role: 'manager', department: 'Marketing' },
];

// Define filterable properties
const FILTERING_PROPERTIES = [
  {
    key: 'name',
    propertyLabel: 'Name',
    groupValuesLabel: 'Name values',
    operators: ['=', '!=', ':', '!:', '^', '!^'],
    defaultOperator: ':',
  },
  {
    key: 'email',
    propertyLabel: 'Email',
    groupValuesLabel: 'Email values',
    operators: ['=', '!=', ':', '!:', '^'],
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
  {
    key: 'ip',
    propertyLabel: 'IP Address',
    groupValuesLabel: 'IP Address values',
    operators: ['=', '!='],
    defaultOperator: '=',
    validationType: 'ip',
  },
  {
    key: 'port',
    propertyLabel: 'Port',
    groupValuesLabel: 'Port values',
    operators: ['=', '!='],
    defaultOperator: '=',
    validationType: 'port',
  },
];

// Define filtering options (suggestions)
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
  { propertyKey: 'department', value: 'HR', label: 'Human Resources' },
  { propertyKey: 'department', value: 'Finance', label: 'Finance' },
];

// Apply filters to data
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
        default:
          return true;
      }
    });

    // Apply AND/OR logic
    return query.operation === 'and'
      ? tokenResults.every(Boolean)
      : tokenResults.some(Boolean);
  });
}

function App() {
  const [query, setQuery] = useState({
    tokens: [],
    operation: 'and',
  });

  // Apply filters
  const filteredUsers = useMemo(() => applyFilters(USERS, query), [query]);

  // Count text
  const countText = useMemo(() => {
    if (query.tokens.length === 0) return undefined;
    const count = filteredUsers.length;
    return count === 1 ? '1 match' : `${count} matches`;
  }, [filteredUsers.length, query.tokens.length]);

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Typography variant="h3" className="text-gray-900 mb-2">
            PropertyFilter Test
          </Typography>
          <Typography className="text-gray-600">
            Test the PropertyFilter component by filtering the user data below.
          </Typography>
        </div>

        {/* Filter Card */}
        <Card className="p-6 mb-6">
          <Typography variant="h6" className="text-gray-800 mb-4">
            Filter Users
          </Typography>
          
          <PropertyFilter
            filteringProperties={FILTERING_PROPERTIES}
            filteringOptions={FILTERING_OPTIONS}
            query={query}
            onChange={setQuery}
            countText={countText}
            filteringPlaceholder="Filter by name, status, role, department..."
            i18nStrings={{
              clearFiltersText: 'Clear all filters',
              operationAndText: 'AND',
              operationOrText: 'OR',
            }}
          />

          {/* Tips */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <Typography variant="small" className="text-blue-800 font-medium mb-1">
              💡 Tips:
            </Typography>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Type a property name like "Status" or "Name" to filter by that field</li>
              <li>• Use operators: = (equals), != (not equals), : (contains), !: (not contains), ^ (starts with)</li>
              <li>• Type any text to search across all fields</li>
              <li>• Click AND/OR between tokens to change the join logic</li>
              <li>• <strong>IP Address</strong>: Use format x.x.x.x or x.x.x.x/22-32 (CIDR)</li>
              <li>• <strong>Port</strong>: Use 80, 445-500 (range), or 21, 22, 80, 443 (list)</li>
            </ul>
          </div>
        </Card>

        {/* Debug: Query State */}
        <Card className="p-4 mb-6 bg-gray-50">
          <Typography variant="small" className="font-mono text-gray-600">
            Query: {JSON.stringify(query)}
          </Typography>
        </Card>

        {/* Results Table */}
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <Typography variant="h6" className="text-gray-800">
              Results ({filteredUsers.length} of {USERS.length})
            </Typography>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full min-w-max table-auto">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-4 text-left">
                    <Typography variant="small" className="font-semibold text-gray-700">
                      Name
                    </Typography>
                  </th>
                  <th className="p-4 text-left">
                    <Typography variant="small" className="font-semibold text-gray-700">
                      Email
                    </Typography>
                  </th>
                  <th className="p-4 text-left">
                    <Typography variant="small" className="font-semibold text-gray-700">
                      Status
                    </Typography>
                  </th>
                  <th className="p-4 text-left">
                    <Typography variant="small" className="font-semibold text-gray-700">
                      Role
                    </Typography>
                  </th>
                  <th className="p-4 text-left">
                    <Typography variant="small" className="font-semibold text-gray-700">
                      Department
                    </Typography>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user, index) => (
                    <tr
                      key={user.id}
                      className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                    >
                      <td className="p-4">
                        <Typography variant="small" className="font-medium text-gray-900">
                          {user.name}
                        </Typography>
                      </td>
                      <td className="p-4">
                        <Typography variant="small" className="text-gray-600">
                          {user.email}
                        </Typography>
                      </td>
                      <td className="p-4">
                        <Chip
                          size="sm"
                          value={user.status}
                          color={
                            user.status === 'active' ? 'green' :
                            user.status === 'inactive' ? 'gray' : 'amber'
                          }
                          className="capitalize"
                        />
                      </td>
                      <td className="p-4">
                        <Typography variant="small" className="text-gray-700 capitalize">
                          {user.role}
                        </Typography>
                      </td>
                      <td className="p-4">
                        <Typography variant="small" className="text-gray-700">
                          {user.department}
                        </Typography>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-8 text-center">
                      <Typography className="text-gray-500">
                        No users match your filters
                      </Typography>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default App;
