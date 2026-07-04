# 🗺️ BACKLOG maestro — Millo

> **Documento maestro de gobernanza.** Refleja el estado de cada funcionalidad a
> través de las cuatro etapas documentales: **ARQ** (propuesta) → **AUD**
> (auditoría) → **DEC** (decisión oficial) → **IMP** (implementación).

## 📏 Regla obligatoria para todos los agentes

> **Cada vez que un agente genere o actualice un documento (ARQ, AUD, DEC o IMP),
> DEBE actualizar este archivo `./docs/roadmap/BACKLOG.md`** para reflejar el
> nuevo estado de la funcionalidad correspondiente (marcar la etapa y ajustar la
> columna *Estado*).

## Convención de identificadores

- Cada funcionalidad tiene un **ID de backlog** (`FIN-00X`, `WA-00X`, `INF-00X`).
- Sus documentos comparten el **mismo consecutivo**: `FIN-001` ↔ `ARQ-0001`,
  `AUD-0001`, `DEC-0001`, `IMP-0001`.

## Leyenda

| Símbolo | Significado |
|:---:|---|
| ✅ | Documento generado / etapa superada |
| ⏳ | Pendiente o en curso |
| ❌ | Rechazado / no aplica |

**Estados:** `Pendiente` · `En análisis` · `En auditoría` · `Aprobado (DEC)` · `En implementación` · `Implementado` · `Rechazado`.

---

## Tablero

| ID | Funcionalidad | Prioridad | ARQ | AUD | DEC | IMP | Estado |
|-----|---------------|:---------:|:---:|:---:|:---:|:---:|--------|
| FIN-001 | Gestión de Movimientos (editar/eliminar/historial y filtro por mes) | Alta | ✅ | ⏳ | ⏳ | ⏳ | **En auditoría** |
| FIN-002 | Gráficas y visualización (torta de gastos, progreso de deuda) | Alta | ⏳ | ⏳ | ⏳ | ⏳ | Pendiente |
| FIN-003 | Dashboard — navegación y mejoras dinámicas | Media | ⏳ | ⏳ | ⏳ | ⏳ | Pendiente |
| FIN-004 | Copiloto Financiero (IA conversacional / recomendaciones) | Media | ⏳ | ⏳ | ⏳ | ⏳ | Pendiente |
| FIN-005 | Salud Financiera (score y semáforo) | Media | ⏳ | ⏳ | ⏳ | ⏳ | Pendiente |
| WA-001 | WhatsApp — cola asíncrona (BullMQ) + LLM de fallback | Alta | ⏳ | ⏳ | ⏳ | ⏳ | Pendiente |
| WA-002 | WhatsApp — OCR de comprobantes | Baja | ⏳ | ⏳ | ⏳ | ⏳ | Pendiente |
| INF-001 | Notificaciones push reales (FCM) | Media | ⏳ | ⏳ | ⏳ | ⏳ | Pendiente |
| INF-002 | Despliegue en la nube (infraestructura) | Alta | ⏳ | ⏳ | ⏳ | ⏳ | Pendiente |

---

## Base ya construida (previo a la gobernanza)

Estas capacidades ya están implementadas y verificadas en v0.x (antes de adoptar
el proceso ARQ→AUD→DEC→IMP). Cambios **futuros** sobre ellas sí pasan por gobernanza.

- Autenticación (email + JWT + refresh) · Entidades financieras
- Deudas + motor de amortización + simulador de abono/estrategias
- Transacciones + categorías con iconos + dashboard mensual
- WhatsApp (webhook + parser NLP por reglas + vinculación OTP)
- Motor de sugerencias (reglas) · Recordatorios + scheduler
- Sincronización offline (SQLite + outbox) · App móvil (Expo SDK 54)

> *Última actualización de este tablero: 2026-07-04 · verificación de estructura documental (carpeta `auditorias/` alineada a plural, índice `docs/README.md` y plantilla AUD añadidos).*
