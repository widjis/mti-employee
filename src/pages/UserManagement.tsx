import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Users, 
  UserPlus, 
  Edit, 
  Trash2, 
  Shield, 
  Eye, 
  EyeOff,
  Settings,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  Key
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { User, ROLE_PERMISSIONS } from '@/types/user';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface UserWithPermissions extends User {
  createdAt: string;
  lastLogin?: string;
  status: 'active' | 'inactive';
  customColumns?: string[];
}

interface ColumnPermission {
  field: string;
  label: string;
  category: string;
  canView: boolean;
  canEdit: boolean;
}

const COLUMN_CATEGORIES = {
  basic: 'Basic Information',
  contact: 'Contact Information', 
  employment: 'Employment Details',
  organization: 'Organization',
  financial: 'Financial Information',
  benefits: 'Benefits & Insurance',
  termination: 'Termination Details'
};

const ALL_COLUMNS: ColumnPermission[] = [
  // Basic Information
  { field: 'employee_id', label: 'Employee ID', category: 'basic', canView: true, canEdit: false },
  { field: 'name', label: 'Full Name', category: 'basic', canView: true, canEdit: true },
  { field: 'gender', label: 'Gender', category: 'basic', canView: true, canEdit: true },
  { field: 'date_of_birth', label: 'Date of Birth', category: 'basic', canView: true, canEdit: true },
  { field: 'place_of_birth', label: 'Place of Birth', category: 'basic', canView: true, canEdit: true },
  { field: 'age', label: 'Age', category: 'basic', canView: true, canEdit: false },
  { field: 'marital_status', label: 'Marital Status', category: 'basic', canView: true, canEdit: true },
  { field: 'religion', label: 'Religion', category: 'basic', canView: true, canEdit: true },
  { field: 'nationality', label: 'Nationality', category: 'basic', canView: true, canEdit: true },
  { field: 'blood_type', label: 'Blood Type', category: 'basic', canView: true, canEdit: true },
  
  // Contact Information
  { field: 'phone_number', label: 'Phone Number', category: 'contact', canView: true, canEdit: true },
  { field: 'email', label: 'Email', category: 'contact', canView: true, canEdit: true },
  { field: 'address', label: 'Address', category: 'contact', canView: true, canEdit: true },
  { field: 'city', label: 'City', category: 'contact', canView: true, canEdit: true },
  { field: 'ktp_no', label: 'KTP Number', category: 'contact', canView: true, canEdit: true },
  { field: 'emergency_contact_name', label: 'Emergency Contact', category: 'contact', canView: true, canEdit: true },
  
  // Employment Details
  { field: 'join_date', label: 'Join Date', category: 'employment', canView: true, canEdit: true },
  { field: 'employment_status', label: 'Employment Status', category: 'employment', canView: true, canEdit: true },
  { field: 'years_in_service', label: 'Years in Service', category: 'employment', canView: true, canEdit: false },
  { field: 'point_of_hire', label: 'Point of Hire', category: 'employment', canView: true, canEdit: true },
  { field: 'education', label: 'Education', category: 'employment', canView: true, canEdit: true },
  
  // Organization
  { field: 'department', label: 'Department', category: 'organization', canView: true, canEdit: true },
  { field: 'division', label: 'Division', category: 'organization', canView: true, canEdit: true },
  { field: 'section', label: 'Section', category: 'organization', canView: true, canEdit: true },
  { field: 'job_title', label: 'Job Title', category: 'organization', canView: true, canEdit: true },
  { field: 'position_grade', label: 'Position Grade', category: 'organization', canView: true, canEdit: true },
  { field: 'direct_report', label: 'Direct Report', category: 'organization', canView: true, canEdit: true },
  { field: 'work_location', label: 'Work Location', category: 'organization', canView: true, canEdit: true },
  
  // Financial Information
  { field: 'bank_name', label: 'Bank Name', category: 'financial', canView: true, canEdit: true },
  { field: 'account_name', label: 'Account Name', category: 'financial', canView: true, canEdit: true },
  { field: 'account_no', label: 'Account Number', category: 'financial', canView: true, canEdit: true },
  { field: 'npwp', label: 'NPWP', category: 'financial', canView: true, canEdit: true },
  
  // Benefits & Insurance
  { field: 'bpjs_tk', label: 'BPJS TK', category: 'benefits', canView: true, canEdit: true },
  { field: 'bpjs_kes', label: 'BPJS Kesehatan', category: 'benefits', canView: true, canEdit: true },
  { field: 'insurance_endorsement', label: 'Insurance Card', category: 'benefits', canView: true, canEdit: true },
  
  // Termination Details
  { field: 'terminated_date', label: 'Termination Date', category: 'termination', canView: true, canEdit: true },
  { field: 'terminated_type', label: 'Termination Type', category: 'termination', canView: true, canEdit: true },
  { field: 'terminated_reason', label: 'Termination Reason', category: 'termination', canView: true, canEdit: true }
];

const UserManagement: React.FC = () => {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithPermissions[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserWithPermissions | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPermissionDialogOpen, setIsPermissionDialogOpen] = useState(false);
  const [isPasswordResetDialogOpen, setIsPasswordResetDialogOpen] = useState(false);
  const [userPermissions, setUserPermissions] = useState<ColumnPermission[]>([]);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [newUser, setNewUser] = useState({
    username: '',
    name: '',
    role: 'employee' as User['role'],
    department: '',
    password: ''
  });

  // Check if current user has permission to manage users
  const canManageUsers = user?.role === 'superadmin' || 
    (user?.role && ROLE_PERMISSIONS[user.role]?.users?.manage_users);

  useEffect(() => {
    if (canManageUsers) {
      fetchUsers();
    }
  }, [canManageUsers]);

  // Debug selectedUser changes
  useEffect(() => {
    if (selectedUser) {
      console.log('selectedUser changed:', selectedUser);
      console.log('selectedUser.role:', selectedUser.role);
    }
  }, [selectedUser]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      } else {
        toast({
          title: "Error",
          description: "Failed to load users",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to connect to server",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newUser)
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "User created successfully"
        });
        setIsCreateDialogOpen(false);
        setNewUser({ username: '', name: '', role: 'employee', department: '', password: '' });
        fetchUsers();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.message || "Failed to create user",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: "Failed to create user",
        variant: "destructive"
      });
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    
    try {
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: selectedUser.name,
          role: selectedUser.role,
          department: selectedUser.department,
          status: selectedUser.status
        })
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "User updated successfully"
        });
        setIsEditDialogOpen(false);
        setSelectedUser(null);
        fetchUsers();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.message || "Failed to update user",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive"
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "User deleted successfully"
        });
        fetchUsers();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.message || "Failed to delete user",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive"
      });
    }
  };

  const handlePasswordReset = async () => {
    if (!selectedUser) return;
    
    // Check if current user can reset this user's password
    if (user?.id !== selectedUser.id) {
      // Only superadmin and admin can reset other users' passwords
      if (!['superadmin', 'admin'].includes(user?.role || '')) {
        toast({
          title: "Access Denied",
          description: "Only superadmin and admin users can reset other users' passwords. Your current role is '" + user?.role + "'.",
          variant: "destructive"
        });
        return;
      }
      
      // Admin users cannot reset passwords for admin or superadmin users
      if (user?.role === 'admin' && ['admin', 'superadmin'].includes(selectedUser.role || '')) {
        toast({
          title: "Access Denied",
          description: "Admin users cannot reset passwords for other admin or superadmin users.",
          variant: "destructive"
        });
        return;
      }
    }
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive"
      });
      return;
    }
    
    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const response = await fetch(`/api/users/${selectedUser.id}/password`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          newPassword: newPassword
        })
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Password reset successfully"
        });
        setIsPasswordResetDialogOpen(false);
        setSelectedUser(null);
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.message || "Failed to reset password",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      toast({
        title: "Error",
        description: "Failed to reset password",
        variant: "destructive"
      });
    }
  };

  const openPermissionDialog = async (user: UserWithPermissions) => {
    setSelectedUser(user);
    
    // Initialize permissions based on user's role
    const rolePermissions = ALL_COLUMNS.map(col => ({
      ...col,
      canView: user.customColumns ? user.customColumns.includes(col.field) : 
               (user.role || 'user') === 'superadmin' || (user.role || 'user') === 'admin',
      canEdit: (user.role || 'user') === 'superadmin' || (user.role || 'user') === 'admin'
    }));
    
    setUserPermissions(rolePermissions);
    setIsPermissionDialogOpen(true);
  };

  const handleSavePermissions = async () => {
    if (!selectedUser) return;
    
    const allowedColumns = userPermissions
      .filter(perm => perm.canView)
      .map(perm => perm.field);
    
    try {
      const response = await fetch(`/api/users/${selectedUser.id}/permissions`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ allowedColumns })
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Permissions updated successfully"
        });
        setIsPermissionDialogOpen(false);
        fetchUsers();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.message || "Failed to update permissions",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error updating permissions:', error);
      toast({
        title: "Error",
        description: "Failed to update permissions",
        variant: "destructive"
      });
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'superadmin': return 'bg-red-100 text-red-800';
      case 'admin': return 'bg-blue-100 text-blue-800';
      case 'hr_general': return 'bg-green-100 text-green-800';
      case 'finance': return 'bg-yellow-100 text-yellow-800';
      case 'dep_rep': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!canManageUsers) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access user management.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading users...</div>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
      {/* Current User Role Info */}
      <Alert className="border-blue-200 bg-blue-50">
        <Tooltip>
          <TooltipTrigger asChild>
            <Shield className="h-4 w-4" />
          </TooltipTrigger>
          <TooltipContent>
            <p>Your current role and permissions context</p>
          </TooltipContent>
        </Tooltip>
        <AlertDescription>
          You are logged in as <strong>{user?.name}</strong> with <strong>{user?.role?.replace('_', ' ').toUpperCase()}</strong> role.
          {user?.role === 'superadmin' && (
            <span className="block mt-1 text-sm">
              As a superadmin, you can view and manage all users including other superadmins.
            </span>
          )}
        </AlertDescription>
      </Alert>
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage users, roles, and column-level permissions
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Add a new user to the system with appropriate role and permissions.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  placeholder="Enter username"
                />
              </div>
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value as User['role'] })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="dep_rep">Department Representative</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="hr_general">HR General</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    {user?.role === 'superadmin' && (
                      <SelectItem value="superadmin">Super Admin</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={newUser.department}
                  onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                  placeholder="Enter department"
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="Enter password"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateUser}>
                Create User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            System Users
          </CardTitle>
          <CardDescription>
            Manage user accounts, roles, and permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((userItem) => (
              <div key={userItem.id} className={`flex items-center justify-between p-4 border rounded-lg ${
                userItem.role === 'superadmin' ? 'border-red-200 bg-red-50' : ''
              }`}>
                <div className="flex items-center space-x-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    userItem.role === 'superadmin' ? 'bg-red-100' : 'bg-blue-100'
                  }`}>
                    <Users className={`h-5 w-5 ${
                      userItem.role === 'superadmin' ? 'text-red-600' : 'text-blue-600'
                    }`} />
                  </div>
                  <div>
                    <div className="font-medium">{userItem.name}</div>
                    <div className="text-sm text-muted-foreground">@{userItem.username}</div>
                    {userItem.department && (
                      <div className="text-sm text-muted-foreground">{userItem.department}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className={getRoleBadgeColor(userItem.role || 'user')}>
                    {(userItem.role || 'user').replace('_', ' ').toUpperCase()}
                  </Badge>
                  <Badge variant={userItem.status === 'active' ? 'default' : 'secondary'}>
                    {userItem.status}
                  </Badge>
                  {/* Auth Type Badge */}
                  {userItem.auth_type && (
                    <Badge variant="outline" className={userItem.auth_type === 'domain' ? 'border-purple-300 text-purple-700' : 'border-gray-300 text-gray-700'}>
                      {userItem.auth_type === 'domain' ? 'DOMAIN' : 'LOCAL'}
                    </Badge>
                  )}
                  <div className="flex space-x-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        console.log('Edit button clicked, user data:', userItem);
                        console.log('User role:', userItem.role);
                        setSelectedUser(userItem);
                        setIsEditDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {/* Password reset button - conditional rendering based on user permissions */}
                    {(
                      user?.role === 'superadmin' || 
                      (user?.role === 'admin' && !['admin', 'superadmin'].includes(userItem.role || '')) ||
                      user?.id === userItem.id
                    ) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(userItem);
                          setIsPasswordResetDialogOpen(true);
                        }}
                      >
                        <Key className="h-4 w-4" />
                      </Button>
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openPermissionDialog(userItem)}
                        >
                          <Shield className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Manage column permissions
                      </TooltipContent>
                    </Tooltip>
                    {userItem.id !== user?.id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteUser(userItem.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and role.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              {/* Auth Info */}
              <Alert className="bg-slate-50 border-slate-200">
                <AlertDescription>
                  Authentication: <strong>{selectedUser.auth_type === 'domain' ? 'Domain' : 'Local'}</strong>
                  {selectedUser.auth_type === 'domain' && selectedUser.domain_username && (
                    <span className="ml-2 text-sm text-muted-foreground">(AD: {selectedUser.domain_username})</span>
                  )}
                </AlertDescription>
              </Alert>
              <div>
                <Label htmlFor="edit-name">Full Name</Label>
                <Input
                  id="edit-name"
                  value={selectedUser.name}
                  onChange={(e) => setSelectedUser({ ...selectedUser, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-role">Role</Label>
                <Select 
                  value={selectedUser.role || 'employee'} 
                  onValueChange={(value) => setSelectedUser({ ...selectedUser, role: value as User['role'] })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="dep_rep">Department Representative</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="hr_general">HR General</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    {user?.role === 'superadmin' && (
                      <SelectItem value="superadmin">Super Admin</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-department">Department</Label>
                <Input
                  id="edit-department"
                  value={selectedUser.department || ''}
                  onChange={(e) => setSelectedUser({ ...selectedUser, department: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-status">Status</Label>
                <Select 
                  value={selectedUser.status} 
                  onValueChange={(value) => setSelectedUser({ ...selectedUser, status: value as 'active' | 'inactive' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateUser}>
              Update User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Column Permissions Dialog */}
      <Dialog open={isPermissionDialogOpen} onOpenChange={setIsPermissionDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Column Permissions</DialogTitle>
            <DialogDescription>
              Configure which columns {selectedUser?.name} can view and edit.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-96">
            <div className="space-y-6">
              {Object.entries(COLUMN_CATEGORIES).map(([category, label]) => {
                const categoryColumns = userPermissions.filter(col => col.category === category);
                if (categoryColumns.length === 0) return null;
                
                return (
                  <div key={category} className="space-y-3">
                    <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                      {label}
                    </h4>
                    <div className="grid grid-cols-1 gap-3">
                      {categoryColumns.map((column, index) => {
                        const permIndex = userPermissions.findIndex(p => p.field === column.field);
                        return (
                          <div key={column.field} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center space-x-3">
                              <Checkbox
                                checked={column.canView}
                                onCheckedChange={(checked) => {
                                  const newPermissions = [...userPermissions];
                                  newPermissions[permIndex].canView = checked as boolean;
                                  if (!checked) {
                                    newPermissions[permIndex].canEdit = false;
                                  }
                                  setUserPermissions(newPermissions);
                                }}
                              />
                              <div>
                                <div className="font-medium text-sm">{column.label}</div>
                                <div className="text-xs text-muted-foreground">{column.field}</div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {column.canView ? (
                                <Eye className="h-4 w-4 text-green-600" />
                              ) : (
                                <EyeOff className="h-4 w-4 text-gray-400" />
                              )}
                              {column.canEdit && (
                                <Edit className="h-4 w-4 text-blue-600" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPermissionDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePermissions}>
              <Save className="h-4 w-4 mr-2" />
              Save Permissions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Reset Dialog */}
      <Dialog open={isPasswordResetDialogOpen} onOpenChange={setIsPasswordResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Reset password for {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>
            <div>
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsPasswordResetDialogOpen(false);
                setNewPassword('');
                setConfirmPassword('');
              }}
            >
              Cancel
            </Button>
            <Button onClick={handlePasswordReset}>
              <Key className="h-4 w-4 mr-2" />
              Reset Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default UserManagement;