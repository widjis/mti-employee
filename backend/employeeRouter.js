import express from 'express';
import { executeQuery, getPool, sql } from './config/database.js';
import config from './config/app.js';
import xlsx from 'xlsx';
import ExcelJS from 'exceljs';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { authenticateToken, authorizeRoles, authorizePermission } from './middleware/auth.js';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import { COLUMN_MAPPING } from './config/roleColumnMapping.js';
import { 
    employeeValidation, 
    employeeUpdateValidation, 
    employeeIdValidation, 
    employeeQueryValidation,
    fileUploadValidation,
    handleValidationErrors, 
    preventSQLInjection 
} from './middleware/validation.js';

const router = express.Router();
// ESM-safe __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirnameESM = path.dirname(__filename);

// Load column enums mirrored from frontend add/edit UI
let COLUMN_ENUMS = {};
try {
  const enumsPath = path.join(__dirnameESM, 'config', 'column_enums.json');
  if (fs.existsSync(enumsPath)) {
    const raw = fs.readFileSync(enumsPath, 'utf-8');
    COLUMN_ENUMS = JSON.parse(raw);
  }
} catch (e) {
  console.warn('Failed to load column_enums.json:', e?.message || e);
}

// Initialize multer upload BEFORE any routes use it
const upload = multer({
  limits: { fileSize: config.upload.maxSize },
  fileFilter: (req, file, cb) => {
    if (config.upload.allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed. Allowed types: ${config.upload.allowedTypes.join(', ')}`));
    }
  },
  storage: multer.memoryStorage(),
});

// --- Import Templates: Profile Definitions and Helpers ---
const PROFILE_KEYS = ['indonesia_active', 'indonesia_inactive', 'expatriate_active', 'expatriate_inactive'];

function getMappingFilePath() {
  // Expect the mapping Excel to be located at backend/scripts/Comben Master Data Column Assignment.xlsx
  // When running from backend working directory, resolve to ./scripts
  const candidate = path.join(process.cwd(), 'scripts', 'Comben Master Data Column Assignment.xlsx');
  if (fs.existsSync(candidate)) return candidate;
  // Fallback to project root layout
  return path.join(process.cwd(), 'backend', 'scripts', 'Comben Master Data Column Assignment.xlsx');
}

function parseBooleanLike(val) {
  if (val === null || val === undefined) return false;
  const s = String(val).trim().toLowerCase();
  return s === 'y' || s === 'yes' || s === 'true' || s === '1';
}

function normalizeKey(k) {
  return String(k).trim().toLowerCase().replace(/\s+/g, ' ');
}

// Build a robust, case-insensitive mapping from Excel headers to internal fields
const NORMALIZED_HEADER_MAPPING = (() => {
  const map = {};
  for (const [excelHeader, internal] of Object.entries(COLUMN_MAPPING || {})) {
    map[normalizeKey(excelHeader)] = internal;
  }
  // Common synonyms and fallbacks
  map['employee id'] = 'employee_id';
  map['emp id'] = 'employee_id';
  map['emp. id'] = 'employee_id';
  map['imip id'] = map['imip id'] || 'imip_id';
  map['mobile phone'] = map['mobile phone'] || 'phone_number';
  map['emergency contact name'] = map['emergency contact'] || 'emergency_contact_name';
  map['email'] = map['email'] || 'email';
  map['ktp no'] = map['ktp no'] || 'ktp_no';
  map['ktp address'] = map['ktp address'] || 'address';
  map['ktp city'] = map['ktp city'] || 'city';
  map['point of hire'] = map['poin of hire'] || 'point_of_hire';
  map['poin of hire'] = 'point_of_hire';
  map['poin of origin'] = 'point_of_origin';
  map['first join date (merdeka group)'] = 'first_join_date_merdeka';
  map['transfer merdeka group'] = 'transfer_merdeka';
  map['first join date'] = 'first_join_date';
  map['join date'] = 'join_date';
  map['employment status'] = 'employment_status';
  map['end contract'] = 'end_contract';
  map['years in service'] = 'years_in_service';
  map['branch id'] = map['company office'] || 'company_office';
  map['branch'] = map['company office'] || 'company_office';
  map['company office'] = map['company office'] || 'company_office';
  map['work location'] = 'work_location';
  map['division'] = 'division';
  map['department'] = 'department';
  map['section'] = 'section';
  map['direct report'] = 'direct_report';
  map['job title'] = map['job tittle'] || 'job_title';
  map['position grade'] = 'position_grade';
  map['group job title'] = map['group job tittle'] || 'group_job_title';
  map['bank name'] = 'bank_name';
  map['account name'] = 'account_name';
  map['account no'] = 'account_no';
  map['npwp'] = 'npwp';
  map['bpjs tk no'] = map['bpjs tk'] || 'bpjs_tk';
  map['bpjs kes no'] = map['bpjs kes'] || 'bpjs_kes';
  map['status bpjs kesehatan'] = map['status bpjs kes'] || 'status_bpjs_kes';
  map['travel in'] = 'travel_in';
  map['travel out'] = 'travel_out';
  map['terminated date'] = 'terminated_date';
  map['terminated type'] = 'terminated_type';
  map['terminated reason'] = 'terminated_reason';
  map['black list mti'] = 'blacklist_mti';
  map['black list imip'] = 'blacklist_imip';
  map['office email'] = 'email';
  map['locality status'] = 'locality_status';
  return map;
})();

function sanitizeHeaderText(header) {
  // Remove UI hint suffixes like "(Dropdown: ...)" or "(readonly)" from header labels
  return String(header || '')
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function mapRowToInternalFields(row) {
  const out = {};
  for (const [key, value] of Object.entries(row)) {
    const cleaned = sanitizeHeaderText(key);
    const norm = normalizeKey(cleaned);
    const mapped = NORMALIZED_HEADER_MAPPING[norm];
    if (mapped) {
      out[mapped] = value;
    } else {
      // Fallback: convert to snake_case-like
      const fallback = cleaned.toLowerCase().replace(/\s+/g, '_');
      out[fallback] = value;
    }
  }
  return out;
}

function pickValue(row, candidates) {
  const keys = Object.keys(row);
  for (const cand of candidates) {
    const match = keys.find(k => normalizeKey(k) === normalizeKey(cand));
    if (match) return row[match];
  }
  // Fallback: contains
  for (const k of keys) {
    const nk = normalizeKey(k);
    if (candidates.some(c => nk.includes(normalizeKey(c)))) {
      return row[k];
    }
  }
  return undefined;
}

function findFlag(row, tokens) {
  const keys = Object.keys(row);
  for (const k of keys) {
    const nk = normalizeKey(k);
    if (tokens.every(t => nk.includes(normalizeKey(t)))) {
      return row[k];
    }
  }
  return undefined;
}

function getTemplateDefinition(profile) {
  const mappingPath = getMappingFilePath();
  if (!fs.existsSync(mappingPath)) {
    return { headers: [], computed: [], available: false, message: 'Mapping Excel not found' };
  }
  try {
    const workbook = xlsx.readFile(mappingPath);
    // Prefer the explicit mapping sheet by name first, then fallback by header presence
    let sheet = workbook.Sheets['Column Name'];
    if (!sheet) {
      for (const name of workbook.SheetNames) {
        const candidate = workbook.Sheets[name];
        const r = xlsx.utils.sheet_to_json(candidate, { header: 1 });
        const headers = Array.isArray(r) && r.length ? (r[0] || []) : [];
        const headerStr = headers.map(h => normalizeKey(h)).join(' ');
        if (headerStr.includes('column name') || headerStr.includes('excel header') || headerStr.includes('display label')) {
          sheet = candidate; break;
        }
      }
    }
    if (!sheet) sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });

    const headers = [];
    const computed = [];

    const includeForProfile = (row) => {
      // Mapping uses broad audience flags: 'Indonesia' and 'Expat'. Active/inactive distinction is not in the sheet.
      // So we map both active/inactive to their respective broad flag columns.
      let val;
      if (profile === 'indonesia_active' || profile === 'indonesia_inactive') {
        val = pickValue(row, ['Indonesia']);
      } else if (profile === 'expatriate_active' || profile === 'expatriate_inactive') {
        val = pickValue(row, ['Expat', 'Expatriate']);
      }
      // If no flag column is found, default to include to avoid empty templates
      if (val === undefined) return true;
      return parseBooleanLike(val);
    };

    // Helpers for example generation
    const typeExample = (type) => {
      const t = String(type || '').trim().toLowerCase();
      if (!t) return undefined;
      if (t.includes('email')) return 'sample@example.com';
      if (t.includes('phone') || t.includes('tel')) return '+62 812-3456-7890';
      if (t.includes('date') || t.includes('dob')) return '31/01/2025';
      if (t.includes('bool')) return 'Yes';
      if (t.includes('int') || t.includes('number') || t.includes('numeric')) return '12345';
      if (t.includes('id') || t.includes('code')) return 'MTI123456';
      return 'Sample Text';
    };

    const headerHeuristicExample = (name) => {
      const n = normalizeKey(name);
      if (n.includes('emp. id') || n.includes('employee id')) return 'MTI123456';
      if (n.includes('imip id')) return 'MTI123456';
      if (n.includes('email')) return 'sample@example.com';
      if (n.includes('phone') || n.includes('mobile')) return '+62 812-3456-7890';
      if (n.includes('gender')) return 'Male';
      if (n.includes('date of birth') || n.includes('dob') || n.includes('date')) return '31/01/2025';
      if (n.includes('age')) return '30';
      if (n.includes('place of birth')) return 'Jakarta';
      if (n.includes('address')) return 'Jl. Contoh No. 123, Jakarta';
      return undefined;
    };

    // Remove UI hint suffixes like "(Dropdown: ...)" or "(Free Text)" from examples
    function sanitizeExample(val) {
      if (val === undefined || val === null) return '';
      let s = String(val).trim();
      // Strip any parenthetical hints entirely
      s = s.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
      // Normalize extra spaces and trim quotes
      s = s.replace(/\s{2,}/g, ' ').replace(/^['"]|['"]$/g, '');
      return s;
    }

    const examples = [];

    for (const row of rows) {
      const colName = pickValue(row, ['Column Name','column_name','Column','Excel Header','Display Label']);
      if (!colName) continue;
      const notes = pickValue(row, ['Notes','Note','notes']) || '';
      const computedFlag = pickValue(row, ['Computed','computed']);
      let isComputed = false;
      if (typeof notes === 'string') {
        const lower = notes.toLowerCase();
        if (lower.includes('computed') || lower.includes('derived')) {
          isComputed = true;
        }
      }
      if (computedFlag && parseBooleanLike(computedFlag)) {
        isComputed = true;
      }

      if (includeForProfile(row)) {
        headers.push(String(colName));
        // Build example value
        let ex = pickValue(row, ['Data Example','Example','Sample']);
        const dtype = pickValue(row, ['Data Type','Type']);
        // Special rule: Emp. ID/Employee ID should always use MTI123456 pattern
        const nCol = normalizeKey(colName);
        if (nCol.includes('emp. id') || nCol.includes('employee id')) {
          ex = 'MTI123456';
        }
        if (!ex) ex = headerHeuristicExample(colName);
        if (!ex) ex = typeExample(dtype);
        if (isComputed) ex = '';
        examples.push(sanitizeExample(ex));
      }

      if (isComputed) {
        computed.push(String(colName));
      }
    }

    return { headers, computed, examples, available: true };
  } catch (err) {
    return { headers: [], computed: [], available: false, message: err.message };
  }
}

// Heuristic: decide if a header is a date column
function isDateHeaderLabel(label) {
  const clean = sanitizeHeaderText(label);
  const n = normalizeKey(clean);
  const internal = NORMALIZED_HEADER_MAPPING[n];
  if (internal && DATE_FIELDS.includes(internal)) return true;
  // Only treat as date if header explicitly contains 'date' or 'dob'.
  // Avoid broad tokens like 'birth' or 'join' to prevent misclassifying
  // non-date fields such as 'Place of Birth'.
  if (/\bplace\s+of\s+birth\b/i.test(clean)) return false;
  return /\bdate\b/i.test(clean) || /\bdob\b/i.test(clean);
}

// ExcelJS-based workbook builder with proper date formatting
async function buildTemplateWorkbookExcelJS(headers, computed, examples = []) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Template');

  // Build labeled headers and add to first row
  const labeledHeaders = headers.map(h => String(h));
  ws.addRow(labeledHeaders);
  // Style headers
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: 'middle' };

  // Prepare example row values
  const sampleRow = Array.isArray(examples) && examples.length === headers.length
    ? [...examples]
    : new Array(headers.length).fill('');

  // Inject dropdown guidance into sample values for enumerated fields
  headers.forEach((header, idx) => {
    const rawNorm = normalizeKey(String(header));
    const clean = sanitizeHeaderText(header);
    const normalized = normalizeKey(clean);
    let internal = NORMALIZED_HEADER_MAPPING[rawNorm] || NORMALIZED_HEADER_MAPPING[normalized] || undefined;
    if (!internal) {
      const h = String(header).toLowerCase();
      // Handle common misspelling "Endorsment" and variants
      if (/\binsurance\b.*\bendor(s|se|sement|sment)\b/.test(h)) internal = 'insurance_endorsement';
      else if (/\bowlexa\b/.test(h)) internal = 'insurance_owlexa';
      else if (/\bfpg\b/.test(h)) internal = 'insurance_fpg';
      else if (/\bblack\b.*\bmti\b/.test(h)) internal = 'blacklist_mti';
      else if (/\bblack\b.*\bimip\b/.test(h)) internal = 'blacklist_imip';
    }
    const isComputed = computed.includes(header);
    if (isComputed) {
      sampleRow[idx] = '';
      return;
    }
    if (internal && COLUMN_ENUMS[internal] && Array.isArray(COLUMN_ENUMS[internal]) && COLUMN_ENUMS[internal].length) {
      const options = COLUMN_ENUMS[internal];
      const first = options[0];
      sampleRow[idx] = `${first} (Dropdown: ${options.join(', ')})`;
    }
    // Gender sample should be 'M', not full label
    if (internal === 'gender') {
      sampleRow[idx] = 'M';
    }
    // Binary toggles sample should be '0' and include note (0,1)
    const checklistFields = Array.isArray(COLUMN_ENUMS['checklist_fields'])
      ? Array.from(new Set([...COLUMN_ENUMS['checklist_fields'], 'insurance_endorsement','insurance_owlexa','insurance_fpg','blacklist_mti','blacklist_imip']))
      : ['insurance_endorsement','insurance_owlexa','insurance_fpg','blacklist_mti','blacklist_imip'];
    if (internal && checklistFields.includes(internal)) {
      sampleRow[idx] = '0 (0,1)';
    }
  });

  // Apply date formatting per column and set example as Date object
  headers.forEach((header, idx) => {
    const colIndex = idx + 1;
    const col = ws.getColumn(colIndex);
    if (isDateHeaderLabel(header)) {
      col.numFmt = 'dd/mm/yyyy';
      // If example is missing or looks non-date, set a safe example date
      const ex = sampleRow[idx];
      let dateVal = null;
      if (ex instanceof Date) {
        dateVal = ex;
      } else if (typeof ex === 'number') {
        // Excel serial to JS Date
        const utcDays = Math.floor(ex - 25569);
        dateVal = new Date(utcDays * 86400 * 1000);
      } else if (typeof ex === 'string') {
        // Try to parse common dd/mm/yyyy or yyyy-mm-dd formats
        const s = ex.trim();
        let m = s.match(/^([0-9]{1,2})[\/-]([0-9]{1,2})[\/-]([0-9]{2,4})$/);
        if (m) {
          let y = Number(m[3]);
          if (y < 100) y = y < 50 ? 2000 + y : 1900 + y;
          const d = Number(m[1]); const mo = Number(m[2]);
          dateVal = new Date(y, mo - 1, d);
        } else {
          m = s.match(/^([0-9]{4})[\/-]([0-9]{1,2})[\/-]([0-9]{1,2})$/);
          if (m) {
            const y = Number(m[1]); const mo = Number(m[2]); const d = Number(m[3]);
            dateVal = new Date(y, mo - 1, d);
          }
        }
      }
      if (!dateVal || isNaN(dateVal.getTime())) {
        dateVal = new Date(2025, 0, 31);
      }
      sampleRow[idx] = dateVal;
    }
    // Set reasonable column widths based on header length
    col.width = Math.max(String(labeledHeaders[idx]).length, 15);
  });

  // Append example row
  ws.addRow(sampleRow);
  return wb;
}

function buildTemplateWorkbook(headers, computed, examples = []) {
  const wb = xlsx.utils.book_new();
  // Create a sheet with headers in first row; mark computed columns by appending " (readonly)"
  const labeledHeaders = headers.map(h => computed.includes(h) ? `${h} (readonly)` : h);
  const exampleRow = Array.isArray(examples) && examples.length === headers.length ? examples : new Array(headers.length).fill('');
  const ws = xlsx.utils.aoa_to_sheet([labeledHeaders, exampleRow]);

  // Apply date formatting to example cells where applicable
  for (let c = 0; c < headers.length; c++) {
    const header = headers[c];
    if (!isDateHeaderLabel(header)) continue;
    const addr = xlsx.utils.encode_cell({ r: 1, c }); // second row (examples)
    // Always use a safe, fixed sample date to avoid huge serials
    // caused by out-of-range example strings in mappings
    const sample = new Date(2025, 0, 31);
    const serial = Math.floor(Date.UTC(sample.getFullYear(), sample.getMonth(), sample.getDate()) / 86400000) + 25569;
    ws[addr] = { t: 'n', v: serial, z: 'dd/mm/yyyy' };
  }
  xlsx.utils.book_append_sheet(wb, ws, 'Template');
  return wb;
}

router.get('/employees/templates', 
  // Public access per policy; keep SQL injection prevention and add rate limiting
  rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }),
  preventSQLInjection,
  async (req, res) => {
    const profile = String(req.query.profile || '').toLowerCase();
    if (!PROFILE_KEYS.includes(profile)) {
      return res.status(400).json({ success: false, message: `Invalid profile. Use one of: ${PROFILE_KEYS.join(', ')}` });
    }

    try {
      // Programmatic template generation from mapping (no static files)
      const def = getTemplateDefinition(profile);
      if (!def.available) {
        return res.status(404).json({ success: false, message: def.message || 'Mapping not available' });
      }

      // Pull distinct departments from DB to list inline in header
      try {
        const pool = await getPool();
        const result = await pool.request().query("SELECT DISTINCT department FROM dbo.employee_core WHERE department IS NOT NULL ORDER BY department");
        const departments = (result.recordset || []).map(r => r.department).filter(Boolean);
        if (departments.length) {
          COLUMN_ENUMS['department'] = departments;
        }
      } catch (e) {
        console.warn('Template generation: failed to fetch departments:', e?.message || e);
      }

      const mappingPath = getMappingFilePath();
      const stat = fs.existsSync(mappingPath) ? fs.statSync(mappingPath) : null;
      const mappingBuffer = fs.existsSync(mappingPath) ? fs.readFileSync(mappingPath) : null;
      const hash = mappingBuffer ? crypto.createHash('sha256').update(mappingBuffer).digest('hex') : '';
      const updatedAt = stat ? new Date(stat.mtime).toISOString() : '';
      const version = '0.0.0';

      // Generate using ExcelJS to ensure date formatting displays as dd/mm/yyyy
      const wb = await buildTemplateWorkbookExcelJS(def.headers, def.computed, def.examples || []);
      const buffer = await wb.xlsx.writeBuffer();
      res.setHeader('X-Template-Profile', profile);
      res.setHeader('X-Template-Version', version);
      res.setHeader('X-Template-Hash', hash);
      res.setHeader('X-Template-Updated-At', updatedAt);
      res.setHeader('X-Template-Source', 'mapping-excel');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="employee_template_${profile}.xlsx"`);
      return res.send(buffer);
    } catch (err) {
      console.error('Template generation error:', err);
      return res.status(500).json({ success: false, message: 'Failed to generate template', error: err.message });
    }
  }
);

// --- Dry-Run Import Endpoint ---
function ensureLogDir() {
  const dir = path.join(__dirnameESM, 'logs', 'imports');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function writeImportLog(filename, payload) {
  try {
    const dir = ensureLogDir();
    const full = path.join(dir, filename);
    fs.writeFileSync(full, JSON.stringify(payload, null, 2));
    // Return only the filename so clients request via /api/files?path=<filename>
    // This keeps downloads constrained to logs/imports without exposing absolute paths.
    return filename;
  } catch (e) {
    console.error('Failed writing import log:', e);
    return null;
  }
}

function escapeCSV(value) {
  if (value == null) return '';
  const s = String(value);
  // Quote if contains comma, quote, or newline
  if (/[",\n]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function formatLogCSV(payload) {
  const rows = [];
  rows.push(['Section', 'Severity', 'Row', 'Column', 'Message']);

  const hv = payload.headerValidation || {};
  if (Array.isArray(hv.missing) && hv.missing.length) {
    for (const h of hv.missing) {
      rows.push(['HeaderValidation', 'error', '', 'header', `Missing header: ${h}`]);
    }
  }
  if (Array.isArray(hv.extra) && hv.extra.length) {
    for (const h of hv.extra) {
      rows.push(['HeaderValidation', 'warning', '', 'header', `Unexpected extra header: ${h}`]);
    }
  }
  if (Array.isArray(hv.orderMismatch) && hv.orderMismatch.length) {
    for (const m of hv.orderMismatch) {
      const msg = `Order mismatch: expected index ${m.expectedIndex} for "${m.expectedHeader}", found index ${m.actualIndex}`;
      rows.push(['HeaderValidation', 'info', '', 'header', msg]);
    }
  }

  const rowErrors = Array.isArray(payload.rowErrors) ? payload.rowErrors : [];
  for (const re of rowErrors) {
    rows.push(['RowError', 'error', re.rowNumber ?? '', re.column ?? '', re.message ?? '']);
  }

  const warnings = Array.isArray(payload.warnings) ? payload.warnings : [];
  for (const w of warnings) {
    rows.push(['Processing', 'warning', '', '', String(w)]);
  }

  const errors = Array.isArray(payload.errors) ? payload.errors : [];
  for (const e of errors) {
    rows.push(['Processing', 'error', '', '', String(e)]);
  }

  return rows.map(r => r.map(escapeCSV).join(',')).join('\n') + '\n';
}

function writeImportLogCSV(filename, payload) {
  try {
    const dir = ensureLogDir();
    const full = path.join(dir, filename);
    const csv = formatLogCSV(payload);
    fs.writeFileSync(full, csv);
    return filename;
  } catch (e) {
    console.error('Failed writing CSV import log:', e);
    return null;
  }
}

// Serve log files securely: restrict to logs/imports directory
router.get('/files', authenticateToken, (req, res) => {
  try {
    const requested = String(req.query.path || '');
    if (!requested) {
      return res.status(400).json({ success: false, message: 'Missing path query parameter' });
    }

    const baseDir = ensureLogDir();
    const normalizedBase = path.resolve(baseDir);

    // Resolve requested against baseDir safely (handles absolute Windows paths)
    const decodedRequested = requested; // Express already decodes querystring
    // Always resolve against the base directory to prevent escaping it
    const resolvedCandidate = path.resolve(normalizedBase, decodedRequested);
    const safeRelative = path.relative(normalizedBase, resolvedCandidate);

    // Prevent traversal: relative must not escape base, and must not be absolute
    if (!safeRelative || safeRelative.startsWith('..') || path.isAbsolute(safeRelative)) {
      return res.status(403).json({ success: false, message: 'Access denied to requested file' });
    }

    const finalPath = path.join(normalizedBase, safeRelative);
    if (!fs.existsSync(finalPath)) {
      return res.status(404).json({ success: false, message: `File not found: ${finalPath}` });
    }

    // Use root option to avoid Windows absolute path quirks
    const options = { root: normalizedBase };
    return res.sendFile(safeRelative, options, (err) => {
      if (err) {
        console.error('File serving error:', err);
        if (err.code === 'ENOENT') {
          return res.status(404).json({ success: false, message: 'File not found' });
        }
        return res.status(500).json({ success: false, message: 'Failed to serve file' });
      }
    });
  } catch (err) {
    console.error('File serving error:', err);
    return res.status(500).json({ success: false, message: 'Failed to serve file' });
  }
});

function validateHeaders(expectedHeaders, actualHeaders) {
  // Normalize both sides by stripping parenthetical hints and collapsing whitespace
  const normalizeDisplay = (s) => sanitizeHeaderText(s).toLowerCase();

  const expectedNorm = expectedHeaders.map(h => normalizeDisplay(h));
  const actualNorm = actualHeaders.map(h => normalizeDisplay(h));
  const expectedNormSet = new Set(expectedNorm);
  const actualNormSet = new Set(actualNorm);

  // Map normalized -> original for reporting
  const normToExpectedOriginal = new Map();
  const normToActualOriginal = new Map();
  for (let i = 0; i < expectedHeaders.length; i++) {
    const norm = expectedNorm[i];
    if (!normToExpectedOriginal.has(norm)) normToExpectedOriginal.set(norm, expectedHeaders[i]);
  }
  for (let i = 0; i < actualHeaders.length; i++) {
    const norm = actualNorm[i];
    if (!normToActualOriginal.has(norm)) normToActualOriginal.set(norm, actualHeaders[i]);
  }

  // Determine missing/extra using normalized comparison, but report originals
  const missing = expectedNorm
    .filter(n => !actualNormSet.has(n))
    .map(n => normToExpectedOriginal.get(n) || n);
  const extra = actualNorm
    .filter(n => !expectedNormSet.has(n))
    .map(n => normToActualOriginal.get(n) || n);

  // Order mismatches: compare normalized forms by index, report originals
  const orderMismatch = [];
  const minLen = Math.min(expectedNorm.length, actualNorm.length);
  for (let i = 0; i < minLen; i++) {
    if (expectedNorm[i] !== actualNorm[i]) {
      orderMismatch.push({ index: i, expected: expectedHeaders[i], actual: actualHeaders[i] });
    }
  }

  return { missing, extra, orderMismatch };
}

const DATE_FIELDS = [
  'date_of_birth',
  'first_join_date_merdeka',
  'transfer_merdeka',
  'first_join_date',
  'join_date',
  'end_contract',
  'travel_in',
  'travel_out',
  'terminated_date'
];

// Fields stored as CHAR(1) in DB that may come as longer strings from Excel
const CHAR1_FIELDS = [
  'gender',
  'insurance_endorsement',
  'insurance_owlexa',
  'insurance_fpg',
  'blacklist_mti',
  'blacklist_imip'
];

function normalizeChar1(field, val) {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  if (!s) return null;
  // Special mapping for gender
  if (field === 'gender') {
    const g = s.toLowerCase();
    if (g.startsWith('m')) return 'M';
    if (g.startsWith('f')) return 'F';
    return s[0].toUpperCase();
  }
  // Boolean-like flags mapped to Y/N
  if (['insurance_endorsement','insurance_owlexa','insurance_fpg','blacklist_mti','blacklist_imip'].includes(field)) {
    return parseBooleanLike(s) ? 'Y' : 'N';
  }
  // Default: first character uppercased
  return s[0].toUpperCase();
}

router.post('/employees/import/dry-run',
  authenticateToken,
  authorizeRoles('admin', 'hr_general', 'superadmin'),
  preventSQLInjection,
  upload.single('file'),
  fileUploadValidation,
  handleValidationErrors,
  async (req, res) => {
    const profile = String(req.query.profile || '').toLowerCase();
    const onDuplicate = String(req.query.onDuplicate || 'update').toLowerCase();
    if (!PROFILE_KEYS.includes(profile)) {
      return res.status(400).json({ success: false, message: `Invalid profile. Use one of: ${PROFILE_KEYS.join(', ')}` });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded', processedRows: 0, errors: ['No file uploaded'] });
    }

    try {
      const def = getTemplateDefinition(profile);
      const workbook = xlsx.read(req.file.buffer, { type: 'buffer', cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawRows = xlsx.utils.sheet_to_json(worksheet, { defval: null, raw: false });
      // Map Excel headers to internal field names for processing
      const rows = rawRows.map(mapRowToInternalFields);

      if (rows.length === 0) {
        return res.status(400).json({ success: false, message: 'Excel file empty', processedRows: 0, errors: ['Empty file'] });
      }

      // Header validation should compare the original Excel headers, not mapped keys
      const actualHeaders = Object.keys(rawRows[0]).map(sanitizeHeaderText);
      const headerValidation = def.available ? validateHeaders(def.headers, actualHeaders) : { missing: [], extra: [], orderMismatch: [] };

      const pool = await getPool();
      let processed = 0;
      let skipped = 0;
      const errors = [];
      const warnings = [];
      const rowErrors = [];

      // Preload duplicates set for efficiency
      const employeeIds = rows.map(r => String(r.employee_id || '').trim()).filter(Boolean);
      const uniqueIds = Array.from(new Set(employeeIds));
      // Guard against empty IN () which causes SQL syntax errors
      const dupResult = uniqueIds.length > 0
        ? await executeQuery(`SELECT employee_id FROM dbo.employee_core WHERE employee_id IN (${uniqueIds.map(id => `'${id.replace(/'/g, "''")}'`).join(',')})`)
        : { recordset: [] };
      const existingSet = new Set((dupResult.recordset || []).map(r => String(r.employee_id)));

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNumber = i + 2; // considering header row
        const employeeId = String(row.employee_id || '').trim();
        if (!employeeId) {
          const msg = `Row ${rowNumber}: employee_id is required`;
          errors.push(msg);
          rowErrors.push({ rowNumber, column: 'employee_id', message: 'Required field missing' });
          skipped++;
          continue;
        }

        // Date normalization validation
        for (const df of DATE_FIELDS) {
          if (row[df] !== null && row[df] !== undefined) {
            const parsed = parseExcelDate(row[df]);
            if (!parsed) {
              warnings.push(`Row ${rowNumber}: ${df} could not be parsed, value='${row[df]}'`);
            }
          }
        }

        const exists = existingSet.has(employeeId);
        if (exists) {
          if (onDuplicate === 'error') {
            const msg = `Row ${rowNumber} employee_id=${employeeId} already exists`;
            errors.push(msg);
            rowErrors.push({ rowNumber, column: 'employee_id', message: 'Duplicate existing employee' });
            skipped++;
            continue;
          }
          if (onDuplicate === 'skip') {
            warnings.push(`Row ${rowNumber} employee_id=${employeeId} skipped due to duplicate`);
            skipped++;
            continue;
          }
          // 'update' → allowed; count as processed
          processed++;
        } else {
          processed++;
        }
      }

      const summary = {
        rows: rows.length,
        processed,
        skipped,
        errors: errors.length,
        warnings: warnings.length
      };

      const logPayload = {
        timestamp: new Date().toISOString(),
        type: 'dry-run',
        profile,
        onDuplicate,
        headerValidation,
        summary,
        errors,
        warnings,
        rowErrors
      };
      const base = `import-dry-run-${Date.now()}`;
      const jsonName = `${base}.json`;
      const csvName = `${base}.csv`;
      const logJsonRel = writeImportLog(jsonName, logPayload);
      const logCsvRel = writeImportLogCSV(csvName, logPayload);

      return res.json({ 
        success: errors.length === 0, 
        message: errors.length ? 'Dry-run completed with errors' : 'Dry-run successful', 
        summary, 
        headerValidation, 
        errors,
        warnings,
        rowErrors, 
        logUrl: logJsonRel ? `/api/files?path=${encodeURIComponent(logJsonRel)}` : null,
        logCsvUrl: logCsvRel ? `/api/files?path=${encodeURIComponent(logCsvRel)}` : null
      });
    } catch (err) {
      console.error('Dry-run processing error:', err);
      return res.status(500).json({ success: false, message: 'Failed to process dry-run', errors: [err.message] });
    }
  }
);

// --- Commit Import Endpoint ---
router.post('/employees/import/commit',
  authenticateToken,
  authorizeRoles('admin', 'hr_general', 'superadmin'),
  preventSQLInjection,
  upload.single('file'),
  fileUploadValidation,
  handleValidationErrors,
  async (req, res) => {
    const profile = String(req.query.profile || '').toLowerCase();
    const onDuplicate = String(req.query.onDuplicate || 'update').toLowerCase();
    if (!PROFILE_KEYS.includes(profile)) {
      return res.status(400).json({ success: false, message: `Invalid profile. Use one of: ${PROFILE_KEYS.join(', ')}` });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded', processedRows: 0, errors: ['No file uploaded'] });
    }

    try {
      const workbook = xlsx.read(req.file.buffer, { type: 'buffer', cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawRows = xlsx.utils.sheet_to_json(worksheet, { defval: null, raw: false });
      const rows = rawRows.map(mapRowToInternalFields);

      if (rows.length === 0) {
        return res.status(400).json({ success: false, message: 'Excel file empty', processedRows: 0, errors: ['Empty file'] });
      }

      // Normalize date fields
      for (let i = 0; i < rows.length; i++) {
        for (const df of DATE_FIELDS) {
          if (rows[i][df] !== null && rows[i][df] !== undefined) {
            rows[i][df] = parseExcelDate(rows[i][df]);
          }
        }
        // Normalize CHAR(1) fields to a single character compatible with DB
        for (const cf of CHAR1_FIELDS) {
          if (rows[i][cf] !== undefined) {
            rows[i][cf] = normalizeChar1(cf, rows[i][cf]);
          }
        }
      }

      const pool = await getPool();
      const employeeIds = rows.map(r => String(r.employee_id || '').trim()).filter(Boolean);
      const uniqueIds = Array.from(new Set(employeeIds));
      const dupResult = uniqueIds.length ? await executeQuery(`SELECT employee_id FROM dbo.employee_core WHERE employee_id IN (${uniqueIds.map(id => `'${id.replace(/'/g, "''")}'`).join(',')})`) : { recordset: [] };
      const existingSet = new Set(dupResult.recordset.map(r => String(r.employee_id)));

      let processedRows = 0;
      const errors = [];
      const warnings = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNumber = i + 2;
        const employeeId = String(row.employee_id || '').trim();

        if (!employeeId) {
          errors.push(`Row ${rowNumber}: employee_id is required`);
          continue;
        }

        const exists = existingSet.has(employeeId);
        if (exists && onDuplicate === 'error') {
          errors.push(`Row ${rowNumber} employee_id=${employeeId} exists (duplicate policy=error)`);
          continue;
        }
        if (exists && onDuplicate === 'skip') {
          warnings.push(`Row ${rowNumber} employee_id=${employeeId} skipped (duplicate policy=skip)`);
          continue;
        }

        const transaction = new sql.Transaction(pool);
        try {
          await transaction.begin();
          const request = new sql.Request(transaction);
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
            .input('blood_type', sql.Char(2), row.blood_type)
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

          await transaction.commit();
          processedRows++;
        } catch (err) {
          // Attempt rollback, but guard against aborted/non-started transactions to avoid EABORT bubbling
          try {
            await transaction.rollback();
          } catch (rbErr) {
            console.error('Rollback failed or transaction already aborted:', rbErr);
          }
          errors.push(`Row ${rowNumber} employee_id=${employeeId} error: ${err.message}`);
        }
      }

      const summary = { rows: rows.length, processedRows, errors: errors.length, warnings: warnings.length };
      const logPayload = {
        timestamp: new Date().toISOString(),
        type: 'commit',
        profile,
        onDuplicate,
        summary,
        errors,
        warnings
      };
      const base = `import-commit-${Date.now()}`;
      const jsonName = `${base}.json`;
      const csvName = `${base}.csv`;
      const logJsonRel = writeImportLog(jsonName, logPayload);
      const logCsvRel = writeImportLogCSV(csvName, logPayload);

      return res.json({ 
        success: errors.length === 0, 
        message: errors.length ? 'Imported with some errors.' : `Successfully processed ${processedRows} rows.`, 
        summary, 
        errors,
        warnings,
        logUrl: logJsonRel ? `/api/files?path=${encodeURIComponent(logJsonRel)}` : null,
        logCsvUrl: logCsvRel ? `/api/files?path=${encodeURIComponent(logCsvRel)}` : null
      });
    } catch (err) {
      console.error('Commit import processing error:', err);
      return res.status(500).json({ success: false, message: 'Failed to process commit import', errors: [err.message] });
    }
  }
);

// Validation error handler (moved to validation middleware)
// Employee validation rules are now imported from validation.js

router.post('/employees', 
  authenticateToken, 
  authorizePermission('employees.create'), 
  preventSQLInjection,
  employeeValidation, 
  handleValidationErrors, 
  async (req, res) => {
  const pool = await getPool();
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
      .input('blood_type', sql.Char(2), data.blood_type)
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
router.put('/employees/:employee_id', 
  authenticateToken, 
  authorizePermission('employees.edit'), 
  preventSQLInjection,
  employeeUpdateValidation, 
  handleValidationErrors, 
  async (req, res) => {
  const pool = await getPool();
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
      .input('blood_type', sql.Char(2), data.blood_type)
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
router.delete('/employees/:employee_id', 
  authenticateToken, 
  authorizePermission('employees.delete'), 
  preventSQLInjection,
  employeeIdValidation, 
  handleValidationErrors, 
  async (req, res) => {
  const pool = await getPool();
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
router.get('/employees', 
  authenticateToken, 
  authorizePermission('employees.view'), 
  preventSQLInjection,
  employeeQueryValidation, 
  handleValidationErrors, 
  async (req, res) => {
  try {
    const pool = await getPool();
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


function excelDateToJSDate(serial) {
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);
  return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate());
}

function parseExcelDate(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'number') return excelDateToJSDate(value);
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  const s = String(value).trim();
  if (!s) return null;

  // yyyy-mm-dd or yyyy/mm/dd
  let m = s.match(/^([0-9]{4})[\/-]([0-9]{1,2})[\/-]([0-9]{1,2})$/);
  if (m) {
    const y = Number(m[1]); const mo = Number(m[2]); const d = Number(m[3]);
    return new Date(y, mo - 1, d);
  }
  // dd/mm/yyyy or dd-mm-yyyy or with two-digit year
  m = s.match(/^([0-9]{1,2})[-\/. ]([0-9]{1,2})[-\/. ]([0-9]{2,4})$/);
  if (m) {
    let y = Number(m[3]);
    if (y < 100) y = y < 50 ? 2000 + y : 1900 + y;
    const d = Number(m[1]); const mo = Number(m[2]);
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) return new Date(y, mo - 1, d);
  }
  // mm/dd/yyyy (common US format)
  m = s.match(/^([0-9]{1,2})[-\/. ]([0-9]{1,2})[-\/. ]([0-9]{4})$/);
  if (m) {
    const mo = Number(m[1]); const d = Number(m[2]); const y = Number(m[3]);
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) return new Date(y, mo - 1, d);
  }
  // Month name formats: 31 Jan 2025 or January 31, 2025
  const months = {
    jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
    apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6,
    aug: 7, august: 7, sep: 8, sept: 8, september: 8,
    oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11
  };
  m = s.match(/^([0-9]{1,2})\s+([A-Za-z]+)\s+([0-9]{2,4})$/);
  if (m) {
    const d = Number(m[1]); const mo = months[m[2].toLowerCase()]; let y = Number(m[3]);
    if (y < 100) y = y < 50 ? 2000 + y : 1900 + y;
    if (mo !== undefined) return new Date(y, mo, d);
  }
  m = s.match(/^([A-Za-z]+)\s+([0-9]{1,2}),?\s+([0-9]{2,4})$/);
  if (m) {
    const mo = months[m[1].toLowerCase()]; const d = Number(m[2]); let y = Number(m[3]);
    if (y < 100) y = y < 50 ? 2000 + y : 1900 + y;
    if (mo !== undefined) return new Date(y, mo, d);
  }
  // Fallback to native parser
  const nd = new Date(s);
  return isNaN(nd.getTime()) ? null : new Date(nd.getFullYear(), nd.getMonth(), nd.getDate());
}



function safeString(val) {
  if (val === undefined || val === null) return null;
  return String(val);
}

router.post('/employees/upload', 
  authenticateToken, 
  authorizeRoles('admin', 'hr_general'), 
  preventSQLInjection,
  upload.single('file'), 
  fileUploadValidation, 
  handleValidationErrors, 
  async (req, res) => {
  if (!req.file)
    return res.status(400).json({ success: false, message: 'No file uploaded', processedRows: 0, errors: ['No file uploaded'] });

  try {
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer', cellDates: true });
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
          .input('blood_type', sql.Char(2), row.blood_type)
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