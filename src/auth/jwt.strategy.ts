import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { Request } from 'express';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TokenBlacklist } from '../schemas/token-blacklist.schema';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      passReqToCallback: true,
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }
  // Note: passport-jwt will call validate(req, payload) when passReqToCallback=true
  async validate(req: Request, payload: any) {
    // Check token blacklist
    try {
      const authHeader = req.headers && (req.headers as any).authorization;
      const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
      if (token) {
        // lazy require to avoid circular import issues
        const mongoose = require('mongoose');
        // only try to access the model if it has been registered
        if (Array.isArray(mongoose.modelNames) && mongoose.modelNames().includes('TokenBlacklist')) {
          const BlackModel = mongoose.model('TokenBlacklist');
          const found = await BlackModel.findOne({ token }).lean();
          if (found) {
            throw new UnauthorizedException('Token revoked');
          }
        }
      }
    } catch (e) {
      // if any error reading blacklist, fall through to normal validate which will reject if user missing
    }

    const user = await this.authService.validateUser(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user as any;
  }
}
