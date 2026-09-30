# Comprensión del problema · FIN-024 (Mora de fijos y deudas)

- **Versión:** 1.0
- **Fecha:** 2026-07-13
- **Autor:** Agente Arquitecto
- **Estado:** Entregado — para evaluación del CTO y el CPSAO (requisito previo a ARQ-0024)
- **Historial de cambios:**
  - v1.0 (2026-07-13) — respuesta a las 5 preguntas, verificada contra código real.

---

## Verificación previa contra el código (lo que existe HOY)

**La asimetría central — la mora solo es observable en deudas, no en fijos:**

- **Deudas:** el pago SÍ se observa (`pago_deuda` → `nextDueDate` avanza a la
  próxima ocurrencia futura, atómico — FIN-018). Por tanto `nextDueDate < hoy`
  significa "la cuota del periodo no está registrada": señal fuerte de mora,
  con una sola ambigüedad honesta (pagó por fuera y no lo registró). Los "meses
  de atraso" son derivables (la lógica de catch-up de FIN-018 ya los calcula al
  pagar: `months_behind`).
- **Fijos:** NO hay vínculo pago↔fijo (`Transaction` no tiene `fixedItemId` —
  mejora registrada en ARQ-0020 §4.1-bis). "Ya pasó su fecha" es TODO lo que se
  puede afirmar; distinguir "vencido sin pagar" de "pagado sin conciliar" exige
  la conciliación, que es un proyecto en sí mismo.

**Hallazgo fundacional (nuevo, crítico para esta FIN):** el cron diario de
recordatorios (`reminders.scheduler.ts:16` → `dispatchDue`,
`reminders.service.ts:158-172`) **avanza `debt.nextDueDate` un mes al llegar el
día de vencimiento, se haya pagado o no** — código de FIN-002, anterior a
FIN-018. Consecuencias verificables: (a) dos escritores de `nextDueDate` con
semánticas OPUESTAS ("avanza al pagar" vs "avanza al vencer") — la clase de
conflicto que §32 prohíbe, aplicada a una fecha; (b) con el cron activo, la
fecha nunca queda en el pasado ⇒ **la mora sería estructuralmente indetectable**
y el "venció el {fecha}" de FIN-022 P4 casi nunca aparecería; (c) el
recordatorio de una cuota NO pagada se silencia solo (avanza y no insiste).
Cualquier diseño de mora empieza por resolver este conflicto.

**Lo que ya existe y esta FIN puede conectar:** recordatorios pre-vencimiento
(offsets 3/1/0 días, push/WhatsApp/Telegram, con presupuesto de 2/día — FIN-007
§4.5); insights del Motor con dedupe y severidad (FIN-006); la etiqueta neutra
de FIN-022 P4; `AmortizationEntry.paidAt` (concilia cuotas pagadas); el patrón
"acción visible donde hay dolor" (FIN-019). **Lo que NO existe:** ningún camino
post-vencimiento (ni aviso, ni insight, ni estado visible de "hace N días");
ningún indicador de mora en Score/Salud (FIN-004 cerró con 3 indicadores).

**Frontera ya decidida que se respeta:** `SpendableService` §4.1-bis no cambia
(el CTO lo fijó en la apertura): mora es INFORMAR, no recalcular lo comprometido.

## Las 5 preguntas

### 1 · ¿Qué problema cotidiano intenta resolver realmente?

**"¿Se me pasó algo?" — la pregunta que hoy nadie responde.** La app conoce
todas las fechas, avisa ANTES del vencimiento… y después se calla para siempre.
El día después de un vencimiento sin pago es exactamente cuando el costo crece
(interés de mora, cobros, reporte a centrales) y cuando la app tiene su única
oportunidad de evitarlo barato. El problema no es calcular la mora — es que el
producto la conoce y no la dice.

### 2 · ¿Por qué merece FIN propia y no es una pieza de Deudas?

Porque es un DOMINIO transversal con una condición previa técnica: (a) toca
deudas Y fijos, y sus superficies naturales son varias (lista de Deudas,
Presupuesto, quizá Inicio/notificaciones); (b) exige resolver el conflicto de
escritores de `nextDueDate` (hallazgo de arriba) — un cambio de semántica del
Motor de recordatorios, no un retoque de pantalla; (c) fue diferido TRES veces
justamente porque mezclarlo con otra FIN lo habría hecho mal.

### 3 · ¿Qué cambia en la capacidad de decisión del usuario?

Hoy: se entera de la mora por el banco (cobro, llamada, reporte). Después:
**se entera por Milla al día siguiente, con la acción correcta al lado** —
"esta cuota venció hace 3 días: si ya la pagaste, regístrala; si no, esto es lo
que te cuesta cada día / abónale ya". La ambigüedad honesta (pagó sin registrar)
se convierte en CTA de conciliación, no en acusación — coherente con "el rojo
no culpa" (§29.2, FIN-020).

### 4 · ¿Qué error común evita?

Dos de plata y uno de datos: (a) **pagar tarde por olvido** — el más caro por
peso de descuido que existe (mora + reporte); (b) **normalizar el atraso** —
sin un "hace N días" visible, una cuota vencida se ve igual que una por vencer;
(c) **el error de higiene** que hoy nos causamos solos: quien pagó por fuera y
no registró ve fechas viejas sin que nadie le pida conciliar — y el Score/las
cifras trabajan con datos falsos.

### 5 · ¿Qué perdería el usuario si esta capacidad no existiera? (anticipo §31)

**El copiloto en el momento de mayor riesgo.** Toda la promesa de Milla es
"decidir a tiempo": sin mora visible, la app acompaña muy bien mientras todo va
bien y guarda silencio exactamente cuando más cuesta el silencio. Ninguna otra
experiencia puede absorberlo: Deudas muestra el contrato, Presupuesto el ciclo,
Salud las causas — nadie dice "esto YA se venció, haz esto hoy". Es además la
pieza que protege la honestidad del resto: sin conciliación, las cifras
"honestas" de FIN-020/021/023 se calculan sobre pagos fantasma.

## Nota de alcance para la decisión del CTO/CPSAO (previa al ARQ)

1. **Condición previa (propongo que sea P1 del ARQ):** un solo escritor de
   `nextDueDate` — el recordatorio deja de avanzar la fecha al vencer (FIN-018
   es la semántica ganadora) y su recurrencia se deriva sin escribir en la
   deuda. Sin esto, no hay mora detectable.
2. **Iteración 1 solo visibilidad + conciliación, sin motor nuevo** ("conectar,
   no inventar"): estado derivado en lectura (`hoy − nextDueDate`) para DEUDAS,
   con CTA doble (registrar pago / abonar); los FIJOS mantienen "ya pasó su
   fecha" (su mora real exige `fixedItemId` — ¿entra la conciliación de fijos
   aquí o es FIN futura? decisión de alcance).
3. **Score/Salud:** propongo NO tocar en esta iteración (un indicador de mora
   exige cortes auditados y datos que aún no existen — mismo criterio DEC-019
   P1); registrar como semilla.
4. **Aviso post-vencimiento:** ¿un recordatorio "venció ayer" reutilizando el
   canal y el presupuesto de 2/día existentes (una extensión pequeña), o
   iteración 1 sin notificaciones (solo en pantalla)? Decisión de producto.
