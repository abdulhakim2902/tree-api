import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLE_KEY } from 'src/decorators/role';
import { Role } from 'src/enums/role.enum';
import { Request } from 'src/interfaces/request.interface';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user;

    const roles = this.reflector.getAllAndOverride<Role[]>(ROLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!roles) return true;
    if (!user.role) return true;

    return roles.some((role) => user.role === role);
  }
}
