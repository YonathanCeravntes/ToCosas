# ARQ-0027 · Evolución del modelo de ingresos personales

- **Versión:** 1.0
- **Fecha:** 2026-07-13
- **Autor:** Agente Arquitecto
- **Estado:** Emitido — para validación del CTO y pase a AUD-0027 (flujo §36.2)
- **Historial de cambios:**
  - v1.0 (2026-07-13) — emisión por directiva del CTO (hilo FIN-027).
- **Módulo/Feature:** FIN-027 · **Origen (§27):** Instrucción del Fundador
  (memo 2026-07-13) · Prioridad Alta
- **Documentos base:** `docs/correspondencia/FIN-027-Modelo-de-Ingresos.md` ·
  GOBERNANZA v3.14 §31/§32/§36

## 0. Intención

Que Milla entienda de qué vive cada usuaria — empleada, independiente, con
salario fijo Y comisiones a la vez — configurándolo UNA vez, y que "lo que de
verdad te queda del ingreso" (neto) sea una sola cifra oficial en toda la app.

## 1. Objetivo

1. Modelo de datos del perfil de ingresos: perfil laboral + fuentes (fijas y
   variables coexistentes) + deducciones con **base de cotización configurable**
   (total vs. parcial — requisito duro del Fundador).
2. **`NetIncomeService`**: la ÚNICA definición de "ingreso neto disponible"
   (§32), inyectada por todos los consumidores — patrón `SpendableService`.
3. Análisis de impacto obligatorio en Salud, Motor, Presupuesto, Copiloto,
   Proyecciones y Reportes.

## 2. Problema (verificado contra código)

- Hoy el "ingreso" del sistema es plano: `FixedItem(kind='ingreso')` (monto +
  día) para lo declarado y las transacciones `ingreso` para lo real. No existen
  perfil laboral, tipos de fuente, ni deducciones.
- **Todas las cifras trabajan con BRUTO:** `incomeRef(fixedIncome, income)`
  (`core-metrics.ts:36`) alimenta DTI, capacidad de ahorro y Score; el
  Presupuesto usa `fixedIncome` bruto; las interpretaciones "$N de cada $100"
  dividen sobre bruto. Para una empleada con retención en la fuente el error se
  disimula (lo que registra ya llega neto); para un independiente que paga su
  salud/pensión aparte, **el sistema le muestra plata que no es suya**.
- "Ingreso neto disponible" no existe como concepto — si cada pantalla lo
  improvisara después, tendríamos el bug §32 de "Te queda" otra vez, a escala.

## 3. Alcance

Backend: 3 modelos nuevos + migración + `NetIncomeService` + consumo en los 6
puntos del impacto. Frontend: sección "Mi perfil de ingresos" (en Ajustes u
onboarding — P5). **Fuera (declarado):** el módulo Registrar/Transacciones NO
se toca (la captura de ingresos reales sigue idéntica; si el diseño de detalle
lo requiriera en IMP, me detengo y aviso — instrucción permanente); motor de
impuestos/retefuente colombiana completa (solo deducciones declaradas por la
usuaria, cero tablas tributarias fabricadas); infraestructura (§36.4).

## 4. Diseño — alternativas por pieza

### P1 — Modelo de datos

| | **Alt A — Modelo propio de 3 piezas (recomendada)** | **Alt B — Extender `FixedItem` con campos de deducción** |
|---|---|---|
| Qué es | `IncomeProfile` (1:1 usuario: perfil laboral `empleado/independiente/empresario/pensionado/estudiante/otro`) · `IncomeSource` (n por usuario: `kind` salario_fijo/salario_variable/comisiones/bonificaciones/honorarios/otro; `isVariable`; monto fijo o estimado mensual para variables; activo) · `Deduction` (n por fuente o por perfil: `kind` salud/pensión/otra; % o monto; **`base`: total \| parcial** con el valor de la base parcial —monto o %—; **`withheldAtSource`**) | Meter tipo, deducciones y base en el modelo de compromisos |
| Ventajas | Cada concepto con su forma; la coexistencia fijo+variable es natural (n fuentes); la base parcial es un campo, no un hack; extensible sin migrar después | Sin tablas nuevas |
| Desventajas | 3 modelos + migración | `FixedItem` es flujo de ciclo, no contrato laboral — mezclar rompe FIN-016/020 y el §32 del comprometido |

**`withheldAtSource` (diseño derivado de la realidad, no pedido pero necesario):**
una deducción **retenida en la fuente** (empleado) reduce el neto pero NUNCA
sale de la cuenta de la usuaria; una deducción **pagada por ella** (independiente
que paga su PILA) es además un COMPROMISO del ciclo. Sin este flag, o el
independiente ve inflado su "Te queda", o el empleado vería descontada dos veces
su salud. Con él: las pagadas-por-la-usuaria se exponen a `SpendableService`
como compromiso (inyección — sin tocar su fórmula).

### P2 — Relación con los `FixedItem` de ingreso existentes

| | **Alt A — Migración con conversión automática (recomendada)** | **Alt B — Coexistencia con precedencia** |
|---|---|---|
| Qué es | Los `FixedItem(kind='ingreso')` existentes se convierten en `IncomeSource(kind='otro', fijo, sin deducciones)` — misma cifra, cero pérdida; el alta de "ingreso fijo" del Presupuesto pasa a crear fuentes; `FixedItem` queda solo para GASTOS | Ambos modelos viven y los consumidores suman "el que exista" |
| Ventajas | UNA casa para el ingreso declarado; imposible el doble conteo; el Presupuesto no pierde nada (lee del servicio nuevo) | Sin migración |
| Desventajas | Migración de datos (SQL a mano + `migrate deploy`, patrón conocido) y cambios en el alta del Presupuesto | Dos fuentes del mismo concepto = §32 roto por diseño desde el día uno |

### P3 — `NetIncomeService`: la única definición (§32, por construcción)

`compute(userId)` → `{ grossFixed, grossVariableEstimate, deductions[] (con
base efectiva y monto calculado), netFixed, netMonthlyEstimate,
selfPaidDeductions[] }`. Reglas: deducción % se aplica sobre su **base
declarada** (total de la fuente o la porción parcial); montos fijos se restan
directo; los estimados variables se marcan como estimación (§29: jamás se
presentan como certeza). Vive en módulo HOJA (patrón `DebtOutlayModule` de
FIN-023) para que Motor, Budget, Copilot y Reportes lo inyecten sin ciclos.
Criterio: **ninguna otra ruta calcula "neto" — grep en la validación.**

### P4 — Impacto por consumidor (encargo obligatorio)

| Consumidor | Hoy | Con FIN-027 | Decisión que NO tomo solo |
|---|---|---|---|
| Motor (`incomeRef` → DTI, ahorro, Score) | bruto declarado/real | `netFixed`/neto estimado como referencia | **¿DTI sobre neto o bruto?** La banca usa bruto; la honestidad de Milla ("nunca mentir hacia arriba") sugiere neto — más DTI, menos Score. Alternativas al DEC: (a) neto en todo (coherente, Score baja para quien tiene deducciones — como FIN-023); (b) bruto para DTI, neto para el resto (convención bancaria, pero dos referencias). Recomiendo (a) con el efecto DECLARADO |
| Salud | textos proporcionales | sin cambio de forma; valores se sinceran | — |
| Presupuesto (`fixedIncome`, committedRatio) | bruto | `netFixed`; las deducciones auto-pagadas aparecen en lo comprometido (vía Spendable) | — |
| teQueda (FIN-020) | ingresos REALES recibidos | **sin cambios de fórmula** (lo recibido ya es lo recibido); gana los compromisos de deducción auto-pagada | — |
| Copiloto | `fixedIncomeTotal` bruto | vista minimizada gana neto y perfil (sin PII nueva: kinds, no empleadores) | — |
| Proyecciones/Reportes | sobre bruto | sobre neto disponible | — |

### P5 — Dónde configura la usuaria

Alt A (recomendada): sección "💼 Mi perfil de ingresos" en Ajustes, con el alta
de fuentes y deducciones (una vez, editable); el onboarding solo pregunta el
perfil laboral (1 tap) y ofrece completar después — cero fricción de entrada.
Alt B: onboarding completo obligatorio (rechazo: fricción donde FIN-017 la quitó).

## 5. Respuesta al filtro §31

Sin este modelo, Milla solo es honesta con un arquetipo (empleado de salario
único ya neteado): al independiente le muestra como suyo un ingreso del que aún
debe pagar salud y pensión, y a la comisionista la obliga a fingir que su
ingreso es fijo. Se perdería la base de TODA cifra per-ingreso de la app (DTI,
ahorro, $N de cada $100, presupuesto) para los perfiles que más necesitan un
copiloto. Valor diferencial: **es la pieza que hace que "de cada $100 que te
entraron" sea verdad para cualquier forma de ganarse la vida.**

## 6. Componentes
Backend: modelos+migración, `NetIncomeModule` (hoja) + `NetIncomeService`,
consumo en Motor/Budget/Copilot, conversión de FixedItem ingreso, tests (caso a
mano de deducción parcial vs total; regresión: usuaria sin perfil = cifras de
hoy). Frontend: pantalla de perfil de ingresos; el Presupuesto reetiqueta su
alta de ingreso.

## 7. Base de datos
3 tablas nuevas + migración de conversión (SQL a mano, reversible: los
FixedItem ingreso se conservan con `deletedAt` marcado, no se borran).

## 8. Backend
El Motor cambia solo su INSUMO de referencia (como FIN-023); cortes intactos.

## 9. Uso de IA
Ninguno.

## 10. Riesgos
- Score/DTI se sinceran para quien registre deducciones (baja) — cuarto capítulo
  de "nunca mentir hacia arriba"; declarar en RC.
- Estimados de ingreso variable: riesgo de fabricar certeza — mitigado con
  lenguaje de estimación (§29) y porque teQueda sigue usando SOLO lo real.
- Migración de FixedItem ingreso: probar con la BD demo antes de producción
  (§36.3: verificación de migraciones).
- Regresión garantizada: usuaria sin perfil configurado → `NetIncomeService`
  degrada a las cifras actuales (neto = bruto declarado) — test explícito.

## 11. Dependencias
FIN-016 (ciclo), FIN-020 (Spendable — recibe compromisos nuevos por inyección),
FIN-005 (vistas minimizadas). Ninguna nueva de infraestructura.

## 12. Impacto
1 concepto oficial nuevo (ingreso neto disponible) con 6 consumidores por
inyección; 3 modelos; 1 pantalla; la app deja de asumir "un salario".

## 13. Criterios de aceptación
1. §32 por grep: "neto" solo en `NetIncomeService`; consumidores lo inyectan.
2. Caso a mano: salario 4M con salud/pensión 4%+4% sobre base TOTAL vs sobre
   base parcial de 2.5M ⇒ netos distintos correctos; fuente fija + comisiones
   variables coexistiendo.
3. `withheldAtSource=false` ⇒ la deducción aparece en lo comprometido del ciclo.
4. Regresión: sin perfil configurado, TODAS las cifras actuales idénticas.
5. Suites + typecheck + migración `deploy` verificada (§36.3); capturas del
   perfil y del efecto en Presupuesto/Salud.
6. Filtro §31 (§5) y decisión P4-Motor resuelta en DEC.

## 14. Plan
1. Validación CTO → AUD-0027 → DEC-0027 (decisión DTI neto/bruto + P2) →
2. modelos+migración → 3. servicio hoja + consumidores → 4. pantalla perfil →
5. capturas/tests → 6. IMP-0027 (secuencia de IMPs la fija el CTO) →
validación → cierre.
