# OnToYou API - Getting Started

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file from the example:
```bash
copy .env.example .env
```

3. Update the `.env` file with your configuration:
- Set your MongoDB connection URI
- Configure JWT settings
- Set other environment variables as needed

## Running the Application

### Development Mode
```bash
npm run start:dev
```

The API will be available at: `http://localhost:3000/api/v1/`

### Production Mode
```bash
npm run build
npm run start:prod
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/login` - Send OTP to mobile number
- `POST /api/v1/auth/verify` - Verify OTP and get JWT token

### Profile
- `GET /api/v1/presets` - Get all preset options for profile creation
- `POST /api/v1/profile/create` - Create user profile
- `GET /api/v1/profile/:user_id` - Get user profile

### Banners
- `GET /api/v1/banners` - Get all active banners

### Rentals
- `POST /api/v1/rentals/initiate` - Initiate rental and get matches
- `POST /api/v1/rentals/confirm` - Confirm rental booking
- `POST /api/v1/rentals/otp-verify` - Verify rental OTP

### Matches
- `GET /api/v1/matches/top` - Get top matches based on criteria

## MongoDB Setup

Make sure MongoDB is running and accessible. The application will automatically:
- Connect to MongoDB using the URI from `.env`
- Create indexes for optimal performance
- Set up geospatial indexes for location-based queries

### Required Indexes (created automatically):
- User: mobile_number, location (2dsphere), city, gender, interests
- Rental: renter_id, host_id, location (2dsphere), status
- Banner: active

## Environment Variables

Key environment variables:

- `PORT` - Server port (default: 3000)
- `MONGODB_URI` - MongoDB connection string
- `JWT_ENABLED` - Enable/disable JWT authentication (true/false)
- `JWT_SECRET` - Secret key for JWT tokens
- `JWT_EXPIRATION` - Token expiration time (e.g., '7d')
- `OTP_EXPIRY_MINUTES` - OTP validity duration
- `DEFAULT_USER_CREDITS` - Initial credits for new users

## Testing

Run tests:
```bash
npm run test
```

## Project Structure

```
src/
├── auth/                    # Authentication module
│   ├── dto/                # Data transfer objects
│   ├── auth.controller.ts  # Auth endpoints
│   ├── auth.service.ts     # Auth business logic
│   ├── auth.module.ts      # Auth module config
│   └── jwt.strategy.ts     # JWT strategy
├── profile/                 # Profile management
├── banners/                 # Banner management
├── rentals/                 # Rental/booking system
├── matches/                 # Matchmaking
├── schemas/                 # MongoDB schemas
├── common/                  # Shared utilities
│   ├── guards/             # Auth guards
│   ├── decorators/         # Custom decorators
│   ├── filters/            # Exception filters
│   └── utils/              # Helper functions
├── app.module.ts           # Root module
└── main.ts                 # Application entry point
```

## Next Steps

1. Install dependencies: `npm install`
2. Set up MongoDB and update `.env`
3. Run the application: `npm run start:dev`
4. Test the endpoints using Postman or similar tool
5. Integrate SMS service for OTP delivery
6. Set up file upload for profile images
7. Configure production environment

## Notes

- JWT authentication can be toggled via `JWT_ENABLED` in `.env`
- OTP is logged to console in development (implement SMS service for production)
- File uploads are not yet implemented (configure multer/S3 as needed)
- All coordinates use [longitude, latitude] format
- Distances are calculated in kilometers
