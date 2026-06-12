import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';

import type { AuthUser } from '../decorators/current-user.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Effective roles for a principal. super_admin is a strict superset of admin
 * (§A4) — it satisfies any admin-gated route, but admin does NOT satisfy a
 * super_admin-gated route (Integrations / payouts).
 */
function effectiveRoles(role: Role): Role[] {
  return role === Role.super_admin ? [Role.super_admin, Role.admin] : [role];
}

/**
 * Role-based access control. Runs after JwtAuthGuard; enforces @Roles(...).
 * Public routes and routes without @Roles pass through.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const granted = user ? effectiveRoles(user.role) : [];
    if (!user || !requiredRoles.some((r) => granted.includes(r))) {
      throw new ForbiddenException('Insufficient role for this resource');
    }
    return true;
  }
}
