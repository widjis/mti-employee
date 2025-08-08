export interface User {
  id: string;
  username: string;
  name: string;
  role: 'superadmin' | 'admin' | 'hr_general' | 'finance' | 'dep_rep' | 'employee';
  department?: string;
}

// Role-based access control matrix
export interface Permission {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
  export: boolean;
  import: boolean;
  audit: boolean;
  manage_users: boolean;
  system_config: boolean;
}

export interface RolePermissions {
  employees: Permission;
  users: Permission;
  reports: Permission;
  system: Permission;
}

// Role-based access control matrix
export const ROLE_PERMISSIONS: Record<User['role'], RolePermissions> = {
  superadmin: {
    employees: {
      create: true,
      read: true,
      update: true,
      delete: true,
      export: true,
      import: true,
      audit: true,
      manage_users: true,
      system_config: true
    },
    users: {
      create: true,
      read: true,
      update: true,
      delete: true,
      export: true,
      import: true,
      audit: true,
      manage_users: true,
      system_config: true
    },
    reports: {
      create: true,
      read: true,
      update: true,
      delete: true,
      export: true,
      import: true,
      audit: true,
      manage_users: true,
      system_config: true
    },
    system: {
      create: true,
      read: true,
      update: true,
      delete: true,
      export: true,
      import: true,
      audit: true,
      manage_users: true,
      system_config: true
    }
  },
  admin: {
    employees: {
      create: true,
      read: true,
      update: true,
      delete: true,
      export: true,
      import: true,
      audit: true,
      manage_users: false,
      system_config: false
    },
    users: {
      create: true,
      read: true,
      update: true,
      delete: true,
      export: false,
      import: false,
      audit: true,
      manage_users: true,
      system_config: false
    },
    reports: {
      create: true,
      read: true,
      update: true,
      delete: true,
      export: true,
      import: false,
      audit: true,
      manage_users: false,
      system_config: false
    },
    system: {
      create: false,
      read: true,
      update: false,
      delete: false,
      export: false,
      import: false,
      audit: true,
      manage_users: false,
      system_config: false
    }
  },
  hr_general: {
    employees: {
      create: true,
      read: true,
      update: true,
      delete: false,
      export: true,
      import: true,
      audit: false,
      manage_users: false,
      system_config: false
    },
    users: {
      create: false,
      read: false,
      update: false,
      delete: false,
      export: false,
      import: false,
      audit: false,
      manage_users: false,
      system_config: false
    },
    reports: {
      create: true,
      read: true,
      update: false,
      delete: false,
      export: true,
      import: false,
      audit: false,
      manage_users: false,
      system_config: false
    },
    system: {
      create: false,
      read: false,
      update: false,
      delete: false,
      export: false,
      import: false,
      audit: false,
      manage_users: false,
      system_config: false
    }
  },
  finance: {
    employees: {
      create: false,
      read: true,
      update: true,
      delete: false,
      export: true,
      import: false,
      audit: false,
      manage_users: false,
      system_config: false
    },
    users: {
      create: false,
      read: false,
      update: false,
      delete: false,
      export: false,
      import: false,
      audit: false,
      manage_users: false,
      system_config: false
    },
    reports: {
      create: true,
      read: true,
      update: false,
      delete: false,
      export: true,
      import: false,
      audit: false,
      manage_users: false,
      system_config: false
    },
    system: {
      create: false,
      read: false,
      update: false,
      delete: false,
      export: false,
      import: false,
      audit: false,
      manage_users: false,
      system_config: false
    }
  },
  dep_rep: {
    employees: {
      create: false,
      read: true,
      update: false,
      delete: false,
      export: true,
      import: false,
      audit: false,
      manage_users: false,
      system_config: false
    },
    users: {
      create: false,
      read: false,
      update: false,
      delete: false,
      export: false,
      import: false,
      audit: false,
      manage_users: false,
      system_config: false
    },
    reports: {
      create: false,
      read: true,
      update: false,
      delete: false,
      export: true,
      import: false,
      audit: false,
      manage_users: false,
      system_config: false
    },
    system: {
      create: false,
      read: false,
      update: false,
      delete: false,
      export: false,
      import: false,
      audit: false,
      manage_users: false,
      system_config: false
    }
  },
  employee: {
    employees: {
      create: false,
      read: true,
      update: false,
      delete: false,
      export: false,
      import: false,
      audit: false,
      manage_users: false,
      system_config: false
    },
    users: {
      create: false,
      read: false,
      update: false,
      delete: false,
      export: false,
      import: false,
      audit: false,
      manage_users: false,
      system_config: false
    },
    reports: {
      create: false,
      read: false,
      update: false,
      delete: false,
      export: false,
      import: false,
      audit: false,
      manage_users: false,
      system_config: false
    },
    system: {
      create: false,
      read: false,
      update: false,
      delete: false,
      export: false,
      import: false,
      audit: false,
      manage_users: false,
      system_config: false
    }
  }
};

// Helper function to check permissions
export const hasPermission = (
  userRole: User['role'],
  module: keyof RolePermissions,
  action: keyof Permission
): boolean => {
  return ROLE_PERMISSIONS[userRole]?.[module]?.[action] || false;
};

// Navigation items based on role
export interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  requiredPermission?: {
    module: keyof RolePermissions;
    action: keyof Permission;
  };
  children?: NavigationItem[];
}

export const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'LayoutDashboard',
    path: '/dashboard'
  },
  {
    id: 'employees',
    label: 'Employee Management',
    icon: 'Users',
    path: '/employees',
    requiredPermission: {
      module: 'employees',
      action: 'read'
    },
    children: [
      {
        id: 'employees-directory',
        label: 'Employee Directory',
        icon: 'Users',
        path: '/employees/directory',
        requiredPermission: {
          module: 'employees',
          action: 'read'
        }
      },
      {
        id: 'employees-add',
        label: 'Add Employee',
        icon: 'UserPlus',
        path: '/employees/add',
        requiredPermission: {
          module: 'employees',
          action: 'create'
        }
      },
      {
        id: 'employees-import',
        label: 'Import Employees',
        icon: 'Upload',
        path: '/employees/import',
        requiredPermission: {
          module: 'employees',
          action: 'import'
        }
      }
    ]
  },
  {
    id: 'reports',
    label: 'Reports & Analytics',
    icon: 'BarChart3',
    path: '/reports',
    requiredPermission: {
      module: 'reports',
      action: 'read'
    },
    children: [
      {
        id: 'reports-employee',
        label: 'Employee Reports',
        icon: 'FileText',
        path: '/reports/employee',
        requiredPermission: {
          module: 'reports',
          action: 'read'
        }
      },
      {
        id: 'reports-analytics',
        label: 'Analytics Dashboard',
        icon: 'TrendingUp',
        path: '/reports/analytics',
        requiredPermission: {
          module: 'reports',
          action: 'read'
        }
      }
    ]
  },
  {
    id: 'users',
    label: 'User Management',
    icon: 'UserCog',
    path: '/users',
    requiredPermission: {
      module: 'users',
      action: 'read'
    },
    children: [
      {
        id: 'users-list',
        label: 'Manage Users',
        icon: 'Users',
        path: '/users/management',
        requiredPermission: {
          module: 'users',
          action: 'manage_users'
        }
      },
      {
        id: 'users-roles',
        label: 'Role Management',
        icon: 'Shield',
        path: '/users/roles',
        requiredPermission: {
          module: 'users',
          action: 'manage_users'
        }
      },
      {
        id: 'role-matrix',
        label: 'Role Matrix Configuration',
        icon: 'Settings',
        path: '/users/role-matrix',
        requiredPermission: {
          module: 'users',
          action: 'manage_users'
        }
      }
    ]
  },
  {
    id: 'audit',
    label: 'Audit Trail',
    icon: 'History',
    path: '/audit',
    requiredPermission: {
      module: 'system',
      action: 'audit'
    }
  },
  {
    id: 'system',
    label: 'System Settings',
    icon: 'Settings',
    path: '/system',
    requiredPermission: {
      module: 'system',
      action: 'system_config'
    },
    children: [
      {
        id: 'system-config',
        label: 'Configuration',
        icon: 'Cog',
        path: '/system/config',
        requiredPermission: {
          module: 'system',
          action: 'system_config'
        }
      },
      {
        id: 'system-backup',
        label: 'Backup & Restore',
        icon: 'Database',
        path: '/system/backup',
        requiredPermission: {
          module: 'system',
          action: 'system_config'
        }
      }
    ]
  }
];

export interface Employee {
  insurance_endorsement: 'Y' | 'N' | '';
  insurance_owlexa: 'Y' | 'N' | '';
  insurance_fpg: 'Y' | 'N' | '';
  employee_id: string;
  imip_id: string;
  name: string;
  gender: 'M' | 'F' | '';
  place_of_birth: string;
  date_of_birth: Date | null;
  age: number | null;
  marital_status: string;
  tax_status: string;
  spouse_name: string;
  child_name_1: string;
  child_name_2: string;
  child_name_3: string;
  religion: string;
  nationality: string;
  blood_type: 'A' | 'B' | 'AB' | 'O' | '';
  phone_number: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  email: string;
  kartu_keluarga_no: string;
  ktp_no: string;
  address: string;
  city: string;
  point_of_hire: string;
  point_of_origin: string;
  education: string;
  schedule_type: string;
  first_join_date_merdeka: Date | null;
  transfer_merdeka: Date | null;
  first_join_date: Date | null;
  join_date: Date | null;
  employment_status: string;
  end_contract: Date | null;
  years_in_service: number | null;
  company_office: string;
  work_location: string;
  division: string;
  department: string;
  section: string;
  direct_report: string;
  job_title: string;
  grade: string;
  position_grade: string;
  group_job_title: string;
  bank_name: string;
  account_name: string;
  account_no: string;
  npwp: string;
  bpjs_tk: string
  bpjs_kes: string;
  status_bpjs_kes: string;
  travel_in: Date | null;
  travel_out: Date | null;
  terminated_date: Date | null;
  terminated_type: string;
  terminated_reason: string;
  blacklist_mti: 'Y' | 'N' | '';
  blacklist_imip: 'Y' | 'N' | '';
  kitas_no: string;
  passport_no: string;
  status: 'active' | 'inactive' | '';
}

interface AccessConfig {
  canViewRow: (row: Employee, user: User) => boolean;
  visibleFields: (keyof Employee)[];
}

export const accessConfigs: Record<User['role'], AccessConfig> = {
  superadmin: {
    canViewRow: () => true, // can view all
    visibleFields: ['insurance_endorsement',	'insurance_owlexa',	'insurance_fpg',	'employee_id',	'imip_id',	'name',	'gender',	'place_of_birth',	'date_of_birth',	'age',	'marital_status',	'tax_status',	'spouse_name',	'child_name_1',	'child_name_2',	'child_name_3',	'religion',	'nationality',	'blood_type',	'phone_number',	'emergency_contact_name',	'emergency_contact_phone',	'email',	'kartu_keluarga_no',	'ktp_no',	'address',	'city',	'point_of_hire',	'point_of_origin',	'education',	'schedule_type',	'first_join_date_merdeka',	'transfer_merdeka',	'first_join_date',	'join_date',	'employment_status',	'end_contract',	'years_in_service',	'company_office',	'work_location',	'division',	'department',	'section',	'direct_report',	'job_title',	'grade',	'position_grade',	'group_job_title',	'bank_name',	'account_name',	'account_no',	'npwp',	'bpjs_tk',	'bpjs_kes',	'status_bpjs_kes',	'travel_in',	'travel_out',	'terminated_date',	'terminated_type',	'terminated_reason',	'blacklist_mti',	'blacklist_imip',	'kitas_no',	'passport_no', 'status'],
  },
  admin: {
    canViewRow: () => true, // can view all
    visibleFields: ['insurance_endorsement',	'insurance_owlexa',	'insurance_fpg',	'employee_id',	'imip_id',	'name',	'gender',	'place_of_birth',	'date_of_birth',	'age',	'marital_status',	'tax_status',	'spouse_name',	'child_name_1',	'child_name_2',	'child_name_3',	'religion',	'nationality',	'blood_type',	'phone_number',	'emergency_contact_name',	'emergency_contact_phone',	'email',	'kartu_keluarga_no',	'ktp_no',	'address',	'city',	'point_of_hire',	'point_of_origin',	'education',	'schedule_type',	'first_join_date_merdeka',	'transfer_merdeka',	'first_join_date',	'join_date',	'employment_status',	'end_contract',	'years_in_service',	'company_office',	'work_location',	'division',	'department',	'section',	'direct_report',	'job_title',	'grade',	'position_grade',	'group_job_title',	'bank_name',	'account_name',	'account_no',	'npwp',	'bpjs_tk',	'bpjs_kes',	'status_bpjs_kes',	'travel_in',	'travel_out',	'terminated_date',	'terminated_type',	'terminated_reason',	'blacklist_mti',	'blacklist_imip',	'kitas_no',	'passport_no', 'status'],
  },
  hr_general: {
    canViewRow: () => true, // most rows, no strict filter here
    visibleFields: ['employee_id',	'imip_id',	'name',	'gender',	'place_of_birth',	'date_of_birth',	'age',	'religion',	'nationality',	'blood_type',	'phone_number',	'emergency_contact_name',	'emergency_contact_phone',	'email',	'ktp_no',	'address',	'city',	'point_of_hire',	'point_of_origin',	'education',	'schedule_type',	'first_join_date_merdeka',	'transfer_merdeka',	'first_join_date',	'join_date',	'employment_status',	'end_contract',	'years_in_service',	'company_office',	'work_location',	'division',	'department',	'section',	'direct_report',	'job_title',	'position_grade',	'group_job_title',	'terminated_date',	'terminated_type',	'terminated_reason',	'blacklist_mti',	'blacklist_imip'], // less sensitive fields
  },
  finance: {
    canViewRow: (row) => row.status === 'active', // only active users
    visibleFields: ['employee_id',	'imip_id',	'name',	'gender',	'phone_number',	'email',	'address',	'point_of_hire',	'first_join_date',	'employment_status',	'company_office',	'work_location',	'division',	'department',	'section',	'direct_report',	'job_title',	'position_grade',	'group_job_title',	'bank_name',	'account_name',	'account_no',	'npwp'], // limited fields
  },
  dep_rep: {
    canViewRow: (row, user) => row.department === user.department, // only view own department
    visibleFields: ['employee_id',	'name',	'gender',	'tax_status',	'religion',	'nationality',	'blood_type',	'phone_number',	'email',	'point_of_hire',	'schedule_type',	'first_join_date',	'join_date',	'employment_status',	'end_contract',	'years_in_service',	'department',	'section',	'job_title',	'position_grade',	'bpjs_tk',	'bpjs_kes',	'terminated_date'], // some limitations
  },
  employee: {
    canViewRow: (row, user) => row.employee_id === user.username, // only view own record
    visibleFields: ['employee_id', 'name', 'gender', 'phone_number', 'email', 'department', 'job_title', 'employment_status'], // very limited fields
  },
};

export interface LoginCredentials {
  username: string;
  password: string;
}