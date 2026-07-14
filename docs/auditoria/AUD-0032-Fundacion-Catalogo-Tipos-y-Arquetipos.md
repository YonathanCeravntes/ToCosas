# AUD-0032 · La fundación de FIN-030 — catálogo de tipos + espina contra los 4 arquetipos

- **Documento auditado:** `docs/arquitectura/ARQ-0032-Fundacion-Catalogo-Tipos-y-Arquetipos.md` v1.0 (commit `8361cbc`)
- **Insumos:** `DEC-0030` §6 (criterio a–d) · `DEC-0031`/`ARQ-0031` (la espina) · guardarraíles A–K · `GOBERNANZA.md` §31/§32/§42 · código verificado contra `HEAD`
- **Realiza:** Auditor de Milla
- **Fecha:** 2026-07-14

---

## 1. Resumen Ejecutivo

`ARQ-0032` consolida el umbrella: eleva los 11 tipos a primera clase y prueba que los 4
arquetipos divergentes (libranza, hipoteca, gota a gota, compra a cuotas) caben en **3
`scheduleModel` ya existentes** por **configuración** (`PRODUCT_TYPE_DESCRIPTORS`), no por
lógica por-tipo. La tesis es correcta y bien construida. **Una observación con peso: el
ARQ subcuenta las ramas por-tipo que existen hoy — el grep §32 de cierre es cumplible,
pero solo si FIN-032 disuelve TODAS, no las 3 que nombra.** Sin hallazgos bloqueantes.

## 2. Los tres puntos que el Arquitecto pidió verificar

### Punto 1 — Los 4 arquetipos caben en 3 `scheduleModel` sin rama ad-hoc → **sí, con dos guardas que confirmo**

- **Libranza → `amortizado` + `paymentSource:'nomina'`:** los números salen del mismo motor
  de amortización (FIN-012); lo divergente es un flag de datos, no un número aparte. **La
  guarda crítica es real y correcta:** una libranza (descuento de nómina) NO puede modelarse
  **a la vez** como compromiso de deuda (`DebtOutlayService`) **y** como deducción de ingreso
  (FIN-027) — se doble-contaría e inflaría el DTI. El ARQ la declara y testea. **Coordinación
  forward:** FIN-027 aún no está implementada; cuando aterrice, este guard debe ser un test
  cruzado de cierre (la cuota de libranza vive solo en `DebtOutlayService`, nunca como
  deducción). Lo endoso como condición.
- **Gota a gota → `saldo_y_cuota_pactada`, SIN fecha de libertad:** correcto **no** inventarla
  (un informal no tiene payoff garantizado); la UI lo dice sin culpar (§29.2). No fabricar una
  fecha falsa es la decisión honesta. ✓
- Hipoteca (`amortizado` + tasa `fija_o_variable`, proyección a la tasa de hoy; re-proyección =
  FIN-033) y compra a cuotas (`cuotas_por_compra`, reusa `CardInstallment` de FIN-031) caben
  sin rama. ✓

### Punto 2 — ¿El grep §32 de cierre es cumplible? → **sí, PERO el ARQ subcuenta las ramas actuales**

El ARQ dice que "hoy solo existen las 3 ramas sancionadas de FIN-031"
(`debt-outlay.service.ts:59`, `debts.service.ts:268`, `DebtDetailScreen.tsx:53`). **Contra
código hay más:**
- **`card.service.ts:179`** — `if (debt.debtType !== 'tarjeta_credito') …` — **4ª rama
  backend no listada.** Es un guard; por el criterio estricto del propio ARQ debería
  expresarse como `capabilities.installmentPurchases`, no como chequeo de tipo hardcodeado.
- **`AddDebtScreen.tsx`** — el formulario de alta entero ramifica por `isCard` (líneas 13,
  38–55, 81–104): un **5º** branch (de facto) que decide campos, validación y payload por
  tipo. FIN-032 §4.5 lo disuelve (alta renderizada desde `descriptor.requiredFields`) — bien —
  pero el ARQ no lo cuenta entre lo que hay que colapsar.
- `DebtDetailScreen.tsx:53` (`isCard`) gobierna medio detalle (57/70/77/110/115) — más que "una
  rama".

**Consecuencia:** el grep §32 (`debtType===` solo en el descriptor + el único
`switch(scheduleModel)`) **es alcanzable**, pero la condición de cierre debe cubrir **todas**
estas ubicaciones, no las 3 nombradas. Si el `IMP` colapsa solo esas 3 y deja
`card.service.ts:179` y el `isCard` de `AddDebtScreen`/`DebtDetailScreen`, el grep falla o se
estrecha en silencio — y el "bug ×tipos" sobrevive por el frontend. **La Validación debe
correr el grep contra el conjunto completo.**

### Punto 3 — Enum + `saldo_y_cuota_pactada` no reescribe Debt ni rompe los 9 tipos → **CONFIRMADO**

- La extensión del enum es `ALTER TYPE ADD VALUE` (`libranza`/`compra_a_cuotas`/`fintech`),
  no destructiva, sin backfill (patrón FIN-023). No reescribe `Debt`. ✓
- `saldo_y_cuota_pactada` reusa `Debt.currentBalance` + `Debt.monthlyPayment` (cuota pactada)
  existentes; sin columnas nuevas; el saldo se mueve por pagos con la reversión de FIN-028.
  Correcto. ✓
- Regresión: los 9 tipos mapean a un descriptor (`otro` por defecto); el ARQ exige test de que
  las cifras de un `credito_personal`/`hipotecario` existentes no cambian. Sólido.

## 3. §32 y la tesis de fundación

- **La autoridad única de tipo (`PRODUCT_TYPE_DESCRIPTORS`) es el diseño correcto:** un
  registro de configuración (datos, no lógica), patrón `EMERGENCY_FUND_MILESTONES`/`attackOrder`
  — el único lugar que traduce `DebtType → comportamiento`. El dispatch por `scheduleModel` en
  UNA función de 3 brazos es lo que impide que renazca la lógica por-tipo dispersa.
- **DTI = `DebtOutlayService.totalOutlay ÷ NetIncomeService.netIncome`:** composición de dos
  fuentes únicas, cero fórmula nueva — correcto (y depende de que FIN-027 exponga `netIncome`,
  coordinación forward).
- **"Lo comprometido" sigue en `DebtOutlayService`** (autoridad única), extendiendo solo el
  brazo informal — consistente con la observación de mi `AUD-0031` (todo compromiso de deuda,
  incluido card/informal, en una autoridad).

## 4. Filtro §31 y experiencia (§28-29)

- **§31:** sustantiva — los 11 productos reales del usuario colombiano como ciudadanos de 1ª
  clase con números correctos por configuración, y **probado con evidencia** (test de 4
  arquetipos) que sumar el resto es una fila de config. FIN-031 validó el patrón; esta lo
  vuelve fundación. Cumple.
- **§28-29:** gota a gota representado sin juzgar (§29.2, guardarraíl D); alta mínima por tipo
  (B) evita el formulario de banco. Sin jerga nueva.

## 5. Observaciones

1. **Subconteo de ramas por-tipo (Punto 2, con peso):** el `IMP` debe disolver **todas** las
   ramas actuales en el descriptor/`scheduleModel` — no solo las 3 nombradas: incluir
   `card.service.ts:179` (→ `capabilities`) y el `isCard` de `AddDebtScreen`/`DebtDetailScreen`
   (→ alta y detalle por descriptor). El grep §32 de cierre debe ejecutarse contra el conjunto
   completo, o el bug sobrevive por el frontend.
2. **Guard de doble conteo de libranza (Punto 1):** condición de cierre cruzada con FIN-027 — la
   cuota de libranza vive solo en `DebtOutlayService`, nunca como deducción de ingreso; test
   explícito cuando FIN-027 aterrice.
3. **`saldo_y_cuota_pactada` sin fecha de libertad:** correcto; la UI debe declarar la ausencia
   sin culpar (§29.2), no mostrar un placeholder que parezca error.

## 6. Veredicto

**APROBADO CON OBSERVACIONES.**

La fundación-por-configuración es la arquitectura correcta: 3 `scheduleModel` ya existentes, un
descriptor único como autoridad de tipo, DTI como composición de fuentes únicas, y la prueba de
los 4 arquetipos como condición de cierre auditable — es exactamente la evidencia (no promesa)
que el guardarraíl F pide. Los tres puntos: los arquetipos caben sin rama ad-hoc (con la guarda
de doble conteo de libranza y sin fecha falsa en informal); el enum no reescribe Debt ni rompe
los 9 tipos; y el grep §32 es cumplible **pero el ARQ subcuenta las ramas actuales** —
`card.service.ts:179` y el `isCard` del frontend también deben colapsar, y la Validación debe
correr el grep contra el conjunto completo. Es donde el "bug ×11 tipos" que el CPSAO pidió
vigilar por encima de todo entraría por la puerta del frontend. Ninguna observación exige
rehacer el diseño.
