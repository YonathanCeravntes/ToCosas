# IMP-0023 · Desembolso real de deuda como "lo comprometido" (§32)

- **Versión:** 1.0
- **Fecha:** 2026-07-13
- **Autor:** Agente Arquitecto/Desarrollador
- **Estado:** Entregado — para VALIDACIÓN del Auditor y posterior cierre del CTO
- **Historial de cambios:**
  - v1.0 (2026-07-13) — emisión tras DEC-0023 (P1 Alt A, P2–P5 + §5).
- **Módulo/Feature:** FIN-023 · **Origen (§27):** Deuda técnica §32, prioridad
  inmediata + requisito del Fundador (cuota de manejo)
- **Documentos base:** `ARQ-0023` v1.0 (commit `3f74873`) · `AUD-0023` · `DEC-0023`
- **Referencia inmutable (regla GOBERNANZA):** commit
  **`c7b9804bea21f313ca375fc102557e5dd0c1be95`**

## 1. Resumen

"Lo comprometido" con una deuda es ahora el desembolso real (cuota + seguros y
cargos que se pagan aparte) en los 6 consumidores del inventario, alimentados
por UNA fuente (`DebtOutlayService.outlaysByUser`) cuyo cálculo es el
`paymentBreakdown` puro ya auditado de FIN-013. La cuota de manejo existe como
dato del usuario (nunca asumida), con la misma maquinaria financiado/aparte.
Cuarta FIN consecutiva de fuente única por construcción — y salda la deuda
declarada de DEC-0011 §4.2.

## 2. Desviación de empaquetado declarada (misma conducta, otro módulo)

El ARQ ubicaba `outlaysByUser` en `DebtInsuranceService`. Al cablear el
consumidor 6 (mensajería) apareció un ciclo real de módulos que el AUD pidió
vigilar: `Messaging → Debts → Reminders → Whatsapp → Messaging`. En vez de
`forwardRef` (frágil, y tocaría módulos de FIN cerradas), la fuente vive en un
**módulo HOJA** (`DebtOutlayModule` → `DebtOutlayService`) que no importa nada:
todas las capas lo consumen sin ciclo. El cálculo sigue siendo ÚNICO: se
extrajo a `payment-breakdown.util.ts` (función pura) y el `paymentBreakdown`
de display de FIN-013 DELEGA en él — cero copias. Conducta idéntica a la
aprobada; solo cambió el paquete. Los tests de FIN-013 pasan sin modificar sus
aserciones.

## 3. Cumplimiento (DEC-0023)

| Pieza | Implementación | Verificación |
|---|---|---|
| P1 Alt A | Enum + migración `ADD VALUE 'cuota_manejo'` (SQL a mano, no destructiva); UI del detalle: "🛡️ Seguros y cargos del crédito", alta con selector Seguro/Cuota de manejo (sin campos de endoso para cargos) | Captura detalle: "Cuota de manejo · aparte $29.900" |
| **§5.1** | Rechazo SERVER-SIDE en create y update: `cuota_manejo` + `endorsed` → 400; + `insurer` → 400 | Unit (3 casos) + e2e (400 real) |
| **§5.2** | Cero defaults: grep de `cuota_manejo` — solo enum/DTO/validación/label; ningún monto literal en ninguna capa; el candidato del alta solo PRE-LLENA el nombre, nunca el valor | Grep en IMP; revisión del diff |
| P2 (fuente única) | 6 consumidores inyectan `outlaysByUser`: teQueda (`spendable`), Motor (`engine.service` → `essential`), Presupuesto (`budget.service`: committed + lista), Copiloto (`context-assembler.debtMonthly`), mensajería (`buildSummary`), summary de Deudas | e2e caso a mano: cuota+45k+30k=+75k en Motor persistido, Presupuesto y summary |
| **§5.3** (orden Motor→Recs) | Recomendaciones NO se tocó: lee `EssentialExpense` PERSISTIDA (FIN-021) — el e2e fija que la lectura persistida incluye los cargos, que ES la fuente de Recomendaciones | e2e "Motor: el gasto esencial PERSISTIDO incluye los 75k" |
| **§5.4** | Comentario en `context-assembler`: el `available` del Copiloto mejora su INSUMO de deuda pero NO se unifica con teQueda (hallazgo VALIDACION-0020 sigue abierto y registrado) | Código + este IMP |
| P3 | Cuotas de Presupuesto = outlay por deuda + nota condicional "Incluyen los seguros y cargos que pagas aparte" (solo si `debtChargesSeparate > 0`, §29.1) | Captura Presupuesto |
| P4 | Hero de Deudas: "Con seguros y cargos: $519.134 al mes" SOLO si difiere de las cuotas | Captura lista |
| Extra necesario | El CRUD de seguros/cargos ahora emite `debt.updated` por outbox — sin esto, la frescura ~25 s declarada en ARQ §10 habría sido falsa (solo job nocturno). Verificado EN VIVO: el cargo creado por API se reflejó en las métricas al pasar el debounce | Evidencia en §5; patrón outbox idéntico a FIN-002 |

## 4. Suites, greps y frontera

- Unitaria **318/318** (+5: caso a mano 575k, regresión outlay==cuota,
  3 validaciones). E2E **20/20** (+5). `tsc` limpio. `migrate deploy` limpio.
- Grep §13.1: `monthlyPayment` como compromiso — CERO fuera de la fuente. Usos
  restantes justificados: amortización/simulaciones y sugerencias (`minPayment`
  — insumo de cálculo de cuota, frontera del ARQ §2 confirmada por AUD),
  recordatorios y `upcoming` (la CUOTA que vence — contrato), display del
  breakdown (insumo), "tus cuotas suman" del hero (contrato declarado FIN-022),
  fallbacks `?? monthlyPayment` junto al mapa de outlay (mismo valor si el mapa
  no trae la deuda).
- **Regresión** (criterio §13.3): usuaria sin cargos aparte → cifras idénticas
  a antes de FIN-023, fijado por unit y e2e.

## 5. Juicio razonado

**¿"Lo comprometido" dice ahora la verdad completa? Sí, y la demo lo muestra en
cascada:** al registrarle la cuota de manejo real ($29.900) a la Tarjeta, el
detalle muestra "Desembolso mensual real $127.099", Deudas agrega "Con seguros
y cargos: $519.134 al mes" (la línea aparece porque la usuaria ya tenía además
un seguro aparte de $38.000 en el crédito — el hallazgo original, visible), la
cuota comprometida de Presupuesto pasó a $127.099/$392.035 con su nota, y el
"Te queda" bajó exactamente $29.900. Nada de eso se calculó dos veces.

**Reservas honestas:** (1) el Score/DTI/fondo de usuarias con cargos aparte
empeora al sincerarse el insumo — es la promesa de DEC-0020, pero la RC debe
mirarlo con usuarias reales; (2) el `available` del Copiloto sigue siendo una
fórmula propia (mejoró su insumo, no su §32) — hallazgo VALIDACION-0020, con
dueño; (3) las simulaciones de portafolio siguen sobre cuota contractual
(correcto per AUD: usar outlay sobrestimaría el pago del crédito), lo que
implica que "libre de todo" del simulador no modela que los cargos desaparecen
al saldar — refinamiento futuro si alguna FIN lo pide.

## 6. Para la validación

- Reproducir: `npx jest` (318) · `npm run test:e2e` (20, docker) · greps de §4 ·
  `npx prisma migrate deploy` idempotente.
- Capturas: `docs/producto/capturas/fin-023/` (+ `capture-fin023.js`; el cargo
  de la demo se creó por API real y el Motor lo recogió por el outbox).
- Checkout aislado sobre el commit de referencia.
