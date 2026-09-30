# IMP-0034 · Selector moderno de obligaciones + motor de entidades (P1 del EOC)

- **Versión:** 1.0
- **Fecha:** 2026-07-14
- **Autor:** Agente Arquitecto/Desarrollador
- **Estado:** Entregado — en rama de trabajo, para VALIDACIÓN e integración del CTO (§36.2).
- **Historial de cambios:**
  - v1.0 (2026-07-14) — emisión tras DEC-0034 (3 condiciones del Auditor como cierre).
- **Módulo/Feature:** FIN-034 (P1 de DEC-0033) · **Origen (§27):** Visión del Fundador + decisión
  de producto del CPSAO · Prioridad MÁXIMA
- **Documentos base:** `ARQ-0034` v1.0 (`b0f4cc7`) · `AUD-0034` (APROBADO CON OBSERVACIONES) ·
  `DEC-0034` (§3 las 3 condiciones) · `DEC-0033` (umbrella EOC) · GOBERNANZA §32/§42
- **Referencia inmutable (regla GOBERNANZA):** commit
  **`df5348a34092f3dbaaaabcf8afe81baba50e54f9`**

## 1. Resumen

El muro de 12 chips (FIN-032) se reemplaza por un **selector moderno en 1ª persona**: buscas tu
banco/tarjeta (catálogo de entidades reconocidas) o eliges el tipo. El alta sigue armándose desde
`PRODUCT_TYPE_DESCRIPTORS` (FIN-032 intacto). **Extiende** el motor de entidades que ya existía
—sin esquema nuevo, sin fórmula nueva, sin IA— y **no toca la cascada de Registrar** (P2).

## 2. Cumplimiento (DEC-0034 §3 — las 3 condiciones del Auditor)

| Condición de cierre | Implementación | Verificación |
|---|---|---|
| **§3.1 — grep §32 con alcance corregido** (lecturas de cálculo de `typicalRate`, no toda ref) | `typicalRate` solo en el config (`global-entities.catalog.ts`), el DTO y `entities.service` (siembra/prellenado). **Ningún servicio de cálculo la lee.** | grep de cierre: `typicalRate` fuera de config/DTO/entities = 0. **Gate DPA+PIA:** 0 imports de IA en `entities/` |
| **§3.2 — la tasa del usuario GANA sobre la pista** | El selector prellena `interestRate` con `typicalRate` (pista **editable**); el payload lleva el valor que el usuario ve/edita; el backend guarda `dto.interestRate`, nunca copia `typicalRate` en silencio. | e2e: entidad con `typicalRate` 32 + alta con tasa 15 → `Debt.interestRate === 15` |
| **§3.3 — el tipo inferido SIEMPRE es editable** | El tipo sugerido (`suggestedDebtType`) es una pista; la pantalla ofrece **"Cambiar"** y un banco no impone tipo (`suggestedDebtType: null`). | e2e: una misma entidad banco sostiene `hipotecario` **y** `credito_personal`; captura con "Cambiar" |

## 3. Independencia del catálogo (DEC-0033 §4.5)

Reconocimiento, **no** recomendación: el orden es solo **relevancia** (prefijo antes que
"contiene") + **recencia/pertenencia** (lo del usuario primero) — nunca "la mejor" ni patrocinio;
la respuesta **no trae campo de score/rank/recommended**. **Camino libre garantizado:** una
entidad fuera del catálogo igual crea la deuda (el selector siempre ofrece elegir el tipo y poner
el nombre). Tests: unit (sin score, pertenencia primero) + e2e (sin ranking, `entityId` null crea
la deuda).

## 4. Catálogo global sembrado (config-sin-código)

`GLOBAL_ENTITIES` (22 entidades colombianas: bancos, fintech, compra a cuotas, cooperativas,
prestamista) + `seedGlobalEntities()` **idempotente y a prueba de carreras**: índice único parcial
sobre el nombre global (`financial_entities_global_name_key`) + captura de `P2002` para que dos
arranques concurrentes no dupliquen; la migración además **deduplica** lo ya sembrado. **Añadir una
modalidad = una fila** (test de config-sin-código: inyectar un catálogo con una fila extra → se
crea, sin tocar UI). `typicalRate` es una **pista** editable, jamás autoridad §32.

## 5. Suites y evidencia

- **Unitaria 366/366** (+5: `entities.service.spec` — siembra idempotente, config-sin-código,
  orden por pertenencia/relevancia sin score, pista de tipo).
- **E2E 14 suites / 61** — `fin034-selector-entidades` **6/6**: catálogo buscable; Independencia
  (sin ranking + camino libre); tasa del usuario gana; tipo editable (banco → 2 tipos); recencia.
- **`tsc` limpio** (backend y frontend).
- **Migración** `20260714160000_fin034_entidad_global_unica` (dedup + índice único parcial),
  aplicada con `migrate deploy`. **Sin cambios de modelo** (`isGlobal`/`entityId` ya existían).
- **Capturas reales** (`docs/producto/capturas/fin-034/`, `capture-fin034.js`): selector con
  búsqueda "banco" (entidades + monograma + "O elige el tipo"); alta prellenada desde "Nu" (nombre
  + tasa típica 32 editable) con **"Cambiar"** (tipo editable).

## 6. Grep §32 (alcance corregido, condición §3.1)

```
# typicalRate / campos de FinancialEntity en SERVICIOS DE CÁLCULO → 0
typicalRate: solo global-entities.catalog.ts (config) + entity.dto.ts + entities.service.ts
FinancialEntity (fuera de entities/): conversation.service.ts (linking) · sync.service.ts (export)
  → linking/sync, NO cálculo (los 2 reads legítimos que el Auditor pidió NO hacer fallar el grep)
# gate DPA+PIA: cero imports de IA en entities/
```

## 7. Archivos

- **Backend:** `global-entities.catalog.ts` (config + mapa entidad→tipo); `entities.service.ts`
  (`seedGlobalEntities` idempotente/race-safe + `search` relevancia/recencia + `OnModuleInit`);
  `entities.controller.ts` (filtro `type`); migración dedup + índice único parcial; su spec + e2e.
- **Frontend:** `api/types.ts` (`FinancialEntity`); `api/endpoints.ts` (`entitiesApi.search`,
  `entityId` en el alta); `AddDebtScreen.tsx` (selector moderno + monograma); `capture-fin034.js`.

## 8. Pendiente para el CTO (§36.2/§36.3)

Validar (grep §32 con el alcance corregido + los 3 tests de condición + Independencia + gate IA +
regresión del alta) e **integrar**. **OTA:** el frontend de FIN-034 se agrupa con FIN-032 en una
**sola publicación gateada** (§40/§41), según la decisión de release. NO toca Registrar (P2 sigue
bajo retención del Fundador).
