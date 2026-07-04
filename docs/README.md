# 📚 Documentación de Millo

## Estructura documental (gobernanza técnica)

```
docs/
├── README.md                  ← este índice
├── roadmap/
│   └── BACKLOG.md             ← 🗺️ tablero maestro (estado de cada funcionalidad)
├── arquitectura/             ← 📐 propuestas   ARQ-XXXX-*.md  (+ plantilla, proceso)
├── auditorias/               ← 🔍 auditorías   AUD-XXXX-*.md  (+ plantilla)
├── oficial/                  ← 🏛️ decisiones   DEC-XXXX-*.md
├── implementaciones/         ← 🛠️ informes     IMP-XXXX-*.md  (+ plantilla)
└── 00..10-*.md               ← diseño de producto y especificación técnica base
```

## Flujo de gobernanza (5 fases)

```
FASE 1 Análisis → FASE 2 Propuesta (ARQ) → FASE 3 Espera → (AUD → DEC) → FASE 4 Implementación → FASE 5 Documentación (IMP)
```

| Etapa | Documento | Carpeta |
|-------|-----------|---------|
| Propuesta | `ARQ-XXXX-NombreModulo.md` | `arquitectura/` |
| Auditoría | `AUD-XXXX-NombreModulo.md` | `auditorias/` |
| Decisión (CTO) | `DEC-XXXX-NombreModulo.md` | `oficial/` |
| Implementación | `IMP-XXXX-NombreModulo.md` | `implementaciones/` |

- Un mismo consecutivo `XXXX` recorre toda la cadena: `FIN-001 ↔ ARQ-0001 ↔ AUD-0001 ↔ DEC-0001 ↔ IMP-0001`.
- **Regla del tablero:** al generar/actualizar cualquiera de esos documentos, se
  actualiza `roadmap/BACKLOG.md`.

## Diseño de producto (base v0)

El diseño y la especificación técnica inicial están en los documentos numerados
[`00`](00-vision-y-propuesta-de-valor.md) … [`10`](10-costos-y-escalabilidad.md)
de esta carpeta (visión, MoSCoW, arquitectura, BD, WhatsApp, API, fases,
seguridad, testing, despliegue, costos).
