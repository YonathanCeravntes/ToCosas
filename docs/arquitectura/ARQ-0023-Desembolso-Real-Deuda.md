# ARQ-0023 · Desembolso real de deuda como "lo comprometido" (§32)

- **Versión:** 1.0
- **Fecha:** 2026-07-12
- **Autor:** Agente Arquitecto
- **Estado:** Emitido — para AUD-0023
- **Historial de cambios:**
  - v1.0 (2026-07-12) — emisión por apertura de FIN-023 (encargo del CTO en el
    hilo, con el requisito del Fundador: cuota de manejo como dato del usuario).
- **Módulo/Feature:** FIN-023 · **Origen (§27):** Deuda técnica §32, prioridad
  inmediata (decisión CPSAO en hilo FIN-022) + requisito nuevo del Fundador
- **Documentos base:** hilos FIN-022/FIN-023 · `COMPRENSION-FIN022` (hallazgo) ·
  DEC-0011 §4.2 (la deuda declarada que esta FIN salda) · GOBERNANZA §32

## 0. Intención

Que "lo comprometido" con una deuda sea lo que de verdad sale del bolsillo cada
mes — cuota, seguros y cargos del banco — en TODAS las cifras de la app, no solo
en el detalle. Tercera aplicación de "nunca mentir hacia arriba".

## 1. Objetivo

1. `totalMonthlyOutlay` (FIN-013) pasa de dato de display a **fuente única de
   "lo comprometido" por deuda**, consumida por construcción por todos los
   puntos que hoy usan `monthlyPayment` a secas como compromiso.
2. **Cuota de manejo** de tarjetas como dato aportado por el usuario (nunca
   asumido ni con default), con el mismo patrón financiado/aparte de los seguros.

## 2. Problema — inventario completo de consumidores (verificado en `8bd4c67`)

`debt.monthlyPayment` usado como "compromiso mensual" (subestimado si hay
seguros/cargos aparte — `debt-insurance.spec.ts:29-33`):

| # | Consumidor | Efecto del sesgo hoy | ¿En el encargo? |
|---|---|---|---|
| 1 | `spendable.service.ts:109` (teQueda, FIN-020) | "Te queda" MIENTE HACIA ARRIBA | Sí |
| 2 | `engine.service.ts:53` (Motor: `essential` → DTI, fondo de emergencia, runway) | DTI optimista; cobertura del fondo inflada | Sí |
| 3 | Recomendaciones (FIN-021: lee `EssentialExpense` PERSISTIDA) | **se corrige sola al corregir el Motor** — cero cambios propios | Sí (por construcción) |
| 4 | `budget.service.ts:105,132` (committed estructural + lista de cuotas de Presupuesto) | comprometido subestimado | No listado — mismo bug, propongo incluirlo |
| 5 | `context-assembler.ts:149` (Copiloto, `debtMonthly` del contexto) | el Copiloto razona con cifra optimista | No listado — propongo incluirlo (1 línea) |
| 6 | `conversation.service.ts:171` (resumen WhatsApp/Telegram) | ídem | No listado — propongo incluirlo (1 línea) |

**NO son compromiso (frontera declarada, no se tocan):** `minPayment` de las
simulaciones de portafolio y sugerencias (insumo de amortización — el roll-over
libera la CUOTA; modelar la desaparición de cargos al saldar sería una FIN
futura); los recordatorios de cuota (avisan del pago del CRÉDITO); el
"tus cuotas suman" del hero de Deudas (etiquetado como contrato en FIN-022 —
ver P4); `prepay/payoff` (operan sobre el crédito).

Nota histórica: DEC-0011 §4.2 decidió EXPLÍCITAMENTE que las primas no
impactaran el Motor "en este ciclo" (comentario vivo en `schema.prisma:414`).
FIN-023 salda esa deuda declarada — no corrige un descuido.

## 3. Alcance

Backend (fuente única + consumidores 1–6) + modelo de datos del cargo + alta en
el detalle de deuda + línea condicional en el hero de Deudas (P4). **Fuera:**
simulaciones/sugerencias (frontera §2), recordatorios, Score y sus cortes (los
VALORES cambian porque el insumo se corrige; los cortes NO se tocan).

## 4. Diseño — alternativas por pieza

### P1 — Modelo de datos de la cuota de manejo (decisión pedida por el CTO)

| | **Alt A — Extender `DebtInsuranceKind` con `cuota_manejo` (recomendada)** | **Alt B — Modelo nuevo `DebtCharge`** | **Alt C — Generalizar el modelo existente (rename a "cargos")** |
|---|---|---|---|
| Qué es | Nuevo valor del enum; el registro vive en `debt_insurances` con la MISMA maquinaria (financiado/aparte, activo, breakdown) | Tabla nueva para cargos no-seguro; `paymentBreakdown` suma dos colecciones | Renombrar modelo/tabla a `DebtCharge` y que "seguro" sea un kind |
| Ventajas | Radio de daño MÍNIMO: cero migración de datos, cero cambios en `paymentBreakdown` (ya auditado), una sola alta en UI; una migración `ALTER TYPE … ADD VALUE` no destructiva | Semántica limpia ("cargo bancario ≠ póliza") | Semántica perfecta a largo plazo |
| Desventajas | Deuda semántica DECLARADA: la tabla se llama "insurances" y `endorsed`/`insurer` no aplican al cargo (la UI los oculta para ese kind; validación en DTO: `endorsed=true` con `cuota_manejo` → 400) | Duplica maquinaria y UI; dos fuentes que el breakdown debe unir — más superficie para el mismo §32 | Toca FIN-013 CERRADA en schema, servicios, DTOs, UI y tests — máximo radio de daño para el mismo resultado |

Mismo criterio que FIN-021 P1: adoptar la maquinaria ya auditada antes que
inventar una paralela. La UI del detalle se renombra "🛡️ Seguros y cargos del
crédito" y el alta ofrece "Cuota de manejo" como tipo (sin campos de endoso).

### P2 — La fuente única de "lo comprometido" por deuda

| | **Alt A — Método único con datos incluidos (recomendada)** | **Alt B — Util pura que cada consumidor llama con sus datos** |
|---|---|---|
| Qué es | `DebtInsuranceService.outlaysByUser(userId)`: UNA consulta (deudas activas + cargos activos) + `paymentBreakdown` ya auditado → `{ byDebt: Map<debtId,{basePayment, separate, outlay}>, totalOutlay }`. Los consumidores 1, 2, 4, 5, 6 lo INYECTAN | Cada consumidor agrega `include: {insurances}` a su query y llama la función pura |
| Ventajas | Un solo filtro (`active`, `deletedAt`), un solo cálculo — el bug no puede renacer por un include olvidado o un filtro distinto; mismo argumento que ganó en FIN-020 P2 y DEC-0021 §5.1 | Menos acoplamiento de módulos |
| Desventajas | Budget, Motor, Copiloto y Messaging pasan a importar DebtsModule — verificar ciclos (análisis preliminar: Debts→Simulations→Billing, ninguno importa Budget/Engine/Copilot → sin ciclo; confirmar en AUD) | "Coincide hoy" — exactamente lo que las tres FIN anteriores erradicaron |

Efecto en cascada (declarado, es el PUNTO de la FIN): para usuarias con cargos
aparte, `essential` sube → DTI sube, cobertura del fondo BAJA, runway baja,
teQueda baja, y el Score puede bajar. Ninguna fórmula ni corte cambia — cambia
el insumo, que era optimista. Los textos existentes no requieren recalibración
(todos hablan de proporciones/meses sobre el insumo).

### P3 — Presupuesto y teQueda

La cuota pendiente del ciclo (SpendableService) y la lista "Cuotas de deuda"
de Presupuesto usan el `outlay` por deuda. El copy de la casa de cuotas gana
la aclaración condicional "incluye seguros y cargos" cuando `separate > 0`
(§29.1: sin cargos aparte, nada cambia visualmente).

### P4 — Hero de Deudas (FIN-022, recién aprobado)

| | **Alt A — Línea condicional (recomendada)** | **Alt B — No tocar Deudas** |
|---|---|---|
| Qué es | Bajo "Tus cuotas suman {X} al mes": "Con seguros y cargos: {totalOutlay} al mes" SOLO si `totalOutlay > X` | El hero queda como FIN-022 lo dejó |
| Ventajas | La subestimación era visible justo ahí; frontera FIN-022→023 documentada en el propio copy | Cero riesgo sobre una pantalla recién aprobada |
| Desventajas | Toca (una línea) una experiencia aprobada hace horas | El total real solo se vería en Presupuesto y el detalle |

### P5 — Copiloto y mensajería (consumidores 5–6, propuestos)

Una línea cada uno: `debtMonthly = totalOutlay` del método único. Si el CTO
prefiere excluirlos del alcance, quedan registrados como §32 conocido con
dueño (no silencioso). El `available` del context-assembler (hallazgo de
VALIDACION-0020) es OTRO concepto y NO se toca aquí.

## 5. Respuesta al filtro §31

No aplica en su forma de cierre: no se crea ni elimina experiencia — se corrige
la base de "lo comprometido" (§32) y se habilita un dato real del contrato
colombiano (cuota de manejo) que hoy no tiene dónde vivir. Lo único visible
nuevo: el tipo "Cuota de manejo" en el alta y las líneas condicionales de P3/P4.

## 6. Componentes
Backend: migración enum + `outlaysByUser` en `DebtInsuranceService` + consumo en
5 puntos + tests (unit del método, actualización de specs del Motor/Spendable,
e2e de igualdad con cargo aparte). Frontend: alta "Cuota de manejo" en
`DebtDetailScreen` (kind nuevo, sin endoso), línea P4, copy P3.

## 7. Base de datos
`ALTER TYPE "DebtInsuranceKind" ADD VALUE 'cuota_manejo'` (migración SQL a mano,
no destructiva, sin backfill — sin datos previos que migrar).

## 8. Backend
Sin cambios al Score ni a cortes; sin IA. El Motor cambia UN insumo
(`debtMonthly`) por el método único.

## 9. Uso de IA
Ninguno.

## 10. Riesgos

- **El Score/fondo/DTI de usuarias con cargos aparte EMPEORA de un día para
  otro** (el insumo se sincera). Mitigación: es exactamente la promesa de
  DEC-0020 ("nunca mentir hacia arriba"); los insights de cambio de banda del
  Motor narrarán el movimiento; declarar en RC.
- Ciclos de módulos (P2 Alt A): verificar en AUD el grafo
  Budget/Engine/Copilot/Messaging → Debts → Simulations → Billing.
- `essential` del Motor cambia ⇒ las lecturas persistidas solo se corrigen al
  recomputar (outbox ~25 s tras un evento; job nocturno como backstop) — mismo
  límite de frescura ya aceptado en DEC-0021 §4.2.
- Usuarios sin seguros/cargos: `outlay == monthlyPayment` — cero cambio, y los
  tests lo fijan (regresión).

## 11. Dependencias
FIN-013 (modelo y breakdown), FIN-020/021 (consumidores ya unificados), FIN-016
(nada — mes calendario del Motor intacto). Ninguna nueva.

## 12. Impacto
6 consumidores sobre UNA fuente; el contrato colombiano completo (cuota de
manejo) por fin registrable. Cuarta FIN consecutiva de fuente única por
construcción.

## 13. Criterios de aceptación

1. **§32 por grep:** ningún `monthlyPayment` usado como compromiso fuera del
   método único (los usos de amortización/recordatorios quedan listados y
   justificados en el IMP).
2. **Caso a mano:** deuda cuota 500.000 + seguro aparte 45.000 + cuota de manejo
   aparte 30.000 ⇒ comprometido 575.000 en: teQueda, `EssentialExpense`
   persistida, committed de Presupuesto, contexto del Copiloto (unit + e2e).
3. **Regresión:** usuaria sin cargos aparte ⇒ TODAS las cifras idénticas a hoy
   (test explícito).
4. Cuota de manejo: alta por API/UI con financiado/aparte; `endorsed` rechazado
   para ese kind; sin default en ninguna parte (grep de literales).
5. Capturas: detalle con cuota de manejo registrada + Presupuesto/Deudas con las
   líneas condicionales (usuaria demo con cargo real) y cold-start sin cambios.
6. Suites completas verdes; typecheck; migración `migrate deploy` limpia.

## 14. Plan
1. AUD-0023 (ciclos de módulos + P1) → 2. DEC-0023 → 3. migración + método único
+ consumidores → 4. UI (alta + líneas condicionales) → 5. capturas → 6. IMP-0023
con SHA y juicio razonado → validación → cierre.
