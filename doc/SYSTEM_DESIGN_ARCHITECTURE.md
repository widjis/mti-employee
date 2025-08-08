# MTI Employee Management System - System Design & Architecture

## Document Overview
This document provides a comprehensive overview of the MTI Employee Management System's architecture, design patterns, technology stack, and implementation details.

---

## 1. System Architecture Overview

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│  React 18 + TypeScript + Vite                                  │
│  • Responsive Web Application                                   │
│  • shadcn/ui + Tailwind CSS                                   │
│  • React Query for State Management                            │
│  • React Router for Navigation                                 │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ HTTPS/REST API
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     APPLICATION LAYER                          │
├─────────────────────────────────────────────────────────────────┤
│  Node.js + Express.js                                          │
│  • RESTful API Endpoints                                        │
│  • JWT Authentication                                           │
│  • Role-Based Access Control (RBAC)                           │
│  • Input Validation & Security Middleware                      │
│  • Rate Limiting & CORS                                        │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ SQL Queries
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                       DATA LAYER                               │
├─────────────────────────────────────────────────────────────────┤
│  Microsoft SQL Server                                          │
│  • Employee Data Management                                     │
│  • User Authentication & Authorization                          │
│  • Audit Trail & Logging                                       │
│  • RBAC Matrix (Roles & Permissions)                          │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Technology Stack

#### Frontend Stack
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Library**: shadcn/ui (headless components)
- **Styling**: Tailwind CSS
- **State Management**: React Query (TanStack Query)
- **Routing**: React Router v6
- **Form Handling**: React Hook Form + Zod validation
- **HTTP Client**: Axios

#### Backend Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: Microsoft SQL Server
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcrypt
- **Validation**: express-validator
- **Security**: Helmet, CORS, Rate Limiting
- **Environment**: dotenv

#### Development & Deployment
- **Package Manager**: npm
- **Version Control**: Git
- **Project Management**: OpenProject
- **Documentation**: Markdown

---

## 2. Frontend Architecture

### 2.1 Component Architecture

```
src/
├── components/
│   ├── ui/                    # shadcn/ui base components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   └── ...
│   ├── layout/                # Layout components
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── MainLayout.tsx
│   ├── analytics/             # Analytics components
│   ├── AddEmployeeForm.tsx    # Feature components
│   ├── EmployeeTable.tsx
│   ├── EmployeeEditForm.tsx
│   ├── ExcelUpload.tsx
│   └── ProtectedRoute.tsx
├── pages/
│   ├── Dashboard.tsx
│   ├── Login.tsx
│   ├── Index.tsx
│   └── NotFound.tsx
├── context/
│   └── AuthContext.tsx        # Authentication state
├── hooks/
│   ├── use-mobile.tsx
│   └── use-toast.ts
├── types/
│   └── user.ts               # TypeScript definitions
└── lib/
    └── utils.ts              # Utility functions
```

### 2.2 State Management Strategy

#### Authentication State
- **Context**: AuthContext for user authentication state
- **Persistence**: localStorage for JWT token
- **Auto-refresh**: Token validation on app initialization

#### Server State
- **Library**: React Query (TanStack Query)
- **Caching**: Automatic caching with stale-while-revalidate
- **Mutations**: Optimistic updates for better UX

#### UI State
- **Local State**: useState for component-specific state
- **Form State**: React Hook Form for form management

### 2.3 Responsive Design

#### Breakpoints (Tailwind CSS)
```css
sm: 640px   /* Small devices */
md: 768px   /* Medium devices */
lg: 1024px  /* Large devices */
xl: 1280px  /* Extra large devices */
2xl: 1536px /* 2X Extra large devices */
```

#### Layout Strategy
- **Mobile-first**: Design starts with mobile layout
- **Progressive Enhancement**: Features added for larger screens
- **Flexible Grid**: CSS Grid and Flexbox for layouts
- **Responsive Components**: All components adapt to screen size

---

## 3. Backend Architecture

### 3.1 Application Structure

```
backend/
├── app.js                    # Main application entry
├── config/
│   ├── app.js               # Application configuration
│   └── database.js          # Database connection
├── middleware/
│   ├── auth.js              # JWT authentication
│   ├── validation.js        # Input validation
│   └── errorHandler.js      # Error handling
├── routes/
│   ├── route.js             # Authentication routes
│   ├── employeeRouter.js    # Employee CRUD routes
│   └── openProjectRoutes.js # OpenProject integration
├── services/
│   ├── auditService.js      # Audit trail service
│   └── openProjectService.js # OpenProject API service
├── migrations/
│   ├── 001_audit_trail_setup.sql
│   └── 002_rbac_matrix_setup.sql
└── scripts/
    └── migrate-passwords.js  # Password migration utility
```

### 3.2 Security Architecture

#### Authentication Flow
```
1. User submits credentials
2. Server validates against hashed password (bcrypt)
3. JWT token generated with user claims
4. Token returned to client
5. Client stores token in localStorage
6. Token included in Authorization header for API calls
7. Server validates token on protected routes
```

#### Authorization (RBAC)
```
Roles:
├── superadmin     # Full system access
├── admin          # Administrative access
├── hr_general     # HR department access
├── finance        # Finance department access
└── dep_rep        # Department representative

Permissions Matrix:
├── employees.*    # Employee management
├── users.*        # User management
├── reports.*      # Reporting access
├── audit.*        # Audit trail access
└── system.*       # System administration
```

#### Security Measures
- **Password Hashing**: bcrypt with 12 salt rounds
- **JWT Security**: Signed tokens with expiration
- **Rate Limiting**: Configurable request limits
- **Input Validation**: express-validator for all inputs
- **CORS**: Configured for specific origins
- **Security Headers**: Helmet.js for HTTP headers
- **SQL Injection Prevention**: Parameterized queries

### 3.3 Database Design

#### Core Tables
```sql
-- User Authentication
login {
  id: INT PRIMARY KEY
  username: NVARCHAR(50) UNIQUE
  password_hash: NVARCHAR(255)
  role: NVARCHAR(50)
  is_active: BIT
  created_at: DATETIME2
  updated_at: DATETIME2
}

-- Employee Data
employees {
  id: INT PRIMARY KEY
  employee_id: NVARCHAR(20) UNIQUE
  name: NVARCHAR(100)
  email: NVARCHAR(100)
  phone: NVARCHAR(20)
  department: NVARCHAR(50)
  position: NVARCHAR(50)
  hire_date: DATE
  salary: DECIMAL(10,2)
  status: NVARCHAR(20)
  created_at: DATETIME2
  updated_at: DATETIME2
}

-- RBAC System
roles {
  role_id: INT PRIMARY KEY
  role_name: NVARCHAR(50) UNIQUE
  role_display_name: NVARCHAR(100)
  description: NVARCHAR(500)
  is_active: BIT
}

permissions {
  permission_id: INT PRIMARY KEY
  module_name: NVARCHAR(50)
  action_name: NVARCHAR(50)
  permission_key: NVARCHAR(100) UNIQUE
  description: NVARCHAR(500)
}

role_permissions {
  role_id: INT FOREIGN KEY
  permission_id: INT FOREIGN KEY
  granted_at: DATETIME2
}

-- Audit Trail
audit_trail {
  audit_id: INT PRIMARY KEY
  table_name: NVARCHAR(50)
  record_id: NVARCHAR(50)
  action_type: NVARCHAR(10)
  old_values: NVARCHAR(MAX)
  new_values: NVARCHAR(MAX)
  user_id: INT
  username: NVARCHAR(50)
  timestamp: DATETIME2
  ip_address: NVARCHAR(45)
}
```

---

## 4. API Design

### 4.1 RESTful Endpoints

#### Authentication
```
POST /api/login
POST /api/logout
POST /api/refresh-token
GET  /api/profile
```

#### Employee Management
```
GET    /api/employees          # List employees
POST   /api/employees          # Create employee
GET    /api/employees/:id      # Get employee
PUT    /api/employees/:id      # Update employee
DELETE /api/employees/:id      # Delete employee
POST   /api/employees/upload   # Bulk upload
```

#### System
```
GET /health                    # Health check
GET /api/audit-trail          # Audit logs
GET /api/permissions          # User permissions
```

### 4.2 Request/Response Format

#### Standard Response Structure
```json
{
  "success": boolean,
  "message": string,
  "data": object | array,
  "pagination": {
    "page": number,
    "limit": number,
    "total": number,
    "totalPages": number
  },
  "timestamp": string
}
```

#### Error Response Structure
```json
{
  "success": false,
  "error": string,
  "details": array,
  "code": string,
  "timestamp": string
}
```

---

## 5. Security Design

### 5.1 Authentication & Authorization

#### JWT Token Structure
```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "userId": 1,
    "username": "admin",
    "role": "superadmin",
    "iat": 1640995200,
    "exp": 1641081600
  }
}
```

#### Permission Checking Flow
```
1. Extract JWT from Authorization header
2. Verify token signature and expiration
3. Extract user role from token payload
4. Query role_permissions for user's role
5. Check if required permission exists
6. Allow/deny access based on permission
```

### 5.2 Data Protection

#### Sensitive Data Handling
- **Passwords**: Never stored in plain text, bcrypt hashed
- **JWT Secrets**: Stored in environment variables
- **Database Credentials**: Environment variables only
- **API Keys**: Secure storage and rotation

#### Audit Trail
- **All Data Changes**: CREATE, UPDATE, DELETE operations logged
- **User Context**: User ID and username recorded
- **Timestamp**: Precise timing of all actions
- **IP Tracking**: Source IP address logged
- **Before/After Values**: Complete change history

---

## 6. Performance & Scalability

### 6.1 Frontend Performance

#### Optimization Strategies
- **Code Splitting**: Route-based lazy loading
- **Bundle Optimization**: Vite's tree shaking
- **Image Optimization**: WebP format, lazy loading
- **Caching**: React Query for server state caching
- **Memoization**: React.memo for expensive components

#### Loading Strategies
- **Progressive Loading**: Critical content first
- **Skeleton Screens**: Better perceived performance
- **Optimistic Updates**: Immediate UI feedback

### 6.2 Backend Performance

#### Database Optimization
- **Connection Pooling**: Efficient connection management
- **Indexed Queries**: Strategic database indexing
- **Query Optimization**: Efficient SQL queries
- **Pagination**: Large dataset handling

#### API Performance
- **Rate Limiting**: Prevent abuse and overload
- **Response Compression**: Gzip compression
- **Caching Headers**: Browser caching strategies
- **Error Handling**: Graceful error responses

---

## 7. Development Workflow

### 7.1 Project Structure

```
mti-employee/
├── frontend/                 # React application
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
├── backend/                  # Node.js API
│   ├── app.js
│   ├── config/
│   ├── middleware/
│   ├── routes/
│   ├── services/
│   ├── migrations/
│   └── package.json
├── doc/                      # Documentation
│   ├── TECHNICAL_SPECIFICATIONS.md
│   ├── IMPLEMENTATION_ROADMAP.md
│   ├── ENHANCEMENT_JOURNAL.md
│   └── SYSTEM_DESIGN_ARCHITECTURE.md
├── .env.example             # Environment template
├── README.md                # Project overview
└── package.json             # Root package file
```

### 7.2 Environment Configuration

#### Development Environment
```env
# Database
DB_SERVER=localhost
DB_NAME=mti_employee_db
DB_USER=sa
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your-development-secret
JWT_EXPIRES_IN=24h

# Server
PORT=8080
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

#### Production Environment
```env
# Database
DB_SERVER=production-server
DB_NAME=mti_employee_prod
DB_USER=app_user
DB_PASSWORD=secure_password

# JWT
JWT_SECRET=production-secret-key
JWT_EXPIRES_IN=8h

# Server
PORT=3000
NODE_ENV=production
CORS_ORIGIN=https://mti-employee.com
```

---

## 8. Deployment Architecture

### 8.1 Production Deployment

```
┌─────────────────────────────────────────────────────────────────┐
│                        LOAD BALANCER                           │
│                     (Nginx/Apache)                             │
└─────────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                ▼               ▼               ▼
┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│   Frontend Server   │ │   Frontend Server   │ │   Frontend Server   │
│   (Static Files)    │ │   (Static Files)    │ │   (Static Files)    │
└─────────────────────┘ └─────────────────────┘ └─────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY                               │
└─────────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                ▼               ▼               ▼
┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│   Backend Server    │ │   Backend Server    │ │   Backend Server    │
│   (Node.js/Express) │ │   (Node.js/Express) │ │   (Node.js/Express) │
└─────────────────────┘ └─────────────────────┘ └─────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE CLUSTER                            │
│              (SQL Server with Replication)                     │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 Monitoring & Logging

#### Application Monitoring
- **Health Checks**: Automated endpoint monitoring
- **Performance Metrics**: Response time tracking
- **Error Tracking**: Centralized error logging
- **User Analytics**: Usage pattern analysis

#### Infrastructure Monitoring
- **Server Resources**: CPU, Memory, Disk usage
- **Database Performance**: Query performance, connections
- **Network Monitoring**: Bandwidth, latency
- **Security Monitoring**: Failed login attempts, suspicious activity

---

## 9. Future Enhancements

### 9.1 Planned Features

#### Phase 3: Advanced Features
- **Advanced Search & Filtering**: Complex query capabilities
- **Reporting Dashboard**: Analytics and insights
- **File Management**: Document upload and management
- **Performance Optimization**: Caching and optimization

#### Phase 4: Integration & Testing
- **Third-party Integrations**: External system connections
- **Automated Testing**: Comprehensive test suite
- **Security Enhancements**: Advanced security features
- **Mobile Application**: Native mobile app

### 9.2 Scalability Roadmap

#### Microservices Migration
- **Service Decomposition**: Break monolith into services
- **API Gateway**: Centralized API management
- **Service Discovery**: Dynamic service registration
- **Container Orchestration**: Kubernetes deployment

#### Cloud Migration
- **Cloud Infrastructure**: AWS/Azure migration
- **Serverless Functions**: Lambda/Azure Functions
- **Managed Databases**: Cloud database services
- **CDN Integration**: Global content delivery

---

## 10. Conclusion

The MTI Employee Management System is built on a modern, scalable architecture that prioritizes security, performance, and maintainability. The system follows industry best practices and is designed to accommodate future growth and feature enhancements.

### Key Architectural Strengths

1. **Security-First Design**: Comprehensive security measures at every layer
2. **Scalable Architecture**: Designed for horizontal and vertical scaling
3. **Modern Technology Stack**: Latest frameworks and tools
4. **Responsive Design**: Optimal experience across all devices
5. **Maintainable Codebase**: Clean architecture and documentation
6. **Audit Trail**: Complete activity tracking and compliance
7. **Role-Based Access**: Granular permission management
8. **Performance Optimized**: Fast loading and responsive interface

This architecture provides a solid foundation for the current requirements while maintaining flexibility for future enhancements and scaling needs.