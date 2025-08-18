import dotenv from 'dotenv';
import { executeQuery } from './config/database.js';

// Load environment variables from parent directory
dotenv.config({ path: '../.env' });

async function checkDepartmentData() {
    console.log('🏢 Analyzing Department Data in Local Database\n');
    
    try {
        // Check all users and their department information
        console.log('📊 Step 1: Checking all users and their departments...');
        const usersQuery = `
            SELECT 
                username,
                name,
                department,
                auth_type,
                role,
                created_at,
                last_domain_sync
            FROM dbo.login 
            ORDER BY auth_type, department, username
        `;
        
        const result = await executeQuery(usersQuery);
        const users = result.recordset || result;
        
        if (!users || users.length === 0) {
            console.log('❌ No users found in database');
            return;
        }
        
        console.log(`✅ Found ${users.length} users in database\n`);
        
        // Group users by auth_type
        const localUsers = users.filter(u => u.auth_type === 'local');
        const domainUsers = users.filter(u => u.auth_type === 'domain');
        
        console.log('👥 LOCAL USERS:');
        if (localUsers.length === 0) {
            console.log('   No local users found');
        } else {
            localUsers.forEach(user => {
                console.log(`   - ${user.username} (${user.name})`);
                console.log(`     Department: ${user.department || 'NOT SET'}`);
                console.log(`     Role: ${user.role}`);
                console.log('');
            });
        }
        
        console.log('🌐 DOMAIN USERS:');
        if (domainUsers.length === 0) {
            console.log('   No domain users found');
        } else {
            domainUsers.forEach(user => {
                console.log(`   - ${user.username} (${user.name})`);
                console.log(`     Department: ${user.department || 'NOT SET'}`);
                console.log(`     Role: ${user.role}`);
                console.log(`     Last AD Sync: ${user.last_domain_sync || 'NEVER'}`);
                console.log('');
            });
        }
        
        // Analyze department distribution
        console.log('📈 Step 2: Department Distribution Analysis...');
        const deptQuery = `
            SELECT 
                department,
                auth_type,
                COUNT(*) as user_count
            FROM dbo.login 
            GROUP BY department, auth_type
            ORDER BY department, auth_type
        `;
        
        const deptResult = await executeQuery(deptQuery);
        const deptStats = deptResult.recordset || deptResult;
        
        console.log('\n📊 Department Statistics:');
        const deptMap = new Map();
        
        deptStats.forEach(stat => {
            const dept = stat.department || 'NO DEPARTMENT';
            if (!deptMap.has(dept)) {
                deptMap.set(dept, { local: 0, domain: 0, total: 0 });
            }
            const deptData = deptMap.get(dept);
            deptData[stat.auth_type] = stat.user_count;
            deptData.total += stat.user_count;
        });
        
        for (const [dept, counts] of deptMap.entries()) {
            console.log(`\n🏢 ${dept}:`);
            console.log(`   - Local users: ${counts.local}`);
            console.log(`   - Domain users: ${counts.domain}`);
            console.log(`   - Total: ${counts.total}`);
        }
        
        // Check for users without departments
        const noDeptQuery = `
            SELECT COUNT(*) as count
            FROM dbo.login 
            WHERE department IS NULL OR department = ''
        `;
        
        const noDeptResult = await executeQuery(noDeptQuery);
        const noDeptData = noDeptResult.recordset || noDeptResult;
        const noDeptCount = noDeptData[0].count;
        
        console.log('\n⚠️  Step 3: Users without Department Information:');
        console.log(`   - ${noDeptCount} users have no department set`);
        
        if (noDeptCount > 0) {
            const noDeptUsersQuery = `
                SELECT username, name, auth_type, role
                FROM dbo.login 
                WHERE department IS NULL OR department = ''
                ORDER BY auth_type, username
            `;
            
            const noDeptUsersResult = await executeQuery(noDeptUsersQuery);
            const noDeptUsers = noDeptUsersResult.recordset || noDeptUsersResult;
            console.log('\n   Users without departments:');
            noDeptUsers.forEach(user => {
                console.log(`   - ${user.username} (${user.name}) - ${user.auth_type} - ${user.role}`);
            });
        }
        
        console.log('\n💡 Analysis Summary:');
        console.log('\n🔍 Current Department Mapping Logic:');
        console.log('   1. For DOMAIN users: Department comes from AD "department" attribute');
        console.log('   2. For LOCAL users: Department is manually set during user creation');
        console.log('   3. Department field is stored as-is from AD (no transformation)');
        
        console.log('\n📝 Observations:');
        if (domainUsers.length > 0) {
            const domainWithDept = domainUsers.filter(u => u.department && u.department.trim());
            console.log(`   - ${domainWithDept.length}/${domainUsers.length} domain users have department info`);
            
            if (domainWithDept.length < domainUsers.length) {
                console.log('   ⚠️  Some domain users are missing department information from AD');
            }
        }
        
        if (localUsers.length > 0) {
            const localWithDept = localUsers.filter(u => u.department && u.department.trim());
            console.log(`   - ${localWithDept.length}/${localUsers.length} local users have department info`);
        }
        
        console.log('\n🎯 Recommendations:');
        if (noDeptCount > 0) {
            console.log('   1. Review AD schema to ensure "department" attribute is populated');
            console.log('   2. Consider alternative AD attributes (company, division, OU structure)');
            console.log('   3. Implement department mapping rules based on user groups or OU');
            console.log('   4. Add manual department assignment for local users');
        } else {
            console.log('   ✅ All users have department information - current mapping is working well');
        }
        
        console.log('\n✅ Department data analysis completed!');
        
    } catch (error) {
        console.error('❌ Error during department data analysis:', error.message);
        console.error('Error details:', error);
    }
}

// Run the analysis
checkDepartmentData().catch(console.error);