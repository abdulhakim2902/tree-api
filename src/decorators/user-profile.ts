import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'src/interfaces/request.interface';

export const UserProfile = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = request?.user;
    return data ? user?.[data] : user;
  },
);
