# Quick Reference - JWT & OTP Setup

## ✅ What's Been Implemented

### 1. JWT Authentication

**Status:** ✅ Working on all protected endpoints

**Protected Endpoints:**
- Profile: CREATE, UPDATE, DELETE
- Banners: CREATE, DELETE (Admin)
- Rentals: INITIATE, CONFIRM, OTP_VERIFY

**Public Endpoints:**
- Auth: LOGIN, VERIFY
- Profile: GET, PRESETS
- Banners: GET
- Matches: TOP

**How it works:**
1. User logs in → receives OTP
2. Verifies OTP → receives JWT token
3. Uses token for protected endpoints

**Configuration:**
```env
JWT_ENABLED=true                    # Enable/disable JWT
JWT_SECRET=your-secret-key          # Secret for signing
JWT_EXPIRATION=7d                   # Token validity
```

---

### 2. OTP System

**Current Status:** ✅ Returns OTP in response (development mode)

**OTP Flow:**
```
Login → Generate 6-digit OTP → Store in DB → Return in response (dev mode)
↓
Verify → Check OTP & expiry → Generate JWT token → Return token
```

**Development Mode:**
```json
POST /auth/login
Response: {
  "status": "success",
  "msg": "OTP sent successfully",
  "otp": "533856"  ← Returned for testing
}
```

**Configuration:**
```env
NODE_ENV=development               # OTP in response when 'development'
OTP_EXPIRY_MINUTES=10             # OTP validity period
```

---

### 3. Twilio Integration (Ready)

**Status:** 📝 Commented code ready to use

**To Enable:**

1. **Install Twilio:**
```bash
npm install twilio
```

2. **Add to `.env`:**
```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

3. **Uncomment in `auth.service.ts`:**
```typescript
// Line ~58: Uncomment this
await this.sendOtpViaTwilio(mobile_number, otp);

// Line ~68: Remove dev OTP from response
return {
  status: 'success',
  msg: 'OTP sent successfully',
  // Remove: ...(isDevelopment && { otp }),
};
```

**SMS Template:**
```
Your OnToYou verification code is: {otp}. Valid for 10 minutes.
```

---

## Quick Test Flow

### 1. Get OTP
```powershell
POST http://localhost:8080/api/v1/auth/login
Body: {"mobile_number":"9876543210"}

Response: {"otp": "123456"}  # Use this OTP
```

### 2. Verify & Get Token
```powershell
POST http://localhost:8080/api/v1/auth/verify
Body: {"mobile_number":"9876543210","otp":"123456"}

Response: {"token": "eyJhbG..."}  # Use this token
```

### 3. Use Token for Protected Endpoints
```powershell
POST http://localhost:8080/api/v1/profile/create
Headers: Authorization: Bearer eyJhbG...
Body: {...profile data...}
```

---

## Security Checklist

- [x] JWT authentication implemented
- [x] OTP generation & validation
- [x] OTP expiry (10 minutes)
- [x] Protected endpoints with guards
- [x] Age verification (18+)
- [x] Input validation with DTOs
- [ ] Rate limiting (TODO)
- [ ] Refresh tokens (TODO)
- [ ] Role-based access (TODO)

---

## Production Deployment

### Before Going Live:

1. **Enable Twilio:**
   - Purchase Twilio account
   - Add credentials to `.env`
   - Uncomment Twilio code
   - Remove OTP from response

2. **Security:**
   - Change JWT_SECRET to strong random string
   - Set NODE_ENV=production
   - Enable rate limiting
   - Add CORS whitelist

3. **MongoDB:**
   - Whitelist production server IP
   - Enable database encryption
   - Set up backups

4. **Monitoring:**
   - Add error tracking (Sentry)
   - Set up logging (Winston)
   - Monitor API usage

---

## Files Modified

- `src/auth/auth.service.ts` - Added Twilio integration + OTP in response
- `src/profile/profile.controller.ts` - Added JWT guards
- `src/banners/banners.controller.ts` - Added JWT guards
- `src/rentals/rentals.controller.ts` - Added JWT guards
- `.env` - Added Twilio config (commented)
- `.env.example` - Added Twilio config (commented)

---

## Support

All endpoints tested and working! See `API_TEST_RESULTS.md` for detailed test results.
