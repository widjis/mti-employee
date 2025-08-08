import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Improved Excel column analysis that handles multiple sheets and finds actual headers
 */

function findHeaderRow(data) {
  // Look for the first row that contains string values (likely headers)
  for (let i = 0; i < Math.min(data.length, 10); i++) {
    const row = data[i];
    if (row && Array.isArray(row)) {
      // Check if row contains mostly strings and has reasonable length
      const stringCount = row.filter(cell => typeof cell === 'string' && cell.trim().length > 0).length;
      if (stringCount > row.length * 0.5 && row.length > 5) {
        return { rowIndex: i, headers: row.filter(cell => cell && cell.toString().trim()) };
      }
    }
  }
  return null;
}

function analyzeSheet(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  console.log(`  Sheet: ${sheetName}`);
  console.log(`  Total rows: ${data.length}`);
  
  // Try to find header row
  const headerInfo = findHeaderRow(data);
  if (headerInfo) {
    console.log(`  Header found at row ${headerInfo.rowIndex + 1}`);
    console.log(`  Columns: ${headerInfo.headers.length}`);
    return headerInfo.headers;
  } else {
    console.log(`  No clear headers found`);
    return [];
  }
}

function analyzeExcelColumnsImproved() {
  const publicDir = path.join(__dirname, '../../public');
  
  // Template file
  const templateFile = path.join(publicDir, 'template_data.xlsx');
  
  // Role-specific files
  const roleFiles = {
    'HR Operation': path.join(publicDir, 'Master Data Karyawan untuk HR Operation.xlsx'),
    'Finance': path.join(publicDir, 'Master Data Karyawan untuk Finance.xlsx'),
    'Department Admin': path.join(publicDir, 'Master Data Karyawan untuk Masing Masing Admin Dept.xlsx'),
    'MTI 2025': path.join(publicDir, 'Master Data Karyawan MTI 2025 Fix Update.xlsx')
  };

  const results = {
    template: null,
    roles: {},
    columnMapping: {},
    sheetAnalysis: {},
    recommendations: []
  };

  try {
    // Analyze template file
    console.log('=== ANALYZING TEMPLATE_DATA.XLSX ===');
    if (fs.existsSync(templateFile)) {
      const templateWorkbook = XLSX.readFile(templateFile);
      const templateSheet = templateWorkbook.Sheets[templateWorkbook.SheetNames[0]];
      const templateData = XLSX.utils.sheet_to_json(templateSheet, { header: 1 });
      const templateColumns = templateData[0] || [];
      
      results.template = {
        filename: 'template_data.xlsx',
        totalColumns: templateColumns.length,
        columns: templateColumns
      };
      
      console.log(`Total columns: ${templateColumns.length}`);
      console.log('Sample columns:', templateColumns.slice(0, 10));
      console.log();
    } else {
      console.log('Template file not found!');
      return results;
    }

    // Analyze role-specific files
    for (const [role, filepath] of Object.entries(roleFiles)) {
      if (fs.existsSync(filepath)) {
        console.log(`=== ANALYZING ${role.toUpperCase()} FILE ===`);
        console.log(`File: ${path.basename(filepath)}`);
        
        const workbook = XLSX.readFile(filepath);
        console.log(`Sheet names: ${workbook.SheetNames.join(', ')}`);
        
        // Analyze each sheet
        const sheetResults = {};
        let allColumns = [];
        
        for (const sheetName of workbook.SheetNames) {
          const sheetColumns = analyzeSheet(workbook, sheetName);
          sheetResults[sheetName] = sheetColumns;
          
          // Combine unique columns from all sheets
          for (const col of sheetColumns) {
            if (!allColumns.includes(col)) {
              allColumns.push(col);
            }
          }
        }
        
        results.sheetAnalysis[role] = sheetResults;
        
        // Compare with template
        const templateSet = new Set(results.template.columns);
        const roleSet = new Set(allColumns);
        const missing = results.template.columns.filter(col => !roleSet.has(col));
        const extra = allColumns.filter(col => !templateSet.has(col));
        const common = allColumns.filter(col => templateSet.has(col));
        
        results.roles[role] = {
          filename: path.basename(filepath),
          totalSheets: workbook.SheetNames.length,
          sheetNames: workbook.SheetNames,
          totalColumns: allColumns.length,
          columns: allColumns,
          comparison: {
            common: common,
            missing: missing,
            extra: extra,
            commonCount: common.length,
            missingCount: missing.length,
            extraCount: extra.length
          }
        };
        
        // Store column mapping for this role
        results.columnMapping[role] = allColumns;
        
        console.log(`\nSUMMARY FOR ${role}:`);
        console.log(`Total unique columns across all sheets: ${allColumns.length}`);
        console.log(`Common with template: ${common.length}`);
        console.log(`Missing from template: ${missing.length}`);
        console.log(`Extra columns: ${extra.length}`);
        
        if (allColumns.length > 0) {
          console.log('Sample columns:', allColumns.slice(0, 10));
        }
        
        if (missing.length > 0 && missing.length < 20) {
          console.log('Missing columns:', missing);
        }
        if (extra.length > 0 && extra.length < 20) {
          console.log('Extra columns:', extra);
        }
        console.log('---\n');
      } else {
        console.log(`File not found: ${filepath}`);
      }
    }

    // Generate recommendations
    console.log('=== RECOMMENDATIONS FOR ROLE-BASED EXPORT ===');
    
    // Find most comprehensive role (highest column count)
    const rolesByColumns = Object.entries(results.roles)
      .filter(([,roleData]) => roleData.totalColumns > 0)
      .sort(([,a], [,b]) => b.totalColumns - a.totalColumns);
    
    if (rolesByColumns.length > 0) {
      const [mostComprehensiveRole, roleData] = rolesByColumns[0];
      results.recommendations.push(`Most comprehensive role: ${mostComprehensiveRole} (${roleData.totalColumns} columns)`);
      console.log(`Most comprehensive role: ${mostComprehensiveRole} (${roleData.totalColumns} columns)`);
    }
    
    // Identify core columns (present in all roles that have data)
    const rolesWithData = Object.values(results.roles).filter(role => role.totalColumns > 0);
    if (rolesWithData.length > 0) {
      const allRoleColumns = rolesWithData.map(role => new Set(role.columns));
      const coreColumns = results.template.columns.filter(col => 
        allRoleColumns.every(roleSet => roleSet.has(col))
      );
      results.recommendations.push(`Core columns (present in all roles with data): ${coreColumns.length}`);
      console.log(`Core columns (present in all roles with data): ${coreColumns.length}`);
      if (coreColumns.length > 0 && coreColumns.length < 20) {
        console.log('Core columns:', coreColumns);
      }
    }
    
    // Role-specific recommendations
    for (const [role, roleData] of Object.entries(results.roles)) {
      if (roleData.totalColumns > 0) {
        const accessLevel = roleData.comparison.commonCount / results.template.columns.length;
        let recommendation = '';
        if (accessLevel > 0.8) {
          recommendation = 'Full access - can view most employee data';
        } else if (accessLevel > 0.5) {
          recommendation = 'Moderate access - can view core employee data';
        } else if (accessLevel > 0.2) {
          recommendation = 'Limited access - can view basic employee data';
        } else {
          recommendation = 'Minimal access - very restricted data view';
        }
        
        results.recommendations.push(`${role}: ${recommendation} (${Math.round(accessLevel * 100)}% of template columns)`);
        console.log(`${role}: ${recommendation} (${Math.round(accessLevel * 100)}% of template columns)`);
      }
    }
    
    console.log('\n=== IMPLEMENTATION SUGGESTIONS ===');
    console.log('1. Create role-based column filters in backend API');
    console.log('2. Implement sheet-specific data access for multi-sheet roles');
    console.log('3. Use column mapping to filter data before export/display');
    console.log('4. Create separate export endpoints for each role');
    console.log('5. Implement permission-based column visibility in frontend');
    console.log('6. Consider creating role-specific templates based on analysis');
    
    return results;
    
  } catch (error) {
    console.error('Error analyzing Excel files:', error);
    return { error: error.message };
  }
}

// Export for use in other modules
export { analyzeExcelColumnsImproved };

// Run analysis if called directly
if (import.meta.url === `file://${process.argv[1]}` || import.meta.url.endsWith('analyze-excel-columns-improved.js')) {
  console.log('Starting improved Excel column analysis...');
  const results = analyzeExcelColumnsImproved();
  
  // Save results to JSON file for reference
  const outputFile = path.join(__dirname, 'excel-column-analysis-improved.json');
  try {
    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
    console.log(`\nDetailed analysis results saved to: ${outputFile}`);
  } catch (error) {
    console.error('Error saving results:', error);
  }
}