import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser } from './auth.service';

export const GetUser = createParamDecorator(
  (data: string, ctx: ExecutionContext): AuthUser | undefined => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    return data ? user?.[data] : user;
  },
);