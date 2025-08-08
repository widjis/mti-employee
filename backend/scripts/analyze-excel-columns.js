import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Analyze Excel column structures for role-based export/view functionality
 * This script examines the template and role-specific Excel files to identify
 * column differences for implementing role-based data access
 */

function analyzeExcelColumns() {
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
      console.log('Columns:', templateColumns);
      console.log();
    } else {
      console.log('Template file not found!');
      return results;
    }

    // Analyze role-specific files
    for (const [role, filepath] of Object.entries(roleFiles)) {
      if (fs.existsSync(filepath)) {
        console.log(`=== ANALYZING ${role.toUpperCase()} FILE ===`);
        
        const workbook = XLSX.readFile(filepath);
        console.log(`Sheet names: ${workbook.SheetNames.join(', ')}`);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        const columns = data[0] || [];
        console.log(`Raw first row data:`, data[0]);
        console.log(`Data rows count: ${data.length}`);
        
        // Compare with template
        const templateSet = new Set(results.template.columns);
        const roleSet = new Set(columns);
        const missing = results.template.columns.filter(col => !roleSet.has(col));
        const extra = columns.filter(col => !templateSet.has(col));
        const common = columns.filter(col => templateSet.has(col));
        
        results.roles[role] = {
          filename: path.basename(filepath),
          totalColumns: columns.length,
          columns: columns,
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
        results.columnMapping[role] = columns;
        
        console.log(`Total columns: ${columns.length}`);
        console.log(`Common with template: ${common.length}`);
        console.log(`Missing from template: ${missing.length}`);
        console.log(`Extra columns: ${extra.length}`);
        
        if (missing.length > 0) {
          console.log('Missing columns:', missing);
        }
        if (extra.length > 0) {
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
      .sort(([,a], [,b]) => b.totalColumns - a.totalColumns);
    
    if (rolesByColumns.length > 0) {
      const [mostComprehensiveRole, roleData] = rolesByColumns[0];
      results.recommendations.push(`Most comprehensive role: ${mostComprehensiveRole} (${roleData.totalColumns} columns)`);
      console.log(`Most comprehensive role: ${mostComprehensiveRole} (${roleData.totalColumns} columns)`);
    }
    
    // Identify core columns (present in all roles)
    const allRoleColumns = Object.values(results.roles).map(role => new Set(role.columns));
    if (allRoleColumns.length > 0) {
      const coreColumns = results.template.columns.filter(col => 
        allRoleColumns.every(roleSet => roleSet.has(col))
      );
      results.recommendations.push(`Core columns (present in all roles): ${coreColumns.length}`);
      console.log(`Core columns (present in all roles): ${coreColumns.length}`);
      console.log('Core columns:', coreColumns);
    }
    
    // Suggest implementation approach
    results.recommendations.push('Implementation approach: Create role-based column filters');
    results.recommendations.push('Use column mapping to filter data before export/display');
    results.recommendations.push('Implement permission-based column visibility');
    
    console.log('\n=== IMPLEMENTATION SUGGESTIONS ===');
    console.log('1. Create role-based column filters in backend');
    console.log('2. Use column mapping to filter data before export/display');
    console.log('3. Implement permission-based column visibility in frontend');
    console.log('4. Create separate export endpoints for each role');
    console.log('5. Use the most comprehensive role as the master template');
    
    return results;
    
  } catch (error) {
    console.error('Error analyzing Excel files:', error);
    return { error: error.message };
  }
}

// Export for use in other modules
export { analyzeExcelColumns };

// Run analysis if called directly
if (import.meta.url === `file://${process.argv[1]}` || import.meta.url.endsWith('analyze-excel-columns.js')) {
  console.log('Starting Excel column analysis...');
  const results = analyzeExcelColumns();
  
  // Save results to JSON file for reference
  const outputFile = path.join(__dirname, 'excel-column-analysis.json');
  try {
    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
    console.log(`\nAnalysis results saved to: ${outputFile}`);
  } catch (error) {
    console.error('Error saving results:', error);
  }
}