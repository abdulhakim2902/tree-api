import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { PUBLIC_KEY } from 'src/decorators/public';
import { Request } from 'src/interfaces/request.interface';
import { RedisService } from 'src/modules/redis/redis.service';
import { parse } from 'src/helper/string';
import { ConfigService } from '@nestjs/config';
import { UserProfile } from 'src/interfaces/user-profile.interface';
import { Session } from 'src/interfaces/session.interface';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly prefix = 'auth';
  private readonly configService: ConfigService;

  constructor(
    private jwtService: JwtService,
    private redisService: RedisService,
    private reflector: Reflector,
  ) {
    this.configService = new ConfigService();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      const path = context.switchToHttp().getRequest<Request>().path;
      if (
        path.startsWith('/nodes/search') ||
        path.match(/\/nodes\/.*\/root/) ||
        path.startsWith('/nodes/families')
      ) {
        return true;
      }

      throw new UnauthorizedException('Invalid token format');
    }

    try {
      const userProfile = this.jwtService.decode<UserProfile>(token);
      if (!userProfile) {
        throw new Error('Invalid token');
      }

      if (!userProfile?.id) {
        throw new Error('Invalid user');
      }

      const cache = await this.redisService.get(this.prefix, userProfile.id);
      if (!cache) {
        throw new Error('Session expired');
      }

      const session = parse<Session>(cache);
      if (!session) {
        throw new Error('Invalid session');
      }

      if (token !== session.token) {
        throw new Error('Invalid session');
      }

      const envSecret = this.configService.get<string>('JWT_SECRET');
      const payload = await this.jwtService.verifyAsync(token, {
        secret: envSecret + session.secret,
      });

      request.user = payload;
    } catch (err) {
      throw new UnauthorizedException(err.message);
    }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const headers = request.headers;
    const authorization = headers.authorization;
    const [type, token] = authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
