import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from 'src/decorators/public';
import { Request } from 'src/interfaces/request.interface';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwtService: JwtService, private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

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
      const payload = await this.jwtService.verifyAsync(token);
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
