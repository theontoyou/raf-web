import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private configService: ConfigService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // If JWT is disabled, allow all requests
    if (this.configService.get('JWT_ENABLED') !== 'true') {
      return true;
    }

    return super.canActivate(context);
  }
}
