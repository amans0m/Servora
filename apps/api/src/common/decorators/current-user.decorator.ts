import { ExecutionContext, createParamDecorator } from '@nestjs/common';

import type { Role } from '@prisma/client';

/** The authenticated principal attached to the request by the JWT strategy. */
export interface AuthUser {
  userId: string;
  role: Role;
  email?: string | null;
  phone?: string | null;
}

/** Injects the authenticated user (or one of its fields) into a handler. */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthUser | undefined;
    return data && user ? user[data] : user;
  },
);
