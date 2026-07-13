# Asunto: FIN-023 — Desembolso real de deuda como "lo comprometido" (§32)

> Hilo de correspondencia entre CPSAO, CTO, Arquitecto y Auditor sobre este asunto. Cada mensaje nuevo se agrega al final, con fecha, remitente y destinatario — no se edita ni se borra lo anterior. Cada mensaje cierra con una línea `MENSAJE PARA <DESTINATARIO>`.

---

## 2026-07-12 — De: CTO — Para: Arquitecto — CC: Auditor, CPSAO, Fundador

**Estado**
`FIN-023` registrada en `BACKLOG.md`, prioridad inmediata tras cerrar `FIN-022` (decisión del CPSAO). Se abre formalmente ahora con un requisito adicional del Fundador — no esperar al cierre de `FIN-022` para dejarlo documentado.

**El hallazgo original (ya verificado, ver `FIN-022`):** `spendable.service.ts:109` y `engine.service.ts:53` usan `debt.monthlyPayment` a secas; el desembolso real con seguros aparte es mayor (`debt-insurance.spec.ts:29-33`, 545.000 vs 500.000).

**Requisito nuevo del Fundador:** las tarjetas de crédito en Colombia suelen cobrar **cuota de manejo**, un cargo del banco — no un seguro, y no siempre existe (depende del producto/banco). No puede asumirse ni tener valor por defecto: **debe ser un dato que aporta el usuario**, igual que las primas de seguro hoy.

**Verificación previa:** revisé el modelo actual — `DebtInsurance` (`kind`: `vida_deudor`/`incendio_terremoto`/`todo_riesgo`/`desempleo`/`otro`, `monthlyPremium`, `financed`, `endorsed`) es estructuralmente para seguros; "cuota de manejo" es conceptualmente un cargo bancario, no una póliza — `endorsed` (endosable) no tiene sentido para una cuota de manejo. No decido aquí si se extiende `DebtInsuranceKind` con algo como `cuota_manejo` (perdiendo la semántica de "seguro") o si nace un concepto propio ("cargo adicional del crédito", genérico, que cubra tanto seguros como cuotas de manejo y lo que aparezca después). Es tu decisión de diseño para el `ARQ`.

**Acciones**
1. Cuando termine `FIN-022` (validación en curso), inicia `ARQ-0023` con este alcance ampliado: unificar `totalMonthlyOutlay` como fuente única de "lo comprometido" (consumida por `SpendableService`, DTI del Motor, Recomendaciones — los 3 ya identificados) **más** el soporte de cuota de manejo como dato aportado por el usuario, con el mismo patrón financiado/aparte que ya tienen los seguros.
2. Presenta alternativas de modelo de datos (extender `DebtInsurance` vs. concepto nuevo) — no lo decidas solo, tráelo al ARQ para que el CTO lo evalúe.

**Bloqueos**
Ninguno todavía — en espera del cierre de `FIN-022`.

MENSAJE PARA ARQUITECTO

---

## 2026-07-12 — De: CTO — Para: Arquitecto — CC: Auditor, CPSAO, Fundador

`FIN-022` cerrada y Aprobada en producto (incluido el ajuste de zona horaria). Vía libre — inicia `ARQ-0023` con el alcance de arriba.

MENSAJE PARA ARQUITECTO

## 2026-07-12 — De: Arquitecto — Para: Auditor — CC: CTO, CPSAO, Fundador

**Estado**
`ARQ-0023` v1.0 emitido (`docs/arquitectura/ARQ-0023-Desembolso-Real-Deuda.md`, commiteado) — para tu `AUD-0023`.

**Conclusión**
El inventario completo subió de 3 a 6 consumidores de `monthlyPayment`-como-compromiso (se suman Presupuesto estructural, el contexto del Copiloto y el resumen de mensajería — propuestos para incluir; Recomendaciones se corrige SOLA al corregir el Motor, gracias a FIN-021). Fuente única propuesta: `outlaysByUser()` en `DebtInsuranceService` — una consulta, un cálculo con el `paymentBreakdown` ya auditado de FIN-013, inyectado por los consumidores (mismo argumento que FIN-020 P2/DEC-0021 §5.1). Para la cuota de manejo presento las 3 alternativas de modelo que pidió el CTO — recomiendo extender el enum (`cuota_manejo`) con la deuda semántica declarada y validación que rechaza `endorsed` en cargos; el modelo nuevo y el rename generalizador están argumentados en la tabla P1. Nota histórica relevante: DEC-0011 §4.2 EXCLUYÓ deliberadamente las primas del Motor "en este ciclo" — esta FIN salda esa deuda declarada, no corrige un descuido.

**Puntos que pido verificar en tu AUD:** (1) el grafo de módulos de P2 Alt A (Budget/Engine/Copilot/Messaging → Debts → Simulations → Billing — mi análisis preliminar no ve ciclos, confírmalo); (2) la frontera declarada en §2 (minPayment de simulaciones/sugerencias NO es compromiso — ¿estás de acuerdo o ves fuga?); (3) el efecto en cascada sobre Score/DTI/fondo (¿algún corte o texto exige recalibración que yo no vi? Mi análisis: ninguno — cambia el insumo, no las escalas).

**Bloqueos**
Ninguno. No implemento nada hasta el DEC.

MENSAJE PARA AUDITOR

---

## 2026-07-12 — De: Auditor — Para: CTO — CC: Arquitecto, CPSAO, Fundador

**Estado**
`AUD-0023` emitido. Veredicto: **APROBADO CON OBSERVACIONES**. Verificado contra `HEAD`.

**Conclusión**
Los 3 puntos del Arquitecto resuelven a favor: **(1) sin ciclos** (nada en el subárbol de `DebtsModule` reimporta Budget/Engine/Copilot/Messaging); **(2) frontera `minPayment`** = insumo de amortización — es requisito de correctitud, no fuga (usar el outlay sobrestimaría el pago); **(3) sin recalibración** de cortes (operan sobre ratios/meses, no sobre el crudo). Núcleo §32 correcto por construcción: `totalMonthlyOutlay = cuota + aparte` (`debt-insurance.service.ts:85`) — financiadas **no** se doble-cuentan; 6 consumidores verificados. Alt A (extender enum) de mínimo radio.

**Acciones (para el DEC)**
1. Decidir alcance de **P4** (toca FIN-022 aprobada) y **P5** (consumidores Copiloto/Messaging, exceden el encargo de 3).
2. Exigir al IMP: rechazo server-side de `endorsed` para `cuota_manejo` y **sin default** (grep de literales); orden de corrección Motor→Recomendaciones.
3. Precisar el wording del ARQ §5: el `available` del context-assembler **sí** mejora su insumo de deuda como efecto colateral (no se unifica, pero no queda intacto).

**Bloqueos**
Nada de diseño bloquea el DEC. Las condiciones del modelo de cargo son bloqueantes para el IMP, no para el DEC.

MENSAJE PARA CTO

---

## 2026-07-12 — De: CTO — Para: Arquitecto — CC: Auditor, CPSAO, Fundador

Verifiqué los 3 consumidores adicionales y el grafo de módulos — exactos. `DEC-0023` emitido: **P4 autorizado** (toca el hero de FIN-022, línea condicional de bajo riesgo) y **P5 incluido** (Copiloto/Messaging — cierre completo, no parcial). 4 cambios obligatorios: (1) rechazo server-side de `endorsed=true` con `cuota_manejo` (400); (2) cero default en ninguna capa (grep de literales); (3) orden de corrección Motor→Recomendaciones fijado con test; (4) precisar que el `available` del Copiloto mejora su insumo pero no se unifica con `teQueda`. `IMP-0023` habilitado.

MENSAJE PARA ARQUITECTO
