# Development Journal

## 2025-08-08 13:57:07 WIB

### Enhanced Security: Hidden Superadmin Users and Audit Logs

**Security Enhancement**: Implemented comprehensive hiding of superadmin users and their audit trail activities from non-superadmin users.

**Changes Made**:

1. **backend/routes/userRoutes.js**:
   - Modified `GET /` endpoint to filter out superadmin users from user lists for non-superadmin users
   - Updated `GET /:id` endpoint to return 404 when non-superadmin users try to access superadmin user details
   - Superadmin users can still see all users including other superadmins

2. **backend/services/auditService.js**:
   - Enhanced `getAuditTrail()` method with `requestingUser` parameter for role-based filtering
   - Added `getGeneralAuditTrail()` method for comprehensive audit log filtering
   - Both methods now hide audit entries where `user_role = 'superadmin'` from non-superadmin users
   - Superadmin users can see all audit activities including their own

**Security Benefits**:
- ✅ Non-superadmin users cannot see superadmin users in user management interface
- ✅ Non-superadmin users cannot access superadmin user details via API
- ✅ Audit logs hide superadmin activities from regular users
- ✅ Maintains full transparency for superadmin users
- ✅ Prevents information disclosure about system administrators

**Technical Implementation**:
- Role-based filtering at the database query level
- Conditional WHERE clauses based on requesting user's role
- Backward compatible - existing functionality preserved for superadmin users

**Status**: ✅ **COMPLETED** - Superadmin users and their activities are now hidden from regular users.

---

## 2025-08-08 13:50:56 WIB

### Fixed Database Column Name Issue in Password Update

**Bug Fix**: Resolved database error when updating user passwords due to incorrect column name reference.

**Problem**:
- Password reset functionality was failing with error: `Invalid column name 'updatedAt'`
- The `User.updatePassword()` method was using camelCase `updatedAt` but the database table uses snake_case `updated_at`

**Changes Made**:
1. **backend/models/User.js**:
   - Fixed SQL query in `updatePassword()` method (line 124)
   - Changed `updatedAt = GETDATE()` to `updated_at = GETDATE()`
   - Now correctly references the actual database column name

**Database Schema Verification**:
- Confirmed `login` table has `updated_at` column (snake_case)
- Other columns follow same convention: `created_at`, `password_changed_at`, etc.

**Impact**:
- ✅ Password reset functionality now works correctly
- ✅ Superadmin users can reset other users' passwords
- ✅ Users can change their own passwords
- ✅ Database timestamps are properly updated

**Status**: ✅ **COMPLETED** - Password update functionality restored.

---

## 2025-08-08 13:36:29 WIB

### Enabled Sidebar Menu for User Management Sub-Menus

**Enhancement**: Wrapped the UserManagement component with DashboardLayout to enable the sidebar navigation menu for all user management sub-menus.

**Changes Made**:
1. **src/pages/UserManagement.tsx**:
   - Added import for `DashboardLayout` from `@/components/layout/DashboardLayout`
   - Wrapped the entire component return statement with `<DashboardLayout>` component
   - This enables access to the sidebar menu with user management sub-items:
     - Manage Users
     - Role Management  
     - Role Matrix Configuration

**Benefits**:
- Users can now navigate between different user management sections using the sidebar
- Consistent navigation experience across all pages
- Access to other application modules (Employee Management, Reports & Analytics, etc.)
- Proper role-based menu visibility based on user permissions

**Technical Details**:
- The DashboardLayout component automatically handles sidebar state management
- Navigation items are defined in `src/types/user.ts` under `NAVIGATION_ITEMS`
- Role-based access control is enforced through `ROLE_PERMISSIONS` configuration
- TypeScript compilation passed without errors (`npx tsc --noEmit`)

**Status**: ✅ **COMPLETED** - Sidebar menu now available for all user management functionality.

---

## 2025-08-08 13:39:39 WIB

### Added Sidebar Menu to Role Matrix Configuration Page

**Enhancement**: Extended sidebar menu implementation to the RoleMatrix component to ensure consistent navigation across all user management pages.

**Changes Made**:
1. **src/pages/RoleMatrix.tsx**:
   - Added import for `DashboardLayout` from `@/components/layout/DashboardLayout`
   - Wrapped the entire component return statement with `<DashboardLayout>` component
   - This enables sidebar navigation for the Role Matrix Configuration page

**Current Status**:
- ✅ UserManagement.tsx - Sidebar enabled
- ✅ RoleMatrix.tsx - Sidebar enabled
- ⚠️ Role Management page (`/users/roles`) - Route exists in navigation but missing from App.tsx routing

**Benefits**:
- Consistent navigation experience across user management pages
- Users can now navigate between Manage Users and Role Matrix Configuration using the sidebar
- Access to all other application modules from any user management page

**Technical Details**:
- TypeScript compilation passed without errors (`npx tsc --noEmit`)
- Both pages now use the same DashboardLayout wrapper for consistent UI/UX

**Status**: ✅ **COMPLETED** - Role Matrix page now has sidebar menu functionality.

---

## 2025-08-08 11:31:00 WIB

### Fixed TypeError: Cannot read properties of undefined (reading 'replace') in UserManagement

**Issue**: Frontend UserManagement component throwing `TypeError: Cannot read properties of undefined (reading 'replace')` at line 499 when trying to process `user.role.replace('_', ' ').toUpperCase()`.

**Root Cause**: The backend userRoutes.js was still using Sequelize-style syntax (`findByPk`, `user.update()`, `order: [['createdAt', 'DESC']]`) instead of the custom User model methods, causing API calls to fail and return undefined user objects.

**Changes Made**:
1. **backend/routes/userRoutes.js**:
   - Replaced all `User.findByPk(id)` calls with `User.findById(id)`
   - Updated GET `/api/users` route to use `User.findAll()` properly
   - Removed Sequelize-style `attributes: { exclude: ['password'] }` and `order: [['createdAt', 'DESC']]`
   - Added manual password exclusion using destructuring
   - Replaced `user.destroy()` with `User.delete(id)`
   - Replaced `user.update()` with `User.updatePassword(id, newPassword)`
   - Removed references to non-existent `customColumns` field
   - Added fallback for role field: `user.Role || user.role`

2. **API Response Structure**:
   - Fixed user data sanitization to properly exclude passwords
   - Ensured consistent role field naming between database and frontend

3. **Frontend null safety improvements**:
   - Line 499: Added fallback `(user.role || 'user').replace('_', ' ').toUpperCase()`
   - Lines 295-296: Added fallbacks `(user.role || 'user') === 'superadmin'` for permission checks
   - Line 561: Added fallback `selectedUser.role || 'user'` for Select component value
   - Added proper null checks for role badge rendering

**Testing**:
- Backend server starts successfully on port 8080
- Frontend development server running on port 5174
- API endpoints respond with proper HTTP status codes
- User data structure now includes required `role` field
- Ran `npx tsc --noEmit` to verify no TypeScript errors

**Status**: ✅ **RESOLVED** - Both backend and frontend fixes applied, TypeError completely resolved with proper null safety.

---

## 2025-08-08 11:41 WIB - Database Column Mapping Fix

### Issue Resolution
- **Problem**: Role and Status fields showing empty in UserManagement despite user being logged in as superadmin
- **Root Cause**: Database column names mismatch - DB uses 'Role' (capital R) and 'Id' (capital I), but frontend expects 'role' and 'id' (lowercase)

### Database Schema Analysis
```sql
-- Actual database columns in dbo.login table:
'Id', 'username', 'password', 'Role', 'name', 'department', 
'created_at', 'created_by', 'updated_at', 'updated_by', 
'last_login', 'login_count', 'account_locked', 'locked_until', 
'password_changed_at', 'must_change_password'
```

### Changes Made

#### Backend API Updates (`backend/routes/userRoutes.js`)
1. **GET /api/users**: Added column name mapping
   ```javascript
   const sanitizedUsers = users.map(user => {
     const { password, ...userWithoutPassword } = user;
     return {
       ...userWithoutPassword,
       id: userWithoutPassword.Id,
       role: userWithoutPassword.Role,
       status: userWithoutPassword.account_locked ? 'inactive' : 'active'
     };
   });
   ```

2. **GET /api/users/:id**: Added column name mapping for single user
3. **PUT /api/users/:id**: Updated to map frontend fields to database columns
   - `role` → `Role`
   - `status` → `account_locked` (boolean)

#### Backend Model Updates (`backend/models/User.js`)
- Updated `allowedFields` array to use correct database column names:
  ```javascript
  // Before: ['name', 'role', 'department', 'status', ...]
  // After: ['name', 'Role', 'department', 'account_locked', ...]
  ```

### Verification
- ✅ Backend server restarted successfully
- ✅ TypeScript check passed (`npx tsc --noEmit`)
- ✅ Database column mapping implemented
- ✅ Status field now maps `account_locked` boolean to 'active'/'inactive' strings

### Status
**RESOLVED** - Role and Status fields now display correctly with proper database column mapping.

---

## 2025-08-08 11:35 WIB - Frontend Null Safety Improvements

### Issue Resolution
- **Problem**: `TypeError: Cannot read properties of undefined (reading 'replace')` in UserManagement component
- **Root Cause**: `user.role` field was undefined, causing errors when accessing `.replace()` method

### Changes Made

#### Frontend Updates (`src/pages/UserManagement.tsx`)
1. **Line 499**: Added fallback for role display
   ```tsx
   // Before: user.role.replace('_', ' ').toUpperCase()
   // After: (user.role || 'user').replace('_', ' ').toUpperCase()
   ```

2. **Lines 295-296**: Added fallbacks for permission checks
   ```tsx
   // Before: user.role === 'superadmin' || user.role === 'admin'
   // After: (user.role || 'user') === 'superadmin' || (user.role || 'user') === 'admin'
   ```

3. **Line 561**: Added fallback for Select component value
   ```tsx
   // Before: value={selectedUser.role}
   // After: value={selectedUser.role || 'user'}
   ```

#### Backend Updates (`backend/routes/userRoutes.js`)
- Enhanced user data structure validation
- Improved error handling for undefined role fields
- Added proper fallbacks for missing user properties

### Verification
- ✅ TypeScript check passed (`npx tsc --noEmit`)
- ✅ No type errors detected
- ✅ UserManagement component now handles undefined role gracefully

### Status
**RESOLVED** - TypeError in UserManagement component fixed with comprehensive null safety improvements.

---

## 2025-08-08 11:25:00 WIB

### Fixed Database Column Name Mismatch in User Model

**Issue**: The User model was using camelCase column names (`createdAt`, `updatedAt`) while the database uses snake_case (`created_at`, `updated_at`), causing "Invalid column name" errors.

**Root Cause**: After migrating from Sequelize ORM to raw SQL queries, the column naming convention wasn't properly updated to match the database schema.

**Database Schema Verification**:
- Queried `INFORMATION_SCHEMA.COLUMNS` for `dbo.login` table
- Confirmed actual column names: `Id`, `username`, `password`, `Role`, `name`, `department`, `created_at`, `created_by`, `updated_at`, `updated_by`, `last_login`, `login_count`, `account_locked`, `locked_until`, `password_changed_at`, `must_change_password`

**Changes Made**:
1. **backend/models/User.js**:
   - Fixed `INSERT` query: `createdAt` → `created_at`, `updatedAt` → `updated_at`
   - Fixed `ORDER BY` clause: `createdAt` → `created_at`
   - Fixed `UPDATE` statement: `updatedAt` → `updated_at`
   - Updated column references: `role` → `Role`
   - Removed non-existent columns: `status`, `customColumns`

**Testing**:
- Backend server successfully connects to database
- No more "Invalid column name" errors
- API endpoints return proper HTTP responses (401 for unauthorized access)

**Status**: ✅ **RESOLVED** - Database column name mismatches fixed, backend running successfully.

---

## 2025-08-08 14:09:58 WIB

### Restricted Superadmin Role Visibility in User Management

**Changes Made:**
- **File Modified:** `src/pages/UserManagement.tsx`
- **Enhancement Type:** Role-Based Access Control Security Improvement

**Specific Updates:**
1. **Edit User Dialog Role Restriction:**
   - Modified role selection dropdown in edit user dialog
   - Added conditional rendering to hide "Super Admin" option from non-superadmin users
   - Only users with `superadmin` role can now assign superadmin privileges to other users

2. **Security Enhancement:**
   - Implemented `{user?.role === 'superadmin' && (<SelectItem value="superadmin">Super Admin</SelectItem>)}` condition
   - Prevents privilege escalation by restricting superadmin role assignment
   - Maintains existing functionality for create user dialog (already had this restriction)

**Technical Implementation:**
- Used conditional rendering based on current user's role
- Leveraged React JSX conditional syntax for clean implementation
- Maintained consistency between create and edit user dialogs
- Preserved all other role options for non-superadmin users

**Security Impact:**
- Prevents unauthorized superadmin role assignments
- Ensures only superadmins can create or modify other superadmin accounts
- Maintains principle of least privilege in role management

**Status:** ✅ Completed - TypeScript compilation successful, security enhancement deployed

---

## 2025-08-08 14:20 - User Profile Page with Self-Service Password Change

**Enhancement**: Implemented user profile page with self-service password change functionality

**Changes Made**:
- **New Page** (`src/pages/UserProfile.tsx`):
  - Created comprehensive user profile page
  - Self-service password change form with validation
  - Profile information display with role badges
  - Password visibility toggles for security
  - Form validation (current password, new password, confirmation)
  - Integration with existing `/api/users/:id/password` endpoint
  - Responsive design with shadcn/ui components

- **Navigation** (`src/App.tsx`):
  - Added `/profile` route with ProtectedRoute wrapper
  - Imported UserProfile component

- **Layout** (`src/components/layout/DashboardLayout.tsx`):
  - Added "Profile" menu item to user dropdown
  - Navigation link to user profile page

**Features**:
- **Profile Information**: User details, role badges, department info
- **Password Change**: Secure self-service password updates
- **Validation**: Current password verification, new password strength
- **Security**: Password visibility toggles, form validation
- **UI/UX**: Responsive design, loading states, toast notifications

**User Experience**:
- Easy access via user dropdown menu
- Clear visual feedback for password changes
- Comprehensive validation messages
- Role-based profile information display

## 2025-01-08 14:14 - Admin Password Reset Functionality

**Feature**: Enhanced password reset functionality to allow admin users to reset non-admin user passwords while maintaining security restrictions.

**Changes Made**:

**Backend (`backend/routes/userRoutes.js`)**:
- Modified password reset endpoint authorization logic
- Admin users can now reset passwords for users with roles other than 'admin' and 'superadmin'
- Superadmin users retain ability to reset any user's password
- Users can still reset their own passwords

**Frontend (`src/pages/UserManagement.tsx`)**:
- Updated `handlePasswordReset` function with new permission logic:
  - Admin and superadmin users can reset other users' passwords
  - Admin users cannot reset admin or superadmin passwords
  - Clear error messages for unauthorized attempts
- Added conditional rendering for password reset button:
  - Superadmin: Can see button for all users
  - Admin: Can only see button for non-admin users
  - All users: Can see button for their own account

**Security Benefits**:
- Prevents admin users from escalating privileges by resetting admin/superadmin passwords
- Maintains clear role hierarchy and access control
- Provides appropriate user feedback for unauthorized actions

**Files Modified**:
- `backend/routes/userRoutes.js` - Updated password reset endpoint authorization
- `src/pages/UserManagement.tsx` - Enhanced frontend permission logic and UI

---

## 2025-01-25

### User Management Role Dropdown Security Fix
- **Issue**: Super Admin role was still showing in edit user dialog dropdown for non-superadmin users
- **Root Cause**: Previous conditional rendering was removed, allowing unauthorized access to superadmin role selection
- **Solution**: Re-implemented conditional rendering `{user?.role === 'superadmin' && (<SelectItem value="superadmin">Super Admin</SelectItem>)}` in edit dialog
- **Verification**: Create user dialog already had proper conditional rendering in place
- **Security Enhancement**: Ensures only superadmin users can assign/modify superadmin roles
- **Files Modified**: `src/pages/UserManagement.tsx` (lines 701-703)
- **Status**: ✅ Resolved - Super Admin role option now properly hidden from non-superadmin users

---

## 2025-08-08

### Enhanced User Management Interface for Superadmin Clarity
- **Issue**: User reported seeing superadmin users in the interface without understanding why
- **Root Cause**: User was logged in as superadmin but interface didn't clearly indicate this or explain the visibility
- **Solution**: 
  - Added informational alert banner showing current user's role and permissions
  - Enhanced visual distinction for superadmin users with red-colored styling
  - Added explanatory text for superadmin users about their elevated privileges
  - Improved user experience by making role-based access more transparent
- **Files Modified**:
  - `src/pages/UserManagement.tsx` - Added role info banner and enhanced superadmin user styling
- **UI Improvements**:
  - Current user role displayed prominently at top of page
  - Superadmin users highlighted with red border and background
  - Clear explanation of why superadmin can see all users including other superadmins
- **Testing**: TypeScript compilation passed without errors

---

## 2025-08-08

### Added Password Reset Feature to User Management

**Feature Implementation**: Added a comprehensive password reset feature to the User Management section, allowing administrators to reset user passwords through a secure dialog interface.

**Technical Implementation**:

1. **Frontend Changes** (`src/pages/UserManagement.tsx`):
   - Added state management for password reset dialog and form inputs
   - Implemented `handlePasswordReset()` function with validation
   - Created password reset dialog with new password and confirm password fields
   - Added Key icon button to user action buttons

2. **Backend Integration**: Utilizes existing `/api/users/:id/password` endpoint

3. **Security Features**:
   - Password confirmation validation
   - Minimum password length enforcement (6 characters)
   - Role-based access control
   - Secure password transmission

**Files Modified**: 
- `src/pages/UserManagement.tsx` - Added password reset functionality
- `docs/journal.md` - Documented implementation

**Verification**: 
- ✅ TypeScript compilation successful
- ✅ Password reset dialog works correctly
- ✅ Form validation implemented
- ✅ Integration with existing backend API

---

### Fixed Role-Based Access Control Issues
- **Issue**: Users with 'superadmin' role were not showing their role in the edit dialog
- **Root Cause**: The Select component for roles was conditionally rendering the 'superadmin' option based on `user?.role === 'superadmin'`, but `user` referred to the currently logged-in user, not the user being edited
- **Solution**: 
  - Removed conditional rendering for the 'superadmin' SelectItem
  - Made all role options always available in the dropdown
  - This allows proper editing of users with 'superadmin' role
- **Files Modified**: 
  - `src/pages/UserManagement.tsx` - Updated role Select component (lines 579-583)
- **Testing**: Verified that 'mti-ict' user with 'superadmin' role now displays correctly in edit dialog

### Technical Details
- **Database Verification**: Confirmed 'mti-ict' user has 'superadmin' role in database
- **API Response**: Backend correctly returns role data
- **Frontend Fix**: Removed conditional `{user?.role === 'superadmin' && ...}` wrapper around SuperAdmin SelectItem
- **Result**: All role options (employee, dep_rep, finance, hr_general, admin, superadmin) are now always available in the edit dialog

---

## 2025-08-08 - Database Table Name Fix

### Issue Fixed
- **Problem**: Backend was throwing "Invalid object name 'dbo.users'." error
- **Root Cause**: User model was querying `dbo.users` table, but the actual table name in the database is `dbo.login`
- **Solution**: Updated all SQL queries in `backend/models/User.js` to use `dbo.login` instead of `dbo.users`

### Changes Made
1. **Updated User Model Queries**: Changed all database queries in `User.js` from `dbo.users` to `dbo.login`:
   - `findByUsername()` method
   - `findById()` method
   - `findAll()` method
   - `create()` method
   - `update()` method
   - `updatePassword()` method
   - `delete()` method
   - `updateLoginAttempts()` method
   - `updateLastLogin()` method

2. **Previous Sequelize Removal**: Successfully removed Sequelize dependencies and centralized backend to use `mssql` for all database interactions

### Result
- ✅ Backend server now starts successfully
- ✅ Database connection established to MTIMasterEmployeeDB on 10.60.10.47:1433
- ✅ Server running on port 8080
- ✅ All User model methods now use correct table name (`dbo.login`)

### Technical Details
- **Database**: MTIMasterEmployeeDB
- **Table**: `dbo.login` (for user authentication and management)
- **Connection**: mssql with connection pooling (max=10, min=0)
- **Environment**: Development mode with CORS enabled for localhost:5173