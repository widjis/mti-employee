import express from 'express';
import { sql, poolPromise } from './db.js';
import xlsx from 'xlsx';
import multer from 'multer';

const router = express.Router();

router.post('/employees', async (req, res) => {
  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin();
    const data = req.body;
    const request = new sql.Request(transaction);

    await request
      .input('employee_id', sql.VarChar, data.employee_id)
      .input('imip_id', sql.VarChar, data.imip_id)
      .input('name', sql.VarChar, data.name)
      .input('gender', sql.Char, data.gender)
      .input('place_of_birth', sql.VarChar, data.place_of_birth)
      .input('date_of_birth', sql.Date, data.date_of_birth)
      .input('nationality', sql.VarChar, data.nationality)
      .input('blood_type', sql.Char, data.blood_type)
      .input('marital_status', sql.VarChar, data.marital_status)
      .input('tax_status', sql.VarChar, data.tax_status)
      .input('religion', sql.VarChar, data.religion)
      .input('education', sql.VarChar, data.education)
      .input('age', sql.Int, data.age)
      .input('kartu_keluarga_no', sql.VarChar, data.kartu_keluarga_no)
      .input('ktp_no', sql.VarChar, data.ktp_no)
      .input('npwp', sql.VarChar, data.npwp)
      .query(`INSERT INTO dbo.employee_core (employee_id, imip_id, name, gender, date_of_birth, 
                          place_of_birth, nationality, blood_type, marital_status, tax_status, religion, 
                          education, age, kartu_keluarga_no, ktp_no, npwp)
              VALUES (@employee_id, @imip_id, @name, @gender, @date_of_birth, 
                      @place_of_birth, @nationality, @blood_type, @marital_status, @tax_status, @religion, 
                      @education, @age, @kartu_keluarga_no, @ktp_no, @npwp)`);

    const employmentRequest = new sql.Request(transaction);
    await employmentRequest
      .input('employee_id', sql.VarChar, data.employee_id)
      .input('company_office', sql.VarChar, data.company_office)
      .input('work_location', sql.VarChar, data.work_location)
      .input('division', sql.VarChar, data.division)
      .input('department', sql.VarChar, data.department)
      .input('section', sql.VarChar, data.section)
      .input('direct_report', sql.VarChar, data.direct_report)
      .input('job_title', sql.VarChar, data.job_title)
      .input('grade', sql.Int, data.grade)
      .input('position_grade', sql.VarChar, data.position_grade)
      .input('group_job_title', sql.VarChar, data.group_job_title)
      .input('terminated_date', sql.Date, data.terminated_date)
      .input('terminated_type', sql.VarChar, data.terminated_type)
      .input('terminated_reason', sql.VarChar, data.terminated_reason)
      .input('blacklist_mti', sql.Char, data.blacklist_mti)
      .input('blacklist_imip', sql.Char, data.blacklist_imip)
      .input('status', sql.VarChar, data.status)
      .query(`INSERT INTO dbo.employee_employment (employee_id, company_office, work_location, division, 
                                                  department, section, direct_report, job_title, grade, position_grade, 
                                                  group_job_title, terminated_date, terminated_type, terminated_reason, blacklist_mti, blacklist_imip, status)
              VALUES (@employee_id, @company_office, @work_location, @division, 
                      @department, @section, @direct_report, @job_title, @grade, @position_grade, 
                      @group_job_title, @terminated_date, @terminated_type, @terminated_reason, @blacklist_mti, @blacklist_imip, @status);`);

    const bankRequest = new sql.Request(transaction);
    await bankRequest
      .input('employee_id', sql.VarChar, data.employee_id)
      .input('bank_name', sql.VarChar, data.bank_name)
      .input('account_no', sql.VarChar, data.account_no)
      .input('account_name', sql.VarChar, data.account_name)
      .query(`INSERT INTO dbo.employee_bank (employee_id, bank_name, account_no, account_name)
              VALUES (@employee_id, @bank_name, @account_no , @account_name)`);

    const insuranceRequest = new sql.Request(transaction);
    await insuranceRequest
      .input('employee_id', sql.VarChar, data.employee_id)
      .input('insurance_endorsement', sql.Char, data.insurance_endorsement)
      .input('insurance_owlexa', sql.Char, data.insurance_owlexa)
      .input('insurance_fpg', sql.Char, data.insurance_fpg)
      .input('bpjs_tk', sql.VarChar, data.bpjs_tk)
      .input('bpjs_kes', sql.VarChar, data.bpjs_kes)
      .input('status_bpjs_kes', sql.VarChar, data.status_bpjs_kes)
      .query(`INSERT INTO dbo.employee_insurance (employee_id, insurance_endorsement, insurance_owlexa, insurance_fpg, bpjs_tk, bpjs_kes, status_bpjs_kes)
              VALUES (@employee_id, @insurance_endorsement, @insurance_owlexa, @insurance_fpg, @bpjs_tk, @bpjs_kes, @status_bpjs_kes)`);

    // Insert employee_travel
    const travelRequest = new sql.Request(transaction);
    await travelRequest
      .input('employee_id', sql.VarChar, data.employee_id)
      .input('travel_in', sql.Date, data.travel_in)
      .input('travel_out', sql.Date, data.travel_out)
      .input('passport_no', sql.VarChar, data.passport_no)
      .input('kitas_no', sql.VarChar, data.kitas_no)
      .query(`INSERT INTO dbo.employee_travel (employee_id, travel_in, travel_out, passport_no, kitas_no)
              VALUES (@employee_id, @travel_in, @travel_out, @passport_no, @kitas_no)`);

    // Insert employee_contact
    const contactRequest = new sql.Request(transaction);
    await contactRequest
      .input('employee_id', sql.VarChar, data.employee_id)
      .input('phone_number', sql.VarChar, data.phone_number)
      .input('email', sql.VarChar, data.email)
      .input('address', sql.VarChar, data.address)
      .input('city', sql.VarChar, data.city)
      .input('emergency_contact_name', sql.VarChar, data.emergency_contact_name)
      .input('emergency_contact_phone', sql.VarChar, data.emergency_contact_phone)
      .input('spouse_name', sql.VarChar, data.spouse_name)
      .input('child_name_1', sql.VarChar, data.child_name_1)
      .input('child_name_2', sql.VarChar, data.child_name_2)
      .input('child_name_3', sql.VarChar, data.child_name_3)
      .query(`INSERT INTO dbo.employee_contact (employee_id, phone_number, email, address, city, emergency_contact_name, 
                          emergency_contact_phone, spouse_name, child_name_1, child_name_2, child_name_3)
              VALUES (@employee_id, @phone_number, @email, @address, @city, @emergency_contact_name, 
                        @emergency_contact_phone, @spouse_name, @child_name_1, @child_name_2, @child_name_3)`);

    // Insert employee_onboard
    const onboardRequest = new sql.Request(transaction);
    await onboardRequest
      .input('employee_id', sql.VarChar, data.employee_id)
      .input('point_of_hire', sql.VarChar, data.point_of_hire)
      .input('point_of_origin', sql.VarChar, data.point_of_origin)
      .input('schedule_type', sql.VarChar, data.schedule_type)
      .input('first_join_date_merdeka', sql.Date, data.first_join_date_merdeka)
      .input('transfer_merdeka', sql.Date, data.transfer_merdeka)
      .input('first_join_date', sql.Date, data.first_join_date)
      .input('join_date', sql.Date, data.join_date)
      .input('employment_status', sql.VarChar, data.employment_status)
      .input('end_contract', sql.Date, data.end_contract)
      .input('years_in_service', sql.Int, data.years_in_service)
      .query(`INSERT INTO dbo.employee_onboard (employee_id, point_of_hire, point_of_origin, schedule_type, 
                                                first_join_date_merdeka, transfer_merdeka, first_join_date, 
                                                join_date, employment_status, end_contract, years_in_service)
              VALUES (@employee_id, @point_of_hire, @point_of_origin, @schedule_type, 
                      @first_join_date_merdeka, @transfer_merdeka, @first_join_date, 
                      @join_date, @employment_status, @end_contract, @years_in_service)`);
    await transaction.commit();
    res.status(201).send({ message: 'Employee added successfully' });
  }
  catch (error) {
    console.error("SQL transaction error:", error);
    try {
      await transaction.rollback();
    }
    catch (rollbackError) {
      console.error("Rollback failed:", rollbackError);
    }
    res.status(500).json({ message: 'Failed to add employee', error: error.message });
  }
});

// Update employee (PUT)
router.put('/employees/:employee_id', async (req, res) => {
  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin();
    const employee_id = req.params.employee_id;
    const data = req.body;

    // Update dbo.employee_core
    const coreRequest = new sql.Request(transaction);
    await coreRequest
      .input('employee_id', sql.VarChar, employee_id)
      .input('imip_id', sql.VarChar, data.imip_id)
      .input('name', sql.VarChar, data.name)
      .input('gender', sql.Char, data.gender)
      .input('place_of_birth', sql.VarChar, data.place_of_birth)
      .input('date_of_birth', sql.Date, data.date_of_birth)
      .input('nationality', sql.VarChar, data.nationality)
      .input('blood_type', sql.Char, data.blood_type)
      .input('marital_status', sql.VarChar, data.marital_status)
      .input('tax_status', sql.VarChar, data.tax_status)
      .input('religion', sql.VarChar, data.religion)
      .input('education', sql.VarChar, data.education)
      .input('age', sql.Int, data.age)
      .input('kartu_keluarga_no', sql.VarChar, data.kartu_keluarga_no)
      .input('ktp_no', sql.VarChar, data.ktp_no)
      .input('npwp', sql.VarChar, data.npwp)
      .query(`UPDATE dbo.employee_core
              SET imip_id=@imip_id, name=@name, gender=@gender, place_of_birth=@place_of_birth, date_of_birth=@date_of_birth,
                  nationality=@nationality, blood_type=@blood_type, marital_status=@marital_status, tax_status=@tax_status,
                  religion=@religion, education=@education, age=@age, kartu_keluarga_no=@kartu_keluarga_no, ktp_no=@ktp_no, npwp=@npwp
              WHERE employee_id=@employee_id`);

    // Update dbo.employee_employment
    const employmentRequest = new sql.Request(transaction);
    await employmentRequest
      .input('employee_id', sql.VarChar, employee_id)
      .input('company_office', sql.VarChar, data.company_office)
      .input('work_location', sql.VarChar, data.work_location)
      .input('division', sql.VarChar, data.division)
      .input('department', sql.VarChar, data.department)
      .input('section', sql.VarChar, data.section)
      .input('direct_report', sql.VarChar, data.direct_report)
      .input('job_title', sql.VarChar, data.job_title)
      .input('grade', sql.Int, data.grade)
      .input('position_grade', sql.VarChar, data.position_grade)
      .input('group_job_title', sql.VarChar, data.group_job_title)
      .input('terminated_date', sql.Date, data.terminated_date)
      .input('terminated_type', sql.VarChar, data.terminated_type)
      .input('terminated_reason', sql.VarChar, data.terminated_reason)
      .input('blacklist_mti', sql.Char, data.blacklist_mti)
      .input('blacklist_imip', sql.Char, data.blacklist_imip)
      .input('status', sql.VarChar, data.status)
      .query(`UPDATE dbo.employee_employment
              SET company_office=@company_office, work_location=@work_location, division=@division, department=@department,
                  section=@section, direct_report=@direct_report, job_title=@job_title, grade=@grade,
                  position_grade=@position_grade, group_job_title=@group_job_title, terminated_date=@terminated_date,
                  terminated_type=@terminated_type, terminated_reason=@terminated_reason, blacklist_mti=@blacklist_mti,
                  blacklist_imip=@blacklist_imip, status=@status
              WHERE employee_id=@employee_id`);

    // Update dbo.employee_bank
    const bankRequest = new sql.Request(transaction);
    await bankRequest
      .input('employee_id', sql.VarChar, employee_id)
      .input('bank_name', sql.VarChar, data.bank_name)
      .input('account_no', sql.VarChar, data.account_no)
      .input('account_name', sql.VarChar, data.account_name)
      .query(`UPDATE dbo.employee_bank
              SET bank_name=@bank_name, account_no=@account_no, account_name=@account_name
              WHERE employee_id=@employee_id`);

    const insuranceRequest = new sql.Request(transaction);
    await insuranceRequest
      .input('employee_id', sql.VarChar, employee_id)
      .input('insurance_endorsement', sql.Char, data.insurance_endorsement)
      .input('insurance_owlexa', sql.Char, data.insurance_owlexa)
      .input('insurance_fpg', sql.Char, data.insurance_fpg)
      .input('bpjs_tk', sql.VarChar, data.bpjs_tk)
      .input('bpjs_kes', sql.VarChar, data.bpjs_kes)
      .input('status_bpjs_kes', sql.VarChar, data.status_bpjs_kes)
      .query(`UPDATE dbo.employee_insurance
              SET insurance_endorsement=@insurance_endorsement, insurance_owlexa=@insurance_owlexa, insurance_fpg=@insurance_fpg,
                  bpjs_tk=@bpjs_tk, bpjs_kes=@bpjs_kes, status_bpjs_kes=@status_bpjs_kes
              WHERE employee_id=@employee_id`);

    // Insert employee_travel
    const travelRequest = new sql.Request(transaction);
    await travelRequest
      .input('employee_id', sql.VarChar, data.employee_id)
      .input('travel_in', sql.Date, data.travel_in)
      .input('travel_out', sql.Date, data.travel_out)
      .input('passport_no', sql.VarChar, data.passport_no)
      .input('kitas_no', sql.VarChar, data.kitas_no)
      .query(`UPDATE dbo.employee_travel 
              SET employee_id = @employee_id, travel_in = @travel_in, travel_out = @travel_out, passport_no = @passport_no, kitas_no = @kitas_no
              WHERE employee_id = @employee_id`);

    // Insert employee_contact
    const contactRequest = new sql.Request(transaction);
    await contactRequest
      .input('employee_id', sql.VarChar, data.employee_id)
      .input('phone_number', sql.VarChar, data.phone_number)
      .input('email', sql.VarChar, data.email)
      .input('address', sql.VarChar, data.address)
      .input('city', sql.VarChar, data.city)
      .input('emergency_contact_name', sql.VarChar, data.emergency_contact_name)
      .input('emergency_contact_phone', sql.VarChar, data.emergency_contact_phone)
      .input('spouse_name', sql.VarChar, data.spouse_name)
      .input('child_name_1', sql.VarChar, data.child_name_1)
      .input('child_name_2', sql.VarChar, data.child_name_2)
      .input('child_name_3', sql.VarChar, data.child_name_3)
      .query(`UPDATE dbo.employee_contact
              SET employee_id = @employee_id, phone_number = @phone_number, 
                email = @email, address = @address, city = @city, 
                emergency_contact_name = @emergency_contact_name, emergency_contact_phone = @emergency_contact_phone, 
                spouse_name = @spouse_name, child_name_1 = @child_name_1, 
                child_name_2 = @child_name_2, child_name_3 = @child_name_3
              WHERE employee_id = @employee_id`);

    // Insert employee_onboard
    const onboardRequest = new sql.Request(transaction);
    await onboardRequest
      .input('employee_id', sql.VarChar, data.employee_id)
      .input('point_of_hire', sql.VarChar, data.point_of_hire)
      .input('point_of_origin', sql.VarChar, data.point_of_origin)
      .input('schedule_type', sql.VarChar, data.schedule_type)
      .input('first_join_date_merdeka', sql.Date, data.first_join_date_merdeka)
      .input('transfer_merdeka', sql.Date, data.transfer_merdeka)
      .input('first_join_date', sql.Date, data.first_join_date)
      .input('join_date', sql.Date, data.join_date)
      .input('employment_status', sql.VarChar, data.employment_status)
      .input('end_contract', sql.Date, data.end_contract)
      .input('years_in_service', sql.Int, data.years_in_service)
      .query(`UPDATE dbo.employee_onboard
              SET employee_id = @employee_id, point_of_hire = @point_of_hire, point_of_origin = @point_of_origin, 
                schedule_type = @schedule_type, first_join_date_merdeka = @first_join_date_merdeka, 
                transfer_merdeka = @transfer_merdeka, first_join_date = @first_join_date, 
                join_date = @join_date , employment_status = @employment_status, 
                end_contract = @end_contract, years_in_service = @years_in_service
              WHERE employee_id = @employee_id`);

    await transaction.commit();
    res.json({ message: 'Employee updated successfully' });
  }
  catch (error) {
    console.error("SQL transaction update error:", error);
    try {
      await transaction.rollback();
    }
    catch (rollbackError) {
      console.error("Rollback failed:", rollbackError);
    }
    res.status(500).json({ message: 'Failed to update employee', error: error.message });
  }
});


// DELETE employee by ID
router.delete('/employees/:employee_id', async (req, res) => {
  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();
    const employee_id = req.params.employee_id;

    // Execute queries **one by one**, awaiting each before continuing
    let request = new sql.Request(transaction);
    await request.input('employee_id', sql.VarChar, employee_id)
      .query('DELETE FROM dbo.employee_travel WHERE employee_id=@employee_id');

    request = new sql.Request(transaction);
    await request.input('employee_id', sql.VarChar, employee_id)
      .query('DELETE FROM dbo.employee_contact WHERE employee_id=@employee_id');

    request = new sql.Request(transaction);
    await request.input('employee_id', sql.VarChar, employee_id)
      .query('DELETE FROM dbo.employee_onboard WHERE employee_id=@employee_id');

    request = new sql.Request(transaction);
    await request.input('employee_id', sql.VarChar, employee_id)
      .query('DELETE FROM dbo.employee_insurance WHERE employee_id=@employee_id');

    request = new sql.Request(transaction);
    await request.input('employee_id', sql.VarChar, employee_id)
      .query('DELETE FROM dbo.employee_bank WHERE employee_id=@employee_id');

    request = new sql.Request(transaction);
    await request.input('employee_id', sql.VarChar, employee_id)
      .query('DELETE FROM dbo.employee_employment WHERE employee_id=@employee_id');

    request = new sql.Request(transaction);
    await request.input('employee_id', sql.VarChar, employee_id)
      .query('DELETE FROM dbo.employee_core WHERE employee_id=@employee_id');

    await transaction.commit();
    res.json({ message: `Employee ${employee_id} deleted successfully.` });
  }
  catch (error) {
    console.error('SQL transaction delete error:', error);
    try {
      await transaction.rollback();
    }
    catch (rollbackError) {
      console.error('Rollback failed:', rollbackError);
    }
    res.status(500).json({ message: 'Failed to delete employee', error: error.message });
  }
});

// Get all employees with joined tables
router.get('/employees', async (req, res) => {
  try {
    const pool = await poolPromise;
    const query = `
     SELECT 
     ecore.*,
     ebank.bank_name,
     ebank.account_name,
     ebank.account_no,
     econtact.phone_number,
     econtact.email,
     econtact.address,
     econtact.city,
     econtact.emergency_contact_name,
     econtact.emergency_contact_phone,
     econtact.spouse_name,
     econtact.child_name_1,
     econtact.child_name_2,
     econtact.child_name_3,
     eemployment.company_office,
     eemployment.work_location,
     eemployment.division,
     eemployment.department,
     eemployment.section,
     eemployment.direct_report,
     eemployment.job_title,
     eemployment.grade,
     eemployment.position_grade,
     eemployment.group_job_title,
     eemployment.terminated_date,
     eemployment.terminated_type,
     eemployment.terminated_reason,
     eemployment.blacklist_mti,
     eemployment.blacklist_imip,
     eemployment.status,
     einsurance.insurance_endorsement,
     einsurance.insurance_owlexa,
     einsurance.insurance_fpg,
     einsurance.bpjs_tk,
     einsurance.bpjs_kes,
     einsurance.status_bpjs_kes,
     eonboard.point_of_hire,
     eonboard.point_of_origin,
     eonboard.schedule_type,
     eonboard.first_join_date_merdeka,
     eonboard.transfer_merdeka,
     eonboard.first_join_date,
     eonboard.join_date,
     eonboard.employment_status,
     eonboard.end_contract,
     eonboard.years_in_service,
     etravel.travel_in,
     etravel.travel_out,
     etravel.passport_no,
     etravel.kitas_no
     
     FROM dbo.employee_core ecore
     LEFT JOIN dbo.employee_bank ebank ON ecore.employee_id = ebank.employee_id
     LEFT JOIN dbo.employee_contact econtact ON ecore.employee_id = econtact.employee_id
     LEFT JOIN dbo.employee_employment eemployment ON ecore.employee_id = eemployment.employee_id
     LEFT JOIN dbo.employee_insurance einsurance ON ecore.employee_id = einsurance.employee_id
     LEFT JOIN dbo.employee_onboard eonboard ON ecore.employee_id = eonboard.employee_id
     LEFT JOIN dbo.employee_travel etravel ON ecore.employee_id = etravel.employee_id
     `;
    const result = await pool.request().query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only Excel files allowed'));
  },
  storage: multer.memoryStorage(),
});

function excelDateToJSDate(serial) {
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);
  return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate());
}

function parseExcelDate(value) {
  if (typeof value === 'number') return excelDateToJSDate(value);
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (value) {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}



function safeString(val) {
  if (val === undefined || val === null) return null;
  return String(val);
}

router.post('/employees/upload', upload.single('file'), async (req, res) => {
  if (!req.file)
    return res.status(400).json({ success: false, message: 'No file uploaded', processedRows: 0, errors: ['No file uploaded'] });

  try {
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(worksheet, { defval: null, raw: false });

    if (rows.length === 0)
      return res.status(400).json({ success: false, message: 'Excel file empty', processedRows: 0, errors: ['Empty file'] });

    if (!('employee_id' in rows[0]))
      return res.status(400).json({ success: false, message: 'Missing Employee ID column', processedRows: 0, errors: ['Missing employee_id'] });

    const pool = await poolPromise;
    let processedRows = 0;
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const employeeId = safeString(row.employee_id)?.trim();

      if (!employeeId) {
        errors.push(`Row ${i + 2}: employee_id is required`);
        continue;
      }

      // Parse date fields
      row.date_of_birth = parseExcelDate(row.date_of_birth);
      row.first_join_date_merdeka = parseExcelDate(row.first_join_date_merdeka);
      row.transfer_merdeka = parseExcelDate(row.transfer_merdeka);
      row.first_join_date = parseExcelDate(row.first_join_date);
      row.join_date = parseExcelDate(row.join_date);
      row.end_contract = parseExcelDate(row.end_contract);
      row.travel_in = parseExcelDate(row.travel_in);
      row.travel_out = parseExcelDate(row.travel_out);
      row.terminated_date = parseExcelDate(row.terminated_date);

      const transaction = new sql.Transaction(pool);

      try {
        await transaction.begin();
        const request = new sql.Request(transaction);
        // Upsert employee_core
        await request
          .input('employee_id', sql.VarChar, employeeId)
          .input('imip_id', sql.VarChar, row.imip_id)
          .input('name', sql.VarChar, row.name)
          .input('gender', sql.Char(1), row.gender)
          .input('place_of_birth', sql.VarChar, row.place_of_birth)
          .input('date_of_birth', sql.Date, row.date_of_birth ? new Date(row.date_of_birth) : null)
          .input('age', sql.Int, row.age)
          .input('marital_status', sql.VarChar, row.marital_status)
          .input('tax_status', sql.VarChar, row.tax_status)
          .input('religion', sql.VarChar, row.religion)
          .input('nationality', sql.VarChar, row.nationality)
          .input('blood_type', sql.Char(1), row.blood_type)
          .input('kartu_keluarga_no', sql.VarChar, row.kartu_keluarga_no)
          .input('ktp_no', sql.VarChar, row.ktp_no)
          .input('npwp', sql.VarChar, row.npwp)
          .input('education', sql.VarChar, row.education)
          .query(`
            IF EXISTS (SELECT 1 FROM dbo.employee_core WHERE employee_id = @employee_id)
              UPDATE dbo.employee_core SET
                imip_id=@imip_id,
                name=@name,
                gender=@gender,
                place_of_birth=@place_of_birth,
                date_of_birth=@date_of_birth,
                age=@age,
                marital_status=@marital_status,
                tax_status=@tax_status,
                religion=@religion,
                nationality=@nationality,
                blood_type=@blood_type,
                kartu_keluarga_no=@kartu_keluarga_no,
                ktp_no=@ktp_no,
                npwp=@npwp,
                education=@education
              WHERE employee_id = @employee_id
            ELSE
              INSERT INTO dbo.employee_core (
                employee_id, imip_id, name, gender, place_of_birth, date_of_birth, age,
                marital_status, tax_status, religion, nationality, blood_type, kartu_keluarga_no, ktp_no, npwp, education
              ) VALUES (
                @employee_id, @imip_id, @name, @gender, @place_of_birth, @date_of_birth, @age,
                @marital_status, @tax_status, @religion, @nationality, @blood_type, @kartu_keluarga_no, @ktp_no, @npwp, @education
              )
          `);

        // Upsert employee_insurance
        const insReq = new sql.Request(transaction);
        await insReq
          .input('employee_id', sql.VarChar, employeeId)
          .input('insurance_endorsement', sql.Char(1), row.insurance_endorsement)
          .input('insurance_owlexa', sql.Char(1), row.insurance_owlexa)
          .input('insurance_fpg', sql.Char(1), row.insurance_fpg)
          .input('bpjs_tk', sql.VarChar, row.bpjs_tk)
          .input('bpjs_kes', sql.VarChar, row.bpjs_kes)
          .input('status_bpjs_kes', sql.VarChar, row.status_bpjs_kes)
          .query(`
            IF EXISTS (SELECT 1 FROM dbo.employee_insurance WHERE employee_id = @employee_id)
              UPDATE dbo.employee_insurance SET 
                insurance_endorsement=@insurance_endorsement,
                insurance_owlexa=@insurance_owlexa,
                insurance_fpg=@insurance_fpg,
                bpjs_tk=@bpjs_tk,
                bpjs_kes=@bpjs_kes,
                status_bpjs_kes=@status_bpjs_kes
              WHERE employee_id = @employee_id
            ELSE 
              INSERT INTO dbo.employee_insurance 
              (employee_id, insurance_endorsement, insurance_owlexa, insurance_fpg, bpjs_tk, bpjs_kes, status_bpjs_kes)
              VALUES (@employee_id, @insurance_endorsement, @insurance_owlexa, @insurance_fpg, @bpjs_tk, @bpjs_kes, @status_bpjs_kes)
          `);

        // Upsert employee_contact
        const contactReq = new sql.Request(transaction);
        await contactReq
          .input('employee_id', sql.VarChar, employeeId)
          .input('phone_number', sql.VarChar, row.phone_number)
          .input('email', sql.VarChar, row.email)
          .input('address', sql.VarChar, row.address)
          .input('city', sql.VarChar, row.city)
          .input('emergency_contact_name', sql.VarChar, row.emergency_contact_name)
          .input('emergency_contact_phone', sql.VarChar, row.emergency_contact_phone)
          .input('spouse_name', sql.VarChar, row.spouse_name)
          .input('child_name_1', sql.VarChar, row.child_name_1)
          .input('child_name_2', sql.VarChar, row.child_name_2)
          .input('child_name_3', sql.VarChar, row.child_name_3)
          .query(`
            IF EXISTS (SELECT 1 FROM dbo.employee_contact WHERE employee_id=@employee_id)
              UPDATE dbo.employee_contact
              SET phone_number=@phone_number, emergency_contact_name=@emergency_contact_name, 
                  emergency_contact_phone=@emergency_contact_phone, email=@email, address=@address, city=@city,
                  spouse_name=@spouse_name, child_name_1=@child_name_1,
                  child_name_2=@child_name_2, child_name_3=@child_name_3
              WHERE employee_id = @employee_id
            ELSE
              INSERT INTO dbo.employee_contact
              (employee_id, phone_number, emergency_contact_name, emergency_contact_phone, email, address, city, spouse_name, child_name_1, child_name_2, child_name_3)
              VALUES
              (@employee_id, @phone_number, @emergency_contact_name, @emergency_contact_phone, @email, @address, @city, @spouse_name, @child_name_1, @child_name_2, @child_name_3)
          `);

        // Upsert employee_onboard
        const onboardReq = new sql.Request(transaction);
        await onboardReq
          .input('employee_id', sql.VarChar, employeeId)
          .input('point_of_hire', sql.VarChar, row.point_of_hire)
          .input('point_of_origin', sql.VarChar, row.point_of_origin)
          .input('schedule_type', sql.VarChar, row.schedule_type)
          .input('first_join_date_merdeka', sql.Date, row.first_join_date_merdeka ? new Date(row.first_join_date_merdeka) : null)
          .input('transfer_merdeka', sql.Date, row.transfer_merdeka ? new Date(row.transfer_merdeka) : null)
          .input('first_join_date', sql.Date, row.first_join_date ? new Date(row.first_join_date) : null)
          .input('join_date', sql.Date, row.join_date ? new Date(row.join_date) : null)
          .input('employment_status', sql.VarChar, row.employment_status)
          .input('end_contract', sql.Date, row.end_contract ? new Date(row.end_contract) : null)
          .input('years_in_service', sql.Int, row.years_in_service)
          .query(`
            IF EXISTS (SELECT 1 FROM dbo.employee_onboard WHERE employee_id = @employee_id)
              UPDATE dbo.employee_onboard SET
                point_of_hire=@point_of_hire,
                point_of_origin=@point_of_origin,
                schedule_type=@schedule_type,
                first_join_date_merdeka=@first_join_date_merdeka,
                transfer_merdeka=@transfer_merdeka,
                first_join_date=@first_join_date,
                join_date=@join_date,
                employment_status=@employment_status,
                end_contract=@end_contract,
                years_in_service=@years_in_service
              WHERE employee_id = @employee_id
            ELSE 
              INSERT INTO dbo.employee_onboard
              (employee_id, point_of_hire, point_of_origin, schedule_type, first_join_date_merdeka, transfer_merdeka, first_join_date, join_date, employment_status, end_contract, years_in_service)
              VALUES
              (@employee_id, @point_of_hire, @point_of_origin, @schedule_type, @first_join_date_merdeka, @transfer_merdeka, @first_join_date, @join_date, @employment_status, @end_contract, @years_in_service)
          `);

        // Upsert employee_employment
        const employmentReq = new sql.Request(transaction);
        await employmentReq
          .input('employee_id', sql.VarChar, employeeId)
          .input('company_office', sql.VarChar, row.company_office)
          .input('work_location', sql.VarChar, row.work_location)
          .input('division', sql.VarChar, row.division)
          .input('department', sql.VarChar, row.department)
          .input('section', sql.VarChar, row.section)
          .input('direct_report', sql.VarChar, row.direct_report)
          .input('job_title', sql.VarChar, row.job_title)
          .input('grade', sql.Int, row.grade)
          .input('position_grade', sql.VarChar, row.position_grade)
          .input('group_job_title', sql.VarChar, row.group_job_title)
          .input('terminated_date', sql.Date, row.terminated_date ? new Date(row.terminated_date) : null)
          .input('terminated_type', sql.VarChar, row.terminated_type)
          .input('terminated_reason', sql.VarChar, row.terminated_reason)
          .input('blacklist_mti', sql.Char(1), row.blacklist_mti)
          .input('blacklist_imip', sql.Char(1), row.blacklist_imip)
          .input('status', sql.VarChar, row.status)
          .query(`
            IF EXISTS (SELECT 1 FROM dbo.employee_employment WHERE employee_id = @employee_id)
              UPDATE dbo.employee_employment SET
                company_office=@company_office,
                work_location=@work_location,
                division=@division,
                department=@department,
                section=@section,
                direct_report=@direct_report,
                job_title=@job_title,
                grade=@grade,
                position_grade=@position_grade,
                group_job_title=@group_job_title,
                terminated_date=@terminated_date,
                terminated_type=@terminated_type,
                terminated_reason=@terminated_reason,
                blacklist_mti=@blacklist_mti,
                blacklist_imip=@blacklist_imip,
                status=@status
              WHERE employee_id = @employee_id
            ELSE
              INSERT INTO dbo.employee_employment 
              (employee_id, company_office, work_location, division, department, section, direct_report, job_title, grade, position_grade, group_job_title, terminated_date, terminated_type, terminated_reason, blacklist_mti, blacklist_imip, status)
              VALUES
              (@employee_id, @company_office, @work_location, @division, @department, @section, @direct_report, @job_title, @grade, @position_grade, @group_job_title, @terminated_date, @terminated_type, @terminated_reason, @blacklist_mti, @blacklist_imip, @status)
          `);

        // Upsert employee_bank
        const bankReq = new sql.Request(transaction);
        await bankReq
          .input('employee_id', sql.VarChar, employeeId)
          .input('bank_name', sql.VarChar, row.bank_name)
          .input('account_name', sql.VarChar, row.account_name)
          .input('account_no', sql.VarChar, row.account_no)
          .query(`
            IF EXISTS (SELECT 1 FROM dbo.employee_bank WHERE employee_id = @employee_id)
              UPDATE dbo.employee_bank SET
                bank_name=@bank_name,
                account_name=@account_name,
                account_no=@account_no
              WHERE employee_id = @employee_id
            ELSE
              INSERT INTO dbo.employee_bank
              (employee_id, bank_name, account_name, account_no)
              VALUES
              (@employee_id, @bank_name, @account_name, @account_no)
          `);

        // Upsert employee_travel
        const travelReq = new sql.Request(transaction);
        await travelReq
          .input('employee_id', sql.VarChar, employeeId)
          .input('travel_in', sql.Date, row.travel_in ? new Date(row.travel_in) : null)
          .input('travel_out', sql.Date, row.travel_out ? new Date(row.travel_out) : null)
          .input('passport_no', sql.VarChar, row.passport_no)
          .input('kitas_no', sql.VarChar, row.kitas_no)
          .query(`
            IF EXISTS (SELECT 1 FROM dbo.employee_travel WHERE employee_id = @employee_id)
              UPDATE dbo.employee_travel SET
                travel_in=@travel_in,
                travel_out=@travel_out,
                passport_no=@passport_no,
                kitas_no=@kitas_no
              WHERE employee_id = @employee_id
            ELSE
              INSERT INTO dbo.employee_travel
              (employee_id, travel_in, travel_out, passport_no, kitas_no)
              VALUES
              (@employee_id, @travel_in, @travel_out, @passport_no, @kitas_no)
          `);

        // Commit transaction for this employee record
        await transaction.commit();
        processedRows++;
      } catch (err) {
        await transaction.rollback();
        errors.push(`Row ${i + 2} employee_id=${employeeId} error: ${err.message}`);
      }
    }

    res.json({
      success: errors.length === 0,
      message: errors.length === 0 ? `Successfully processed ${processedRows} rows.` : 'Processed with some errors.',
      processedRows,
      errors,
    });
  } catch (err) {
    console.error('Upload processing error:', err);
    res.status(500).json({ success: false, message: 'Failed to process uploaded file.', errors: [err.message] });
  }
});

export default router;