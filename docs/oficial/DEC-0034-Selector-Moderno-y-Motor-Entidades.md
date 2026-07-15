# DEC-0034 · Selector moderno de obligaciones + motor de entidades (P1 del EOC)

- **Versión:** 1.0
- **Fecha:** 2026-07-14
- **Autor:** CTO (Claude)
- **Estado:** Emitida — habilita `IMP-0034`.
- **Base:** `ARQ-0034` v1.0 (`b0f4cc7`) · `AUD-0034` (APROBADO CON OBSERVACIONES) · `DEC-0033`
  (umbrella EOC, §4 criterios transversales) · `CIERRE-0032` (fundación)

---

## 0. Verificación independiente previa (CTO)

No cerré sobre el resumen del Auditor: repliqué sus greps yo mismo contra `HEAD`.
- `entities.service.ts:10-21` — `findAll` ya mezcla `OR:[{userId},{isGlobal:true}]`, filtra por
  `name contains insensitive`, ordena `name asc`. Confirmado carácter a carácter.
- `typicalRate`: **cero usos de cálculo** — la única coincidencia es la declaración de tipo en
  `entity.dto.ts:35`. Ningún servicio la lee para derivar un número.
- Las 2 refs a `FinancialEntity` fuera de `entities/`: `conversation.service.ts:142`
  (`findFirst` para vincular por nombre en el registro conversacional) y `sync.service.ts:26`
  (`findMany` de exportación) — ninguna es cálculo. Confirmado.
- Catálogo global real: `SELECT count(*) FROM financial_entities WHERE is_global=true` → **0**.
  El ARQ no exagera el problema que resuelve.
- `EntityType` (6 valores) y `Debt.entityId` — confirmados en `schema.prisma`.

Todo lo que el ARQ y el AUD afirman contra código es cierto. **Sin banderas rojas.**

## 1. Resumen ejecutivo

Se aprueba `ARQ-0034`: reemplaza el muro de 12 chips (FIN-032) por un selector moderno que
**extiende** el motor de entidades existente — sin esquema nuevo, sin fórmula nueva, sin IA.
El alta sigue armándose desde `PRODUCT_TYPE_DESCRIPTORS` (FIN-032 intacto). No toca Registrar.

## 2. Decisiones aprobadas

- **Catálogo global sembrado** (`GLOBAL_ENTITIES` config + `seedGlobalEntities()` idempotente,
  patrón `PRODUCT_TYPE_DESCRIPTORS`).
- **Búsqueda enriquecida** (`EntitiesService.search()`): relevancia por prefijo + recencia/
  pertenencia del usuario, filtro `type`, degradación con gracia (browse sin `q`, camino libre
  con 0 resultados). Extiende `findAll`, no reemplaza su fórmula.
- **Mapa `ENTITY_TYPE_TO_DEBT_TYPE`** como prellenado editable, nunca imposición.
- **Selector moderno (UI)** sobre `/entities` + `/debts/catalog` — cero literal de tipo nuevo.

## 3. Las 3 observaciones del Auditor — elevadas a condición explícita de cierre

Ninguna exige rediseño; las fijo como criterio de aceptación auditable para que la Validación no
tenga ambigüedad:
1. **Alcance del grep §32 de cierre:** debe apuntar a *lecturas de `typicalRate`/campos de
   `FinancialEntity` en servicios de cálculo* — no a toda referencia al modelo (los reads
   legítimos de `conversation.service`/`sync.service` no deben hacerlo fallar).
2. **La tasa que el usuario confirma en el alta gana sobre la pista de `typicalRate`** — test
   explícito: editar la tasa prellenada y verificar que `Debt.interestRate` guarda el valor del
   usuario, nunca el de la entidad en silencio.
3. **Inferencia de tipo siempre editable** — el test de Independencia cubre que elegir una
   entidad no bloquea cambiar el tipo resultante.

## 4. Observaciones aceptadas (no bloqueantes, ya cubiertas por el ARQ)

Logos remotos fuera de P1 (monograma de respaldo, sin fetch obligatorio); favoritos persistidos
fuera de P1 (usa recencia derivada); confirmación mensual y profundidad por evento → FIN-036/037.

## 5. Próximos pasos

`IMP-0034` habilitado con las 3 condiciones de §3 incorporadas a los criterios de aceptación del
ARQ (§13). Cierre auditable: grep §32 con el alcance corregido, test de "tasa del usuario gana",
test de tipo editable, test de Independencia (sin ranking + camino libre), gate IA (grep=0),
config-sin-código (entidad y tipo nuevos sin tocar UI), regresión del alta. **OTA:** su frontend
se agrupa con FIN-032 en una sola publicación gateada (§40/§41). Emito la directiva de `IMP-0034`
al Arquitecto.
