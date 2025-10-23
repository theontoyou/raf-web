// Success Messages
export const SUCCESS_MESSAGES = {
  OTP_SENT: 'OTP sent successfully',
  OTP_VERIFIED: 'OTP verified successfully',
  PROFILE_CREATED: 'Profile created successfully',
  PROFILE_UPDATED: 'Profile updated successfully',
  PROFILE_DELETED: 'Profile deleted successfully',
  BANNER_ADDED: 'Banner added successfully',
  BANNER_DELETED: 'Banner deleted successfully',
  RENTAL_INITIATED: 'Rental initiated successfully',
  RENTAL_CONFIRMED: 'Rental confirmed successfully',
  RENTAL_COMPLETED: 'Rental completed successfully',
  DATA_FETCHED: 'Data fetched successfully',
};

// Error Messages
export const ERROR_MESSAGES = {
  INVALID_OTP: 'Invalid OTP',
  OTP_EXPIRED: 'OTP has expired',
  INVALID_MOBILE: 'Invalid mobile number',
  USER_NOT_FOUND: 'User not found',
  PROFILE_NOT_FOUND: 'Profile not found',
  BANNER_NOT_FOUND: 'Banner not found',
  RENTAL_NOT_FOUND: 'Rental not found',
  INSUFFICIENT_CREDITS: 'Insufficient credits',
  UNAUTHORIZED: 'Unauthorized access',
  VALIDATION_FAILED: 'Validation failed',
  INTERNAL_ERROR: 'Internal server error',
  DATABASE_ERROR: 'Database operation failed',
  INVALID_TOKEN: 'Invalid or expired token',
  MISSING_REQUIRED_FIELDS: 'Missing required fields',
};

// Status Codes
export const STATUS_CODES = {
  SUCCESS: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500,
};

// Response Helper
export const createResponse = (
  status: 'success' | 'error',
  message: string,
  data?: any,
  statusCode: number = STATUS_CODES.SUCCESS,
) => {
  return {
    status,
    statusCode,
    message,
    ...data,
  };
};
