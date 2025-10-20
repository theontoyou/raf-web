# OnToYou API

NestJS backend for OnToYou - A platform for social meetups and rentals.

## Features

- JWT Authentication (toggleable via .env)
- MongoDB with Mongoose ODM
- User Profile Management
- OTP-based Login
- Rental/Booking System
- Matchmaking Algorithm
- Banner Management
- Geospatial Queries (2dsphere indexing)

## Installation

```bash
npm install
```

## Configuration

1. Copy `.env.example` to `.env`
2. Update MongoDB URI and other configuration values

```bash
cp .env.example .env
```

## Running the app

```bash
# development
npm run start:dev

# production mode
npm run start:prod
```

## API Documentation

Base URL: `http://localhost:3000/api/v1/`

See `ontoyou_api_docs.md` for complete API documentation.

## Project Structure

```
src/
├── auth/           # Authentication module
├── profile/        # User profile management
├── banners/        # Banner management
├── rentals/        # Rental/booking system
├── matches/        # Matchmaking algorithm
├── common/         # Shared utilities, guards, decorators
├── schemas/        # MongoDB schemas
└── main.ts         # Application entry point
```

## Testing

```bash
# unit tests
npm run test

# e2e tests
npm run test:e2e

# test coverage
npm run test:cov
```
