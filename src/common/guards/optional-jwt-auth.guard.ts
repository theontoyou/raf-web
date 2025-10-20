import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Optional JWT Guard - allows requests with or without JWT token
 * If token is present and valid, it attaches user to request
 * If token is absent or invalid, request proceeds without user
 */
@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    // Always allow the request to proceed
    return true;
  }
}
