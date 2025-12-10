import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import EmployeeTable from '@/components/EmployeeTable';

import EmployeeEditForm from '@/components/EmployeeEditForm';
import { Employee, User, accessConfigs, hasPermission } from '@/types/user';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Users,
  UserPlus,
  Building,
  TrendingUp,
  Upload,
  Download,
  Calendar,
  Clock,
  Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Dashboard = () => {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
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

  // Removed dashboard Add Employee flow to centralize under Employee Management

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

  // Aggregation helpers (client-side, handles nulls and variations)
  const toKey = (val: unknown) => String(val ?? '').trim().toLowerCase();

  const genderStats = React.useMemo(() => {
    const maleKeys = new Set(['m', 'male', 'l']); // 'l' for 'laki-laki'
    const femaleKeys = new Set(['f', 'female', 'p']); // 'p' for 'perempuan'
    let male = 0, female = 0, unknown = 0;
    employees.forEach(emp => {
      const g = toKey(emp.gender);
      if (!g) unknown++;
      else if (maleKeys.has(g)) male++;
      else if (femaleKeys.has(g)) female++;
      else unknown++;
    });
    return { male, female, unknown };
  }, [employees]);

  const nationalityStats = React.useMemo(() => {
    let indonesia = 0, expatriate = 0, unknown = 0;
    employees.forEach(emp => {
      const n = toKey(emp.nationality);
      if (!n) unknown++;
      else if (n.includes('indo')) indonesia++;
      else expatriate++;
    });
    return { indonesia, expatriate, unknown };
  }, [employees]);

  const contractStats = React.useMemo(() => {
    let permanent = 0, contract = 0, unknown = 0;
    employees.forEach(emp => {
      const s = toKey(emp.employment_status);
      if (!s) unknown++;
      else if (s.includes('contract')) contract++;
      else if (s.includes('permanent') || s.includes('tetap')) permanent++;
      else unknown++;
    });
    return { permanent, contract, unknown };
  }, [employees]);

  // Point of origin derivation: uses `point_of_origin` if available; otherwise falls back to unknown.
  // Pending clarification for exact mapping rules.
  const originStats = React.useMemo(() => {
    let local = 0, nonLocal = 0, overseas = 0, unknown = 0;
    employees.forEach(emp => {
      const o = toKey(emp.point_of_origin);
      if (!o) { unknown++; return; }
      if (o.includes('local')) local++;
      else if (o.includes('non') || o.includes('non-local')) nonLocal++;
      else if (o.includes('overseas') || o.includes('luar')) overseas++;
      else unknown++;
    });
    return { local, nonLocal, overseas, unknown };
  }, [employees]);

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
  const ACTIVE_STATUSES = ['active', 'probation', 'contract', 'intern'];
  const activeEmployees = employees.filter(emp => {
    const status = (emp.employment_status || '').toLowerCase();
    return ACTIVE_STATUSES.includes(status);
  }).length;
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
            <Button variant="outline" onClick={handleExportData} className="flex items-center">
              <Download className="mr-2 h-4 w-4" />
              Export Data
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-12 gap-4">
          <Card className="col-span-12 md:col-span-6 lg:col-span-4">
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

          <Card className="col-span-12 md:col-span-6 lg:col-span-4">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Departments</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{departments}</div>
            </CardContent>
          </Card>

          <Card className="col-span-12 md:col-span-6 lg:col-span-4">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">New Hires</CardTitle>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {employees.filter(emp => {
                  const jd = emp.join_date
                    ? new Date(typeof emp.join_date === 'string' ? emp.join_date : emp.join_date.toISOString())
                    : null;
                  return jd ? jd > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) : false;
                }).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Last 30 days
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Demographics Cards */}
        <div className="grid grid-cols-12 gap-4">
          <Card className="col-span-12 md:col-span-6 lg:col-span-3">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                Gender
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Counts by `gender` field (male/female; unknown included).
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm">
                <span>Male</span>
                <Badge variant="outline">{genderStats.male}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span>Female</span>
                <Badge variant="outline">{genderStats.female}</Badge>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                <span>Unknown</span>
                <span>{genderStats.unknown}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-12 md:col-span-6 lg:col-span-3">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                Nationality
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Indonesia vs Expatriate derived from `nationality`.
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm">
                <span>Indonesia</span>
                <Badge variant="outline">{nationalityStats.indonesia}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span>Expatriate</span>
                <Badge variant="outline">{nationalityStats.expatriate}</Badge>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                <span>Unknown</span>
                <span>{nationalityStats.unknown}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-12 md:col-span-6 lg:col-span-3">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                Contract Type
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Derived from `employment_status` (permanent/contract; unknown included).
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm">
                <span>Permanent</span>
                <Badge variant="outline">{contractStats.permanent}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span>Contract</span>
                <Badge variant="outline">{contractStats.contract}</Badge>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                <span>Unknown</span>
                <span>{contractStats.unknown}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-12 md:col-span-6 lg:col-span-3">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                Point of Origin
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Using `point_of_origin`; mapping rules pending clarification.
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm">
                <span>Local</span>
                <Badge variant="outline">{originStats.local}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span>Non-Local</span>
                <Badge variant="outline">{originStats.nonLocal}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span>Overseas</span>
                <Badge variant="outline">{originStats.overseas}</Badge>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                <span>Unknown</span>
                <span>{originStats.unknown}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="flex w-full">
            <TabsTrigger className="flex-1 text-center" value="overview">Overview</TabsTrigger>
            <TabsTrigger className="flex-1 text-center" value="employees">Employees</TabsTrigger>

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


        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;