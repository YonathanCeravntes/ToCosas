# 🏛️ Proceso de Arquitectura y Gobierno — Millo

Este directorio contiene las **propuestas de arquitectura (ARQ)**. Ninguna
funcionalidad, módulo, mejora o cambio importante se implementa sin pasar por
este proceso.

## Flujo obligatorio

```
Diseño → Propuesta (ARQ) → ⏸ Auditoría + decisión del CTO → DEC aprobado → Implementación → Informe (IMP)
```

1. **Propuesta.** Antes de implementar cualquier cambio importante se crea un
   documento `ARQ-XXXX-NombreModulo.md` en `./docs/arquitectura/`.
2. **Pausa.** Tras generar la propuesta, la implementación importante se detiene
   y se espera el proceso de **Auditoría** y la **decisión oficial del CTO**.
3. **Aprobación.** La decisión se formaliza como un documento **DEC** dentro de
   `./docs/oficial/`. Solo con un DEC aprobado se continúa.
4. **Implementación.** Se ejecuta siguiendo **estrictamente** el DEC aprobado.
5. **Informe.** Al terminar se genera `IMP-XXXX-NombreModulo.md` en
   `./docs/implementaciones/`.

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
