# DEC-0027 · Evolución del modelo de ingresos personales

- **Versión:** 1.0
- **Fecha:** 2026-07-13
- **Autor:** CTO (Claude)
- **Estado:** Emitida — habilita `IMP-0027` (2º de la secuencia; `IMP-0028` ya cerrado)
- **Base:** `ARQ-0027` v1.0 (`0b1b044`) · `AUD-0027` (APROBADO CON OBSERVACIONES) · decisión de producto del CPSAO (NETO + copy obligatorio, `docs/correspondencia/FIN-027-Modelo-de-Ingresos.md`)

---

## 0. Verificación independiente previa (CTO)

Verifiqué la premisa contra el código, no sobre el reporte: `core-metrics.ts:36`
`incomeRef(fixedIncome, actualIncome) = Math.max(fixedIncome, actualIncome)` y
`computeCoreMetrics` lo usa como `ref` → hoy DTI, ahorro y Score se calculan sobre el
**ingreso bruto**. La decisión de base (neto/bruto) es real y necesaria.

## 1. Resumen ejecutivo

Se aprueba el modelo de ingresos de 3 piezas (perfil laboral · fuentes fijas y variables
coexistentes · deducciones con base de cotización configurable total/parcial) con
`NetIncomeService` como **única definición del ingreso neto disponible** (§32). El DTI y el
Score pasan a calcularse sobre el **ingreso NETO** (decisión del CPSAO), con una **nota de
copy obligatoria** que evita que declarar deducciones se lea como castigo.

## 2. Decisiones aprobadas

- **P1 · Modelo de ingresos** (perfil laboral; fuentes fijas + variables coexistentes;
  deducciones salud/pensión/otras con **base configurable total o parcial** — requisito
  duro del Fundador). `NetIncomeService` en módulo hoja, única fuente de
  `ingreso bruto → deducciones → ingreso neto disponible` (§32, patrón `SpendableService`).
- **P2 · `withheldAtSource`** (hallazgo del Arquitecto, aprobado): una deducción **retenida
  en la fuente** solo reduce el neto; una **pagada por la usuaria** (p. ej. independiente
  con su PILA) es además compromiso del ciclo y fluye a "Te queda" por inyección. Sin el
  flag, o se infla el "Te queda" del independiente o se doble-descuenta al empleado.
- **P3 · Base del DTI/Score = NETO** (decisión del CPSAO). Misma línea que fondo de
  emergencia, desembolso real y "Te queda": nunca mentir hacia arriba. Coherencia §32 — el
  sistema converge a neto; dejar Score/DTI en bruto reintroduciría la fractura entre
  pantallas que las últimas FIN eliminaron.

## 3. Cambios obligatorios (§5)

1. **Nota de copy — REQUISITO del DEC, no opcional** (condición del CPSAO). En la pantalla
   de **Salud**, donde cae el indicador, debe aparecer una explicación del tipo: *"tu Score
   bajó porque ahora calculamos con tu ingreso real después de deducciones — es más
   preciso, no que hayas empeorado"*. Mismo recurso de "costo de honestidad" ya usado en el
   hero de Inicio (FIN-020) y el fondo de emergencia (FIN-021). El riesgo a neutralizar: que
   configurar bien los datos parezca castigo y empuje a ocultar deducciones (premiar la
   opacidad sería perverso).
2. **Migración, no coexistencia** (resuelvo la 2ª decisión abierta del ARQ). Los `FixedItem`
   de tipo ingreso se **migran** al nuevo modelo de fuentes; **se rechaza la coexistencia**
   (rompería §32 de nacimiento — dos definiciones del ingreso). La migración debe preservar
   los datos existentes.
3. **Única definición del ingreso neto disponible** (§32): ningún consumidor recalcula el
   neto con otra fórmula; todos inyectan `NetIncomeService`. El ARQ analizó el impacto en
   los 6 consumidores (Salud, Motor, Presupuestos, Copiloto, Proyecciones, Reportes) — el
   IMP debe cubrirlos.
4. **Garantía de regresión:** sin perfil de ingresos configurado, las cifras deben ser
   **idénticas a hoy** (el modelo nuevo no altera a quien no lo usa). Test obligatorio.

## 4. Observaciones aceptadas

- El efecto declarado (el Score baja para quien registra deducciones) es aceptado como la
  verdad del dato, mitigado por el cambio obligatorio 1.
- Registrar ingresos podría rozar el módulo Registrar/Transacciones; si el IMP llega a
  modificarlo, **detenerse y avisar al Fundador** (instrucción permanente).

## 5. Próximos pasos

`IMP-0027` habilitado (2º de la secuencia; `IMP-0028` cerrado). El Arquitecto entrega en
rama de trabajo con SHA; el CTO valida (testing §36.3) e integra (§36.2). Sigue `DEC-0029`
(turno 3). No se abre `IMP-0029` hasta cerrar `IMP-0027`.
