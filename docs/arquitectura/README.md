# 🏛️ Proceso de Arquitectura y Gobierno — Millo

Este directorio contiene las **propuestas de arquitectura (ARQ)**. Ninguna
funcionalidad, módulo, mejora o cambio importante se implementa sin pasar por
este proceso.

## Flujo obligatorio (5 fases)

```
FASE 1 Análisis → FASE 2 Propuesta (ARQ) → ⏸ FASE 3 Espera (DEC) → FASE 4 Implementación → FASE 5 Documentación (IMP)
```

1. **FASE 1 · Análisis.** Analizar el requerimiento, comprender el problema,
   evaluar impacto técnico, identificar módulos afectados y **clasificar** si el
   cambio requiere gobernanza. Ante cualquier duda → **requiere gobernanza**.
   Requieren gobernanza los cambios en: lógica de negocio, arquitectura, base de
   datos, seguridad, IA, APIs, permisos, integraciones, monetización o
   experiencia funcional. Las correcciones triviales (ortografía, estilos,
   ajustes visuales sin cambio funcional, bugs simples) se implementan directo.
2. **FASE 2 · Propuesta.** Crear `ARQ-XXXX-NombreModulo.md` en
   `./docs/arquitectura/` con las 14 secciones. Al terminar, **detener la implementación**.
3. **FASE 3 · Espera.** Esperar obligatoriamente `./docs/oficial/DEC-XXXX-NombreModulo.md`.
   Hasta que exista, **no se modifica código** de esa funcionalidad.
4. **FASE 4 · Implementación.** Con el DEC aprobado, implementar **exactamente lo
   autorizado**: sin funcionalidades extra, sin cambiar la arquitectura por
   iniciativa propia.
5. **FASE 5 · Documentación.** Crear `IMP-XXXX-NombreModulo.md` en
   `./docs/implementaciones/`. Luego, quedar disponible para una nueva auditoría.

## Nomenclatura

| Tipo | Carpeta | Formato |
|------|---------|---------|
| Propuesta de arquitectura | `docs/arquitectura/` | `ARQ-XXXX-NombreModulo.md` |
| Decisión oficial (aprobación) | `docs/oficial/` | `DEC-XXXX-NombreModulo.md` |
| Informe de implementación | `docs/implementaciones/` | `IMP-XXXX-NombreModulo.md` |

- `XXXX` = consecutivo de 4 dígitos (0001, 0002, …). El número se conserva
  entre ARQ ↔ DEC ↔ IMP del mismo módulo para trazabilidad.
- La plantilla de propuesta está en [`ARQ-0000-Plantilla.md`](ARQ-0000-Plantilla.md).

## Secciones mínimas de una propuesta (ARQ)

1. Objetivo
2. Problema que resuelve
3. Alcance
4. Arquitectura propuesta
5. Componentes involucrados
6. Base de datos
7. Backend
8. Frontend
9. IA involucrada
10. Riesgos identificados
11. Dependencias
12. Impacto esperado
13. Criterios de aceptación
14. Plan de implementación

## Registro de propuestas

| ARQ | Módulo | Estado | DEC | IMP |
|-----|--------|--------|-----|-----|
| [ARQ-0001](ARQ-0001-Gestion-Movimientos.md) | Gestión de Movimientos | En auditoría | — | — |

> Estados posibles: `Borrador` · `En auditoría` · `Aprobada (DEC)` · `Rechazada` · `Implementada`.
