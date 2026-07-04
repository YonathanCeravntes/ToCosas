# 🔍 Auditorías (AUD) — Millo

Este directorio contiene los **informes de auditoría** de las propuestas de
arquitectura. Un `AUD-XXXX-NombreModulo.md` es la **evaluación técnica** de un
`ARQ-XXXX` antes de que el CTO emita la decisión (`DEC-XXXX`).

## Lugar en el flujo

```
ARQ (propuesta) → AUD (auditoría) → DEC (decisión del CTO) → IMP (implementación)
```

La auditoría revisa la propuesta y produce un veredicto recomendado; la decisión
final y vinculante la toma el CTO en el `DEC`.

La plantilla está en [`AUD-0000-Plantilla.md`](AUD-0000-Plantilla.md).

## Contenido mínimo de una auditoría (AUD)

| Campo | Descripción |
|-------|-------------|
| **ID** | AUD-XXXX (mismo consecutivo que su ARQ) |
| **Propuesta auditada** | ARQ-XXXX-NombreModulo |
| **Fecha / Auditor** | AAAA-MM-DD / responsable |
| **Hallazgos** | Fortalezas y debilidades técnicas de la propuesta |
| **Riesgos no cubiertos** | Riesgos que la propuesta omite o subestima |
| **Verificación de secciones** | Que el ARQ tenga las 14 secciones y sean coherentes |
| **Recomendaciones / ajustes** | Cambios sugeridos antes de aprobar |
| **Veredicto recomendado** | Aprobar / Aprobar con cambios / Rechazar |

> Recordatorio: al generar un AUD, actualizar `docs/roadmap/BACKLOG.md`.

## Registro de auditorías

| AUD | ARQ auditado | Veredicto | Fecha |
|-----|--------------|-----------|-------|
| — | — | _(sin auditorías aún)_ | — |
