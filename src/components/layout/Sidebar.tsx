import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { hasPermission, NAVIGATION_ITEMS, NavigationItem } from '@/types/user';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  List,
  Upload,
  BarChart3,
  FileText,
  TrendingUp,
  UserCog,
  Shield,
  History,
  Settings,
  Cog,
  Database,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Crown,
  ShieldCheck,
  Eye,
  Building2,
  Calculator,
  Users2
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

// Icon mapping
const iconMap = {
  LayoutDashboard,
  Users,
  UserPlus,
  List,
  Upload,
  BarChart3,
  FileText,
  TrendingUp,
  UserCog,
  Shield,
  History,
  Settings,
  Cog,
  Database,
};

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

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const isMobile = useIsMobile();

  if (!user) return null;

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const renderNavigationItem = (item: NavigationItem, level = 0) => {
    // Check if user has permission to view this item
    if (item.requiredPermission) {
      const hasAccess = hasPermission(
        user.role,
        item.requiredPermission.module,
        item.requiredPermission.action
      );
      if (!hasAccess) return null;
    }

    const IconComponent = iconMap[item.icon as keyof typeof iconMap];
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.id);
    const isActive = window.location.pathname === item.path;

    if (hasChildren) {
      return (
        <Collapsible
          key={item.id}
          open={isExpanded}
          onOpenChange={() => toggleExpanded(item.id)}
        >
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                'w-full justify-start h-10 px-3 py-2 text-sm font-medium transition-colors',
                level > 0 && 'ml-4 w-[calc(100%-1rem)]',
                isActive && 'bg-accent text-accent-foreground',
                'hover:bg-accent hover:text-accent-foreground'
              )}
            >
              {IconComponent && <IconComponent className="mr-3 h-4 w-4" />}
              <span className="flex-1 text-left">{item.label}</span>
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1">
            {item.children?.map(child => renderNavigationItem(child, level + 1))}
          </CollapsibleContent>
        </Collapsible>
      );
    }

    return (
      <Button
        key={item.id}
        variant="ghost"
        className={cn(
          'w-full justify-start h-10 px-3 py-2 text-sm font-medium transition-colors',
          level > 0 && 'ml-4 w-[calc(100%-1rem)]',
          isActive && 'bg-accent text-accent-foreground',
          'hover:bg-accent hover:text-accent-foreground'
        )}
        onClick={() => {
          if (item.path) {
            navigate(item.path);
            // Only auto-close on true mobile (sheet/overlay)
            if (isMobile) {
              onToggle();
            }
          }
        }}
      >
        {IconComponent && <IconComponent className="mr-3 h-4 w-4" />}
        <span className="flex-1 text-left">{item.label}</span>
      </Button>
    );
  };

  const roleConfig = roleBadgeConfig[user.role];
  const RoleIcon = roleConfig.icon;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden" 
          onClick={onToggle}
        />
      )}
      
      {/* Sidebar */}
      <div
        className={cn(
          // Remove forced lg:translate-x-0 so desktop can fully hide
          'fixed left-0 top-0 z-50 h-full w-64 transform bg-card border-r transition-transform duration-200 ease-in-out lg:fixed',
          isOpen
            ? 'translate-x-0 lg:translate-x-0'
            : '-translate-x-full lg:-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b">
          <div className="flex items-center space-x-2">
            <img src="/favicon.png" alt="MTI Logo" className="w-8 h-8" />
            <span className="font-semibold text-sm">MTI Dashboard</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={onToggle}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* User Info */}
        <div className="p-4 border-b">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                {user.name.charAt(0).toUpperCase()}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {user.name}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                @{user.username}
              </p>
            </div>
          </div>
          <div className="mt-3">
            <Badge className={cn('text-xs', roleConfig.className)}>
              <RoleIcon className="w-3 h-3 mr-1" />
              {roleConfig.label}
            </Badge>
          </div>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-1">
            {NAVIGATION_ITEMS.map(item => renderNavigationItem(item))}
          </nav>
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t">
          <div className="text-xs text-muted-foreground text-center">
            <p>MTI Employee Management</p>
            <p>Version 2.0.0</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;