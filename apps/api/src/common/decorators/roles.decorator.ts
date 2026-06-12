import { SetMetadata } from '@nestjs/common';
import type { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Restricts a route to one or more roles (customer / engineer / admin).
 * Enforced by RolesGuard. Routes with no @Roles are open to any authenticated
 * user (Security §12 — RBAC on every route).
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
