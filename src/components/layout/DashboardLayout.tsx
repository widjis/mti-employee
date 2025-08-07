import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Building, LogOut, Settings, User, Shield, Eye } from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();

  if (!user) return null;

  const isAdmin = user.role === 'admin';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card shadow-sm">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <img src="/favicon.png" alt="MTI Logo" className="w-20 h-15"/>
              <h1 className="text-xl font-bold text-foreground">MTI Employee Dashboard</h1>
            </div>
            <Badge 
              variant={isAdmin ? "default" : "secondary"}
              className={isAdmin ? "bg-admin hover:bg-admin-hover" : "bg-viewer hover:bg-viewer-hover"}
            >
              {isAdmin ? (
                <>
                  <Shield className="w-3 h-3 mr-1" />
                  Admin Access
                </>
              ) : (
                <>
                  <Eye className="w-3 h-3 mr-1" />
                  Viewer Access
                </>
              )}
            </Badge>
          </div>

          <div className="flex items-center space-x-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="relative h-8 w-8 rounded-full">
                  <User className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                className="w-56 bg-popover border shadow-lg z-50" 
                align="end" 
                forceMount
              >
                <DropdownMenuItem 
                  className="cursor-pointer text-destructive focus:text-destructive"
                  onClick={logout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;