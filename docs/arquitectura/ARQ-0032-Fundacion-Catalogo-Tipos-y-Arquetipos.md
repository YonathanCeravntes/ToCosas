# ARQ-0032 · La fundación de FIN-030 — catálogo de tipos + espina probada contra los 4 arquetipos

- **Versión:** 1.0
- **Fecha:** 2026-07-14
- **Autor:** Agente Arquitecto
- **Estado:** Emitido — para AUD-0032 y validación del CTO (§36.2)
- **Historial de cambios:**
  - v1.0 (2026-07-14) — la FIN que consolida el umbrella FIN-030 sobre la espina de FIN-031.
- **Módulo/Feature:** FIN-032 (fundación del umbrella FIN-030) · **Origen (§27):**
  Directriz de producto del Fundador + criterio de cierre del CPSAO · Prioridad MÁXIMA
- **Documentos base:** `DEC-0030` umbrella (§6 criterio de cierre a–d) · `DEC-0031`
  (la espina, `8473ed5`) · `ARQ-0030`/`ARQ-0031` · guardarraíles A–K · GOBERNANZA §31/§32/§42

## 0. Observación de frontera (Registrar/Transacciones)

FIN-032 NO reescribe Registrar. El alta-por-tipo extiende el formulario de creación
de deuda (el selector de tipo que FIN-031 ya introdujo para la tarjeta se generaliza
al catálogo). El único punto de entrada que se compone es el de `compra_a_cuotas`
("¿cómo pagaste? → a cuotas"), autorizado por el Fundador para toda la iniciativa.
Si el IMP necesitara tocar el núcleo de `transactions.service` más allá de componer
sobre `TransactionCreated`, me detengo y aviso.

## 1. Objetivo

Consolidar FIN-030: que los **11 tipos de deuda sean ciudadanos de primera clase** y
que la espina de FIN-031 quede **probada contra los 4 arquetipos estructuralmente
divergentes** —libranza, hipoteca, gota a gota, compra a cuotas— **sin una sola rama
ad-hoc**. La tesis a demostrar con evidencia (no promesa): *si esos 4 caben por
configuración, los 11 caben, y sumar el resto es una fila de config, no un rediseño*
(guardarraíl F).

## 2. Problema (verificado contra código)

- `DebtType` tiene **9 valores** (`schema.prisma`); faltan `libranza`, `compra_a_cuotas`
  y un rótulo `fintech` para que el catálogo sea de 1ª clase. `otro` ya existe como
  escape.
- Hoy el "tipo" casi no dirige comportamiento: las **únicas** ramas por tipo son las
  3 sancionadas por FIN-031 —`debt-outlay.service.ts:59` (compromiso de tarjeta),
  `debts.service.ts:268` (tarjeta sin amortización de contrato), `DebtDetailScreen.tsx:53`
  (`isCard`)—. Sin una **autoridad de descripción de tipo**, cada tipo nuevo tienta a
  añadir otra rama `debtType === 'X'` dispersa → el "bug ×11 tipos" que el CTO teme.
- Los arquetipos divergentes no son representables hoy: **libranza** (se paga por
  descuento de nómina), **hipoteca** (plazo largo + seguro endosable + tasa variable),
  **gota a gota / préstamo informal** (sin cronograma formal, interés opcional/pactado)
  y **compra a cuotas** fuera de una tarjeta. Un usuario Beta con cualquiera de esos se
  topa con "producto no soportado".

## 3. Alcance

**Dentro (la fundación, a–d de DEC-0030 §6):**
- (a) el **catálogo de tipos** en el enum como 1ª clase;
- (b) la **espina probada contra los 4 arquetipos** por configuración, sin ramas ad-hoc;
- (c) los **11 registrables con números núcleo correctos** (cuota / saldo / "Te queda" /
  DTI / fecha de libertad) por las **fuentes únicas §32**, no por lógica por-tipo;
- (d) **alta mínima por tipo** (guardarraíl B): catálogo amplio + alta estrecha.

**Fuera (declarado, FIN-033+):** la profundidad avanzada por producto —retanqueo/
refinanciación de libranza, abonos extraordinarios de hipoteca, cambios de condiciones,
**confirmación mensual por corte**— y la **re-proyección por cambio de tasa variable**.
Progresiva, no bloquea el cierre de la fundación. "Flujo de caja" sigue fuera (no pasa el
gate del DSS — DEC-0030 §5).

## 4. Diseño

### 4.1 · El catálogo de tipos (guardarraíl A + F)

Extensión pura del enum `DebtType` (9 → 12), sin reescribir `Debt`:

| # | `DebtType` | Nuevo | Arquetipo que ejercita |
|---|---|---|---|
| 1 | `tarjeta_credito` | | compra a cuotas (revolvente, cupo) — validado FIN-031 |
| 2 | `compra_a_cuotas` | ✅ | **compra a cuotas** (plan fijo, con/sin interés — Addi/Sistecrédito) |
| 3 | `credito_personal` | | amortizado estándar |
| 4 | `libre_inversion` | | amortizado estándar |
| 5 | `libranza` | ✅ | **libranza** (descuento de nómina) |
| 6 | `hipotecario` | | **hipoteca** (plazo largo + seguro endosable + tasa fija/variable) |
| 7 | `vehiculo` | | amortizado + seguro |
| 8 | `educativo` | | amortizado (a veces gracia — FIN-033) |
| 9 | `gota_a_gota` | | **gota a gota** (sin cronograma, interés brutal pactado) |
| 10 | `prestamo_familiar` | | informal (interés opcional) |
| 11 | `fintech` | ✅ | tarjeta/rotativo de neobanco (Nu, RappiCard) |
| — | `otro` | | **personalizable** — escape de guardarraíl F (descriptor por defecto) |

Los **11 de primera clase** = filas 1–11; `otro` es el comodín configurable. Cada valor
del enum apunta a **una fila de descriptor** (§4.2) — nunca a una rama de código dispersa.

### 4.2 · La autoridad única de tipo: `PRODUCT_TYPE_DESCRIPTORS` (§32 + guardarraíl F)

Un **registro de configuración** (const, patrón `EMERGENCY_FUND_MILESTONES`/`attackOrder`:
una fuente, inyectada, nunca recalculada por pantalla). Es **el único lugar** que traduce
`DebtType → comportamiento`. Cada entrada declara **datos, no lógica**:

```
PRODUCT_TYPE_DESCRIPTORS[type] = {
  label,                       // nombre de producto
  scheduleModel,               // 'amortizado' | 'cuotas_por_compra' | 'saldo_y_cuota_pactada'
  rate,                        // 'fija' | 'fija_o_variable' | 'opcional'
  paymentSource,               // 'cuenta' | 'nomina' (libranza) | 'informal'
  capabilities,                // { creditLimit?, installmentPurchases?, endorsableInsurance? }
  requiredFields, optionalFields   // guardarraíl B: el alta mínima del tipo
}
```

Un **tipo nuevo = una fila + su validador**, sin migración de los existentes (F, testeable).

### 4.3 · Los 4 arquetipos reducen a 3 `scheduleModel` — TODOS ya existentes

El corazón de la tesis: los números núcleo (cuota / saldo / fecha de libertad) se resuelven
por **`scheduleModel`, no por `debtType`**. Solo hay **tres** modelos, y los tres ya están
construidos o son la generalización de una ruta viva:

| `scheduleModel` | Cómo calcula cuota/saldo/fecha | Fuente (ya existe) | Arquetipos/tipos |
|---|---|---|---|
| **`amortizado`** | plan de amortización de contrato | `AmortizationService.buildSchedule` (FIN-012) | **hipoteca**, **libranza**, personal, libre inversión, vehículo, educativo, compra a cuotas CON interés |
| **`cuotas_por_compra`** | Σ planes de cuotas por compra | `CardService`/`CardInstallment` (FIN-031) | **compra a cuotas** (plan fijo), tarjeta, fintech rotativo |
| **`saldo_y_cuota_pactada`** | cuota pactada + saldo por pagos, **sin** fecha de libertad garantizada | generaliza la ruta "sin cronograma" que FIN-031 ya abrió para la tarjeta (`computeSchedule` vacío) | **gota a gota**, préstamo familiar, informal |

La **única pieza nueva** es nombrar `saldo_y_cuota_pactada` (hoy es el caso implícito de la
tarjeta con saldo 0/sin amortización). Todo lo demás se **reusa**. Los 4 arquetipos:

1. **Libranza** → `amortizado` + `paymentSource: 'nomina'`. Los números núcleo salen del
   MISMO motor de amortización. Lo divergente (se paga por nómina) es un **flag de fuente de
   pago**, no un número aparte. **Guarda contra doble conteo (crítico):** la cuota de libranza
   es "lo comprometido" por `DebtOutlayService` (autoridad única §32) y **NO** se modela además
   como deducción de ingreso (FIN-027) — se declara y se testea, o el DTI se infla.
2. **Hipoteca** → `amortizado` + `rate: 'fija_o_variable'` + `capabilities.endorsableInsurance`
   (seguros de FIN-013). Mismo motor con plazo largo; el seguro endosable ya es un concepto
   vivo. Tasa variable: se **almacena** (`rateKind`) y se proyecta **a la tasa de hoy** (honesto:
   "proyección a tu tasa actual"); la re-proyección por cambio de tasa es FIN-033 (declarado).
3. **Gota a gota / informal** → `saldo_y_cuota_pactada` + `rate: 'opcional'` +
   `paymentSource: 'informal'`. Sin cronograma; cuota pactada; el costo brutal se representa por
   la tasa/cuota declarada, **sin juzgar** (guardarraíl D, copy §29.2). Saldo por pagos (reusa la
   reversión de saldo de FIN-028).
4. **Compra a cuotas** (fuera de tarjeta) → `cuotas_por_compra` (plan fijo, reusa
   `CardInstallment`) o `amortizado` si cobra interés tipo crédito. Ya validado como patrón por
   FIN-031.

### 4.4 · Los números núcleo por §32 (guardarraíl C) — un solo `switch` de 3 brazos

Ningún número se recalcula por pantalla ni por tipo. El **dispatch por `scheduleModel`** vive
en **una sola función** que las fuentes únicas ya existentes consultan:

- **"Lo comprometido"** → `DebtOutlayService` (autoridad única; hoy ya despacha tarjeta vs
  `monthlyPayment`, `:54-60`). Se extiende el brazo `saldo_y_cuota_pactada` (usa la cuota
  pactada). Sigue **UNA** autoridad — teQueda/presupuesto/Copiloto/Motor la heredan.
- **Cuota / saldo / fecha de libertad** → resuelto por `scheduleModel` (los 3 modelos de §4.3).
- **"Te queda"** → `SpendableService` (lee `DebtOutlayService`) — **sin cambio**.
- **DTI** → `DebtOutlayService.totalOutlay` ÷ `NetIncomeService.netIncome` (FIN-027):
  **composición de dos fuentes únicas, cero fórmula nueva**.

**Regla de cierre (grep §32):** `debtType === …` puede aparecer **solo** en el descriptor
(§4.2) y en el `switch(scheduleModel)` de esa única función; **en ninguna pantalla ni otro
servicio**. Es la prueba de que no renace la lógica por-tipo.

### 4.5 · Alta mínima por tipo (guardarraíl B)

`descriptor.requiredFields` define el mínimo obligatorio; el resto es progresivo. El selector
de tipo (ya presente para tarjeta en `AddDebtScreen`) se generaliza al catálogo y **renderiza
los campos desde el descriptor**. Ejemplos: tarjeta → nombre + cupo; compra a cuotas → nombre +
monto + nº cuotas + con/sin interés; libranza → nombre + saldo + cuota (+ tasa); hipoteca →
nombre + saldo + plazo + tasa + fija/variable; gota a gota/familiar → nombre + saldo + cuota
pactada (interés opcional). **Test:** ningún alta pide más que su mínimo declarado.

### 4.6 · Confirmación en dos niveles (DEC-0030 §5)

El **alta** de un producto es un hecho directo → **sin** segunda confirmación. La modificación
de datos NO ingresados (refi, retanqueo, cambio de condiciones) SÍ pediría confirmación — pero
eso es **FIN-033**, fuera de la fundación. FIN-032 solo encódea el nivel "hecho directo".

## 5. Respuesta al filtro §31

Sin la fundación, FIN-030 quedaría representada por dos productos mecánicamente iguales
(tarjeta + préstamo genérico) que **no prueban el modelo**; un usuario Beta con libranza,
hipoteca o gota a gota se topa con "producto no soportado", y cada tipo nuevo tienta una rama
`debtType===` dispersa que erosiona §32. **Valor diferencial:** los 11 productos reales del
usuario colombiano quedan como ciudadanos de 1ª clase con cuota/saldo/"Te queda"/DTI/fecha de
libertad **correctos por configuración**, y queda **probado con evidencia** que sumar el resto
es una fila de config, no un rediseño. Ninguna FIN previa lo da: FIN-031 validó el *patrón*;
esta lo vuelve *fundación*.

## 6. Componentes

Backend: enum `DebtType` (+3); `product-type.descriptor.ts` (registro único §4.2);
generalización del `scheduleModel` dispatch (una función; `DebtOutlayService` extiende el brazo
informal); validadores de alta por descriptor; `saldo_y_cuota_pactada` como modelo nombrado
(saldo por pagos, reusa reversión FIN-028). Frontend: selector de catálogo + alta por descriptor
(generaliza el toggle de FIN-031); el detalle por `scheduleModel` (la tarjeta ya oculta la
amortización — se generaliza el gate a "qué secciones aplican por modelo"). Tests: 4 arquetipos
parametrizados, alta mínima, grep §32, regresión de los 9 tipos.

## 7. Base de datos

Solo la extensión del enum `DebtType` (migración a mano + `migrate deploy`; los enums de
Postgres se extienden con `ALTER TYPE … ADD VALUE`, sin backfill). `saldo_y_cuota_pactada` NO
necesita tabla nueva: usa `Debt.currentBalance` + `Debt.monthlyPayment` (cuota pactada) ya
existentes; el saldo se mueve por pagos con la reversión de FIN-028. Sin columnas nuevas.

## 8. Backend

Cero fórmula nueva (§32): amortización FIN-012, cuotas por compra FIN-031, desembolso FIN-023,
teQueda FIN-020, ingreso neto FIN-027. El descriptor es configuración; el dispatch por
`scheduleModel` es una sola función de 3 brazos que las fuentes únicas consultan.

## 9. Uso de IA

Ninguno nuevo. El acuse de alta reusa el motor conversacional de FIN-029 (gate DPA+PIA intacto).

## 10. Riesgos

- **El descriptor degenerando en rama por-tipo disfrazada:** mitigado por que el descriptor es
  DATA y el dispatch es UN `switch(scheduleModel)` de 3 brazos; el grep §32 de cierre prohíbe
  `debtType===` fuera del descriptor y esa función.
- **Doble conteo de libranza** (nómina vs compromiso): declarado y testeado — la cuota es "lo
  comprometido", no una deducción de ingreso.
- **Tasa variable de hipoteca:** proyección a la tasa de hoy (honesto); re-proyección = FIN-033.
- **`saldo_y_cuota_pactada` sin fecha de libertad:** es correcto no inventarla (informal); la UI
  lo dice sin culpar (§29.2), no muestra una fecha falsa.
- **Regresión de los 9 tipos:** cada uno mapea a un descriptor; `otro` por defecto. Test de que
  las cifras de un `credito_personal`/`hipotecario` existentes no cambian.

## 11. Dependencias

FIN-031 (la espina, `8473ed5`), FIN-012 (amortización), FIN-023 (desembolso), FIN-020 (teQueda),
FIN-027 (ingreso neto para DTI), FIN-028 (reversión de saldo), FIN-013 (seguros endosables),
FIN-002 (outbox). Ninguna nueva.

## 12. Impacto

Consolida el umbrella FIN-030: el catálogo completo probado contra los arquetipos que rompen el
molde. A partir de aquí, un tipo o comportamiento nuevo es configuración declarada (FIN-033+),
no un rediseño.

## 13. Criterios de aceptación (condición de cierre auditable)

1. **Prueba de los 4 arquetipos (la condición de cierre):** un test **parametrizado** que
   registra libranza, hipoteca, gota a gota y compra a cuotas y verifica sus **números núcleo**
   (cuota, saldo, "Te queda"/desembolso, DTI, fecha de libertad) — corriendo por la **misma
   espina**, sin ninguna rama específica del arquetipo (el propio test no puede special-casear).
2. **Grep §32:** `debtType === …` aparece SOLO en `PRODUCT_TYPE_DESCRIPTORS` y en el único
   `switch(scheduleModel)`; cero recálculo por pantalla; "lo comprometido" de cualquier tipo sale
   solo de `DebtOutlayService`.
3. **Alta mínima por tipo (B):** test — cada tipo pide solo su mínimo declarado.
4. **Los 11 registrables (c):** cada tipo del catálogo se crea y muestra cuota/saldo/"Te queda"/
   DTI/fecha de libertad correctos (o declara honestamente su ausencia, p. ej. sin fecha de
   libertad en informal), sin "producto no soportado".
5. **Regresión:** los 9 tipos existentes no cambian sus cifras (test).
6. Suites + typecheck + build + migración del enum; capturas del alta por catálogo y de un
   arquetipo divergente (p. ej. libranza) con sus números. Filtro §31 (§5).

## 14. Plan

1. Validación CTO → **AUD-0032** (foco: (b) genericidad sin ramas ad-hoc + (c) §32 en los
   números núcleo) → **DEC-0032** → 2. enum +3 + `PRODUCT_TYPE_DESCRIPTORS` (registro único) →
   3. consolidar el dispatch por `scheduleModel` en una función; extender el brazo informal de
   `DebtOutlayService`; `saldo_y_cuota_pactada` → 4. alta por descriptor (selector de catálogo) +
   detalle por modelo → 5. tests de los 4 arquetipos + alta mínima + grep §32 + regresión;
   capturas → 6. **IMP-0032** con SHA y juicio razonado → validación e integración del CTO →
   **cierre que consolida FIN-030** (con el visto de producto del Fundador/CPSAO).
