import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthUser } from '@chms/shared';

/** Injects the authenticated user (resolved by JwtStrategy) into a handler. */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user;
    if (!user) return undefined;
    return data ? user[data] : user;
  },
);
