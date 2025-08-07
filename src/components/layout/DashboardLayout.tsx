import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { LogOut, User, Menu, Crown, ShieldCheck, Users2, Calculator, Building2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import Sidebar from './Sidebar';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) return null;

  const isAdmin = user.role === 'admin' || user.role === 'superadmin';
  
  // Role badge configuration
  const roleBadgeConfig = {
    superadmin: {
      icon: Crown,
      label: 'Super Admin',
      className: 'bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0',
    },
    admin: {
      icon: ShieldCheck,
      label: 'Administrator',
      className: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0',
    },
    hr_general: {
      icon: Users2,
      label: 'HR General',
      className: 'bg-gradient-to-r from-green-600 to-emerald-600 text-white border-0',
    },
    finance: {
      icon: Calculator,
      label: 'Finance',
      className: 'bg-gradient-to-r from-orange-600 to-red-600 text-white border-0',
    },
    dep_rep: {
      icon: Building2,
      label: 'Department Rep',
      className: 'bg-gradient-to-r from-gray-600 to-slate-600 text-white border-0',
    },
  };

  const roleConfig = roleBadgeConfig[user.role];
  const RoleIcon = roleConfig.icon;

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      
      {/* Main Content Area */}
      <div className={cn(
        'transition-all duration-200 ease-in-out',
        'lg:ml-64' // Always offset by sidebar width on large screens
      )}>
        {/* Header */}
        <header className="border-b bg-card shadow-sm sticky top-0 z-30">
          <div className="flex h-16 items-center justify-between px-4 lg:px-6">
            <div className="flex items-center space-x-4">
              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              
              <div className="flex items-center space-x-2">
                <img src="/favicon.png" alt="MTI Logo" className="w-8 h-8 lg:w-10 lg:h-10"/>
                <h1 className="text-lg lg:text-xl font-bold text-foreground hidden sm:block">
                  MTI Employee Dashboard
                </h1>
                <h1 className="text-lg font-bold text-foreground sm:hidden">
                  MTI
                </h1>
              </div>
              
              {/* Role Badge */}
              <Badge className={cn('text-xs hidden md:flex', roleConfig.className)}>
                <RoleIcon className="w-3 h-3 mr-1" />
                {roleConfig.label}
              </Badge>
            </div>

            <div className="flex items-center space-x-2 lg:space-x-4">
              {/* User Info - Desktop */}
              <div className="hidden lg:flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">
                    {user.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    @{user.username}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              </div>
              
              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="relative h-8 w-8 rounded-full lg:hidden">
                    <User className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  className="w-56 bg-popover border shadow-lg z-50" 
                  align="end" 
                  forceMount
                >
                  <div className="px-3 py-2 border-b">
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">@{user.username}</p>
                    <Badge className={cn('text-xs mt-2', roleConfig.className)}>
                      <RoleIcon className="w-3 h-3 mr-1" />
                      {roleConfig.label}
                    </Badge>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="cursor-pointer text-destructive focus:text-destructive"
                    onClick={logout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              {/* Desktop Logout */}
              <Button
                variant="ghost"
                size="sm"
                className="hidden lg:flex text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={logout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;