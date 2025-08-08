import React from 'react';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ExcelUpload from '@/components/ExcelUpload';
import { hasPermission } from '@/types/user';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, AlertTriangle, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

const ImportEmployees: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  // Check if user has import permission
  const canImportData = hasPermission(user.role, 'employees', 'import');

  const downloadTemplate = () => {
    toast({
      title: "Template Download",
      description: "Excel template download started",
    });

    const link = document.createElement('a');
    link.href = './template_data.xlsx';
    link.download = 'employee_template.xlsx';
    link.click();
  };

  if (!canImportData) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-foreground">Import Employees</h2>
              <p className="text-muted-foreground">
                Bulk upload employee data using Excel files
              </p>
            </div>
          </div>

          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You don't have permission to import employee data. Please contact your administrator.
            </AlertDescription>
          </Alert>
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
            <h2 className="text-3xl font-bold text-foreground flex items-center space-x-2">
              <Upload className="h-8 w-8" />
              <span>Import Employees</span>
            </h2>
            <p className="text-muted-foreground mt-2">
              Upload Excel files to add or update multiple employee records at once
            </p>
          </div>
          <Button onClick={downloadTemplate} variant="outline" className="flex items-center space-x-2">
            <Download className="h-4 w-4" />
            <span>Download Template</span>
          </Button>
        </div>

        {/* Instructions Card */}
        <Card>
          <CardHeader>
            <CardTitle>Before You Start</CardTitle>
            <CardDescription>
              Please review these important guidelines for successful data import
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-foreground">File Requirements</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Excel format (.xlsx or .xls)</li>
                  <li>• Maximum file size: 10MB</li>
                  <li>• First row must contain column headers</li>
                  <li>• Required column: Employee ID</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-foreground">Data Guidelines</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Use consistent date formats (YYYY-MM-DD)</li>
                  <li>• Ensure Employee IDs are unique</li>
                  <li>• Validate email addresses</li>
                  <li>• Check department names match existing ones</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upload Component */}
        <ExcelUpload />

        {/* Additional Information */}
        <Card>
          <CardHeader>
            <CardTitle>Import Process</CardTitle>
            <CardDescription>
              Understanding how the import process works
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-primary font-bold">1</span>
                </div>
                <h4 className="font-medium">Upload File</h4>
                <p className="text-sm text-muted-foreground">
                  Select and upload your Excel file with employee data
                </p>
              </div>
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-primary font-bold">2</span>
                </div>
                <h4 className="font-medium">Validation</h4>
                <p className="text-sm text-muted-foreground">
                  System validates data format and checks for errors
                </p>
              </div>
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-primary font-bold">3</span>
                </div>
                <h4 className="font-medium">Import</h4>
                <p className="text-sm text-muted-foreground">
                  Valid records are imported into the database
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ImportEmployees;