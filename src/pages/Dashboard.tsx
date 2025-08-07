import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import EmployeeTable from '@/components/EmployeeTable';
import ExcelUpload from '@/components/ExcelUpload';
import EmployeeEditForm from '@/components/EmployeeEditForm';
import AddEmployeeForm from '@/components/AddEmployeeForm';
import { Employee, User, accessConfigs, hasPermission } from '@/types/user';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  UserPlus,
  Building,
  TrendingUp,
  Upload,
  Download,
  Plus,
  Calendar,
  Clock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Dashboard = () => {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [isAddFormOpen, setAddFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  
  // Role-based permissions
  const canCreateEmployees = hasPermission(user.role, 'employees', 'create');
  const canEditEmployees = hasPermission(user.role, 'employees', 'update');
  const canDeleteEmployees = hasPermission(user.role, 'employees', 'delete');
  const canExportData = hasPermission(user.role, 'employees', 'export');
  const canImportData = hasPermission(user.role, 'employees', 'import');

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
      } catch (error) {
        console.error('Error fetching employees:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (token) {
      fetchEmployees();
    }
  }, [token]);

  const handleEmployeeView = (employee: Employee) => {
    toast({
      title: "Employee Details",
      description: `Viewing details for ${employee.name}`,
    });
  };

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const handleEmployeeEdit = (employee: Employee) => {
    console.log('Editing employee:', employee);
    setEditingEmployee(employee);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingEmployee(null);
  };

  const handleEmployeeSave = (updatedEmployee: Employee) => {
    setEmployees(prev => prev.map(emp => emp.employee_id === updatedEmployee.employee_id ? updatedEmployee : emp));
    setEditingEmployee(null);
    setIsModalOpen(false);
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
    } catch (error: any) {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete employee. Please try again.",
        variant: "destructive",
      });
      // Rollback UI state to re-add employee
      setEmployees(prev => [...prev, employee]);
    }
  };

  const handleAddEmployee = () => {
    setAddFormOpen(true);
  };

  const handleAddEmployeeSave = (newEmployee: Employee) => {
    setEmployees(prev => [...prev, newEmployee]);
    setAddFormOpen(false);
    toast({
      title: "Employee Added",
      description: `${newEmployee.name} has been added successfully.`,
    });
  };

  const convertToCSV = (data: any[]) => {
    if (!data.length) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row =>
        headers.map(fieldName => {
          const escaped = ('' + row[fieldName]).replace(/"/g, '""');
          return `"${escaped}"`;
        }).join(',')
      )
    ];

    return csvRows.join('\n');
  };

  const currentUser = user;
  const allEmployees = employees;

  if (!currentUser || !allEmployees) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </DashboardLayout>
    );
  }
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
    const config = accessConfigs[currentUser.role];

    const filteredRows = allEmployees.filter(emp => config.canViewRow(emp, currentUser));

    function assignKey<T, K extends keyof T>(obj: Partial<T>, key: K, value: T[K]) {
      obj[key] = value;
    }

    const shownData = filteredRows.map(emp => {
      const filteredEmp: Partial<Employee> = {};
      config.visibleFields.forEach(field => {
        assignKey(filteredEmp, field, emp[field]);
      });
      return filteredEmp;
    });

    if (!shownData.length) {
      alert('No data to export.');
      return;
    }

    const csv = convertToCSV(shownData);
    downloadCSV(csv, 'employee-data.csv'); // your CSV download utility
  };

  // Calculate stats
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter(emp => emp.status === 'active').length;
  const departments = [...new Set(employees.map(emp => emp.department))].length;

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
        {/* Welcome Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-foreground">
              Welcome back, {user.name}!
            </h2>
            <p className="text-muted-foreground">
              {canCreateEmployees ? 'Manage employee data and system settings' : 'View employee information and reports'}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {canCreateEmployees && (
              <Button onClick={handleAddEmployee} className="bg-admin hover:bg-admin-hover flex items-center">
                <Plus className="mr-2 h-4 w-4" />
                Add Employee
              </Button>
            )}

            <Button variant="outline" onClick={handleExportData} className="flex items-center">
              <Download className="mr-2 h-4 w-4" />
              Export Data
            </Button>
          </div>

          {isAddFormOpen && (
            <AddEmployeeForm
              onAdd={handleAddEmployeeSave}
              onClose={() => setAddFormOpen(false)}
            />
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalEmployees}</div>
              <p className="text-xs text-muted-foreground">
                {activeEmployees} active, {totalEmployees - activeEmployees} inactive
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Departments</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{departments}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">New Hires</CardTitle>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {employees.filter(emp =>
                  new Date(emp.first_join_date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                ).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Last 30 days
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="flex w-full">
            <TabsTrigger className="flex-1 text-center" value="overview">Overview</TabsTrigger>
            <TabsTrigger className="flex-1 text-center" value="employees">Employees</TabsTrigger>
            {canImportData && <TabsTrigger className="flex-1 text-center" value="upload">Bulk Upload</TabsTrigger>}
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Employee Overview</CardTitle>
                <CardDescription>
                  Quick overview of your employee database
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Active Employees</span>
                    <Badge variant="default" className="bg-success">
                      {activeEmployees} / {totalEmployees}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {[...new Set(employees.map(emp => emp.status))].map(stat => {
                      const count_stat = employees.filter(emp => emp.status === stat).length;
                      const percentage = (count_stat / totalEmployees) * 100;
                      return (
                        <div key={stat} className="space-y-1">
                          <div className="flex justify-between text-sm font-medium">
                            <span>{stat.charAt(0).toUpperCase() + stat.slice(1)}</span>
                            <span>{count_stat} ({percentage.toFixed(1)}%)</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="space-y-2">
                    <span className="text-sm font-medium">Department Distribution</span>
                    {[...new Set(employees.map(emp => emp.department))].map(dept => {
                      const count = employees.filter(emp => emp.department === dept).length;
                      const percentage = (count / totalEmployees) * 100;

                      return (
                        <div key={dept} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>{dept}</span>
                            <Badge variant="default" className="bg-success">
                              {count} employees
                            </Badge>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="employees" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Employee Directory</CardTitle>
                <CardDescription>
                  {canEditEmployees
                    ? 'View, edit, and manage all employee records.'
                    : 'View employee directory.'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EmployeeTable
                  employees={employees}
                  onEdit={handleEmployeeEdit}
                  onView={handleEmployeeView}
                  onDelete={canDeleteEmployees ? handleEmployeeDelete : undefined}
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
          </TabsContent>

          {canImportData && (
            <TabsContent value="upload" className="space-y-4">
              <ExcelUpload />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;