import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ROLE_PERMISSIONS, type User, type RolePermissions, type Permission } from '@/types/user';
import { Shield, Users, FileText, Settings, Save, RotateCcw, Filter, Table as TableIcon } from 'lucide-react';
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
        <TabsList className="grid w-full grid-cols-5">
          {/* Employee Management */}
          <TabsTrigger value={modules[0].key} className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">{modules[0].label}</span>
          </TabsTrigger>
          {/* Column Access */}
          <TabsTrigger value="column_access" className="flex items-center gap-2">
            <TableIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Column Access</span>
          </TabsTrigger>
          {/* Remaining modules */}
          {modules.slice(1).map((module) => {
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

        {/* Column Access Tab Content */}
        <TabsContent value="column_access">
          <Card>
            <CardHeader>
              <CardTitle>Column Access Matrix</CardTitle>
              <CardDescription>
                Configure per-column view, edit, and export permissions. You can flag sensitive fields anytime.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ColumnAccessMatrix />
            </CardContent>
          </Card>
        </TabsContent>
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

// Types for column matrix
type RoleItem = { role_id: number; role_name: string; role_display_name: string };
type ColumnCatalog = {
  id: number;
  table_name: string;
  column_name: string;
  display_label: string;
  data_type: string;
  is_exportable: boolean | number;
  is_sensitive: boolean | number;
  is_active: boolean | number;
};
type AccessItem = {
  column_id: number;
  table_name: string;
  column_name: string;
  display_label: string;
  data_type: string;
  can_view: boolean | number;
  can_edit: boolean | number;
  export_allowed: boolean | number;
};

const ColumnAccessMatrix: React.FC = () => {
  const { toast } = useToast();
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [columns, setColumns] = useState<ColumnCatalog[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [tableFilter, setTableFilter] = useState<string>('');
  const ALL_TABLES = '__all__';
  const [search, setSearch] = useState('');
  const [accessItems, setAccessItems] = useState<AccessItem[]>([]);
  const [changedAccess, setChangedAccess] = useState<Record<number, AccessItem>>({});
  const [changedColumns, setChangedColumns] = useState<Record<number, Partial<ColumnCatalog>>>({});
  const [saving, setSaving] = useState(false);

  const normalizeBool = (v: boolean | number | null | undefined) => Boolean(Number(v));

  // Map technical table names to user-friendly group labels
  const formatGroupLabel = (table: string) => {
    if (!table) return '';
    // Convert snake_case like 'employee_bank' to 'Employee Bank'
    return table
      .split('_')
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ');
  };

  useEffect(() => {
    const loadInitial = async () => {
      try {
        const [rRes, cRes] = await Promise.all([
          fetch('/api/column-matrix/roles'),
          fetch('/api/column-matrix/columns')
        ]);
        const rJson = await rRes.json();
        const cJson = await cRes.json();
        if (rJson.success) setRoles(rJson.roles);
        if (cJson.success) setColumns(cJson.columns);
        if (rJson.roles?.length && !selectedRoleId) setSelectedRoleId(String(rJson.roles[0].role_id));
      } catch (err) {
        toast({ title: 'Error', description: 'Failed to load roles/columns', variant: 'destructive' });
      }
    };
    loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const loadAccess = async () => {
      if (!selectedRoleId) return;
      try {
        const res = await fetch(`/api/column-matrix/access/${selectedRoleId}`);
        const json = await res.json();
        if (json.success) {
          setAccessItems(json.items);
          setChangedAccess({});
        }
      } catch (err) {
        toast({ title: 'Error', description: 'Failed to load role access', variant: 'destructive' });
      }
    };
    loadAccess();
  }, [selectedRoleId, toast]);

  const filtered = useMemo(() => {
    const byTable = tableFilter
      ? accessItems.filter(a => a.table_name === tableFilter)
      : accessItems;
    const term = search.trim().toLowerCase();
    if (!term) return byTable;
    return byTable.filter(a => `${a.table_name}.${a.column_name} ${a.display_label}`.toLowerCase().includes(term));
  }, [accessItems, tableFilter, search]);

  const tables = useMemo(() => {
    const set = new Set<string>();
    columns.forEach(c => set.add(c.table_name));
    return Array.from(set).sort();
  }, [columns]);

  const toggleAccess = (colId: number, key: keyof Pick<AccessItem, 'can_view' | 'can_edit' | 'export_allowed'>, value: boolean) => {
    setAccessItems(prev => prev.map(a => a.column_id === colId ? { ...a, [key]: value } : a));
    setChangedAccess(prev => {
      const current = accessItems.find(a => a.column_id === colId);
      const base = current ? { ...current, [key]: value } : { column_id: colId, table_name: '', column_name: '', display_label: '', data_type: '', can_view: 0, can_edit: 0, export_allowed: 0 } as AccessItem;
      return { ...prev, [colId]: base };
    });
  };

  const toggleColumnFlag = (colId: number, key: keyof Pick<ColumnCatalog, 'is_sensitive' | 'is_exportable'>, value: boolean) => {
    setColumns(prev => prev.map(c => c.id === colId ? { ...c, [key]: value } as ColumnCatalog : c));
    setChangedColumns(prev => ({ ...prev, [colId]: { ...(prev[colId] || {}), [key]: value } }));
  };

  const handleSave = async () => {
    if (!selectedRoleId) return;
    setSaving(true);
    try {
      const accessPayload = Object.values(changedAccess).map(item => ({
        columnId: item.column_id,
        can_view: normalizeBool(item.can_view),
        can_edit: normalizeBool(item.can_edit),
        export_allowed: normalizeBool(item.export_allowed),
      }));
      if (accessPayload.length) {
        const res = await fetch(`/api/column-matrix/access/${selectedRoleId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: accessPayload })
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.message || 'Failed to update access');
      }

      const columnPayload = Object.entries(changedColumns);
      for (const [colId, patch] of columnPayload) {
        const res = await fetch(`/api/column-matrix/column/${colId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch)
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.message || 'Failed to update column');
      }

      setChangedAccess({});
      setChangedColumns({});
      toast({ title: 'Saved', description: 'Column access and flags updated.' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: 'Error', description: message || 'Save failed', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-3">
          <Label>Role</Label>
          <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
            <SelectTrigger className="w-full mt-1">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {roles.map(r => (
                <SelectItem key={r.role_id} value={String(r.role_id)}>
                  {r.role_display_name || r.role_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-12 md:col-span-3">
          <Label>Group</Label>
          <Select value={tableFilter || ALL_TABLES} onValueChange={(v) => setTableFilter(v === ALL_TABLES ? '' : v)}>
            <SelectTrigger className="w-full mt-1">
              <SelectValue placeholder="All groups" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_TABLES}>All groups</SelectItem>
              {tables.map(t => (
                <SelectItem key={t} value={t}>{formatGroupLabel(t)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-12 md:col-span-4">
          <Label>Search</Label>
          <div className="relative mt-1">
            <Filter className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter columns…" className="pl-8" />
          </div>
        </div>
        <div className="col-span-12 md:col-span-2 flex items-end justify-end">
          <Button onClick={handleSave} disabled={!selectedRoleId || saving || (!Object.keys(changedAccess).length && !Object.keys(changedColumns).length)}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[220px]">Column</TableHead>
              <TableHead className="text-center">View</TableHead>
              <TableHead className="text-center">Edit</TableHead>
              <TableHead className="text-center">Export</TableHead>
              <TableHead className="text-center">Sensitive</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(item => {
              const catalog = columns.find(c => c.id === item.column_id);
              const exportable = normalizeBool(catalog?.is_exportable ?? 0);
              const sensitive = normalizeBool(catalog?.is_sensitive ?? 0);
              return (
                <TableRow key={`${item.table_name}.${item.column_name}`}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant={sensitive ? 'destructive' : 'secondary'}>{formatGroupLabel(item.table_name)}</Badge>
                      <div>
                        <div className="font-medium">{item.display_label || item.column_name}</div>
                        <div className="text-xs text-muted-foreground">{item.column_name} · {item.data_type}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch checked={Boolean(Number(item.can_view))} onCheckedChange={(v) => toggleAccess(item.column_id, 'can_view', v)} />
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch checked={Boolean(Number(item.can_edit))} onCheckedChange={(v) => toggleAccess(item.column_id, 'can_edit', v)} />
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch checked={Boolean(Number(item.export_allowed)) && exportable} onCheckedChange={(v) => toggleAccess(item.column_id, 'export_allowed', v)} disabled={!exportable} />
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch checked={sensitive} onCheckedChange={(v) => toggleColumnFlag(item.column_id, 'is_sensitive', v)} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {filtered.length === 0 && (
          <div className="p-6 text-sm text-muted-foreground">No columns match your filters.</div>
        )}
      </div>
    </div>
  );
};

export default RoleMatrix;