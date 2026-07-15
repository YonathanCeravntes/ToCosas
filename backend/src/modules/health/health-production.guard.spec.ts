import { ServiceUnavailableException } from '@nestjs/common';
import { HealthProductionGuard } from './health-production.guard';

function buildGuard(env: Record<string, string | undefined>) {
  const config = {
    get: jest.fn((key: string, def?: string) => env[key] ?? def),
  } as never;
  return new HealthProductionGuard(config);
}

describe('HealthProductionGuard (DEC-0004 §10.3)', () => {
  it('producción sin flag → 503', () => {
    const guard = buildGuard({ NODE_ENV: 'production' });
    expect(() => guard.canActivate()).toThrow(ServiceUnavailableException);
  });

  it('producción con flag explícito en false → 503', () => {
    const guard = buildGuard({
      NODE_ENV: 'production',
      HEALTH_SCORE_PRODUCTION_ENABLED: 'false',
    });
    expect(() => guard.canActivate()).toThrow(ServiceUnavailableException);
  });

  it('producción con flag true (tras validación legal) → permite', () => {
    const guard = buildGuard({
      NODE_ENV: 'production',
      HEALTH_SCORE_PRODUCTION_ENABLED: 'true',
    });
    expect(guard.canActivate()).toBe(true);
  });

  it('desarrollo/staging → permite sin flag', () => {
    expect(buildGuard({ NODE_ENV: 'development' }).canActivate()).toBe(true);
    expect(buildGuard({}).canActivate()).toBe(true);
  });
});
