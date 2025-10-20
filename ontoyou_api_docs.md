# OnToYou — API & Data Documentation (v1)

**Base URL:** https://api.ontoyou.com/api/v1/

**Framework:** NestJS (MVC)

**Auth:** JWT (enable/disable toggle in .env)

**Data Store:** MongoDB, Indexed Collections

---

## 1. Collections & JSON Structures

### 1.1 users

```json
{
  "_id": ObjectId("..."),
  "auth": {
    "mobile_number": "9876543210",
    "otp_verified": true,
    "created_at": ISODate("2025-10-20T10:00:00Z"),
    "last_login": ISODate("2025-10-20T11:00:00Z")
  },
  "profile": {
    "name": "Ayush V Nair",
    "dob": "2002-11-20",
    "bio": "Traveler, foodie, movie buff",
    "gender": "Male",
    "preferred_gender": ["Female"],
    "age": 22,
    "age_range": { "min": 20, "max": 26 },
    "languages": ["English", "Malayalam"],
    "images": [
      "https://cdn.ontoyou.com/users/1/img1.jpg",
      "https://cdn.ontoyou.com/users/1/img2.jpg",
      "https://cdn.ontoyou.com/users/1/img3.jpg"
    ],
    "city": "Bangalore",
    "location": { "type": "Point", "coordinates": [77.5946, 12.9716] },
    "distance_limit_km": 15
  },
  "traits": {
    "extroversion": 7,
    "introversion": 3,
    "agreeableness": 8,
    "assertiveness": 6,
    "openness": 9,
    "emotional_stability": 7,
    "conscientiousness": 8,
    "sarcastic_humor": true,
    "dry_humor": false,
    "playful_humor": true,
    "silly_humor": false,
    "intellectual_humor": true
  },
  "interests": ["Movies", "Travel", "Food & Café Hopping"],
  "boundaries": {
    "talk_intensity": "Moderate",
    "silence_tolerance": "High",
    "emotional_openness": "Medium"
  },
  "preferences": {
    "duration": ["Short", "Medium"],
    "frequency": ["Occasional"]
  },
  "verification": {
    "id_verified": true,
    "social_profiles": ["instagram.com/ayushv"],
    "past_ratings": { "average": 4.7, "count": 32 },
    "no_show_count": 0,
    "punctuality_score": 9
  },
  "custom_note": "Looking for someone to explore cafes this weekend.",
  "credits": { "balance": 3, "spent": 12 },
  "status": { "online": true, "last_seen": ISODate("2025-10-20T11:15:00Z") }
}
```

**Indexes:**
- auth.mobile_number (unique)
- profile.location (2dsphere)
- profile.city, profile.gender, profile.preferred_gender
- interests
- traits.openness, traits.extroversion

---

### 1.2 rentals

```json
{
  "_id": ObjectId("..."),
  "renter_id": ObjectId("..."),
  "host_id": ObjectId("..."),
  "location": { "city": "Bangalore", "type": "Point", "coordinates": [77.59, 12.97] },
  "scheduled_at": ISODate("2025-10-25T17:00:00Z"),
  "status": "confirmed",
  "otp_stage": {
    "renter_otp": "8429",
    "host_otp": "2367",
    "common_otp": "9942",
    "verified": true
  },
  "duration_hours": 2,
  "credits_used": 2,
  "created_at": ISODate("2025-10-20T09:00:00Z"),
  "completed_at": null
}
```

**Indexes:**
- renter_id, host_id, location (2dsphere), status

---

### 1.3 banners

```json
{
  "_id": ObjectId("..."),
  "title": "Weekend Meetup Special",
  "image_url": "https://cdn.ontoyou.com/banners/weekend.jpg",
  "target_url": "https://ontoyou.com/offer/weekend",
  "active": true,
  "created_at": ISODate("2025-10-18T09:00:00Z")
}
```

**Index:** active

---

## 2. APIs

**All APIs prefixed:** /api/v1/

**Headers (if JWT enabled):** Authorization: Bearer <token>

---

### 2.1 Auth APIs

#### POST /auth/login

**Request:**
```json
{ "mobile_number": "9876543210" }
```

**Response:**
```json
{ "status": "success", "msg": "OTP sent successfully" }
```

**Errors:**
- 400: Invalid mobile format

---

#### POST /auth/verify

**Request:**
```json
{ "mobile_number": "9876543210", "otp": "123456" }
```

**Response:**
```json
{
  "status": "success",
  "msg": "OTP verified",
  "token": "<JWT_TOKEN>",
  "user_id": "..."
}
```

**Errors:**
- 401: OTP expired or invalid

---

### 2.2 Profile APIs

#### POST /profile/create

**Request:** Multipart/form-data
```json
{
  "name": "Ayush V Nair",
  "dob": "2002-11-20",
  "bio": "Traveler and foodie",
  "gender": "Male",
  "preferred_gender": ["Female"],
  "languages": ["English", "Malayalam"],
  "images": ["file1.jpg", "file2.jpg", "file3.jpg"],
  "age_range": { "min": 20, "max": 26 },
  "interests": ["#Movies","#Travel"],
  "traits": { ... },
  "boundaries": { ... },
  "preferences": { ... },
  "verification": { ... },
  "custom_note": "Looking for someone fun"
}
```

**Response:**
```json
{ "status": "success", "msg": "Profile created", "user_id": "..." }
```

**Errors:**
- 400: Validation error
- 403: Underage user (<18)

---

#### GET /presets

**URL:** /api/v1/presets

**Method:** GET

**Auth:** Optional (can be public for initial signup)

**Response:**
```json
{
  "status": "success",
  "presets": {
    "age_range": { "min": 18, "max": 60 },
    "genders": ["Male", "Female", "Non-binary", "Any"],
    "preferred_genders": ["Male", "Female", "Non-binary", "Any"],
    "languages": ["English", "Hindi", "Tamil", "Telugu", "Malayalam", "Kannada", "Bengali", "Any"],
    "personality_traits": [
      "Extroversion",
      "Introversion",
      "Agreeableness",
      "Assertiveness",
      "Openness",
      "Emotional Stability",
      "Conscientiousness",
      "Sarcastic Humor",
      "Dry Humor",
      "Playful Humor",
      "Silly Humor",
      "Intellectual Humor"
    ],
    "interests": [
      "Movies",
      "Gaming",
      "Travel",
      "Food & Café Hopping",
      "Sports & Fitness",
      "Music & Concerts",
      "Arts & Culture",
      "Books & Reading",
      "Outdoor Activities",
      "Social Meetups",
      "Online Hangouts",
      "Learning & Workshops"
    ],
    "availability": [
      { "day": "Monday", "time_ranges": ["08:00-12:00","14:00-18:00"] },
      { "day": "Tuesday", "time_ranges": ["08:00-12:00","14:00-18:00"] },
      "... up to Sunday"
    ],
    "boundaries": {
      "talk_intensity": ["Low","Moderate","High"],
      "silence_tolerance": ["Low","Medium","High"],
      "emotional_openness": ["Low","Medium","High"]
    },
    "duration_preferences": ["Short (<1 hr)","Medium (1–3 hrs)","Long (>3 hrs)"],
    "frequency_preferences": ["One-time","Occasional","Recurring"],
    "verification_reliability": [
      "ID verified",
      "Social profile linked",
      "Past ratings",
      "No-show history",
      "Punctuality"
    ],
    "custom_note_guidelines": "User can write a short note describing plans or preferences, up to 200 characters"
  }
}
```

**Status Codes:**
- 200 OK — presets returned successfully
- 500 Internal Server Error — if loading fails

**Usage:**
- Called once on profile creation/update to populate all selectable options
- Frontend renders checkboxes/multi-selects based on arrays
- Limits: e.g., max 3–5 selections per category enforced on frontend or backend validation

---

#### GET /profile/:user_id

**Response:**
```json
{ "status": "success", "profile": { ...full user profile JSON... } }
```

**Errors:**
- 404: Profile not found

---

### 2.3 Banner API

#### GET /banners

**Response:**
```json
{
  "status": "success",
  "banners": [
    { "_id": "...", "title": "...", "image_url": "...", "target_url": "..." }
  ]
}
```

---

### 2.4 Rental Flow APIs

#### POST /rentals/initiate

**Request:**
```json
{
  "location": { "city": "Bangalore", "coordinates": [77.59, 12.97] },
  "preferred_age": { "min": 20, "max": 26 },
  "preferred_gender": ["Female"],
  "time_slot": { "start": "18:00", "end": "20:00" },
  "duration_hours": 2
}
```

**Response:**
```json
{
  "status": "success",
  "msg": "Top matches fetched",
  "matches": [
    { "user_id": "...", "name": "Riya", "age": 23, "distance_km": 5, "image": "..." }
  ]
}
```

---

#### POST /rentals/confirm

**Request:**
```json
{
  "renter_id": "...",
  "host_id": "...",
  "scheduled_at": "2025-10-25T17:00:00Z",
  "duration_hours": 2,
  "credits_used": 2,
  "location": { "city": "Bangalore", "coordinates": [77.59, 12.97] }
}
```

**Response:**
```json
{ "status": "success", "msg": "Rental confirmed", "rental_id": "..." }
```

**Errors:**
- 400: Insufficient credits
- 404: Host unavailable

---

#### POST /rentals/otp-verify

**Request:**
```json
{ "rental_id": "...", "user_id": "...", "otp": "8429" }
```

**Response:**
```json
{ "status": "success", "msg": "OTP verified" }
```

**Errors:**
- 401: Invalid OTP

---

### 2.5 Search / Match APIs

#### GET /matches/top

**Query Parameters:**
- user_id=<>
- city=<>
- age_min=<>
- age_max=<>
- gender=<>

**Response:**
```json
{
  "status": "success",
  "matches": [
    { "user_id": "...", "name": "Riya", "age": 23, "distance_km": 5, "image": "..." }
  ]
}
```

**Errors:**
- 404: No matches found

---

## 3. Notes

- .env flags: JWT_ENABLED=true|false
- Profile images: max 3 per user, S3/Cloud storage recommended
- All time fields ISO 8601
- Age validation enforced server-side (>=18)
- Default credit assigned: 3 credits per new user
- Matchmaking heavily uses 2dsphere indexing + traits/interests scoring

---

This document defines collections, indexes, main APIs, payloads, response structures, JWT toggle, and constraints. It covers all core flows: login → profile → banners → rental initiation → OTP verification → top matches.