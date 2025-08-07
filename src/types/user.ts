export interface User {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'hr_general' | 'finance' | 'dep_rep';
  department?: string;
}

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
};

export interface LoginCredentials {
  username: string;
  password: string;
}