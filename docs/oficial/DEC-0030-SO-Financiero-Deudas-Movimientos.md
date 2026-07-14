# DEC-0030 (umbrella) · SO Financiero Personal — Deudas por tipo + movimientos inteligentes

- **Versión:** 1.0
- **Fecha:** 2026-07-14
- **Autor:** CTO (Claude)
- **Estado:** Emitida — **decisión umbrella**: aprueba la ESPINA y el alcance; habilita el
  ciclo detallado de la **Fase 1** (FIN-031). NO autoriza un IMP de golpe (un FIN a la vez).
- **Base:** `ARQ-0030` umbrella v1.0 (`2a18a76`) · `AUD-0030` (APROBADO CON OBSERVACIONES) ·
  decisión de producto del Fundador+CPSAO y sus observaciones sobre Registrar
  (`docs/correspondencia/Rediseno-Modulo-Deudas.md`) · guardarraíles A–K · `GOBERNANZA.md` §42

---

## 0. Verificación independiente previa (CTO)

Verifiqué contra el código, no sobre el reporte:
- **`DebtType` tiene 9 valores** (`schema.prisma`: tarjeta_credito, credito_personal,
  hipotecario, libre_inversion, vehiculo, educativo, gota_a_gota, prestamo_familiar, otro).
  Añadir `libranza`/`compra_a_cuotas`/`fintech` → **12 ≥ 11** por extensión del enum, sin
  reescribir `Debt`/`Account` (confirma la viabilidad de **Alt A**).
- **La creación de transacción ya emite `TransactionCreated`** por outbox
  (`transactions.service.ts:120-123`). La capa de consecuencias **compone** sobre ese evento
  existente — la cascada no reescribe el núcleo de Registrar, lo **extiende**.

## 1. Resumen ejecutivo

Se aprueba la ESPINA del "SO Financiero Personal" como **una sola transformación**, en dos
piezas y por construcción §42:
1. **Productos financieros como entidad de primera clase**, dirigida por esquema, como una
   **CAPA sobre los `Debt`/`Account` existentes** (Alt A) — no una reescritura; los ≥11 tipos
   se logran extendiendo el enum.
2. **Capa de consecuencias por evento**: las consecuencias son **listeners** de un evento rico
   con causalidad (`sourceEventId`/`sourceTransactionId`) sobre el outbox de FIN-002 — no un
   orquestador imperativo que meta 9 lógicas en la mutación. Esto hace **§42 verdadero por
   construcción**: anular la acción origen revierte la cascada por los mismos listeners
   (patrón anular-pago de FIN-028) + acuse explícito (FIN-029).

## 2. Decisiones aprobadas (nivel umbrella)

- **Alt A (capa sobre lo existente)** para ambas piezas. §32 intacto: ni una fórmula nueva por
  tipo; cupo/saldo/cuotas/desembolso resuelven a fuentes únicas ya construidas.
- **Fase 1 como primer FIN derivado** (FIN-031): la espina validada con **compra-con-tarjeta
  de crédito de punta a punta** — ejercita G/H/I/J juntos y valida el patrón antes de
  replicarlo. Es lo único que este umbrella diseña como implementable.
- Guardarraíles A–K + §31 + §42 quedan como **criterios de aceptación** de toda FIN derivada.

## 3. Cambios obligatorios / condiciones (§5) — del AUD-0030 y del CTO

1. **Política de reversión con dependientes — el borde donde §42 NO es limpio.** El ARQ de
   Fase 1 (FIN-031) **debe declararla explícitamente**: anular una compra cuyas cuotas ya
   tienen pagos no revierte limpio. Opciones a decidir en ese ARQ: **bloquear + ruta de
   corrección**, o **reversión compensatoria**. Es la protección de Confianza central que el
   CPSAO pidió vigilar (G/§42). Sin esta política declarada, FIN-031 no se cierra.
2. **"Flujo de caja" (J) pasa el gate del DSS antes de existir** en cualquier FIN derivada:
   fuente única + responde una **decisión real que "Te queda" no dé ya** (mi lectura, alineada
   con el Arquitecto: solo se justifica si aporta la dimensión **proyectiva** de saldos
   futuros). Si no, no se shipea por completar la lista.
3. **Toda FIN derivada carga como criterio de cierre:** el **grep §32** (ningún número
   recalculado por pantalla) y un **test de reversibilidad** de su cascada. Es donde el "bug
   ×11 tipos" podría entrar.
4. **Sin duplicados (I):** la compra actualiza el producto existente, no crea una 2ª deuda.
5. **Confirmación en dos niveles** (decisión del Fundador): consecuencia directa del hecho →
   sin confirmar; modificación de datos NO ingresados (refi/plazo/consolidación/condiciones/
   sustitución) → confirmación explícita. Encódelo el ARQ de cada fase que lo toque.

## 4. Observaciones aceptadas

- El umbrella no diseña el detalle campo-por-campo de los 11 tipos ni cada cascada — eso va en
  los ARQ derivados (disciplina "un FIN a la vez").
- Registrar/Transacciones autorizado a extenderse (el Fundador dio sus observaciones); su
  núcleo se compone, no se reescribe.

## 5. Desglose FIN (CTO) y próximos pasos

- **FIN-030** — umbrella (esta DEC). Cerrado a nivel umbrella; no tiene IMP propio.
- **FIN-031** — **Fase 1** (funcionalidad nueva, prioridad máxima): espina (producto-entidad
  como capa + capa de consecuencias por evento, visible/reversible) + **compra-con-tarjeta e2e**.
  Su `ARQ-0031` debe honrar los cambios obligatorios 1–5. **Siguiente en abrir.**
- **FIN-032** — resto de tipos de deuda sobre la espina (enriquecimiento). Roadmap, sin diseño
  detallado aún.
- **FIN-033** — confirmación mensual por corte (sobre el motor conversacional único de
  FIN-029). Roadmap; depende de FIN-029 (cerrada) y de la espina.

El IMP sigue **uno a la vez** (§36.2). Emito la directiva de `ARQ-0031` al Arquitecto.
