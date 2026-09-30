# ARQ-0002 · Fundaciones de Datos (Cuentas/Activos + eventos con outbox + series)

- **Módulo/Feature:** FIN-002
- **Autor:** Agente de Arquitectura
- **Fecha:** 2026-07-04
- **Estado:** Propuesto — en espera de auditoría (AUD-0002) y decisión oficial (DEC-0002)
- **Documentos base:** `ARQ-0001-Inteligencia-Financiera.md` · `DEC-0001-Inteligencia-Financiera.md`
- **Producto:** Millo (nombre cerrado por DEC-0001)

> Autorizado por DEC-0001 §11. Este ARQ incorpora obligatoriamente los cambios vinculantes
> de DEC-0001 §10 aplicables a fundaciones (#1, #2, #3, #5, y soporte para #4). Ver §16
> "Cumplimiento de DEC-0001" para la trazabilidad que debe verificar el auditor (AUD-0002).

---

## 1. Objetivo
Construir la **base de datos y de eventos** sobre la que operará el Motor Financiero:
modelar **cuentas monetarias y activos** (para calcular patrimonio y liquidez reales),
e instaurar un **bus de eventos de dominio con patrón outbox** y las **tablas de series de
tiempo** (snapshots + lecturas de métricas) que los módulos de FIN-003 poblarán.

## 2. Problema que resuelve
Hoy el modelo solo tiene pasivos (`Debt`), transacciones y gastos fijos. **No existe forma
de conocer los saldos líquidos ni los activos del usuario**, por lo que patrimonio,
liquidez y fondo de emergencia son incalculables. Tampoco hay un mecanismo confiable para
propagar cambios de dominio (crear transacción, cambiar deuda, actualizar saldo) hacia
recálculos, ni un lugar donde persistir la evolución temporal de los indicadores.

## 3. Alcance
**Incluye:**
- Modelos `Account` (cuentas monetarias) y `Asset` (activos de patrimonio) + CRUD.
- Vínculo opcional `Transaction.accountId` (sin derivación automática de saldo en esta fase).
- Cálculo de **patrimonio** determinista: `netWorth = Σ activos + Σ saldos − Σ pasivos`.
- **Bus de eventos de dominio con patrón outbox** sobre PostgreSQL + despachador por cron.
- Tablas de series: `FinancialSnapshot` y `MetricReading` (creación + estrategia de
  particionamiento/retención). *Las poblará FIN-003; aquí se crean vacías con su contrato.*
- **Clasificación evento-por-evento** (síncrono crítico vs asíncrono diferido).
- Decisiones (no necesariamente implementación) de **cifrado de PII en reposo** y **rate limiting**.
- Frontend: pantalla de **Cuentas y activos** (alta/edición/actualización de saldos) + resumen de patrimonio.

**No incluye (excluido explícitamente por DEC-0001):**
- Redis / BullMQ (rechazado como “ya disponible”; ver §16.1).
- pgvector / RAG / embeddings (rechazo DEC-0001 §5.2).
- Cálculo de indicadores/Score (es FIN-003/FIN-004).
- Derivación automática de saldos desde transacciones (se difiere; saldo = fuente de verdad manual).
- Señal de monetización (DEC-0001: va en FIN-004/FIN-005).

## 4. Arquitectura propuesta

### 4.1 Decisión de infraestructura de eventos (DEC-0001 §10.1) — **outbox sobre PostgreSQL**
Se adopta la **opción (a): cron + tabla outbox sobre el PostgreSQL existente**, sin costo
de infraestructura nuevo. Se **descarta** Redis/BullMQ para esta fase (plan free de Render,
sin add-on de Redis; `backend/package.json` sin `bullmq`/`redis`, verificado).

```
Cambio de dominio (create tx / update debt / update balance)
        │  (una sola transacción DB)
        ├─ escribe la fila de negocio
        └─ escribe fila en OUTBOX (mismo tx)   ← garantía transaccional (mandatory #2)
              │
   [cron cada N s]  OutboxDispatcher lee pending → emite en EventEmitter2 (in-process)
              │        → handlers (Motor, en FIN-003) → marca processed / failed+retry
```

- Emisión in-process con `EventEmitter2` (dependencia nueva liviana, sin infra).
- Despachador con `@nestjs/schedule` (**ya presente**), no requiere worker separado.
- Entrega **at-least-once**; los handlers deben ser idempotentes (se documenta como contrato).
- Ruta de evolución: si la escala lo exige, el `OutboxDispatcher` puede reemplazarse por una
  cola persistente sin tocar productores ni consumidores. Decisión de costo futura, no ahora.

### 4.2 Clasificación de eventos (DEC-0001 §10.3)

| Evento | Productor | Clasificación | Justificación |
|---|---|---|---|
| `TransactionCreated/Updated/Deleted` | transactions | **async diferido** | recálculo de métricas no debe bloquear el registro |
| `DebtCreated/Updated/Deleted` | debts | async diferido | idem |
| `FixedItemChanged` | budget | async diferido | idem |
| `AccountBalanceUpdated` | accounts | **síncrono crítico (<100ms)** para patrimonio inmediato en UI; async para métricas derivadas | el usuario espera ver su patrimonio actualizado al instante |
| `AssetChanged` | accounts | síncrono crítico (patrimonio) + async (métricas) | idem |
| Escritura en `outbox` | todos | **síncrono** (misma tx del cambio) | garantía transaccional |
| Consumo/recompute del Motor | dispatcher | **async diferido** | trabajo pesado fuera del request |

Regla: la parte **síncrona** se limita a escribir el estado y el outbox (rápido); todo
recálculo del Motor es **asíncrono** vía despachador. El patrimonio “inmediato” en UI se
calcula on-read con una consulta agregada barata, no depende del despachador.

### 4.3 Integración con el esquema actual
- `Account` y `Asset` cuelgan de `User` (nuevas relaciones), opcionalmente ligadas a
  `FinancialEntity` (banco/cooperativa ya existente).
- `Transaction` gana `accountId?` (opcional, additive) para futura conciliación; en esta
  fase **no** modifica saldos automáticamente.
- Patrimonio reutiliza `Debt.currentBalance` (pasivos ya existentes) + `Account.currentBalance` + `Asset.currentValue`.

## 5. Componentes involucrados
**Nuevos:** módulo backend `accounts/` (Account+Asset+patrimonio), módulo `events/`
(outbox + dispatcher + definición de eventos de dominio), tablas de series
(`FinancialSnapshot`, `MetricReading`) sin lógica de cómputo aún.
**Modificados:** `Transaction` (columna `accountId`), relaciones en `User`.
**Reutiliza:** `PrismaService`, `@nestjs/schedule`, `AuthModule`/guards, `FinancialEntity`.

## 6. Base de datos

**Modelos nuevos (Prisma):**
- `Account`: `id, userId, entityId?, name, type (efectivo|ahorros|corriente|billetera|otro),
  currency, currentBalance Decimal(18,2), isLiquid Bool, includeInNetWorth Bool,
  isEmergencyFund Bool, archivedAt?, createdAt, updatedAt, deletedAt`.
- `Asset`: `id, userId, name, type (inmueble|vehiculo|inversion|negocio|otro), currency,
  currentValue Decimal(18,2), acquisitionValue? Decimal(18,2), acquisitionDate? Date,
  isLiquid Bool, includeInNetWorth Bool, notes?, createdAt, updatedAt, deletedAt`.
- `AccountBalanceEntry` (histórico de saldos, alimenta patrimonio en el tiempo):
  `id, accountId, balance Decimal(18,2), recordedAt, source (manual|import)`.
- `OutboxEvent`: `id, aggregateType, aggregateId, eventType, payload Jsonb, status
  (pending|processing|processed|failed), attempts Int, availableAt, processedAt?, error?,
  createdAt`. Índices: `(status, availableAt)`.
- `FinancialSnapshot`: `id, userId, capturedAt, netWorth, totalAssets, totalLiquid,
  totalLiabilities, extra Jsonb`. **Poblada por FIN-003.**
- `MetricReading` (serie genérica): `id, userId, metricKey, value Decimal, capturedAt,
  period (day|month)`. **Poblada por FIN-003.**
- `Transaction.accountId?` (nueva columna, FK opcional a `Account`).

**Particionamiento/retención (respuesta a AUD-0001 H9):**
- `MetricReading` con **particionamiento nativo de PostgreSQL por rango sobre `capturedAt`**
  (partición mensual). Retención propuesta: lecturas `day` se conservan 180 días; agregados
  `month` de forma indefinida. Se implementa como decisión ratificable en DEC-0002.
- `AccountBalanceEntry` y `FinancialSnapshot`: sin partición inicial (volumen bajo);
  se revisará cuando `FinancialSnapshot` sea diaria por usuario a escala.

## 7. Backend
NestJS. Nuevos módulos:
- `accounts/`: controllers CRUD de `Account`/`Asset`, `AccountsService`, `NetWorthService`
  (patrimonio determinista, puro y testeable). Emite `AccountBalanceUpdated`/`AssetChanged`.
- `events/`: `OutboxService` (escritura transaccional del evento junto al cambio de dominio),
  `OutboxDispatcher` (cron `@nestjs/schedule`), catálogo tipado de eventos de dominio,
  `DomainEventPublisher` (EventEmitter2). Contrato de **idempotencia** para consumidores.
- Productores existentes (`transactions`, `debts`, `budget`) escriben su evento en el outbox
  dentro de la misma transacción Prisma (`$transaction`).
Migraciones Prisma additivas. Cobertura de tests para `NetWorthService`, `OutboxService`
(garantía transaccional) y `OutboxDispatcher` (retry/idempotencia).

## 8. Frontend
Expo/React Native. Nueva pantalla **“Cuentas y activos”** (accesible desde Presupuesto o
Ajustes):
- Listado + alta/edición de cuentas (tipo, saldo, marcar como líquida / fondo de emergencia).
- Listado + alta/edición de activos (tipo, valor).
- Tarjeta de **Patrimonio** (activos + saldos − deudas) con desglose. Sin Score todavía.
Offline-first: se integra con el motor de sync existente (additive).

## 9. IA involucrada
**Ninguna.** FIN-002 es fundación de datos puramente determinista. No hay llamadas a LLM,
ni embeddings, ni pgvector (excluidos por DEC-0001 §5.2).

## 10. Riesgos identificados
1. **Doble contabilidad** saldo manual vs. transacciones → mitigado: saldo manual es la
   fuente de verdad; sin auto-derivación en esta fase.
2. **Entrega duplicada** del outbox (at-least-once) → mitigado: consumidores idempotentes (contrato).
3. **Fricción de onboarding** por pedir saldos/activos → mitigado: opcionales; patrimonio
   se muestra parcial y va mejorando a medida que el usuario carga datos.
4. **Crecimiento de series** → mitigado con particionamiento/retención (§6).
5. **Datos sensibles nuevos** (saldos, valor de activos) → ver §11 cifrado/rate limiting.

## 11. Cifrado de PII en reposo y rate limiting (DEC-0001 §10.5 — decidir, no implementar aún)
**Evaluación y decisión propuesta (a ratificar en DEC-0002):**
- **Cifrado en reposo:** habilitar cifrado de volumen del proveedor gestionado (baseline) como
  requisito de despliegue. **Cifrado a nivel de campo** para saldos/valores se **evalúa y se
  difiere** (impacta consultas agregadas de patrimonio); decisión: no cifrar a nivel de campo
  en FIN-002, revisitar antes de exponer a producción ampliada.
- **Rate limiting:** adoptar `@nestjs/throttler` en endpoints de auth y de escritura;
  configuración concreta (límites) a fijar en la implementación. Decisión: **adoptar**.
Ambos se documentan aquí como decisión; su implementación efectiva puede ir en FIN-002 o
diferirse a un hardening previo a producción (DEC-0002 lo determina).

## 12. Dependencias
- Ninguna dependencia de otro FIN (FIN-002 es la raíz). Habilita FIN-003 y FIN-004.
- Tecnológicas: PostgreSQL (particionamiento nativo), `@nestjs/schedule` (presente),
  `@nestjs/event-emitter` (nueva, liviana), `@nestjs/throttler` (nueva, para rate limiting).

## 13. Impacto esperado
Habilita por primera vez el cálculo de **patrimonio y liquidez reales**, requisito de todo
el roadmap. Instaura una espina dorsal de eventos confiable (outbox) sin costo de infra
nuevo, y deja listas las tablas de series para que FIN-003 compute indicadores.

## 14. Criterios de aceptación
- CRUD de `Account` y `Asset`; `NetWorthService` devuelve `netWorth = activos + saldos − deudas` con desglose, testeado.
- `OutboxEvent` se escribe en la **misma transacción** que el cambio de dominio (test de garantía transaccional).
- `OutboxDispatcher` (cron) entrega a consumidores in-process, con **retry** e **idempotencia** (test).
- Tablas `FinancialSnapshot` y `MetricReading` creadas, con particionamiento/retención de `MetricReading` definidos.
- Clasificación de eventos documentada (§4.2).
- **Sin** Redis/BullMQ y **sin** pgvector en dependencias ni migraciones.
- Decisiones de cifrado en reposo y rate limiting documentadas y ratificables.
- Pantalla de Cuentas/Activos + tarjeta de Patrimonio funcionando; typecheck + tests verdes; se genera `IMP-0002`.

## 15. Plan de implementación (tras DEC-0002 aprobado)
1. Migración: `Account`, `Asset`, `AccountBalanceEntry`, `OutboxEvent`, `FinancialSnapshot`, `MetricReading`, `Transaction.accountId`.
2. Módulo `events/` (OutboxService + Dispatcher + catálogo de eventos + publisher idempotente).
3. Módulo `accounts/` (CRUD + `NetWorthService`) emitiendo eventos vía outbox.
4. Productores existentes (transactions/debts/budget) escriben su evento en el outbox.
5. `@nestjs/throttler` + baseline de cifrado en despliegue (según DEC-0002).
6. Frontend: pantalla Cuentas/Activos + tarjeta Patrimonio + tipos/endpoints + sync.
7. Tests (NetWorth, Outbox transaccional, Dispatcher retry/idempotencia) + verificación end-to-end.
8. Informe `IMP-0002-Fundaciones-de-Datos.md`.

## 16. Cumplimiento de DEC-0001 (para verificación del auditor, DEC-0001 §11)
| Cambio obligatorio DEC-0001 §10 | Cómo lo cumple este ARQ |
|---|---|
| #1 Decidir infra colas/eventos (no “ya disponible”) | §4.1: se adopta outbox+cron sobre PostgreSQL; se descarta Redis/BullMQ explícitamente |
| #2 Patrón outbox en alcance | §3, §4.1, §6 (`OutboxEvent`), §7 (`OutboxService`) |
| #3 Clasificación evento síncrono/asíncrono | §4.2 (tabla completa) |
| #4 Cold-start (≥60 días) | Soporte de datos: todo historial con timestamp; **umbral se aplica en FIN-003** (fuera de alcance de cómputo aquí), se deja constancia |
| #5 Cifrado PII en reposo + rate limiting decididos | §11 (evaluación + decisión ratificable) |
| Rechazo Redis/BullMQ “ya disponible” | §3 (excluido), §4.1 |
| Rechazo pgvector/RAG en alcance inicial | §3 (excluido), §9 |
| Monetización no en FIN-002 | §3 (excluida; va en FIN-004/005 por DEC-0001) |
| Carpeta auditoría oficial `docs/auditoria/` | Referenciada en encabezado y base documental |

---
*Documento sujeto a gobernanza — ver [../GOBERNANZA.md](../GOBERNANZA.md). En espera de
AUD-0002 y DEC-0002. **No iniciar implementación de código.***
