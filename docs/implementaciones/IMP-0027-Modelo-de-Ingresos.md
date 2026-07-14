# IMP-0027 · Evolución del modelo de ingresos personales

- **Versión:** 1.0
- **Fecha:** 2026-07-14
- **Autor:** Agente Arquitecto/Desarrollador
- **Estado:** Entregado — en rama de trabajo, para VALIDACIÓN e integración del CTO (§36.2)
- **Historial de cambios:**
  - v1.0 (2026-07-14) — emisión tras DEC-0027 (los 4 cambios obligatorios honrados).
- **Módulo/Feature:** FIN-027 · **Origen (§27):** Instrucción del Fundador · Prioridad Alta
- **Documentos base:** `ARQ-0027` v1.0 (`0b1b044`) · `AUD-0027` · `DEC-0027`
  (decisión de producto del CPSAO: NETO + copy obligatorio)
- **Referencia inmutable (regla GOBERNANZA):** commit
  **`67cf375b9863ed42e635f70a2f045f64dd6a64b2`**

## 1. Resumen

Milla ya no asume "un salario": perfil laboral + fuentes fijas y variables que
coexisten + deducciones con base configurable (total o parcial — el requisito
duro del Fundador). El "ingreso neto disponible" es una sola definición
(`NetIncomeService`, patrón `SpendableService`/`DebtOutlayService`) inyectada
por los 6 consumidores identificados en el ARQ. DTI y Score ahora se calculan
sobre NETO (decisión del CPSAO) con la nota de copy obligatoria que evita que
declarar bien las deducciones se sienta como castigo.

## 2. Cumplimiento (DEC-0027)

| Pieza | Implementación | Verificación |
|---|---|---|
| **§5.1 — nota de copy (requisito, no opcional)** | `health.service.score()` expone `netIncomeNotice` con el texto exacto del DEC cuando `hasDeductions=true`; frontend lo muestra en Salud, justo bajo el ScoreCard | Captura real: Score 706 (antes 715) + nota visible; e2e verifica el string exacto |
| **§5.2 — migración, no coexistencia** | Migración SQL: cada `FixedItem(kind='ingreso')` activo se convierte en `IncomeSource` (fija, sin deducciones) preservando nombre/monto/día; el original queda con `deletedAt` (recuperable, nunca borrado — mismo criterio de FIN-028); `budget.service.create` **rechaza** `kind='ingreso'` (400) para que no pueda nacer un FixedItem-ingreso mudo | Verificado en vivo con `demo.laura@millo.app`: su "Salario" $4.2M migró automáticamente a `IncomeSource`; e2e confirma el 400 |
| **§5.3 — única definición del neto (§32)** | `NetIncomeService` en módulo HOJA; 6 consumidores inyectados: Motor (`engine.service` — DTI/SavingsRate/Score sobre `netFixedTotal`), Presupuesto (`fixedIncome` + lista `incomes`), teQueda (`SpendableService` — deducciones auto-pagadas como `PendingCommitment`), Copiloto (`context-assembler` — `fixedIncomeTotal`), Simulador (`simulations.service.loadState`), Salud (nota) | Grep: cero recálculos de "neto" fuera de `NetIncomeService`; e2e de los 6 puntos |
| **§5.4 — regresión** | Sin fuentes configuradas, `NetIncomeService` devuelve todo en 0 — mismas cifras que el `FixedItem-ingreso` vacío de antes | Test unitario dedicado + e2e ("sin perfil configurado, /income/summary es todo ceros") |
| **P2 — `withheldAtSource`** | Deducción retenida → solo reduce el neto; deducción pagada por la usuaria → ADEMÁS aparece en `SpendableService.pendingCommitments` (compromiso del ciclo, anclada al día de su fuente) | Unit + e2e: la pensión NO retenida aparece en `teQueda`; la salud retenida NO |

## 3. Suites y evidencia

- Unitaria **345/345** (+5: `NetIncomeService` con caso a mano de base
  total/parcial y monto fijo, regresión; `SpendableService` con la deducción
  auto-pagada). E2E **40/40** en 10 suites (+8 de FIN-027, incluida la
  actualización necesaria de `fin020-tequeda.e2e-spec.ts` para usar
  `/income/sources` en vez del `FixedItem-ingreso` que el propio FIN-027
  retira). `tsc` limpio en ambos lados. Migración `deploy` verificada.
- Capturas reales (`docs/producto/capturas/fin-027/`): nota de Salud con el
  Score ya bajado por el ingreso neto; pantalla completa del perfil mostrando
  "Salud · base total · retenida" y "Pensión · base parcial · la pagas tú"
  exactamente como se configuraron; Presupuesto sin la opción "Ingreso fijo".

## 4. Juicio razonado

**¿El ingreso neto es una sola verdad en toda la app? Sí, verificado en vivo:**
con la demo se ve la cascada completa — el perfil muestra "$3.932.000" de neto
disponible, la nota de Salud explica por qué el Score bajó de 715 a 706, y
Presupuesto ya no ofrece un segundo camino para declarar ingreso. La
corrección del CTO sobre mi diseño anterior (DEC-0028, aplicada aquí por
analogía) se sostiene: adoptar lo existente y migrar es más seguro que abrir
una segunda ruta "por si acaso".

**Reservas honestas:** (1) el modelo NO calcula retención en la fuente
automáticamente (tablas de retefuente colombianas) — la usuaria declara el %
o monto; es una decisión consciente del ARQ (§3: "cero tablas tributarias
fabricadas"), no un olvido; (2) las deducciones de fuentes VARIABLES no se
modelan (el ARQ asumió que las deducciones declaradas aplican sobre la fuente
FIJA) — si una comisión también tuviera retención, hoy no hay dónde
declararla; semilla para una iteración futura si aparece el caso real; (3) el
formulario de alta de deducciones en el frontend no ofrece el modo "monto
fijo" (`fixedAmount`) — el backend lo soporta y está probado, pero la UI solo
expone porcentaje; ajuste pequeño si el CPSAO lo pide.

## 5. Para la validación

- Reproducir: `npx jest` (345) · `npm run test:e2e` (40, docker) · `npx tsc
  --noEmit` (ambos) · grep de "neto" fuera de `NetIncomeService`.
- Capturas: `docs/producto/capturas/fin-027/` (`capture-fin027.js`; datos
  reales creados por API contra la usuaria demo, verificados también por
  `curl` directo antes de capturar).
- Entregado en rama de trabajo (§36.2): el CTO valida (testing §36.3) e
  integra. Con esto se cierra la secuencia 028→027→029; sigue `IMP-0029`.
