# OnToYou API Testing Guide

## Test the API Endpoints

### 1. Start the Server
```bash
npm run start:dev
```

### 2. Test Authentication Flow

#### Login (Send OTP)
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"mobile_number\": \"9876543210\"}"
```

**Response:**
```json
{
  "status": "success",
  "msg": "OTP sent successfully"
}
```

Note: Check console for OTP (in development mode)

#### Verify OTP
```bash
curl -X POST http://localhost:3000/api/v1/auth/verify \
  -H "Content-Type: application/json" \
  -d "{\"mobile_number\": \"9876543210\", \"otp\": \"<OTP_FROM_CONSOLE>\"}"
```

**Response:**
```json
{
  "status": "success",
  "msg": "OTP verified",
  "token": "<JWT_TOKEN>",
  "user_id": "<USER_ID>"
}
```

### 3. Get Profile Presets
```bash
curl http://localhost:3000/api/v1/presets
```

### 4. Create Profile
```bash
curl -X POST http://localhost:3000/api/v1/profile/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -d '{
    "user_id": "<YOUR_USER_ID>",
    "name": "Ayush V Nair",
    "dob": "2002-11-20",
    "bio": "Traveler and foodie",
    "gender": "Male",
    "preferred_gender": ["Female"],
    "languages": ["English", "Malayalam"],
    "age_range": { "min": 20, "max": 26 },
    "interests": ["Movies", "Travel", "Food & Café Hopping"],
    "traits": {
      "extroversion": 7,
      "introversion": 3,
      "agreeableness": 8,
      "openness": 9
    },
    "boundaries": {
      "talk_intensity": "Moderate",
      "silence_tolerance": "High",
      "emotional_openness": "Medium"
    },
    "preferences": {
      "duration": ["Short", "Medium"],
      "frequency": ["Occasional"]
    },
    "city": "Bangalore",
    "coordinates": [77.5946, 12.9716],
    "distance_limit_km": 15,
    "custom_note": "Looking for someone fun"
  }'
```

### 5. Get Profile
```bash
curl http://localhost:3000/api/v1/profile/<USER_ID>
```

### 6. Get Banners
```bash
curl http://localhost:3000/api/v1/banners
```

### 7. Get Top Matches
```bash
curl "http://localhost:3000/api/v1/matches/top?user_id=<USER_ID>&city=Bangalore"
```

### 8. Initiate Rental
```bash
curl -X POST http://localhost:3000/api/v1/rentals/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "<YOUR_USER_ID>",
    "location": {
      "city": "Bangalore",
      "coordinates": [77.59, 12.97]
    },
    "preferred_age": { "min": 20, "max": 26 },
    "preferred_gender": ["Female"],
    "time_slot": { "start": "18:00", "end": "20:00" },
    "duration_hours": 2
  }'
```

### 9. Confirm Rental
```bash
curl -X POST http://localhost:3000/api/v1/rentals/confirm \
  -H "Content-Type: application/json" \
  -d '{
    "renter_id": "<RENTER_USER_ID>",
    "host_id": "<HOST_USER_ID>",
    "scheduled_at": "2025-10-25T17:00:00Z",
    "duration_hours": 2,
    "credits_used": 2,
    "location": {
      "city": "Bangalore",
      "coordinates": [77.59, 12.97]
    }
  }'
```

### 10. Verify Rental OTP
```bash
curl -X POST http://localhost:3000/api/v1/rentals/otp-verify \
  -H "Content-Type: application/json" \
  -d '{
    "rental_id": "<RENTAL_ID>",
    "user_id": "<USER_ID>",
    "otp": "<OTP_FROM_CONSOLE>"
  }'
```

## Testing with Postman

Import these endpoints into Postman for easier testing:

1. Create a new collection "OnToYou API"
2. Set base URL variable: `{{baseUrl}}` = `http://localhost:3000/api/v1`
3. Add requests for each endpoint above
4. Use environment variables for storing tokens and IDs

## MongoDB Queries

Connect to MongoDB to verify data:

```bash
mongosh mongodb://localhost:27017/ontoyou
```

```javascript
// View users
db.users.find().pretty()

// View rentals
db.rentals.find().pretty()

// View banners
db.banners.find().pretty()

// Check indexes
db.users.getIndexes()
db.rentals.getIndexes()
db.banners.getIndexes()
```

## Common Issues

1. **MongoDB Connection Error**: Make sure MongoDB is running
2. **JWT Errors**: Check if JWT_ENABLED is set correctly in .env
3. **Validation Errors**: Ensure all required fields are provided
4. **Geospatial Queries**: Coordinates must be [longitude, latitude]
