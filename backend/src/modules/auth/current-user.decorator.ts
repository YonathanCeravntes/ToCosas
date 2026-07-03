import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthUser {
  id: string;
  email?: string | null;
}

/**
 * Extrae el usuario autenticado (inyectado por JwtAuthGuard) del request.
 * Uso: `metodo(@CurrentUser() user: AuthUser)`.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const req = ctx.switchToHttp().getRequest();
    return req.user as AuthUser;
  },
);
