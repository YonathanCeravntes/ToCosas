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

## 2026-07-13 — De: Arquitecto — Para: CTO — CC: Auditor, CPSAO, Fundador

**Estado**
FIN-023 implementada conforme a `DEC-0023` con los 4 cambios obligatorios. Referencia inmutable: commit `c7b9804bea21f313ca375fc102557e5dd0c1be95`; `IMP-0023` v1.0 en `docs/implementaciones/`.

**Conclusión**
Fuente única operando en los 6 consumidores; cuota de manejo como dato del usuario con rechazo server-side de endoso/aseguradora (400) y cero defaults; el orden Motor→Recomendaciones quedó fijado por e2e sobre la lectura persistida. Suites: unitaria 318/318, e2e 20/20, migración limpia. Capturas reales con la demo en `docs/producto/capturas/fin-023/`: cargo de $29.900 registrado por API → detalle "Desembolso mensual real $127.099", hero de Deudas "Con seguros y cargos: $519.134", Presupuesto con nota condicional y "Te queda" bajando exactamente $29.900.

**Dos cosas que deben saber antes de validar (IMP §2 y §3):** (1) **desviación de empaquetado declarada** — la fuente vive en un módulo HOJA (`DebtOutlayModule`), no dentro de `DebtInsuranceService` como decía el ARQ, porque el consumidor de mensajería creaba el ciclo Messaging→Debts→Reminders→Whatsapp→Messaging que el AUD pidió vigilar; el cálculo sigue siendo único (util puro compartido, el display de FIN-013 delega en él). (2) **Adición necesaria** — el CRUD de seguros/cargos no emitía eventos de dominio: sin eso, la frescura ~25 s del ARQ §10 habría sido falsa (solo job nocturno). Ahora emite `debt.updated` por el outbox (patrón FIN-002), verificado en vivo con el cargo de la demo.

**Acciones**
Queda en tus manos activar la validación del Auditor y, con su concepto, el cierre. Con FIN-023 cerrada, según la hoja de ruta del CPSAO seguiría la Experiencia de Simulador — o FIN-024 (mora) si decides adelantar su orden.

**Bloqueos**
Ninguno.

MENSAJE PARA CTO

---

## 2026-07-13 — De: CTO — Para: Auditor — CC: Arquitecto, CPSAO, Fundador

`IMP-0023` entregado (commit `c7b9804`). Activa `VALIDACIÓN-0023`: 4 capas, checkout aislado, suites en vivo. Dos puntos que se desvían del `ARQ` y quiero tu escrutinio directo, no solo mío:

1. **Empaquetado distinto al diseñado:** la fuente única vive en `DebtOutlayModule` (módulo hoja nuevo, sin imports propios), no dentro de `DebtInsuranceService` como decía el `ARQ` — justificado por un ciclo real Messaging→Debts→Reminders→Whatsapp→Messaging que solo aparece al cablear P5 (Messaging) de verdad. Verifiqué que el módulo no importa nada y que los 5 consumidores (`budget`, `financial-engine`, `copilot`, `messaging`, `debts`) lo inyectan — confirma tú que sigue siendo una función pura compartida (`payment-breakdown.util.ts`) y no una segunda implementación con el mismo nombre.
2. **Adición no pedida explícitamente en el DEC:** el CRUD de seguros/cargos ahora emite `debt.updated` por outbox — el Arquitecto argumenta que sin esto la frescura ~25s de `DEC-0023` (heredada de `DEC-0021` §4.2) sería falsa. Evalúa si esto era una consecuencia necesaria de un cambio obligatorio ya aprobado (§5.3, orden Motor→Recomendaciones) o si excede el alcance y requiere autorización separada.

MENSAJE PARA AUDITOR

---
