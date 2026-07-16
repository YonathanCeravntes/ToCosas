# ARQ-0036 · Inteligencia de actualización + confirmación mensual por corte (P3 del EOC)

- **Versión:** 1.0
- **Fecha:** 2026-07-16
- **Autor:** Agente Arquitecto
- **Estado:** Emitido — para validación/decisión del CTO (§36.2, `DEC-ORG-001` — sin AUD de tercero)
- **Historial de cambios:**
  - v1.0 (2026-07-16) — P3 del programa EOC (DEC-0033), secuencia 035→036→037.
- **Módulo/Feature:** FIN-036 (P3 de DEC-0033) · **Origen (§27):** Visión del Fundador ·
  Prioridad Alta
- **Documentos base:** `DEC-0033` §3/§4 (alcance + transversales) · `DEC-0030` §5 / `DEC-0035`
  (dos niveles de confirmación) · `CIERRE-0035` (`8cdaef8`) · FIN-029 (motor único) ·
  `PRODUCT_VISION.md` §7 ("calmada, no ansiosa") · GOBERNANZA §32/§42

## 0. Observación de frontera — NO toca Registrar (declarado explícitamente)

Verifiqué el radio antes de diseñar: FIN-036 **no toca `transactions.service` ni el núcleo de
Registrar**. Una confirmación mensual **actualiza un campo de `Debt`** (cuota de manejo, cupo,
tasa) por la vía de actualización de deuda ya existente (`debts.service.update`), y **pregunta por
el motor conversacional único** (`ConversationService`, FIN-029). Ninguna de las dos es
`transactions.service`. Por tanto **no dispara la instrucción permanente del Fundador** (Paso 5,
`DEC-ORG-001`). Si en el IMP apareciera una necesidad nueva sobre Registrar, me detengo y aviso.

## 1. Objetivo

Que Milla mantenga el modelo **al día en el tiempo** —cuota de manejo que subió, cupo que
cambió, tasa variable que se movió— **preguntando solo ante señal real** y **nunca por rutina**
sobre lo que no cambia ("calmada, no ansiosa"). Es la inteligencia de actualización que el
Principio Rector (DEC-0033 §2) pide: la riqueza vive en el modelo a lo largo del tiempo.

## 2. Comportamiento DÍA-1 (sin asumir cadencia madura de Registrar) — el punto que el CTO exigió

`FIN-035` cerró hace un día; **no hay historial de uso**. FIN-036 **no depende de patrones de
uso**: se dispara por una **señal determinista que cada producto ya conoce desde su alta** — su
**fecha de corte/pago** (`paymentDay`/`nextDueDate`) — y por la **política de actualización de su
modalidad** (config). Concretamente, el día 1:

- **Sin datos de uso, funciona igual:** una deuda recién creada ya tiene (si el usuario la dio)
  su fecha de corte; al llegar esa fecha, y **solo entonces**, se evalúa si su modalidad tiene
  algún campo marcado "preguntar al corte" y aún no congelado. Nada depende de "cuánto usa
  Registrar".
- **Señal mínima antes de activarse:** la confirmación **no** se dispara al abrir la app ni por
  antigüedad de la cuenta; se dispara por el **evento de corte** (determinista). Si una deuda no
  tiene fecha de corte, no hay confirmación (degradación con gracia).
- **Escasez de datos = silencio, no ruido:** con una sola deuda y cero historial, a lo sumo se
  pregunta **una** cosa en su corte, y solo si su modalidad lo declara. Un usuario nuevo no recibe
  una avalancha "¿cambió esto? ¿y esto?".

No se diseña sobre "el usuario ya lleva meses registrando"; se diseña sobre "cada producto sabe su
fecha de corte desde que se creó".

## 3. Diseño

### 3.1 · Política de actualización por modalidad (config-sin-código — extiende el descriptor)

Se extiende `PRODUCT_TYPE_DESCRIPTORS` (FIN-032, la única autoridad de tipo) con una tabla
declarada `updatePolicy`: por cada campo revisable, **cuándo** se pregunta:

```
updatePolicy: [
  { field: 'managementFee', label: 'la cuota de manejo', cadence: 'al_corte' },
  { field: 'creditLimit',   label: 'el cupo',            cadence: 'al_corte' },
  { field: 'interestRate',  label: 'la tasa',            cadence: 'nunca_si_fija' | 'al_corte_si_variable' },
]
```

`cadence` ∈ **`al_corte`** (cada corte, si hay señal) · **`anual`** · **`una_vez`** (se pregunta
una vez y nunca más) · **`nunca`** (una tasa fija ya fijada no se vuelve a preguntar — calma) ·
**`auto_detectable`** (un delta numérico determinista lo detecta sin preguntar). **Agregar una
regla de modalidad = una fila** (test de config-sin-código): no toca el código de flujo. Ejemplos:
tarjeta → cuota de manejo/cupo `al_corte`, tasa fija `nunca`; hipoteca variable → tasa
`al_corte`, fija `nunca`; gota a gota → cuota pactada `al_corte`; tipos de tasa fija → tasa
`nunca`.

### 3.2 · Detector determinista "toca confirmar" (día-1, sin IA)

Un `UpdateReviewService` computa, **de forma determinista**, qué deudas tienen un campo por
confirmar: *su fecha de corte se alcanzó desde la última revisión de ese campo* **y** *la política
de su modalidad marca ese campo `al_corte`/`anual`* **y** *no está congelado* (ya respondido en
esta ventana o `nunca`). Cero heurística de uso, cero modelo — solo fechas y la tabla de config
(gate DPA+PIA intacto). Se evalúa **on-read** (cuando la app o el bot consultan) y para la entrega
proactiva se apoya en la infraestructura existente.

### 3.3 · La pregunta = otra puerta al motor único (FIN-029) + presupuesto anti-fatiga (calma)

La confirmación **no es un canal nuevo** (§32): es una **propuesta** entregada por el
`ConversationService` (FIN-029) y/o como **insight proactivo** por el `ProactivityJob` existente
(7 AM Bogotá, **≤1 por usuario/día** vía `NotificationBudgetService`, respeta `proactiveEnabled`/
`quietHours`). "Calmada, no ansiosa" **por construcción**: reusa el presupuesto de notificaciones
que ya impide la avalancha. Copy tipo: *"¿Cambió la cuota de manejo de tu tarjeta X este mes?
Estaba en $Y."* — informa, **no recomienda** contratar nada (Independencia).

### 3.4 · La respuesta = NIVEL 2 (confirmar antes de cometer) → `debts.update` (reversible)

Cambiar un dato que el usuario **no ingresó** (cuota/cupo/tasa) es **nivel 2** (DEC-0030 §5 /
DEC-0035): la propuesta se **confirma antes de aplicar**. Al confirmar, el nuevo valor se escribe
por `debts.service.update` (campo existente — **cero fórmula nueva**, §32) y el Motor recomputa
por el listener ya construido. **Reversible:** se guarda el valor anterior, y "no cambió" congela
el campo hasta el próximo corte. Nunca un cambio silencioso (§42: propuesto → confirmado →
reversible).

### 3.5 · Qué NUNCA se vuelve a preguntar (calma, declarado)

- Una **tasa fija** ya fijada (`cadence: 'nunca'`).
- Un campo `una_vez` ya respondido.
- Un campo ya confirmado en la ventana de corte vigente (no se repregunta hasta el siguiente
  corte).
- Un campo `auto_detectable` cuyo delta ya se observó (se actualiza sin preguntar, si el DEC lo
  aprueba; por defecto se propone).

## 4. Respuesta al filtro §31

Sin FIN-036, el modelo se congela en el momento del alta: una cuota de manejo que sube o un cupo
que cambia quedan desactualizados y "Te queda"/DTI mienten poco a poco. **Valor diferencial:**
Milla mantiene la realidad al día **preguntando lo mínimo y solo ante señal**, sin volverse el
software ansioso que interroga cada mes. Ninguna FIN previa lo da: FIN-032/034/035 construyeron el
modelo y su entrada; esta lo mantiene vivo en el tiempo sin fatigar.

## 5. Componentes

Backend: `updatePolicy` en `PRODUCT_TYPE_DESCRIPTORS` (config); `UpdateReviewService` (detector
determinista por fecha de corte); un intent de confirmación en `ConversationService` (FIN-029) +
la generación de un insight proactivo por el `ProactivityJob` existente; aplicación por
`debts.service.update` (nivel 2, con valor anterior guardado). Frontend: la tarjeta/insight de
confirmación (propuesta con "Sí, cambió a…" / "No cambió") — **sin** tocar Registrar. Tests:
día-1 (dispara por corte, no por uso), config-sin-código, §42 (propuesto/confirmado/reversible,
nivel 2), calma (no repregunta lo congelado/`nunca`), §32 (actualiza campos existentes, detección
determinista), Independencia.

## 6. Base de datos

Mínimo. La detección es on-read por fecha de corte; para "no repreguntar" (calma) se necesita
registrar **cuándo se revisó cada campo** — un `DebtFieldReview` liviano (`debtId`, `field`,
`reviewedAt`, `previousValue`) o un campo equivalente; se define en el IMP con su migración a
mano. `Debt`/`CardPurchase` y sus campos (cuota/cupo/tasa) ya existen — la confirmación los
actualiza, no crea modelo financiero nuevo.

## 7. Backend

Cero fórmula financiera nueva (§32): la confirmación escribe campos existentes por
`debts.service.update`; el recompute lo hace el `EngineListener` ya construido. El detector usa
fechas de corte (`nextDueDate`/`paymentDay`) y la tabla `updatePolicy` — determinista.

## 8. Uso de IA

Ninguno se enciende. La detección de "señal de cambio" es **determinista** (fecha de corte +
delta numérico), no un modelo — gate DPA+PIA intacto. La arquitectura queda lista para que, tras
el gate, el lenguaje natural reuse el mismo motor para responder la confirmación.

## 9. Riesgos

- **Volverse ansioso** (rompe el principio rector): mitigado por dos frenos —el disparo solo por
  corte (no por uso/apertura) y el presupuesto anti-fatiga del `ProactivityJob` (≤1/día)— + la
  regla explícita de qué nunca se repregunta (§3.5). Test de calma.
- **Asumir cadencia madura** (lo que el CTO advirtió): mitigado por el diseño día-1 (§2) —
  determinista por fecha de corte, cero dependencia de historial de uso. Test día-1.
- **Cambio silencioso** (viola §42): mitigado por nivel 2 (confirmar antes de aplicar) + valor
  anterior guardado (reversible). Test.
- **Regla por tipo colándose como código** (viola config-sin-código): mitigado por `updatePolicy`
  como tabla de config; test de que una regla nueva no toca el flujo.
- **Tocar Registrar sin querer:** mitigado — la confirmación actualiza `Debt`, no crea
  transacción; grep/declaración de que no toca `transactions.service`.

## 10. Dependencias

FIN-029 (motor conversacional), FIN-032 (descriptores), el `ProactivityJob`/`Insight` +
`NotificationBudgetService`, `debts.service.update`, el `EngineListener`. Ninguna nueva. NO
depende de Registrar (P2) más allá de lo ya compuesto.

## 11. Impacto

El modelo deja de congelarse en el alta: se mantiene al día en el tiempo, calmadamente. Habilita
P4 (profundidad por evento) sobre datos que siguen siendo verdad.

## 12. Criterios de aceptación

1. **Día-1 (condición del CTO):** una deuda recién creada con fecha de corte → antes del corte, 0
   confirmaciones; al corte, exactamente el/los campo(s) `al_corte` de su modalidad; **sin** ninguna
   dependencia de historial de uso (test).
2. **Config-sin-código:** agregar una regla a `updatePolicy` la hace disparar sin tocar el flujo
   (test que inyecta una regla y la ve en el detector).
3. **§42 nivel 2:** la actualización se **propone**, se **confirma antes de aplicar**, guarda el
   valor anterior y es **reversible**; nunca cambia en silencio (test).
4. **Calma:** un campo confirmado/`nunca`/`una_vez` no se vuelve a preguntar en su ventana (test);
   el disparo respeta el presupuesto anti-fatiga (≤1/día).
5. **§32 (grep):** la confirmación actualiza campos existentes de `Debt` por `debts.update`; sin
   fórmula nueva; detección determinista (0 imports de IA). **No toca `transactions.service`.**
6. **Independencia:** la confirmación informa, no recomienda ni presiona. Suites + typecheck +
   capturas del prompt de confirmación. Filtro §31 (§4).

## 13. Plan

1. Validación/decisión del CTO (auditoría directa, `DEC-ORG-001`) → **DEC-0036** → 2. `updatePolicy`
   en el descriptor + `UpdateReviewService` (detector por corte) → 3. intent de confirmación en
   `ConversationService` + generación de insight proactivo + aplicación por `debts.update` (nivel 2,
   valor anterior) → 4. tests (día-1, config-sin-código, §42/nivel 2, calma, §32, no-toca-Registrar)
   + capturas → 5. **IMP-0036** con SHA y juicio razonado → validación del CTO → cierre. **Fuera:**
   profundidad por evento (FIN-037), habilitación real de IA (gate DPA+PIA).
