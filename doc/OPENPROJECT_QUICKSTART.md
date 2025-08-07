# OpenProject Integration - Quick Start Guide

## 🚀 Quick Setup (5 Minutes)

### Prerequisites
- OpenProject instance (cloud or self-hosted)
- Admin access to OpenProject
- MTI Employee Management System running

---

## Step 1: OpenProject Setup

### Option A: OpenProject Cloud (Recommended)
1. Go to [OpenProject.com](https://www.openproject.com/)
2. Sign up for free trial or paid plan
3. Create your instance: `https://your-company.openproject.com`

### Option B: Self-Hosted
1. Follow [OpenProject Installation Guide](https://www.openproject.org/docs/installation-and-operations/)
2. Or use Docker:
   ```bash
   docker run -d -p 8080:80 openproject/community:latest
   ```

---

## Step 2: Generate API Key

1. **Login to OpenProject**
2. **Go to Profile**: Click your avatar → "My account"
3. **Access Tokens**: Click "Access tokens" tab
4. **Create Token**: 
   - Click "+ API Token"
   - Name: "MTI Employee System"
   - Click "Create"
5. **Copy API Key**: Save it securely!

---

## Step 3: Configure MTI System

### Update Environment Variables
Add to your `.env` file:

```env
# OpenProject Integration
OPENPROJECT_URL=https://your-company.openproject.com
OPENPROJECT_API_KEY=your_copied_api_key_here
OPENPROJECT_API_VERSION=v3
OPENPROJECT_SYNC_ENABLED=true
```

### Install Dependencies
```bash
cd backend
npm install axios
```

---

## Step 4: Test Connection

### Quick Test Script
Create `backend/test-openproject.js`:

```javascript
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const testConnection = async () => {
  try {
    const response = await axios.get(
      `${process.env.OPENPROJECT_URL}/api/v3/projects`,
      {
        headers: {
          'Authorization': `apikey ${process.env.OPENPROJECT_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Connection successful!');
    console.log(`Found ${response.data._embedded.elements.length} projects`);
    return true;
  } catch (error) {
    console.error('❌ Connection failed:', error.response?.data || error.message);
    return false;
  }
};

testConnection();
```

### Run Test
```bash
node test-openproject.js
```

**Expected Output:**
```
✅ Connection successful!
Found 0 projects
```

---

## Step 5: Basic Integration

### Create OpenProject Service
Copy the service file from the main documentation:

```bash
# Create services directory
mkdir -p backend/services

# Copy the OpenProject service code from OPENPROJECT_INTEGRATION.md
# Section: "Step 2: Create OpenProject Service"
```

### Add Routes
Copy the routes file from the main documentation:

```bash
# Create routes directory
mkdir -p backend/routes

# Copy the OpenProject routes code from OPENPROJECT_INTEGRATION.md
# Section: "Step 3: Create Integration Routes"
```

### Update Main App
Add to `backend/app.js`:

```javascript
// Import OpenProject routes
import openProjectRoutes from './routes/openproject.js';

// Add routes (after other routes)
app.use('/api/openproject', openProjectRoutes);
```

---

## Step 6: Test Integration

### Start Backend Server
```bash
cd backend
npm start
```

### Test Health Endpoint
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:8080/api/openproject/health
```

**Expected Response:**
```json
{
  "status": "connected",
  "data": {
    "_embedded": {
      "elements": []
    }
  }
}
```

---

## Step 7: Create Your First Project

### Via OpenProject Web Interface
1. Login to OpenProject
2. Click "+ Project"
3. Fill in details:
   - **Name**: "MTI Employee Management"
   - **Identifier**: "mti-employee"
   - **Description**: "Integration test project"
4. Click "Create"

### Via API (Optional)
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "MTI Employee Management",
    "identifier": "mti-employee",
    "description": "Integration test project"
  }' \
  http://localhost:8080/api/openproject/projects
```

---

## Step 8: Sync Your First Employee

### Test Employee Sync
```bash
# Replace {employee_id} with actual employee ID from your database
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:8080/api/openproject/sync/employee/{employee_id}
```

**Expected Response:**
```json
{
  "message": "Employee synced successfully",
  "employee": {
    "employee_id": "123",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@mti.com"
  },
  "openProjectUser": {
    "id": 456,
    "login": "john.doe@mti.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

---

## Common Issues & Solutions

### ❌ "Unauthorized" Error
**Problem**: Invalid API key
**Solution**: 
1. Regenerate API key in OpenProject
2. Update `.env` file
3. Restart backend server

### ❌ "Connection Timeout"
**Problem**: OpenProject instance not accessible
**Solution**:
1. Check OpenProject URL
2. Verify instance is running
3. Check firewall/network settings

### ❌ "Module not found: axios"
**Problem**: Missing dependency
**Solution**:
```bash
cd backend
npm install axios
```

### ❌ "Cannot read property 'OPENPROJECT_URL'"
**Problem**: Environment variables not loaded
**Solution**:
1. Check `.env` file exists
2. Verify dotenv is configured
3. Restart backend server

---

## Next Steps

### Immediate (Today)
1. ✅ Complete basic setup
2. ✅ Test API connection
3. ✅ Sync first employee

### Short Term (This Week)
1. 🔄 Implement project mapping
2. 🔄 Add work package creation
3. 🔄 Setup time tracking

### Long Term (Next Sprint)
1. 📊 Build dashboard integration
2. 🔄 Implement real-time sync
3. 📈 Add reporting features

---

## Support Resources

### Documentation
- 📖 [Full Integration Guide](./OPENPROJECT_INTEGRATION.md)
- 🔧 [Technical Specifications](./TECHNICAL_SPECIFICATIONS.md)
- 📝 [Enhancement Journal](./ENHANCEMENT_JOURNAL.md)

### OpenProject Resources
- 🌐 [OpenProject API Docs](https://docs.openproject.org/api/)
- 💬 [Community Forum](https://community.openproject.org/)
- 📚 [User Guide](https://docs.openproject.org/)

### MTI System Resources
- 🏠 [Project Overview](../README.md)
- 🛠️ [Backend API](../backend/)
- 🎨 [Frontend Components](../src/components/)

---

## Troubleshooting Checklist

- [ ] OpenProject instance is accessible
- [ ] API key is valid and copied correctly
- [ ] Environment variables are set
- [ ] Backend server is running
- [ ] Dependencies are installed
- [ ] JWT token is valid for API calls
- [ ] Employee data exists in database

---

**🎉 Congratulations!** You've successfully integrated OpenProject with your MTI Employee Management System!

*Need help? Check the [full documentation](./OPENPROJECT_INTEGRATION.md) or create an issue.*