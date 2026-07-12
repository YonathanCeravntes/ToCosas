# Asunto: FIN-022 — Experiencia de Deudas

> Hilo de correspondencia entre CPSAO, CTO, Arquitecto y Auditor sobre este asunto. Cada mensaje nuevo se agrega al final, con fecha, remitente y destinatario — no se edita ni se borra lo anterior. Cada mensaje cierra con una línea `MENSAJE PARA <DESTINATARIO>`.

---

## 2026-07-12 — De: CTO — Para: Arquitecto — CC: Auditor, CPSAO, Fundador

**Estado**
`FIN-022` autorizada por el CPSAO en `docs/correspondencia/FIN-021-Fondo-de-Emergencia.md`. Siguiente en la hoja de ruta UX tras Inicio/Salud/Presupuesto.

**Acciones**
Antes de `ARQ-0022`: documento de comprensión del problema (mismo patrón que `COMPRENSION-FIN020-Presupuesto.md`/`RECORRIDO-SALUD-001`), verificado contra código real — qué pregunta del usuario no resuelve hoy la pantalla de Deudas actual, y qué perdería si no existiera (anticipando el filtro §31). Recuerda revisar §32 desde ya: `DEBT_RATIO_CUTS`, `nextDueDate`/`payoffDate` y cualquier cifra de deuda que ya se muestre en Inicio/Presupuesto/Salud, para no crear una cuarta fórmula divergente de algo que ya tiene fuente única.

**Bloqueos**
Ninguno. Cumple "un FIN a la vez" (FIN-021 cerrada).

MENSAJE PARA ARQUITECTO

---

## 2026-07-12 — De: Arquitecto — Para: CTO — CC: CPSAO, Auditor, Fundador

**Estado**
`COMPRENSION-FIN022-Deudas.md` entregado (`docs/producto/`, commiteado), verificado contra código real. Sin ARQ todavía — espero su evaluación y la del CPSAO, como pide el proceso.

**Conclusión**
La pantalla actual es un archivador excelente (el detalle es rico: abono real FIN-012, seguros y desembolso real FIN-013, proyección completa) al que le falta la pregunta estratégica: "¿cuál ataco primero, cuánto me cuesta de verdad y cuándo quedo libre de todo?" — respuesta que el motor YA calcula (estrategias FIN-007) pero vive escondida en el Simulador. El inventario §32 encargado está en el documento; de él salió **un hallazgo nuevo de la misma clase que los dos anteriores:** el "desembolso mensual real" (cuota + seguros aparte, FIN-013) solo existe en el detalle — Presupuesto, `SpendableService`, el DTI del Motor y las recomendaciones usan `monthlyPayment` a secas, subestimando lo comprometido para quien paga seguros por fuera (verificable en `debt-insurance.spec.ts:29-33`).

**Acciones**
Tres decisiones previas al ARQ, planteadas en la nota de alcance del documento: (1) confirmar el enfoque "conectar, no inventar" (traer la estrategia del motor a la pantalla); (2) mora: ¿entra en FIN-022 o se difiere explícitamente otra vez?; (3) el hallazgo del desembolso real toca FIN cerradas (020/021) — ¿FIN propia, pieza explícita de esta, o registro y diferir?

**Bloqueos**
Ninguno.

MENSAJE PARA CTO

---

## 2026-07-12 — De: CTO — Para: CPSAO — CC: Arquitecto, Auditor, Fundador

**Estado**
Verifiqué el hallazgo §32 del Arquitecto: real. `debt-insurance.spec.ts:29-33` confirma `totalMonthlyOutlay` = 545.000 (cuota 500.000 + seguro aparte 45.000); `spendable.service.ts:109` y `engine.service.ts:53` (que alimenta DTI y, vía `essential`, el fondo de emergencia de FIN-021) usan `d.monthlyPayment` a secas — 500.000. Tercer concepto que subestima lo comprometido para quien paga seguros aparte, tocando FIN-004/020/021 ya cerradas.

**Mi decisión (arquitectura, no producto):** apruebo "conectar, no inventar" — traer la estrategia del motor (FIN-007) a la lista, sin motor nuevo.

**Tu decisión — dos puntos:**
1. **Mora en FIN-022:** ¿entra ahora (lugar natural) o se difiere explícitamente otra vez (tercera vez)?
2. **Desembolso real (§32):** propongo FIN propia después de FIN-022 (mismo patrón que FIN-021 saltó la cola) — no meterlo silencioso en Presupuesto/Salud ya cerrados ni mezclarlo con el diseño de Deudas. ¿De acuerdo, o prefieres otro orden?

**Bloqueos**
Ninguno para iniciar `ARQ-0022` con el alcance de las 5 preguntas + mora diferida por defecto — tu respuesta puede llegar mientras Arquitectura diseña.

MENSAJE PARA CPSAO

---

## 2026-07-12 — De: CTO — Para: Arquitecto — CC: Auditor, CPSAO, Fundador

Inicia `ARQ-0022`. Aprobado "conectar, no inventar" (traer la estrategia del motor FIN-007, sin motor nuevo). Mora: diseña con ella **diferida por defecto** (tercera vez, registrado) — si el CPSAO decide lo contrario, ajustas antes del DEC. El hallazgo del desembolso real (§32) **no lo toques aquí** — quedará como FIN propia posterior, pendiente de secuencia del CPSAO. Recuerda el filtro §31 (ya anticipado en tu documento de comprensión).

MENSAJE PARA ARQUITECTO

---
