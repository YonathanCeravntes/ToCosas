# IMP-0035 · Registrar como puerta única del ecosistema (P2 del EOC)

- **Versión:** 1.0
- **Fecha:** 2026-07-15
- **Autor:** Agente Arquitecto/Desarrollador
- **Estado:** Entregado — en rama de trabajo, para VALIDACIÓN e integración del CTO (§36.2).
- **Historial de cambios:**
  - v1.0 (2026-07-15) — P2 del programa EOC; primer IMP que toca Registrar.
- **Módulo/Feature:** FIN-035 (P2 de DEC-0033) · **Origen (§27):** Visión del Fundador +
  observaciones de Registrar · Prioridad MÁXIMA
- **Documentos base:** `ARQ-0035` v1.0 (`168af9d`) · `DEC-0035` (auditado por el CTO bajo
  `DEC-ORG-001`, sin AUD de tercero) · `DEC-0030` §5 (dos niveles) · GOBERNANZA §32/§42
- **Referencia inmutable (regla GOBERNANZA):** commit
  **`8cdaef8a4a22e9972ea86ca2e82c99046c79d85a`**

## 1. Resumen

Registrar deja de ser un formulario y se vuelve **la puerta única**: una decisión por pantalla,
en 1ª persona, que **arma el flujo según la elección** heredando el contexto para pedir lo mínimo.
Es **otra puerta al MISMO motor** —compone sobre `transactions.service`/outbox y el path de tarjeta
de FIN-031, cero lógica de dominio propia (§32)—. Sin cambios de esquema ni de backend.

## 2. La decisión central, ya en código: el patrón de confirmación

**Nivel 1 (hecho directo) = `commit + acuse + deshacer`** — el MISMO patrón que el bot (FIN-029),
verificado en código. El acuse **ENUMERA** lo que se movió ("Registré tu gasto de $X. **Te queda
$Z**"); **"Deshacer"** revierte reusando el mecanismo real, **nunca `sourceTransactionId`**
(reservado/null — corrección de DEC-0035 §0, acatada):

| Qué se registró | Deshacer | Mecanismo |
|---|---|---|
| Gasto en caja / ingreso / pago de deuda | `transactions.remove(id)` (el camino de `undoLast`) | el Motor recomputa (teQueda live + dirty-set) |
| Gasto con crédito = compra a cuotas | `voidPurchase(id)` (política §4.5 de FIN-031) | saldo/cupo derivados vuelven solos |

**Nivel 2** (modificar datos NO ingresados) reservado para confirmar-antes-de-cometer (DEC-0030
§5) — no se ejercita en el alcance de P2 (no hay modificación de datos no ingresados en el flujo
de registro directo).

## 3. Cumplimiento (DEC-0035 §3 — condiciones de cierre)

| Condición | Implementación | Verificación |
|---|---|---|
| **§3.1 grep §32** — sin ramas por tipo; "flujo disponible" = SpendableService | `AddTransactionScreen` no ramifica por `debtType`/`scheduleModel` ni computa números; "Te queda" = `budgetApi.monthly().teQueda` | grep de cierre: 0 ramas por tipo / cálculo en el flujo |
| **§3.2 cascada §42 vía `transactions.remove`** | gasto → teQueda baja → `remove` → vuelve (recompute real, no `sourceTransactionId`) | e2e: teQueda `before → before−200k → before` |
| **§3.3 coherencia (obs. 8)** | Registrar llama al mismo `transactions.create`/path FIN-031 que el bot y cualquier módulo | e2e: dos gastos idénticos restan igual de teQueda |
| **§3.4 pasos por ruta** | efectivo/cuenta/débito/billetera **nunca** preguntan cuotas (obs. 4); crédito pide solo los deltas | flujo contextual (captura); e2e del path de crédito |
| **§3.5 compat FIN-034 + cero deuda + cobertura** | selector/catálogo intactos; sin backend nuevo; suites completas | unit 366/366, e2e 15/65, tsc limpio |
| **§3.6 sin ideas sueltas de la Beta** | alcance = flujo + enrutado; nada de tipos/seguros/retanqueo/cupo/Score | diff acotado a Registrar |

## 4. El flujo (una decisión por pantalla, heredando contexto)

`¿Qué quieres registrar?` (Un gasto / Un ingreso / Un pago de deuda) → el flujo se arma:
- **Gasto:** monto → **¿cómo pagaste?** → efectivo/cuenta/débito/billetera → detalle (categoría/
  fecha/nota) → commit gasto → acuse; **crédito** → elegir tarjeta → **solo** nº cuotas + con/sin
  interés → `registerPurchase` (FIN-031) → acuse.
- **Ingreso:** monto → detalle → commit ingreso → acuse.
- **Pago de deuda:** monto → elegir deuda → commit `pago_deuda` → acuse ("Nuevo saldo …").
- **Acuse:** enumera la cascada + **Deshacer** + "Registrar otra cosa". Offline-first preservado
  como fallback (si no hay conexión, el repo local guarda y sincroniza).

## 5. Suites y evidencia

- **Unitaria 366/366** (sin cambios de backend; el flujo es frontend sobre endpoints existentes).
- **E2E 15 suites / 65** — `fin035-registrar` **4/4**: §42 gasto revierte por `transactions.remove`;
  pago de deuda baja saldo y se restaura; gasto-con-crédito (compromiso aparece, `voidPurchase`
  revierte); coherencia (mismo `create`, mismo efecto). Sin regresión.
- **`tsc` limpio** (backend y frontend). **Grep §32**: sin ramas por tipo ni cálculo en el flujo.
- **Sin migración / sin cambios de backend** (composición pura sobre lo existente).
- **Capturas reales** (`docs/producto/capturas/fin-035/`, `capture-fin035.js`): la puerta
  ("¿Qué quieres registrar?", 1ª persona); "¿Cómo pagaste?" (contextual); el acuse que enumera
  ("Te queda $1.620.702") + **Deshacer** (§42).

## 6. Archivos

- **Frontend:** `screens/transactions/AddTransactionScreen.tsx` (la puerta guiada: máquina de
  pasos, enrutado por método, acuse + deshacer, offline fallback); `scripts/captura/capture-fin035.js`.
- **Backend:** ninguno de producción — `test/fin035-registrar.e2e-spec.ts` ejercita los endpoints
  existentes (`transactions.create/remove`, path de tarjeta, `budget/monthly`).

## 7. Pendiente para el CTO (§36.2/§36.3)

Validar (grep §32 del flujo + los tests de cascada/coherencia + pasos por ruta) e **integrar**.
**OTA:** el frontend de FIN-035 se suma a la publicación gateada agrupada con FIN-032/034 (§40/§41),
según la decisión de release. Fuera de alcance (declarado): confirmación mensual (FIN-036),
profundidad por evento (FIN-037), habilitación real de IA (gate DPA+PIA).
