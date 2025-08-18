import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import AddEmployeeFormContent from '@/components/AddEmployeeFormContent';
import { Employee, hasPermission } from '@/types/user';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const AddEmployee = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();


  // Check permissions
  const canCreateEmployees = hasPermission(user.role, 'employees', 'create');

  // Redirect if no permission
  if (!canCreateEmployees) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-muted-foreground mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You don't have permission to add employees.</p>
            <Button 
              onClick={() => navigate('/dashboard')} 
              className="mt-4"
              variant="outline"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const handleAddEmployeeSave = (newEmployee: Employee) => {
    // The AddEmployeeForm component handles the API call
    toast({
      title: "Employee Added",
      description: `${newEmployee.name} has been added successfully.`,
    });
    
    // Navigate back to employee directory after successful addition
    navigate('/employees/directory');
  };

  const handleCancel = () => {
    navigate('/employees/directory');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              onClick={() => navigate('/employees/directory')} 
              variant="outline" 
              size="sm"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div>
              <h2 className="text-3xl font-bold text-foreground flex items-center">
                <UserPlus className="mr-3 h-8 w-8" />
                Add New Employee
              </h2>
              <p className="text-muted-foreground">
                Create a new employee record with complete information.
              </p>
            </div>
          </div>
        </div>

        {/* Add Employee Form Card */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Employee Information</CardTitle>
            <CardDescription>
              Fill in all required fields to create a new employee record. 
              Fields marked with * are required.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {/* Use the existing AddEmployeeForm component but without modal wrapper */}
            <div className="p-6">
              <AddEmployeeFormContent
                onAdd={handleAddEmployeeSave}
                onClose={handleCancel}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AddEmployee;