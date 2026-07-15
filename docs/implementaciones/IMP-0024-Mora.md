# IMP-0024 · Mora de deudas — visibilidad y conciliación (iteración 1)

- **Versión:** 1.0
- **Fecha:** 2026-07-13
- **Autor:** Agente Arquitecto/Desarrollador
- **Estado:** Entregado — para VALIDACIÓN del Auditor y posterior cierre del CTO
- **Historial de cambios:**
  - v1.0 (2026-07-13) — emisión tras DEC-0024 (P1/P2/P3 + cambio obligatorio §5).
- **Módulo/Feature:** FIN-024 · **Origen (§27):** Dominio diferido 3 veces,
  activado por el CPSAO
- **Documentos base:** `ARQ-0024` v1.1 · `AUD-0024` · `DEC-0024` ·
  `COMPRENSION-FIN024-Mora.md`
- **Referencia inmutable (regla GOBERNANZA):** commit
  **`faebc2a57eb86acd45244a836b4f6e6c54a92aa2`**

## 1. Resumen

El bug fundacional está muerto: el cron de recordatorios ya no escribe NINGUNA
fecha (ni `debt.nextDueDate` ni `reminder.dueDate` — el cambio obligatorio del
DEC §5 completo) y evalúa el disparo contra la fecha real de la deuda. Con la
fecha por fin confiable, la mora es visible y accionable: "⏰ venció hace N
días" en la lista y bloque de conciliación en el detalle, con copy que afirma
solo lo observable. Score, Salud y SpendableService no aparecen en el diff.

## 2. Cumplimiento (DEC-0024)

| Pieza | Implementación | Verificación |
|---|---|---|
| **P1 + §5 (ambas escrituras)** | `dispatchDue`: el bloque de roll mensual desapareció por completo — el update del recordatorio queda en `{ lastSentAt }` a secas; para `debtId != null` la fecha evaluada es `debt.nextDueDate` (join) y `reminder.dueDate` queda documentado como LEGADO; deuda saldada (`nextDueDate` null) → no dispara; recordatorios manuales intactos | Spec de dispatch (4 casos: no escribe con vencimiento hoy, calla con vencida, salda→silencio, manual igual); grep: `debt.update` no existe en reminders |
| P1 bonus verificado | El recordatorio ya no avisa cuotas YA CUBIERTAS: al pagar, FIN-018 adelanta la fecha y el dispatch la lee directo (antes usaba la copia desincronizada) | Caso 1 del spec: dispara contra la fecha real aunque `reminder.dueDate` esté meses atrás |
| P2 helper único | `overdue.util.ts` — fechas puras en medianoche UTC (lección FIN-022); consumido por list, detalle y summary; frontend solo PINTA | Caso a mano (ayer=1, 12 días, hoy/futuro/null → null, inmunidad de zona horaria); e2e 12 días en las 3 superficies |
| P2 UI | Lista: "⏰ venció hace 12 días" (naranja `warning`, no rojo — §29.2); detalle: bloque de conciliación "No hay un pago registrado… regístrala para que tus números digan la verdad" + "✅ Registrar el pago →" (salta a Registrar) + referencia al abono ya existente | Capturas antes/después con mora REAL |
| Copy §13.4 | Nunca afirma impago: "No hay un pago registrado para esta cuota" (hecho observable), la salida digna primero | Revisión de texto en captura |
| P3 | Sin cambios en Score/Salud/SpendableService (semilla del indicador de mora registrada en ARQ §4.3) | Diff del commit |

## 3. Suites y criterios (ARQ-0024 §13)

- Unitaria **326/326** (+8). E2E **23/23** (+3, mora real contra BD).
- §13.1 ✓ (dispatch sin escrituras + grep: los únicos escritores de
  `nextDueDate` son la creación de deuda y el flujo de pago FIN-018) · §13.2 ✓ ·
  §13.3 ✓ (`capturas/fin-024/`: antes con "(ya pasó)" plano, después con estado
  y bloque; el crédito al día se ve idéntico — regresión visual) · §13.4 ✓ ·
  §13.5 ✓ · §13.6 ✓ (ARQ §5). `tsc` limpio en ambos lados.

## 4. Juicio razonado

**¿Milla habla ahora cuando más cuesta su silencio? Sí:** la usuaria de mora ve
"⏰ venció hace 12 días" donde antes había un "(ya pasó)" mudo, y al entrar al
detalle recibe el diagnóstico honesto con las dos salidas (conciliar o abonar)
— sin regaño, sin números inventados. Y lo estructural: la fecha de vencimiento
tiene UN dueño; el sistema ya no se miente a sí mismo avanzándola sin pago.

**Reservas honestas:** (1) el CTA "Registrar el pago" lleva a Registrar SIN
preseleccionar la deuda (la pantalla de Registrar no recibe params hoy —
mejora pequeña anotada para FIN-025 o un ajuste de producto); (2) tras el
vencimiento el recordatorio calla por diseño (FIN-025 lo cubre); (3) el "antes"
de la captura muestra el estado con el fix de P1 aún sin cron corrido — en
producción, con el cron viejo activo, la mora se habría OCULTADO sola: la
diferencia real antes/después es mayor que la visual; (4) impacto retroactivo:
usuarias con fechas viejas verán números grandes el primer día — el copy de
conciliación es la mitigación (AUD §3).

## 5. Para la validación

- Reproducir: `npx jest` (326) · `npm run test:e2e` (23, docker) · greps §3.
- Capturas: `docs/producto/capturas/fin-024/` (usuaria `demo.mora@millo.test`,
  mora real creada por API + fecha retro vía BD — patrón del e2e de FIN-018).
- Checkout aislado sobre el commit de referencia.
