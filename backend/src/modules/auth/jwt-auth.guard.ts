import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { TokenService } from './token.service';

/**
 * Guard que exige un access token válido en el header Authorization: Bearer.
 * Adjunta el payload del usuario a `request.user`.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly tokens: TokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Falta el token de acceso');
    }
    const token = header.slice('Bearer '.length);
    try {
      const payload = await this.tokens.verifyAccess(token);
      if (payload.type !== 'access') {
        throw new UnauthorizedException('Tipo de token inválido');
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (req as any).user = { id: payload.sub, email: payload.email };
      return true;
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }
}
