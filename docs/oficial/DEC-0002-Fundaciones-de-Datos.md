# DEC-0002 · Fundaciones de Datos (Cuentas/Activos + eventos con outbox + series)

- **Documentos base:** `docs/arquitectura/ARQ-0002-Fundaciones-de-Datos.md` · `docs/auditoria/AUD-0002-Fundaciones-de-Datos.md`
- **Módulo/Feature:** FIN-002
- **Decide:** CTO/CPO/Principal Architect de Millo
- **Fecha:** 2026-07-04

---

## 1. Resumen ejecutivo

ARQ-0002 corrige íntegramente el hallazgo más grave del ciclo anterior (premisa falsa de
Redis/BullMQ) y cumple, con evidencia verificable en su propia tabla de trazabilidad
(§16), los cambios obligatorios de DEC-0001 aplicables a fundaciones de datos. La
auditoría (AUD-0002) lo confirma sin observaciones críticas: **APROBADO CON
OBSERVACIONES**. Concuerdo con el veredicto del auditor y con su recomendación de no
devolver el ARQ a una nueva iteración: las cuatro observaciones (concurrencia del
dispatcher, clasificación de `AccountBalanceUpdated`, purga del outbox, regla de
`AccountBalanceEntry`) son ajustes de especificación de bajo costo que se resuelven en
este mismo DEC, no defectos de arquitectura.

**Este DEC autoriza el inicio de implementación de FIN-002** (a diferencia de DEC-0001,
que era estratégico/umbrella). El desarrollador debe seguir exactamente lo aprobado aquí
más las cuatro decisiones técnicas de la sección 10.

## 2. Arquitecturas revisadas

- `docs/arquitectura/ARQ-0002-Fundaciones-de-Datos.md` — v. 2026-07-04.

## 3. Auditorías revisadas

- `docs/auditoria/AUD-0002-Fundaciones-de-Datos.md` — veredicto: **APROBADO CON OBSERVACIONES**.

## 4. Decisiones aprobadas

1. **Infraestructura de eventos:** outbox sobre PostgreSQL + despachador por cron
   (`@nestjs/schedule`) + `EventEmitter2` in-process. Se ratifica el rechazo explícito de
   Redis/BullMQ para esta fase (§4.1 del ARQ), con ruta de evolución documentada si la
   escala lo exige más adelante.
2. **Modelo de datos:** `Account`, `Asset`, `AccountBalanceEntry`, `OutboxEvent`,
   `FinancialSnapshot`, `MetricReading` (estas dos últimas creadas vacías, pobladas por
   FIN-003), y `Transaction.accountId?` como columna additiva.
3. **Patrimonio determinista:** `netWorth = Σ activos + Σ saldos − Σ pasivos`, calculado
   on-read (sin depender del despachador de eventos).
4. **Clasificación de eventos** (§4.2 del ARQ): aprobada en su totalidad **excepto**
   `AccountBalanceUpdated`/`AssetChanged` (ver Cambios obligatorios #2).
5. **Particionamiento de `MetricReading`** por rango nativo de PostgreSQL sobre
   `capturedAt` (partición mensual), retención de 180 días para lecturas `day`, indefinida
   para `month`.
6. **Rate limiting:** adoptar `@nestjs/throttler` en endpoints de auth y de escritura,
   como parte del alcance de FIN-002 (no diferido).
7. **Cifrado a nivel de campo para `Account.currentBalance`/`Asset.currentValue`:**
   diferido explícitamente para esta fase (se mantiene solo cifrado de volumen del
   proveedor gestionado como baseline). Se ratifica la justificación del ARQ (impacto en
   consultas agregadas de patrimonio) y se reitera como riesgo aceptado (sección 8), no
   ignorado.
8. **Alcance excluido** (Redis/BullMQ, pgvector/RAG, Score/indicadores, derivación
   automática de saldos, monetización): confirmado, coherente con DEC-0001.

## 5. Decisiones rechazadas

- Ninguna decisión de fondo del ARQ se rechaza. Solo se ajusta una clasificación (ver
  Cambios obligatorios #2); no constituye rechazo del diseño, sino una simplificación
  solicitada por la propia auditoría y validada por mí.

## 6. Observaciones aceptadas

- Hallazgo 1 (concurrencia del `OutboxDispatcher` sin claim atómico) — aceptado, se eleva
  a cambio obligatorio antes de implementar (no después).
- Hallazgo 2 (inconsistencia de clasificación de `AccountBalanceUpdated`) — aceptado, se
  resuelve en este DEC (ver sección 10).
- Hallazgo 3 (sin política de purga del outbox) — aceptado, se define una política mínima
  en este DEC.
- Hallazgo 4 (regla de escritura de `AccountBalanceEntry` no explícita) — aceptado, se
  resuelve en este DEC para evitar ambigüedad durante la implementación.

## 7. Observaciones descartadas

- Ninguna. Las cuatro observaciones de AUD-0002 se incorporan como cambios obligatorios u
  decisiones explícitas en este DEC.

## 8. Riesgos aceptados

- **Cifrado a nivel de campo diferido** para saldos/valores de activos: riesgo aceptado
  conscientemente (ya aceptado en DEC-0001, reiterado aquí), mitigado parcialmente por
  cifrado de volumen a nivel de infraestructura. Debe revisitarse antes de escalar a
  producción con más usuarios.
- **Instancia única de backend** (Render free tier): el riesgo de concurrencia del
  dispatcher sin claim atómico sería crítico con múltiples instancias; se acepta que hoy
  no aplica, pero se exige el claim atómico de todas formas (ver sección 10) para no
  heredar deuda técnica cuando se escale.

## 9. Riesgos pendientes

- Ninguno nuevo específico de FIN-002. Los riesgos regulatorios, de consentimiento/IA y de
  monetización siguen pendientes conforme a DEC-0001 y no aplican a este módulo.

## 10. Cambios obligatorios

1. **Claim atómico en `OutboxDispatcher`:** implementar el claim de filas `pending` con
   `UPDATE ... SET status='processing' WHERE status='pending' ... RETURNING` (o
   `SELECT ... FOR UPDATE SKIP LOCKED`), no un simple `SELECT` seguido de `UPDATE` separado.
   Obligatorio antes de mergear, aunque hoy corra una sola instancia — evita deuda técnica
   al escalar.
2. **Reclasificar `AccountBalanceUpdated` y `AssetChanged` como asíncronos diferidos.**
   El patrimonio en UI ya se resuelve on-read (consulta agregada), por lo que no requieren
   trato síncrono crítico. Simplifica el diseño tal como sugiere AUD-0002 Recomendación 2.
3. **Política de purga del outbox:** las filas `OutboxEvent` con `status='processed'` y
   más de 30 días de antigüedad se eliminan mediante un job periódico (mismo mecanismo de
   cron del dispatcher). Documentar en `IMP-0002`.
4. **Regla de `AccountBalanceEntry`:** se escribe automáticamente en cada cambio de
   `Account.currentBalance` (vía el mismo servicio, misma transacción). Validación: no se
   permiten saldos negativos en cuentas marcadas `isLiquid=true` o `isEmergencyFund=true`;
   otros tipos de cuenta pueden aceptar saldo negativo si el frontend lo permite
   explícitamente (caso de sobregiro), documentado como regla de negocio en `IMP-0002`.

## 11. Plan técnico oficial

Se autoriza al agente Desarrollador a iniciar la implementación de FIN-002 siguiendo
exactamente el plan de la sección 15 de `ARQ-0002`, incorporando los 4 cambios
obligatorios de la sección 10 de este DEC:

1. Migraciones Prisma: `Account`, `Asset`, `AccountBalanceEntry`, `OutboxEvent`,
   `FinancialSnapshot`, `MetricReading`, `Transaction.accountId`.
2. Módulo `events/`: `OutboxService` (escritura transaccional), `OutboxDispatcher` (cron,
   **con claim atómico**, cambio obligatorio #1), catálogo de eventos con la clasificación
   corregida (cambio obligatorio #2), job de purga (cambio obligatorio #3).
3. Módulo `accounts/`: CRUD `Account`/`Asset`, `NetWorthService`, escritura automática de
   `AccountBalanceEntry` con validación (cambio obligatorio #4).
4. Productores existentes (`transactions`, `debts`, `budget`) escriben su evento en el
   outbox dentro de la misma transacción Prisma.
5. `@nestjs/throttler` en endpoints de auth y escritura.
6. Frontend: pantalla Cuentas/Activos + tarjeta de Patrimonio, offline-first (additive).
7. Tests: `NetWorthService`, garantía transaccional de `OutboxService`, claim
   atómico/retry/idempotencia de `OutboxDispatcher`, purga.
8. Cierre con `docs/implementaciones/IMP-0002-Fundaciones-de-Datos.md` (Resumen, archivos
   modificados, funcionalidades implementadas, pruebas realizadas, incidencias,
   limitaciones, resultado final), actualizando `docs/roadmap/BACKLOG.md` (columnas
   ARQ/AUD/DEC ya en ✅; el agente marca IMP al entregar, yo confirmo el Estado final tras
   validar).

No se autoriza ninguna funcionalidad fuera de este plan (Score, indicadores, Copiloto,
Redis/BullMQ, pgvector, monetización) dentro del ciclo de FIN-002.

## 12. Prioridad

**Alta.** Es la dependencia raíz de FIN-003 y de todo el roadmap de inteligencia
financiera.

## 13. Estado final

**APROBADO CON AJUSTES.** Se autoriza iniciar la implementación de FIN-002 bajo el plan
de la sección 11 y los 4 cambios obligatorios de la sección 10. El cierre de FIN-002
requiere `IMP-0002-Fundaciones-de-Datos.md`, que yo validaré contra este DEC antes de
autorizar el cierre del desarrollo.

---
*Documento oficial — no modificar. Corresponde al ciclo de gobernanza de `docs/GOBERNANZA.md`.*
