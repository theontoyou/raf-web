import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user) return false;
    // Accept either role === 'admin' or explicit is_admin flag coming from user record
    return user.role === 'admin' || user.is_admin === true;
  }
}
