import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  User, 
  Key, 
  Shield, 
  Eye, 
  EyeOff,
  CheckCircle,
  AlertCircle,
  Crown,
  ShieldCheck,
  Users2,
  Calculator,
  Building2
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
// DashboardLayout provided by router; remove local wrapper
import { cn } from '@/lib/utils';

const UserProfile: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  if (!user) return null;

  // Role badge configuration
  const roleBadgeConfig = {
    superadmin: {
      icon: Crown,
      label: 'Super Admin',
      className: 'bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0',
      description: 'Full system access with all administrative privileges'
    },
    admin: {
      icon: ShieldCheck,
      label: 'Administrator',
      className: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0',
      description: 'Administrative access with user and employee management'
    },
    hr_general: {
      icon: Users2,
      label: 'HR General',
      className: 'bg-gradient-to-r from-green-600 to-emerald-600 text-white border-0',
      description: 'Human resources access with employee data management'
    },
    finance: {
      icon: Calculator,
      label: 'Finance',
      className: 'bg-gradient-to-r from-orange-600 to-red-600 text-white border-0',
      description: 'Financial data access and reporting capabilities'
    },
    dep_rep: {
      icon: Building2,
      label: 'Department Representative',
      className: 'bg-gradient-to-r from-gray-600 to-slate-600 text-white border-0',
      description: 'Department-specific employee data access'
    },
    employee: {
      icon: User,
      label: 'Employee',
      className: 'bg-gradient-to-r from-slate-600 to-gray-600 text-white border-0',
      description: 'Basic employee access to personal information'
    }
  };

  const roleConfig = roleBadgeConfig[user.role];
  const RoleIcon = roleConfig.icon;

  const handlePasswordChange = async () => {
    // Validation
    if (!currentPassword) {
      toast({
        title: "Error",
        description: "Current password is required",
        variant: "destructive"
      });
      return;
    }

    if (!newPassword) {
      toast({
        title: "Error",
        description: "New password is required",
        variant: "destructive"
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive"
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "New password must be at least 6 characters long",
        variant: "destructive"
      });
      return;
    }

    if (currentPassword === newPassword) {
      toast({
        title: "Error",
        description: "New password must be different from current password",
        variant: "destructive"
      });
      return;
    }

    setIsChangingPassword(true);

    try {
      await api.put(`/api/users/${user.id}/password`, {
        currentPassword,
        newPassword,
      });

      {
        toast({
          title: "Success",
          description: "Password changed successfully",
          action: (
            <CheckCircle className="h-4 w-4 text-green-600" />
          )
        });
        
        // Clear form
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      toast({
        title: "Error",
        description: "Failed to change password. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center space-x-2">
          <User className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">User Profile</h1>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Your account details and role information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold">{user.name}</h3>
                  <p className="text-sm text-muted-foreground">@{user.username}</p>
                  {user.department && (
                    <p className="text-sm text-muted-foreground">{user.department}</p>
                  )}
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium">Role & Permissions</Label>
                  <div className="mt-2">
                    <Badge className={cn('text-sm', roleConfig.className)}>
                      <RoleIcon className="w-4 h-4 mr-2" />
                      {roleConfig.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {roleConfig.description}
                  </p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">User ID</Label>
                  <p className="text-sm text-muted-foreground mt-1">{user.id}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Password Change */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Change Password
              </CardTitle>
              <CardDescription>
                Update your account password for security
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Choose a strong password with at least 6 characters. Your new password should be different from your current one.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="current-password">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="current-password"
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter your current password"
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter your new password"
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your new password"
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
              
              <Button 
                onClick={handlePasswordChange}
                disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
                className="w-full"
              >
                {isChangingPassword ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Changing Password...
                  </>
                ) : (
                  <>
                    <Key className="h-4 w-4 mr-2" />
                    Change Password
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
  );
};

export default UserProfile;
import { api } from '@/lib/apiClient';