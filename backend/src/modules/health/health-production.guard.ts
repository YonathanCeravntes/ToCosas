import {
  CanActivate,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Gate técnico de exposición a producción (DEC-0004 §10.3, refuerza DEC-0001
 * §10.7): mientras no exista validación legal formal del Score, en producción
 * este módulo responde 503. En desarrollo/staging no aplica.
 *
 * Activación explícita: HEALTH_SCORE_PRODUCTION_ENABLED=true (default false).
 */
@Injectable()
export class HealthProductionGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(): boolean {
    const isProduction = this.config.get<string>('NODE_ENV') === 'production';
    const enabled =
      this.config.get<string>('HEALTH_SCORE_PRODUCTION_ENABLED', 'false') === 'true';
    if (isProduction && !enabled) {
      throw new ServiceUnavailableException(
        'Salud Financiera no está habilitada en producción (pendiente validación legal).',
      );
    }
    return true;
  }
}
