# Indicadores Estratégicos — Millo

- **Versión:** 1.0
- **Fecha:** 2026-07-06
- **Autor:** CTO (scaffold inicial)
- **Estado:** Vacío — sin datos reales todavía (Millo no está en producción con usuarios reales)
- **Historial de cambios:**
  - v1.0 (2026-07-06) — creación del documento como parte del scaffold de Gobernanza v3.0.

---

> La evolución del producto debe medirse con datos, no solo con percepciones
> (Gobernanza v3.0, Parte II §16). Este documento vivirá los indicadores reales una
> vez Millo tenga usuarios en producción; hasta entonces permanece como plantilla.

## Indicadores a trackear

| Indicador | Definición | Fuente | Estado |
|---|---|---|---|
| DAU (usuarios activos diarios) | Usuarios con ≥1 acción en la app en el día | Backend (por definir instrumentación) | ⏳ Sin datos |
| MAU (usuarios activos mensuales) | Usuarios con ≥1 acción en los últimos 30 días | Backend | ⏳ Sin datos |
| Retención D1 | % de usuarios que vuelven al día 1 tras registro | Backend | ⏳ Sin datos |
| Retención D7 | % de usuarios que vuelven al día 7 tras registro | Backend | ⏳ Sin datos |
| Retención D30 | % de usuarios que vuelven al día 30 tras registro | Backend | ⏳ Sin datos |
| Tiempo promedio de uso | Duración promedio de sesión | Frontend/analítica (por definir) | ⏳ Sin datos |
| Conversión a Premium | % de usuarios free que activan Millo+ | `billing`/`Subscription` (FIN-009) | ⏳ Sin datos |
| Uso del Copiloto Financiero | Mensajes/usuario/mes, % con IA real vs. plantilla | `AiInteractionLog` (FIN-005) | ⏳ Sin datos |
| Funciones más utilizadas | Ranking de endpoints/pantallas por uso | Backend (por definir instrumentación) | ⏳ Sin datos |
| Abandono | % de usuarios que dejan de usar la app | Backend | ⏳ Sin datos |
| Objetivos financieros creados | Conteo de metas/retos creados | `Challenge` (FIN-008), simulaciones (FIN-007) | ⏳ Sin datos |
| Objetivos cumplidos | % de metas/retos completados | `Challenge.status=completed` (FIN-008) | ⏳ Sin datos |

## Nota de instrumentación

Varias fuentes ya existen en el backend (`Subscription`, `AiInteractionLog`,
`Challenge`) pero no hay todavía un pipeline de analítica de producto que las
consolide. Definir esa instrumentación es candidato natural para una futura
`IDEA-XXXX` en `lab/LAB.md`, no una decisión que se tome desde este documento.
