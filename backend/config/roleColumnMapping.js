/**
 * Role-based column mapping configuration
 * Maps Excel column names to database fields for different user roles
 */

// Template database fields (from template_data.xlsx)
const TEMPLATE_FIELDS = [
  'insurance_endorsement', 'insurance_owlexa', 'insurance_fpg', 'employee_id', 'imip_id',
  'name', 'gender', 'place_of_birth', 'date_of_birth', 'age', 'marital_status', 'tax_status',
  'spouse_name', 'child_name_1', 'child_name_2', 'child_name_3', 'religion', 'nationality',
  'blood_type', 'phone_number', 'emergency_contact_name', 'emergency_contact_phone', 'email',
  'kartu_keluarga_no', 'ktp_no', 'address', 'city', 'point_of_hire', 'point_of_origin',
  'education', 'schedule_type', 'first_join_date_merdeka', 'transfer_merdeka', 'first_join_date',
  'join_date', 'employment_status', 'end_contract', 'years_in_service', 'company_office',
  'work_location', 'division', 'department', 'section', 'direct_report', 'job_title',
  'grade', 'position_grade', 'group_job_title', 'bank_name', 'account_name', 'account_no',
  'npwp', 'bpjs_tk', 'bpjs_kes', 'status_bpjs_kes', 'travel_in', 'travel_out',
  'terminated_date', 'terminated_type', 'terminated_reason', 'blacklist_mti', 'blacklist_imip',
  'kitas_no', 'passport_no', 'status'
];

// Column mapping from Excel headers to database fields
const COLUMN_MAPPING = {
  // Basic Info
  'Emp. ID': 'employee_id',
  'IMIP ID': 'imip_id',
  'Employee Name': 'name',
  'Gender': 'gender',
  'Place of Birth': 'place_of_birth',
  'Date of Birth': 'date_of_birth',
  'Age': 'age',
  'Marital Status': 'marital_status',
  'Tax Status': 'tax_status',
  'Religion': 'religion',
  'Nationality': 'nationality',
  'Blood Type': 'blood_type',
  
  // Contact Info
  'Mobile Phone': 'phone_number',
  'Emergency Contact': 'emergency_contact_name',
  'Email': 'email',
  'KTP No': 'ktp_no',
  'KTP Address': 'address',
  'KTP City': 'city',
  
  // Employment Info
  'Poin of Hire': 'point_of_hire',
  'POH': 'point_of_hire',
  'Poin of Origin': 'point_of_origin',
  'Education': 'education',
  'Schedule Type': 'schedule_type',
  'First Join Date (Merdeka Group)': 'first_join_date_merdeka',
  'Transfer Merdeka Group': 'transfer_merdeka',
  'First Join Date': 'first_join_date',
  'Join Date': 'join_date',
  'Employment Status': 'employment_status',
  'End Contract': 'end_contract',
  'Years in Service': 'years_in_service',
  
  // Organization
  'Branch ID': 'company_office',
  'Branch': 'company_office',
  'Company Office': 'company_office',
  'Work Location': 'work_location',
  'Division': 'division',
  'Department': 'department',
  'Section': 'section',
  'Direct Report': 'direct_report',
  'Job Tittle': 'job_title',
  'Position Grade': 'position_grade',
  'Group Job Tittle': 'group_job_title',
  
  // Financial Info
  'Bank Name': 'bank_name',
  'Account Name': 'account_name',
  'Account No': 'account_no',
  'NPWP': 'npwp',
  
  // Insurance & Benefits
  'Insurance (Card)': 'insurance_endorsement',
  'BPJS TK': 'bpjs_tk',
  'BPJS KES': 'bpjs_kes',
  
  // Termination
  'Terminated Date': 'terminated_date',
  'Terminated Type': 'terminated_type',
  'Terminated Reason': 'terminated_reason',
  'Black List MTI': 'blacklist_mti',
  'Black List IMIP': 'blacklist_imip',
  
  // Travel
  'Travel In': 'travel_in',
  'Travel Out': 'travel_out',
  'KITAS No': 'kitas_no',
  'Passport No': 'passport_no',
  
  // Status
  'Status': 'status'
};

// Role-based column access configuration
const ROLE_COLUMN_ACCESS = {
  'admin': {
    name: 'Administrator',
    description: 'Full access to all employee data',
    columns: TEMPLATE_FIELDS, // Full access
    sheets: ['Active Empl (IND)', 'Non Active (IND)', 'Active Empl (CHN)', 'Non Active (CHN)']
  },
  
  'hr_general': {
    name: 'HR Operation',
    description: 'Comprehensive HR data access',
    columns: [
      'employee_id', 'imip_id', 'name', 'gender', 'place_of_birth', 'date_of_birth', 'age',
      'religion', 'nationality', 'blood_type', 'phone_number', 'emergency_contact_name',
      'email', 'ktp_no', 'address', 'city', 'point_of_hire', 'point_of_origin', 'education',
      'schedule_type', 'first_join_date_merdeka', 'transfer_merdeka', 'first_join_date',
      'join_date', 'employment_status', 'end_contract', 'years_in_service', 'company_office',
      'work_location', 'division', 'department', 'section', 'direct_report', 'job_title',
      'position_grade', 'group_job_title', 'terminated_date', 'terminated_type',
      'terminated_reason', 'blacklist_mti', 'blacklist_imip'
    ],
    sheets: ['Active Empl (IND)', 'Non Active (IND)', 'Active Empl (CHN)', 'Non Active (CHN)']
  },
  
  'finance': {
    name: 'Finance',
    description: 'Financial and payroll related data',
    columns: [
      'employee_id', 'imip_id', 'name', 'gender', 'phone_number', 'email', 'address',
      'point_of_hire', 'department', 'section', 'direct_report', 'job_title',
      'position_grade', 'group_job_title', 'bank_name', 'account_name', 'account_no',
      'npwp', 'first_join_date', 'employment_status', 'company_office', 'work_location',
      'division'
    ],
    sheets: ['Active Empl (IND)', 'Active Empl (CHN)']
  },
  
  'dept_admin': {
    name: 'Department Admin',
    description: 'Department-specific employee data',
    columns: [
      'employee_id', 'name', 'gender', 'tax_status', 'religion', 'nationality',
      'blood_type', 'phone_number', 'email', 'point_of_hire', 'department', 'section',
      'direct_report', 'job_title', 'position_grade', 'group_job_title', 'employment_status',
      'company_office', 'work_location', 'division', 'first_join_date', 'end_contract',
      'years_in_service'
    ],
    sheets: ['Active Empl (IND)', 'Non Active (IND)', 'Active Empl (CHN)', 'Non Active (CHN)']
  },
  
  'employee': {
    name: 'Employee',
    description: 'Basic employee information',
    columns: [
      'employee_id', 'name', 'gender', 'phone_number', 'email', 'department',
      'section', 'job_title', 'employment_status', 'company_office', 'work_location'
    ],
    sheets: ['Active Empl (IND)', 'Active Empl (CHN)']
  }
};

// Excel column headers for each role (for export)
const ROLE_EXCEL_HEADERS = {
  'admin': {
    'employee_id': 'Emp. ID',
    'imip_id': 'IMIP ID',
    'name': 'Employee Name',
    'gender': 'Gender',
    'place_of_birth': 'Place of Birth',
    'date_of_birth': 'Date of Birth',
    'age': 'Age',
    'marital_status': 'Marital Status',
    'tax_status': 'Tax Status',
    'religion': 'Religion',
    'nationality': 'Nationality',
    'blood_type': 'Blood Type',
    'phone_number': 'Mobile Phone',
    'emergency_contact_name': 'Emergency Contact',
    'email': 'Email',
    'ktp_no': 'KTP No',
    'address': 'KTP Address',
    'city': 'KTP City',
    'point_of_hire': 'Point of Hire',
    'point_of_origin': 'Point of Origin',
    'education': 'Education',
    'schedule_type': 'Schedule Type',
    'first_join_date_merdeka': 'First Join Date (Merdeka Group)',
    'transfer_merdeka': 'Transfer Merdeka Group',
    'first_join_date': 'First Join Date',
    'join_date': 'Join Date',
    'employment_status': 'Employment Status',
    'end_contract': 'End Contract',
    'years_in_service': 'Years in Service',
    'company_office': 'Company Office',
    'work_location': 'Work Location',
    'division': 'Division',
    'department': 'Department',
    'section': 'Section',
    'direct_report': 'Direct Report',
    'job_title': 'Job Title',
    'position_grade': 'Position Grade',
    'group_job_title': 'Group Job Title',
    'bank_name': 'Bank Name',
    'account_name': 'Account Name',
    'account_no': 'Account No',
    'npwp': 'NPWP',
    'bpjs_tk': 'BPJS TK',
    'bpjs_kes': 'BPJS KES',
    'status_bpjs_kes': 'Status BPJS KES',
    'travel_in': 'Travel In',
    'travel_out': 'Travel Out',
    'terminated_date': 'Terminated Date',
    'terminated_type': 'Terminated Type',
    'terminated_reason': 'Terminated Reason',
    'blacklist_mti': 'Black List MTI',
    'blacklist_imip': 'Black List IMIP',
    'kitas_no': 'KITAS No',
    'passport_no': 'Passport No',
    'status': 'Status',
    'insurance_endorsement': 'Insurance (Card)',
    'insurance_owlexa': 'Insurance Owlexa',
    'insurance_fpg': 'Insurance FPG'
  },
  
  'hr_general': {
    'employee_id': 'Emp. ID',
    'imip_id': 'IMIP ID',
    'name': 'Employee Name',
    'gender': 'Gender',
    'place_of_birth': 'Place of Birth',
    'date_of_birth': 'Date of Birth',
    'age': 'Age',
    'religion': 'Religion',
    'nationality': 'Nationality',
    'blood_type': 'Blood Type',
    'phone_number': 'Mobile Phone',
    'emergency_contact_name': 'Emergency Contact',
    'email': 'Email',
    'ktp_no': 'KTP No',
    'address': 'KTP Address',
    'city': 'KTP City',
    'point_of_hire': 'Point of Hire',
    'point_of_origin': 'Point of Origin',
    'education': 'Education',
    'schedule_type': 'Schedule Type',
    'first_join_date_merdeka': 'First Join Date (Merdeka Group)',
    'transfer_merdeka': 'Transfer Merdeka Group',
    'first_join_date': 'First Join Date',
    'join_date': 'Join Date',
    'employment_status': 'Employment Status',
    'end_contract': 'End Contract',
    'years_in_service': 'Years in Service',
    'company_office': 'Company Office',
    'work_location': 'Work Location',
    'division': 'Division',
    'department': 'Department',
    'section': 'Section',
    'direct_report': 'Direct Report',
    'job_title': 'Job Title',
    'position_grade': 'Position Grade',
    'group_job_title': 'Group Job Title',
    'terminated_date': 'Terminated Date',
    'terminated_type': 'Terminated Type',
    'terminated_reason': 'Terminated Reason',
    'blacklist_mti': 'Black List MTI',
    'blacklist_imip': 'Black List IMIP'
  },
  
  'finance': {
    'employee_id': 'Emp. ID',
    'imip_id': 'IMIP ID',
    'name': 'Employee Name',
    'gender': 'Gender',
    'phone_number': 'Mobile Phone',
    'email': 'Email',
    'address': 'KTP Address',
    'point_of_hire': 'Point of Hire',
    'department': 'Department',
    'section': 'Section',
    'direct_report': 'Direct Report',
    'job_title': 'Job Title',
    'position_grade': 'Position Grade',
    'group_job_title': 'Group Job Title',
    'bank_name': 'Bank Name',
    'account_name': 'Account Name',
    'account_no': 'Account No',
    'npwp': 'NPWP',
    'first_join_date': 'First Join Date',
    'employment_status': 'Employment Status',
    'company_office': 'Company Office',
    'work_location': 'Work Location',
    'division': 'Division'
  },
  
  'dept_admin': {
    'employee_id': 'Emp. ID',
    'name': 'Employee Name',
    'gender': 'Gender',
    'tax_status': 'Tax Status',
    'religion': 'Religion',
    'nationality': 'Nationality',
    'blood_type': 'Blood Type',
    'phone_number': 'Mobile Phone',
    'email': 'Email',
    'point_of_hire': 'Point of Hire',
    'department': 'Department',
    'section': 'Section',
    'direct_report': 'Direct Report',
    'job_title': 'Job Title',
    'position_grade': 'Position Grade',
    'group_job_title': 'Group Job Title',
    'employment_status': 'Employment Status',
    'company_office': 'Company Office',
    'work_location': 'Work Location',
    'division': 'Division',
    'first_join_date': 'First Join Date',
    'end_contract': 'End Contract',
    'years_in_service': 'Years in Service'
  },
  
  'employee': {
    'employee_id': 'Emp. ID',
    'name': 'Employee Name',
    'gender': 'Gender',
    'phone_number': 'Mobile Phone',
    'email': 'Email',
    'department': 'Department',
    'section': 'Section',
    'job_title': 'Job Title',
    'employment_status': 'Employment Status',
    'company_office': 'Company Office',
    'work_location': 'Work Location'
  }
};

/**
 * Get allowed columns for a specific role
 * @param {string} role - User role
 * @returns {Array} Array of allowed column names
 */
function getAllowedColumns(role) {
  return ROLE_COLUMN_ACCESS[role]?.columns || [];
}

/**
 * Get allowed sheets for a specific role
 * @param {string} role - User role
 * @returns {Array} Array of allowed sheet names
 */
function getAllowedSheets(role) {
  return ROLE_COLUMN_ACCESS[role]?.sheets || [];
}

/**
 * Get Excel headers for a specific role
 * @param {string} role - User role
 * @returns {Object} Mapping of database fields to Excel headers
 */
function getExcelHeaders(role) {
  return ROLE_EXCEL_HEADERS[role] || {};
}

/**
 * Filter employee data based on role permissions
 * @param {Array} employees - Array of employee objects
 * @param {string} role - User role
 * @returns {Array} Filtered employee data
 */
function filterEmployeeDataByRole(employees, role) {
  const allowedColumns = getAllowedColumns(role);
  
  return employees.map(employee => {
    const filteredEmployee = {};
    allowedColumns.forEach(column => {
      if (employee.hasOwnProperty(column)) {
        filteredEmployee[column] = employee[column];
      }
    });
    return filteredEmployee;
  });
}

/**
 * Get role information
 * @param {string} role - User role
 * @returns {Object} Role information
 */
function getRoleInfo(role) {
  return ROLE_COLUMN_ACCESS[role] || null;
}

export {
  TEMPLATE_FIELDS,
  COLUMN_MAPPING,
  ROLE_COLUMN_ACCESS,
  ROLE_EXCEL_HEADERS,
  getAllowedColumns,
  getAllowedSheets,
  getExcelHeaders,
  filterEmployeeDataByRole,
  getRoleInfo
};