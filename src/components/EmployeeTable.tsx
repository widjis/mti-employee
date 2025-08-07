import React, { useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Employee, User, accessConfigs } from '@/types/user';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { Resizable } from 'react-resizable';
import 'react-resizable/css/styles.css';

interface EmployeeTableProps {
  employees: Employee[];
  onEdit?: (employee: Employee) => void;
  onView?: (employee: Employee) => void;
  onDelete?: (employeeId: string) => void;
}

const dateFields: (keyof Employee)[] = [
  'date_of_birth',
  'first_join_date_merdeka',
  'transfer_merdeka',
  'first_join_date',
  'join_date',
  'end_contract',
  'travel_in',
  'travel_out',
  'terminated_date',
];

const ResizableTitle: React.FC<{
  width: number;
  onResize: (e: React.SyntheticEvent, data: { size: { width: number } }) => void;
  children: React.ReactNode;
}> = ({ width, onResize, children }) => {
  if (!width) return <th>{children}</th>;
  return (
    <Resizable
      width={width}
      height={0}
      handle={
        <span
          className="react-resizable-handle"
          onClick={e => e.stopPropagation()}
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: 8,
            cursor: 'col-resize',
            zIndex: 1,
            backgroundColor: 'transparent',
          }}
        />
      }
      onResize={onResize}
      draggableOpts={{ enableUserSelectHack: false }}
    >
      <th
        style={{
          width,
          maxWidth: width,
          position: 'relative',
          userSelect: 'none',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          verticalAlign: 'middle',
          cursor: 'pointer',
        }}
      >
        {children}
      </th>
    </Resizable>
  );
};

const EmployeeTable: React.FC<EmployeeTableProps> = ({
  employees,
  onEdit,
  onView,
  onDelete,
}) => {
  const { user } = useAuth();
  const userRole = user?.role as User['role'];
  const config = accessConfigs[userRole];

  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Employee | null; direction: 'asc' | 'desc' | null }>({
    key: null,
    direction: null,
  });
  const defaultColumnWidth = 150;
  const [columnsWidth, setColumnsWidth] = useState<Record<string, number>>(() =>
    config.visibleFields.reduce((acc, field) => {
      acc[field] = defaultColumnWidth;
      return acc;
    }, {} as Record<string, number>)
  );

  const formatDate = (value: any) => {
    if (!value) return '';
    const date = typeof value === 'string' ? new Date(value) : value;
    if (!(date instanceof Date) || isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
  };

  const handleResize = (field: string) => (e: React.SyntheticEvent, data: { size: { width: number } }) => {
    setColumnsWidth(prev => ({
      ...prev,
      [field]: Math.max(50, data.size.width),
    }));
  };

  const requestSort = (key: keyof Employee) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (field: keyof Employee) => {
    if (sortConfig.key !== field) return null;
    return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
  };

  // Filter employees by role
  const filteredByRole = employees.filter(employee => config.canViewRow(employee, user));

  // Filter by global search term
  const filteredEmployees = useMemo(() => {
    return filteredByRole.filter(employee =>
      config.visibleFields.some(field => {
        const val = employee[field];
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(searchTerm.toLowerCase());
      })
    );
  }, [filteredByRole, searchTerm, config.visibleFields]);

  // Sort filtered employees by current sort config
  const sortedEmployees = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) return filteredEmployees;

    return [...filteredEmployees].sort((a, b) => {
      const aVal = a[sortConfig.key!];
      const bVal = b[sortConfig.key!];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      let comparison = 0;
      if (dateFields.includes(sortConfig.key!)) {
        const dateA = aVal instanceof Date ? aVal.getTime() : new Date(aVal).getTime();
        const dateB = bVal instanceof Date ? bVal.getTime() : new Date(bVal).getTime();
        comparison = dateA - dateB;
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else {
        comparison = String(aVal).localeCompare(String(bVal));
      }
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [filteredEmployees, sortConfig]);

  return (
    <div className="space-y-4">
      {/* Global Search */}
      <div className="flex items-center space-x-4 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search employees..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          {sortedEmployees.length} of {employees.length} employees
        </div>
      </div>
      {/* Table */}
      <div className="rounded-md border bg-card overflow-auto max-w-full">
        <table className="min-w-max table-fixed border-collapse">
          <thead>
            <tr>
              <th style={{ width: 80 }}>{userRole === 'admin' ? 'ACTIONS' : null}</th>
              {config.visibleFields.map(field => (
                <Resizable
                  key={field}
                  width={columnsWidth[field]}
                  height={0}
                  handle={
                    <span
                      className="react-resizable-handle"
                      onClick={e => e.stopPropagation()}
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: 0,
                        bottom: 0,
                        width: 8,
                        cursor: 'col-resize',
                        zIndex: 1,
                        backgroundColor: 'transparent',
                      }}
                    />
                  }
                  onResize={handleResize(field)}
                  draggableOpts={{ enableUserSelectHack: false }}
                >
                  <th
                    onClick={() => requestSort(field)}
                    style={{
                      width: columnsWidth[field],
                      maxWidth: columnsWidth[field],
                      position: 'relative',
                      userSelect: 'none',
                      whiteSpace: 'normal',
                      overflowWrap: 'break-word',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      verticalAlign: 'middle',
                      cursor: 'pointer',
                      padding: '1px 24px',
                    }}
                  >
                    <div className="flex justify-between items-center select-none">
                      <span>{field.replace(/_/g, ' ').toUpperCase()}</span>
                      <span>{getSortIndicator(field)}</span>
                    </div>
                  </th>
                </Resizable>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedEmployees.map(employee => (
              <tr key={employee.employee_id} className="hover:bg-muted">
                <td className="border px-6 py-4 whitespace-nowrap overflow-hidden text-ellipsis align-middle text-center">
                  {userRole === 'admin' && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {onEdit && (
                          <DropdownMenuItem onClick={() => onEdit(employee)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                        )}
                        {onDelete && (
                          <DropdownMenuItem onClick={() => onDelete(employee.employee_id)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </td>
                {config.visibleFields.map(field => (
                  <td
                    key={field}
                    className="border px-6 py-4 align-middle break-words whitespace-normal"
                    style={{ width: columnsWidth[field], maxWidth: columnsWidth[field] }}
                  >
                    {dateFields.includes(field)
                      ? formatDate(employee[field])
                      : employee[field]?.toString() ?? ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EmployeeTable;