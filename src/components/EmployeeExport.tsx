import React, { useState, useEffect } from 'react';
import { api } from '@/lib/apiClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Download, 
  FileSpreadsheet, 
  Database, 
  Users, 
  Building2, 
  Activity,
  Info,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface ExportOptions {
  role: string;
  roleInfo: {
    name: string;
    description: string;
    level: number;
  };
  allowedColumns: string[];
  allowedSheets: string[];
  excelHeaders: Record<string, string>;
  derivedHeaders?: string[];
  availableDepartments: string[];
  exportFormats: string[];
  statusOptions: string[];
}

interface EmployeeStats {
  role: string;
  roleInfo: {
    name: string;
    description: string;
    level: number;
  };
  totalEmployees: number;
  activeEmployees: number;
  inactiveEmployees: number;
  totalDepartments: number;
  totalDivisions: number;
  accessibleColumns: number;
  accessibleSheets: number;
}

const EmployeeExport: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [exportOptions, setExportOptions] = useState<ExportOptions | null>(null);
  const [stats, setStats] = useState<EmployeeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<'json' | 'excel'>('excel');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('active');
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [exportProgress, setExportProgress] = useState(0);

  const fetchExportOptions = async () => {
    try {
      const data = await api.get<ExportOptions>('/api/employee-export/options');
      setExportOptions(data);
    } catch (error) {
      console.error('Error fetching export options:', error);
      toast({ title: 'Error', description: 'Failed to load export options', variant: 'destructive' });
    }
  };

  const fetchStats = async () => {
    try {
      const data = await api.get<EmployeeStats>('/api/employee-export/stats');
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    setExportProgress(0);
    
    try {
      const params = new URLSearchParams({
        format: selectedFormat,
        department: selectedDepartment,
        status: selectedStatus,
        ...(selectedSheet && { sheet: selectedSheet })
      });
      
      const response = await fetch(`/api/employee-export/data?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `employee-export-${new Date().toISOString().split('T')[0]}.${selectedFormat === 'excel' ? 'xlsx' : 'json'}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: "Success",
          description: "Export completed successfully"
        });
      } else {
        toast({
          title: "Error",
          description: "Export failed",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Error",
        description: "Export failed",
        variant: "destructive"
      });
    } finally {
      setExporting(false);
      setExportProgress(0);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch('/api/employee-export/template', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `employee-template-${user?.role || 'user'}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: "Success",
          description: "Template downloaded successfully"
        });
      } else {
        // If permission error on role-based template, fallback to public template endpoint
        if (response.status === 401 || response.status === 403) {
          try {
            const fallbackProfile = 'indonesia_active';
            const publicRes = await fetch(`/api/employees/templates?profile=${encodeURIComponent(fallbackProfile)}`);
            if (publicRes.ok) {
              const blob = await publicRes.blob();
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `employee_template_${fallbackProfile}.xlsx`;
              document.body.appendChild(a);
              a.click();
              window.URL.revokeObjectURL(url);
              document.body.removeChild(a);

              toast({
                title: 'Using public template',
                description: 'Role-based template requires permission. Downloaded public template instead.',
              });
            } else {
              toast({
                title: 'Permission required',
                description: 'You do not have access to the role-based template, and public fallback failed.',
                variant: 'destructive'
              });
            }
          } catch (fallbackErr) {
            console.error('Fallback template download error:', fallbackErr);
            toast({
              title: 'Error',
              description: 'Failed to download template (fallback error).',
              variant: 'destructive'
            });
          }
        } else {
          toast({
            title: "Error",
            description: "Failed to download template",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      console.error('Template download error:', error);
      toast({
        title: "Error",
        description: "Failed to download template",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchExportOptions();
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!exportOptions || !stats) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Unable to load export options. Please check your permissions.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Employee Data Export</h1>
        <p className="text-muted-foreground">
          Export employee data based on your role permissions
        </p>
      </div>

      {/* Role Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Your Access Level
          </CardTitle>
          <CardDescription>
            {exportOptions.roleInfo.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="text-sm">
              {exportOptions.roleInfo.name}
            </Badge>
            <div className="text-sm text-muted-foreground">
              Access to {exportOptions.allowedColumns.length} columns across {exportOptions.allowedSheets.length} sheets
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="export" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="export">Export Data</TabsTrigger>
          <TabsTrigger value="template">Download Template</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
        </TabsList>

        {/* Export Tab */}
        <TabsContent value="export" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Export Configuration
              </CardTitle>
              <CardDescription>
                Configure your export settings and download employee data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Export Format */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Export Format</label>
                <Select value={selectedFormat} onValueChange={(value: string) => setSelectedFormat(value as 'json' | 'excel')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excel">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4" />
                        Excel (.xlsx)
                      </div>
                    </SelectItem>
                    <SelectItem value="json">
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        JSON (.json)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Department Filter */}
              {exportOptions.availableDepartments.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Department</label>
                  <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {exportOptions.availableDepartments.map(dept => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Status Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Employment Status</label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {exportOptions.statusOptions.map(status => (
                      <SelectItem key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sheet Selection */}
              {exportOptions.allowedSheets.length > 1 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Sheet (Optional)</label>
                  <Select value={selectedSheet} onValueChange={setSelectedSheet}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Available Sheets</SelectItem>
                      {exportOptions.allowedSheets.map(sheet => (
                        <SelectItem key={sheet} value={sheet}>{sheet}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Export Progress */}
              {exporting && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Exporting data...</span>
                    <span>{exportProgress}%</span>
                  </div>
                  <Progress value={exportProgress} className="w-full" />
                </div>
              )}

              {/* Export Button */}
              <Button 
                onClick={handleExport} 
                disabled={exporting}
                className="w-full"
                size="lg"
              >
                {exporting ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Exporting...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Export Data
                  </div>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Template Tab */}
        <TabsContent value="template" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Excel Template
              </CardTitle>
              <CardDescription>
                Download a template file with the correct column headers for your role
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  This template contains only the columns you have access to based on your role: <strong>{exportOptions.roleInfo.name}</strong>
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <h4 className="font-medium">Template includes:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {[
                    ...Object.values(exportOptions.excelHeaders),
                    ...((exportOptions.derivedHeaders ?? []) as string[])
                  ].map((header, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      {header}
                    </div>
                  ))}
                </div>
              </div>
              
              <Button onClick={handleDownloadTemplate} className="w-full" variant="outline">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="stats" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-blue-500" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Total Employees</p>
                    <p className="text-2xl font-bold">{stats.totalEmployees}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Activity className="h-4 w-4 text-green-500" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Active Employees</p>
                    <p className="text-2xl font-bold">{stats.activeEmployees}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Building2 className="h-4 w-4 text-purple-500" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Departments</p>
                    <p className="text-2xl font-bold">{stats.totalDepartments}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Database className="h-4 w-4 text-orange-500" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Accessible Columns</p>
                    <p className="text-2xl font-bold">{stats.accessibleColumns}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Access Summary</CardTitle>
              <CardDescription>
                Overview of your data access permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Role Level</span>
                  <Badge>{exportOptions.roleInfo.name}</Badge>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Accessible Sheets</span>
                  <span className="text-sm">{stats.accessibleSheets}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Data Coverage</span>
                  <span className="text-sm">
                    {Math.round((stats.accessibleColumns / 65) * 100)}% of all fields
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmployeeExport;