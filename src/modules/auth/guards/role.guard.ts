import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLE_KEY } from 'src/decorators/role';
import { Role } from 'src/enums/role.enum';
import { Request } from 'src/interfaces/request.interface';

@Injectable()
export class RoleGuard implements CanActivate {
  private readonly methods = ['DELETE', 'PATCH', 'PUT'];

  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const roles = this.reflector.getAllAndOverride<Role[]>(ROLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!roles) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user;

    if (user.role !== Role.SUPERADMIN && request.path.startsWith('/nodes')) {
      if (user.nodeId && this.methods.some((e) => e === request.method)) {
        const params = request.params;
        if (user.nodeId === params?.id) {
          return true;
        }
      }
    }

    if (!user?.role) return false;

    return roles.some((role) => user.role === role);
  }
}
