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
