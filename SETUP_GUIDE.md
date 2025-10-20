# 🚀 OnToYou API - Complete Setup Guide

## Prerequisites

Before starting, make sure you have:

1. **Node.js** (v18 or higher)
   - Download: https://nodejs.org/
   - Verify: `node --version`

2. **MongoDB** (v6 or higher)
   - Download: https://www.mongodb.com/try/download/community
   - Or use MongoDB Atlas (cloud): https://www.mongodb.com/cloud/atlas

3. **Git** (optional, for version control)

---

## Step 1: MongoDB Setup

### Option A: Local MongoDB

1. **Install MongoDB Community Server**
   - Windows: Download installer from MongoDB website
   - Run the installer and choose "Complete" setup
   - Install as a Windows Service (recommended)

2. **Verify MongoDB is running**
   ```bash
   # Check if MongoDB service is running
   net start MongoDB
   
   # Or start it manually
   mongod
   ```

3. **Test connection**
   ```bash
   mongosh
   # Should connect to mongodb://localhost:27017
   ```

### Option B: MongoDB Atlas (Cloud)

1. Create free account at https://www.mongodb.com/cloud/atlas
2. Create a cluster
3. Get connection string
4. Update `.env` file:
   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/ontoyou
   ```

---

## Step 2: Project Setup

1. **Navigate to project directory**
   ```bash
   cd "d:\Bhishma Solutions\ONTOYOU"
   ```

2. **Install dependencies** (if not already done)
   ```bash
   npm install
   ```

3. **Configure environment**
   - `.env` file is already created with default settings
   - Update MongoDB URI if using Atlas or different local setup

---

## Step 3: Start the Application

### Development Mode (Recommended)
```bash
npm run start:dev
```

You should see:
```
🚀 Application is running on: http://localhost:3000/api/v1
```

### Production Mode
```bash
npm run build
npm run start:prod
```

---

## Step 4: Verify Setup

### Test API Endpoints

1. **Check if server is running**
   - Open browser: http://localhost:3000/api/v1/banners
   - Should return: `{"status":"success","banners":[]}`

2. **Test authentication**
   ```bash
   curl -X POST http://localhost:3000/api/v1/auth/login ^
     -H "Content-Type: application/json" ^
     -d "{\"mobile_number\": \"9876543210\"}"
   ```

3. **Get presets**
   ```bash
   curl http://localhost:3000/api/v1/presets
   ```

---

## Common Issues & Solutions

### Issue: MongoDB Connection Error
```
ERROR [MongooseModule] Unable to connect to the database
```

**Solutions:**
1. Make sure MongoDB service is running
   ```bash
   net start MongoDB
   ```

2. Check if port 27017 is available
   ```bash
   netstat -ano | findstr :27017
   ```

3. Try alternative MongoDB URI in `.env`:
   ```env
   MONGODB_URI=mongodb://127.0.0.1:27017/ontoyou
   ```

### Issue: Port 3000 Already in Use

**Solution:** Change port in `.env`:
```env
PORT=3001
```

### Issue: Module Not Found Errors

**Solution:** Reinstall dependencies:
```bash
rm -rf node_modules
rm package-lock.json
npm install
```

---

## Development Workflow

### 1. Start Development Server
```bash
npm run start:dev
```
- Auto-reloads on file changes
- Shows compilation errors
- OTPs logged to console

### 2. Test Endpoints
- Use Postman collection: `postman_collection.json`
- Or use curl commands from `API_TESTING.md`

### 3. Check Database
```bash
mongosh
use ontoyou
db.users.find().pretty()
db.rentals.find().pretty()
```

### 4. View Logs
- Server logs appear in terminal
- OTPs printed to console for testing

---

## Project Files Overview

### Configuration Files
- `.env` - Environment variables (MongoDB, JWT, etc.)
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `nest-cli.json` - NestJS CLI settings

### Documentation
- `PROJECT_SUMMARY.md` - Complete project overview
- `GETTING_STARTED.md` - Setup instructions (this file)
- `API_TESTING.md` - API testing examples
- `README.md` - Project introduction
- `postman_collection.json` - Postman import file

### Source Code
- `src/` - All application code
- `src/main.ts` - Application entry point
- `src/app.module.ts` - Root module
- `src/schemas/` - MongoDB schemas
- `src/auth/` - Authentication module
- `src/profile/` - Profile management
- `src/rentals/` - Rental system
- `src/matches/` - Matchmaking
- `src/banners/` - Banner management

---

## Testing the Complete Flow

### 1. User Registration & Login
```bash
# Send OTP
curl -X POST http://localhost:3000/api/v1/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"mobile_number\": \"9876543210\"}"

# Check console for OTP
# Verify OTP
curl -X POST http://localhost:3000/api/v1/auth/verify ^
  -H "Content-Type: application/json" ^
  -d "{\"mobile_number\": \"9876543210\", \"otp\": \"YOUR_OTP\"}"

# Save the returned user_id and token
```

### 2. Create Profile
```bash
curl -X POST http://localhost:3000/api/v1/profile/create ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer YOUR_TOKEN" ^
  -d @profile_data.json
```

### 3. Find Matches
```bash
curl "http://localhost:3000/api/v1/matches/top?user_id=YOUR_USER_ID&city=Bangalore"
```

### 4. Create Rental
```bash
curl -X POST http://localhost:3000/api/v1/rentals/confirm ^
  -H "Content-Type: application/json" ^
  -d @rental_data.json
```

---

## Environment Variables Explained

```env
# Server Configuration
PORT=3000                    # API server port
NODE_ENV=development         # Environment mode

# Database
MONGODB_URI=mongodb://localhost:27017/ontoyou  # MongoDB connection

# JWT Authentication
JWT_ENABLED=true             # Enable/disable JWT (true/false)
JWT_SECRET=your-secret-key   # Secret for signing tokens
JWT_EXPIRATION=7d            # Token validity period

# OTP Configuration
OTP_EXPIRY_MINUTES=10        # OTP validity duration

# Business Rules
DEFAULT_USER_CREDITS=3       # Credits for new users

# File Upload (Future)
MAX_FILE_SIZE=5242880        # 5MB in bytes
ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/jpg

# CDN (Future)
CDN_BASE_URL=https://cdn.ontoyou.com
```

---

## Next Steps

1. ✅ Verify MongoDB is running
2. ✅ Start the development server
3. ✅ Test API endpoints
4. 📝 Import Postman collection for easier testing
5. 🔧 Customize as needed
6. 🚀 Build features and integrate with frontend

---

## Support & Resources

- **MongoDB Docs:** https://docs.mongodb.com/
- **NestJS Docs:** https://docs.nestjs.com/
- **Mongoose Docs:** https://mongoosejs.com/docs/

---

## Quick Reference Commands

```bash
# Start MongoDB (Windows)
net start MongoDB

# Stop MongoDB (Windows)
net stop MongoDB

# Start development server
npm run start:dev

# Build for production
npm run build

# Run production
npm run start:prod

# Connect to MongoDB shell
mongosh

# View all databases
show dbs

# Use ontoyou database
use ontoyou

# View collections
show collections

# View users
db.users.find()
```

---

**Ready to Start?** Run `npm run start:dev` and you're good to go! 🎉
