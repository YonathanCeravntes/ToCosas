import 'reflect-metadata';
import { PATH_METADATA } from '@nestjs/common/constants';
import { HealthScoreController } from './health.controller';

/**
 * ⚖️ GUARDARRAÍL TÉCNICO DE LEY 1266 (DEC-0009 §10.3 — control verificable).
 *
 * El memorando legal (adenda DEC-0005 §3) advierte: si el Score Millo se
 * comparte con terceros (bancos, fintechs) para decisiones de crédito, se
 * activa la Ley 1266 (Habeas Data Financiero) y el registro ante la SIC.
 * Millo NO hace eso, y este test lo garantiza técnicamente: falla si aparece
 * cualquier ruta que permita consultar el Score de otro usuario o exportarlo
 * a un tercero.
 *
 * ⚠️ MODIFICAR ESTE TEST REQUIERE PASAR POR GOBERNANZA (ARQ→AUD→DEC): no es
 * un test de conveniencia, es un control regulatorio (DEC-0009 §10.3).
 */
describe('Guardarraíl Ley 1266 — el Score nunca se comparte con terceros', () => {
  const controllerPath: string = Reflect.getMetadata(PATH_METADATA, HealthScoreController);

  const methodPaths: string[] = Object.getOwnPropertyNames(HealthScoreController.prototype)
    .filter((name) => name !== 'constructor')
    .map((name) => {
      const descriptor = Object.getOwnPropertyDescriptor(HealthScoreController.prototype, name);
      return descriptor?.value ? Reflect.getMetadata(PATH_METADATA, descriptor.value) : undefined;
    })
    .filter((p): p is string => typeof p === 'string');

  it('el controlador de Salud existe y expone rutas', () => {
    expect(controllerPath).toBe('health');
    expect(methodPaths.length).toBeGreaterThan(0);
  });

  it('ninguna ruta acepta un userId ajeno (solo el usuario autenticado)', () => {
    for (const path of methodPaths) {
      expect(`${path} contiene :userId → ${/:user/i.test(path)}`).toBe(
        `${path} contiene :userId → false`,
      );
    }
  });

  it('ninguna ruta sugiere compartir/exportar el Score a terceros', () => {
    const forbidden = /share|export|third|tercero|compartir|entidad|partner|bureau|buro/i;
    for (const path of methodPaths) {
      expect(`${path} → ${forbidden.test(path)}`).toBe(`${path} → false`);
    }
  });
});
