# Gobernanza técnica — ecosistema Millo

Todo cambio que afecte **lógica de negocio, arquitectura, base de datos, seguridad,
IA, APIs, permisos, integraciones, monetización o experiencia funcional** sigue este
proceso. Solo se exceptúan correcciones triviales (ortografía, estilos/ajustes
visuales sin cambio funcional, bugs simples). Ante la duda → gobernanza.

## Flujo

| Fase | Acción | Artefacto |
|---|---|---|
| 1 · Análisis | Entender requerimiento, impacto y módulos afectados | — |
| 2 · Propuesta | Diseñar y documentar | `docs/arquitectura/ARQ-XXXX-NombreModulo.md` → **detener** |
| 3 · Auditoría | Revisión técnica | `docs/auditoria/AUD-XXXX-NombreModulo.md` |
| 4 · Decisión | Aprobación oficial del CTO | `docs/oficial/DEC-XXXX-NombreModulo.md` |
| 5 · Implementación | Solo lo autorizado por el DEC | código |
| 6 · Informe | Cierre | `docs/implementaciones/IMP-XXXX-NombreModulo.md` |

Sin `DEC` aprobado **no se modifica código** de la funcionalidad. La implementación
sigue estrictamente el DEC; no se añaden funcionalidades ni se cambia la arquitectura
por iniciativa propia.

## Contenido mínimo de un ARQ
Objetivo · Problema · Alcance · Arquitectura · Componentes · Base de datos · Backend ·
Frontend · IA involucrada · Riesgos · Dependencias · Impacto esperado · Criterios de
aceptación · Plan de implementación.

## Contenido mínimo de un IMP
Resumen · Archivos modificados · Funcionalidades implementadas · Pruebas realizadas ·
Incidencias · Limitaciones · Resultado final.

## Regla del BACKLOG (para todos los agentes)
Cada vez que se genere un documento (ARQ, AUD, DEC o IMP) se debe actualizar
`docs/roadmap/BACKLOG.md` reflejando el nuevo estado de la funcionalidad.

## Numeración
Cuatro dígitos, correlativa por tipo: `ARQ-0001`, `AUD-0001`, `DEC-0001`, `IMP-0001`.
Un mismo módulo comparte número entre tipos cuando corresponde.
