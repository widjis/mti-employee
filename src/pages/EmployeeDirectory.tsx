import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import EmployeeTable from '@/components/EmployeeTable';
import EmployeeEditForm from '@/components/EmployeeEditForm';
// Removed inline AddEmployeeForm modal in favor of navigation to AddEmployee page
import { Employee, User, accessConfigs, hasPermission } from '@/types/user';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Download,
  Plus
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const EmployeeDirectory = () => {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  // Removed local add form modal state; we navigate to dedicated page instead
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [viewColumns, setViewColumns] = useState<{ field: keyof Employee; label: string }[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<{ field: keyof Employee; label: string }[]>([]);
  
  // Role-based permissions
  const canCreateEmployees = hasPermission(user.role, 'employees', 'create');
  const canEditEmployees = hasPermission(user.role, 'employees', 'update');
  const canDeleteEmployees = hasPermission(user.role, 'employees', 'delete');
  const canExportData = hasPermission(user.role, 'employees', 'export');

  // Fetch employees from API
  useEffect(() => {
    const fetchEmployees = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('http://localhost:8080/api/employees', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (!res.ok) throw new Error('Failed to fetch employee data');
        const employeesData: Employee[] = await res.json();

        function calculateYears(fromDate: string): number {
          const from = new Date(fromDate);
          const today = new Date();
          let years = today.getFullYear() - from.getFullYear();
          const m = today.getMonth() - from.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < from.getDate())) {
            years--;
          }
          return years;
        }

        const enrichedEmployees = employeesData.map(emp => ({
          ...emp,
          age: emp.date_of_birth ? calculateYears(typeof emp.date_of_birth === 'string' ? emp.date_of_birth : emp.date_of_birth.toISOString()) : 0,
          years_in_service: emp.first_join_date ? calculateYears(typeof emp.first_join_date === 'string' ? emp.first_join_date : emp.first_join_date.toISOString()) : 0,
        }));

        setEmployees(enrichedEmployees);
        setFilteredEmployees(enrichedEmployees);
      } catch (error) {
        console.error('Error fetching employees:', error);
        toast({
          title: "Error",
          description: "Failed to fetch employee data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (token) {
      fetchEmployees();
    }
  }, [token, toast]);

  // Fetch role-based view columns (display labels) from API and initialize visibility
  useEffect(() => {
    const fetchViewColumns = async () => {
      if (!token) return;
      try {
        const res = await fetch('http://localhost:8080/api/column-matrix/view-columns', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (!res.ok) throw new Error('Failed to fetch view columns');
        const data = await res.json();
        const cols = (data.columns || []).map((c: any) => ({
          field: c.column_name as keyof Employee,
          label: c.display_label as string,
        }));
        setViewColumns(cols);
        setVisibleColumns(cols);
      } catch (error) {
        console.error('Error fetching view columns:', error);
        // Fallback to accessConfigs visibleFields with formatted labels
        const cfg = accessConfigs[user.role];
        const fallback = cfg.visibleFields.map(f => ({
          field: f,
          label: String(f).replace(/_/g, ' ').replace(/\b\w/g, s => s.toUpperCase()),
        }));
        setViewColumns(fallback);
        setVisibleColumns(fallback);
      }
    };
    fetchViewColumns();
  }, [token, user.role]);

  // Filter employees based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredEmployees(employees);
    } else {
      const filtered = employees.filter(emp => 
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.job_title.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredEmployees(filtered);
    }
  }, [searchTerm, employees]);

  const handleEmployeeView = (employee: Employee) => {
    toast({
      title: "Employee Details",
      description: `Viewing details for ${employee.name}`,
    });
  };

  const handleEmployeeEdit = (employee: Employee) => {
    console.log('Editing employee:', employee);
    setEditingEmployee(employee);
  };

  const handleModalClose = () => {
    setEditingEmployee(null);
  };

  const handleEmployeeSave = (updatedEmployee: Employee) => {
    setEmployees(prev => prev.map(emp => emp.employee_id === updatedEmployee.employee_id ? updatedEmployee : emp));
    setEditingEmployee(null);
    toast({
      title: "Employee Updated",
      description: `${updatedEmployee.name} has been updated successfully.`,
    });
  };

  const deleteEmployee = async (employeeId: string) => {
    const response = await fetch(`/api/employees/${employeeId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error ${response.status}: ${errorText}`);
    }
    return true;
  };

  const handleEmployeeDelete = async (employeeId: string) => {
    const employee = employees.find(emp => emp.employee_id === employeeId);
    if (!employee) return;

    const confirmed = window.confirm(`Are you sure you want to delete ${employee.name}?`);
    if (!confirmed) return;

    // Optimistically update the UI and remove employee
    setEmployees(prev => prev.filter(emp => emp.employee_id !== employeeId));
    toast({
      title: "Employee Deleted",
      description: `${employee.name} has been successfully deleted.`,
      variant: "destructive",
    });

    try {
      await deleteEmployee(employeeId); // API call to delete on server
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      toast({
        title: "Delete Failed",
        description: message || "Failed to delete employee. Please try again.",
        variant: "destructive",
      });
      // Rollback UI state to re-add employee
      setEmployees(prev => [...prev, employee]);
    }
  };

  const navigate = useNavigate();
  const handleAddEmployee = () => {
    navigate('/employees/add');
  };

  // Redirect-based add flow handled in AddEmployee page; removal of local save handler

  const convertToCSV = (data: Record<string, unknown>[]) => {
    if (!data.length) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row =>
        headers.map(fieldName => {
          const value = row[fieldName];
          const escaped = String(value).replace(/"/g, '""');
          return `"${escaped}"`;
        }).join(',')
      )
    ];

    return csvRows.join('\n');
  };

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportData = () => {
    const config = accessConfigs[user.role];

    const filteredRows = filteredEmployees.filter(emp => config.canViewRow(emp, user));

    function assignKey<T, K extends keyof T>(obj: Partial<T>, key: K, value: T[K]) {
      obj[key] = value;
    }

    const shownData = filteredRows.map(emp => {
      const filteredEmp: Partial<Employee> = {};
      visibleColumns.forEach(({ field }) => {
        assignKey(filteredEmp, field, emp[field]);
      });
      return filteredEmp;
    });

    if (!shownData.length) {
      alert('No data to export.');
      return;
    }

    const csv = convertToCSV(shownData);
    downloadCSV(csv, 'employee-directory.csv');
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-foreground">
              Employee Directory
            </h2>
            <p className="text-muted-foreground">
              {canEditEmployees
                ? 'View, edit, and manage all employee records.'
                : 'Browse and search employee information.'}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {canCreateEmployees && (
              <Button onClick={handleAddEmployee} className="bg-admin hover:bg-admin-hover flex items-center">
                <Plus className="mr-2 h-4 w-4" />
                Add Employee
              </Button>
            )}

            {canExportData && (
              <Button variant="outline" onClick={handleExportData} className="flex items-center">
                <Download className="mr-2 h-4 w-4" />
                Export Data
              </Button>
            )}
          </div>
        </div>

        {/* Search and Filter Bar */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search employees by name, ID, department, or position..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center">
                    <Filter className="mr-2 h-4 w-4" /> Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64">
                  {viewColumns.map((col) => {
                    const checked = !!visibleColumns.find(c => c.field === col.field);
                    return (
                      <DropdownMenuItem key={String(col.field)} className="flex items-center gap-2" onSelect={(e) => e.preventDefault()}>
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(val) => {
                            setVisibleColumns(prev => {
                              if (val) {
                                return [...prev, col];
                              } else {
                                return prev.filter(c => c.field !== col.field);
                              }
                            });
                          }}
                        />
                        <span className="text-sm">{col.label}</span>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{filteredEmployees.length} of {employees.length} employees</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Employee Directory Table */}
        <Card>
          <CardHeader>
            <CardTitle>Employee Records</CardTitle>
            <CardDescription>
              Complete directory of all employee information and records.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EmployeeTable
              employees={filteredEmployees}
              onEdit={handleEmployeeEdit}
              onView={handleEmployeeView}
              onDelete={canDeleteEmployees ? handleEmployeeDelete : undefined}
              columns={visibleColumns}
            />
            {editingEmployee && (
              <EmployeeEditForm
                employee={editingEmployee}
                onUpdated={handleEmployeeSave}
                onClose={handleModalClose}
              />
            )}
          </CardContent>
        </Card>

        {/* Add flow now navigates to dedicated AddEmployee page */}
      </div>
    </DashboardLayout>
  );
};

export default EmployeeDirectory;