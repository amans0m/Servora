import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';

import { RolesGuard } from '../src/common/guards/roles.guard';
import { IS_PUBLIC_KEY } from '../src/common/decorators/public.decorator';
import { ROLES_KEY } from '../src/common/decorators/roles.decorator';

/** Build an ExecutionContext whose metadata + request we control. */
function ctx(required: Role[] | undefined, userRole?: Role, isPublic = false) {
  const reflector = new Reflector();
  jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
    if (key === IS_PUBLIC_KEY) return isPublic as never;
    if (key === ROLES_KEY) return required as never;
    return undefined as never;
  });
  const context = {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user: userRole ? { userId: 'u', role: userRole } : undefined }),
    }),
  } as never;
  return { guard: new RolesGuard(reflector), context };
}

describe('RolesGuard — RBAC + super-admin hierarchy (§A4)', () => {
  it('allows a matching role', () => {
    const { guard, context } = ctx([Role.admin], Role.admin);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('super_admin satisfies an admin-gated route (superset)', () => {
    const { guard, context } = ctx([Role.admin], Role.super_admin);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('admin CANNOT access a super_admin-gated route (integrations/payouts)', () => {
    const { guard, context } = ctx([Role.super_admin], Role.admin);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('a customer cannot access an admin route', () => {
    const { guard, context } = ctx([Role.admin], Role.customer);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('routes with no @Roles allow any authenticated user', () => {
    const { guard, context } = ctx(undefined, Role.customer);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('public routes bypass role checks', () => {
    const { guard, context } = ctx([Role.admin], undefined, true);
    expect(guard.canActivate(context)).toBe(true);
  });
});
