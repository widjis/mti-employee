import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { ROLE_PERMISSIONS, type User, type RolePermissions, type Permission } from '@/types/user';
import { Shield, Users, FileText, Settings, Save, RotateCcw } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';

const RoleMatrix: React.FC = () => {
  const { toast } = useToast();
  const [permissions, setPermissions] = useState<typeof ROLE_PERMISSIONS>(ROLE_PERMISSIONS);
  const [hasChanges, setHasChanges] = useState(false);

  const modules = [
    { key: 'employees', label: 'Employee Management', icon: Users },
    { key: 'users', label: 'User Management', icon: Shield },
    { key: 'reports', label: 'Reports & Analytics', icon: FileText },
    { key: 'system', label: 'System Administration', icon: Settings },
  ] as const;

  const actions = [
    { key: 'read', label: 'Read' },
    { key: 'create', label: 'Create' },
    { key: 'update', label: 'Update' },
    { key: 'delete', label: 'Delete' },
    { key: 'manage_users', label: 'Manage Users' },
  ] satisfies ReadonlyArray<{ key: keyof Permission; label: string }>;

  const roles = Object.keys(permissions) as User['role'][];

  const handlePermissionChange = (
    role: User['role'],
    module: keyof RolePermissions,
    action: keyof Permission,
    value: boolean
  ) => {
    setPermissions(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        [module]: {
          ...prev[role][module],
          [action]: value
        }
      }
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      // Here you would typically send the permissions to your backend
      // await updateRolePermissions(permissions);
      
      toast({
        title: "Success",
        description: "Role permissions updated successfully.",
      });
      setHasChanges(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update role permissions.",
        variant: "destructive",
      });
    }
  };

  const handleReset = () => {
    setPermissions(ROLE_PERMISSIONS);
    setHasChanges(false);
    toast({
      title: "Reset",
      description: "Permissions reset to default values.",
    });
  };

  const getRoleColor = (role: User['role']) => {
    switch (role) {
      case 'superadmin': return 'bg-red-100 text-red-800';
      case 'admin': return 'bg-blue-100 text-blue-800';
      case 'hr_general': return 'bg-green-100 text-green-800';
      case 'finance': return 'bg-yellow-100 text-yellow-800';
      case 'dep_rep': return 'bg-purple-100 text-purple-800';
      case 'employee': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Role Matrix Configuration</h1>
          <p className="text-muted-foreground mt-2">
            Configure permissions for each role across different modules
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={!hasChanges}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      {hasChanges && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-yellow-800">
              <Settings className="h-4 w-4" />
              <span className="text-sm font-medium">You have unsaved changes</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue={modules[0].key} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <TabsTrigger key={module.key} value={module.key} className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{module.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {modules.map((module) => (
          <TabsContent key={module.key} value={module.key}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <module.icon className="h-5 w-5" />
                  {module.label} Permissions
                </CardTitle>
                <CardDescription>
                  Configure what each role can do in the {module.label.toLowerCase()} module
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px]">Role</TableHead>
                        {actions.map((action) => (
                          <TableHead key={action.key} className="text-center">
                            {action.label}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {roles.map((role) => (
                        <TableRow key={role}>
                          <TableCell>
                            <Badge className={getRoleColor(role)}>
                              {role.charAt(0).toUpperCase() + role.slice(1)}
                            </Badge>
                          </TableCell>
                          {actions.map((action) => {
                            const moduleKey = module.key as keyof RolePermissions;
                            const modulePerms: Permission = permissions[role][moduleKey];
                            const hasPermission = modulePerms[action.key] === true;
                            
                            return (
                              <TableCell key={action.key} className="text-center">
                                <Switch
                                  checked={hasPermission}
                                  onCheckedChange={(checked) =>
                                    handlePermissionChange(
                                      role,
                                      module.key as keyof RolePermissions,
                                      action.key,
                                      checked
                                    )
                                  }
                                />
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Permission Summary</CardTitle>
          <CardDescription>
            Overview of all role permissions across modules
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map((role) => {
              const rolePerms = permissions[role];
              const totalPermissions = modules.reduce((total, module) => {
                const modulePerms = rolePerms[module.key as keyof RolePermissions];
                if (modulePerms && typeof modulePerms === 'object') {
                  return total + Object.values(modulePerms).filter(Boolean).length;
                }
                return total;
              }, 0);

              return (
                <Card key={role} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={getRoleColor(role)}>
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {totalPermissions} permissions
                    </span>
                  </div>
                  <div className="space-y-1">
                    {modules.map((module) => {
                      const modulePerms = rolePerms[module.key as keyof RolePermissions];
                      const modulePermCount = modulePerms && typeof modulePerms === 'object'
                        ? Object.values(modulePerms).filter(Boolean).length
                        : 0;
                      
                      return (
                        <div key={module.key} className="flex justify-between text-xs">
                          <span>{module.label}</span>
                          <span className="text-muted-foreground">{modulePermCount}</span>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
      </div>
    </DashboardLayout>
  );
};

export default RoleMatrix;