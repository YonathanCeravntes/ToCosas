# ARQ-0037 · Profundidad bancaria real por modalidad — progresiva y Beta-guiada (P4 del EOC)

- **Versión:** 1.0
- **Fecha:** 2026-07-16
- **Autor:** Agente Arquitecto
- **Estado:** Emitido — para validación/decisión del CTO (§36.2, `DEC-ORG-001`)
- **Historial de cambios:**
  - v1.0 (2026-07-16) — P4, última FIN de la secuencia 035→036→037; priorizada por el Fundador.
- **Módulo/Feature:** FIN-037 (P4 de DEC-0033) · **Origen (§27):** Visión del Fundador +
  semilla de producto del CPSAO (visto FIN-032) · Prioridad Media (priorizada hoy)
- **Documentos base:** `DEC-0033` §3/§4 · `CIERRE-0032/0034/0035/0036` · semilla del CPSAO
  ("el gota a gota/informal es el PRIMERO en recibir la lectura honesta de su costo real",
  BACKLOG FIN-033→037) · GOBERNANZA §29.2/§31/§32/§42

## 0. Observación de frontera (NO toca Registrar en este alcance)

Las dos primeras profundidades (lecturas, §4) son **display-only sobre datos ya registrados** —
no tocan `transactions.service` ni el flujo de Registrar. Los **eventos** bancarios futuros que
sí lo toquen (p. ej. capturar una compra internacional al registrarla) **disparan la instrucción
permanente del Fundador** y se diseñan con sus observaciones primero — así queda declarado en la
disciplina de intake (§5). Si el IMP-0037 necesitara tocar Registrar, me detengo y aviso.

## 1. Objetivo — y el reencuadre que evita construir 50 eventos de golpe

P4 es **profundidad progresiva**: que cada modalidad se comporte como en la vida real —sobrecupo,
avances, retanqueo, gracia, notas crédito— **cuando un usuario real lo topa**, no los ~50 eventos
de las 19 modalidades por adelantado. El deliverable de esta FIN no es "todos los eventos": es
**(a) el mecanismo** por el que una profundidad entra por configuración, **(b) la disciplina de
intake Beta-guiada**, y **(c) las primeras profundidades ya priorizadas** que prueban el patrón.

## 2. Qué hay priorizado HOY (Beta-guiado real, no especulación)

- **La semilla del CPSAO (trasladada explícitamente a FIN-037 en el BACKLOG):** el **gota a gota /
  préstamo informal** es el **primero** en recibir una **lectura honesta de su costo real**
  (§29.2). Es la única priorización de producto registrada — se honra primero.
- **Sobrecupo visible** (tarjeta/fintech): deriva de números que `CardService` ya computa
  (`usedAmount`/`creditLimit`) — costo casi cero, valor inmediato para el producto más común de
  la Beta, y sirve como **segunda fila de config** que prueba el mecanismo.
- Todo lo demás (avances, retanqueo, gracia, notas crédito, compras internacionales…) queda en la
  **cola de intake** (§5): entra cuando un usuario Beta lo tope, priorizado por el Fundador.

## 3. Diseño del mecanismo — dos clases de profundidad

### 3.1 · LECTURAS de profundidad (derivadas, siempre encendidas) — lo que entra en IMP-0037

Una **lectura** es un derivado honesto sobre datos ya registrados, sin mutación. Mecanismo:

- **Config:** `depthReadings: DepthReadingKind[]` en `PRODUCT_TYPE_DESCRIPTORS` (la única
  autoridad de tipo) — qué lecturas aplican a cada modalidad. Agregar una lectura a una modalidad
  = **una fila** (test de config-sin-código).
- **Una sola autoridad (§32):** un servicio hoja `DepthReadingService` computa TODAS las lecturas
  **componiendo fuentes/funciones puras existentes** — cero recálculo por pantalla. Se expone en
  la respuesta del detalle (`GET /debts/:id → depthReadings[]`); la UI solo renderiza.
- **§29.2:** el copy informa sin culpar; **Independencia:** no recomienda contratar nada.

**Lectura 1 (la semilla) — costo real del informal (`gota_a_gota`/`prestamo_familiar`):** con la
tasa pactada declarada (opcional en el alta), compone `toMonthlyEffectiveRate` (función pura
FIN-012 — cero fórmula nueva) sobre el saldo: *"De tu cuota de $150.000, ~$X son interés este mes
y ~$Y bajan tu deuda."* Dos bordes honestos: **sin tasa declarada** → invita a declararla para ver
el costo (no inventa cifra); **cuota ≤ interés mensual** → la verdad brutal sin juicio: *"Tu cuota
no alcanza a bajar el saldo — a este ritmo la deuda no termina. Cada peso extra sí lo baja."*
(puente a la jugada de abono, ya existente).

**Lectura 2 — sobrecupo (`tarjeta_credito`/`fintech`):** si `usedAmount > creditLimit` (ambos ya
derivados por `CardService`): *"Estás usando $X por encima de tu cupo — los bancos suelen cobrar
un cargo por esto."* Aviso, no juicio (patrón mora FIN-024).

### 3.2 · EVENTOS de profundidad (mutaciones iniciadas por el usuario) — el patrón, NO el catálogo

Un **evento** (avance, retanqueo, nota crédito, gracia) muta el modelo. El ARQ fija el patrón para
cuando cada uno entre (por intake §5), sin implementarlos por adelantado:
- **Config primero:** el evento se declara por modalidad (qué eventos acepta cada tipo), nunca una
  rama por tipo en el flujo.
- **Handler hoja** que reusa la maquinaria existente (p. ej. un avance en efectivo ≈ el path de
  `CardPurchase` con interés; un abono extraordinario de hipoteca **ya existe** — FIN-012 prepay).
- **Nivel de confirmación por el modelo de DEC-0030 §5:** hecho directo (un avance que el usuario
  registra) = nivel 1 (commit+acuse+deshacer); **modificación de datos no ingresados** (retanqueo,
  refinanciación, cambio de condiciones) = **nivel 2** (confirmar antes de cometer) — el escenario
  que FIN-035 dejó reservado.
- **§42:** cada evento declara su política de reversión ANTES de entrar (el patrón §4.5 de
  FIN-031: limpio sin dependientes; bloqueado + ruta de corrección con ellos).

### 3.3 · Alternativa rechazada — el framework genérico de eventos por adelantado

Modelar ya un `ProductEventDescriptor` genérico con los ~50 eventos tipados sería diseñar sobre
especulación (exactamente lo que DEC-0033 §3 prohíbe: "no los ~50 eventos por adelantado") y
violaría §31 (cero valor hasta que un usuario tope el evento). El mecanismo de §3.1/§3.2 + el
intake de §5 dan la misma extensibilidad con evidencia, no promesa.

## 4. Alcance del IMP-0037 (acotado)

**Dentro:** `depthReadings` en el descriptor (config) · `DepthReadingService` (hoja, §32) · las
**2 lecturas priorizadas** (costo real del informal + sobrecupo) · su UI en el detalle de deuda ·
la **disciplina de intake** documentada (§5) · tests (config-sin-código, §32, §29.2, bordes).
**Fuera (declarado):** cualquier evento mutador (avance/retanqueo/nota crédito/gracia — entran por
intake, cada uno con su mini-ciclo); tocar Registrar; habilitación real de IA; nivel 2 (no hay
modificación de datos no ingresados en las 2 lecturas — son display-only).

## 5. La disciplina de intake Beta-guiada (cómo entra el resto, sin reabrir FIN-037)

1. Un usuario Beta topa una necesidad real (o el Fundador la prioriza) → se registra como
   **candidata** en el BACKLOG (título + modalidad + qué decide el usuario con ella).
2. El Fundador prioriza (Paso 1, `DEC-ORG-001`); el CTO abre el mini-ciclo del evento.
3. El evento entra como **config + handler hoja** con su política de reversión y su nivel de
   confirmación declarados — **sin rediseñar el flujo ni crear formularios nuevos** (obs. 9 del
   Fundador). Si toca Registrar → instrucción permanente (observaciones del Fundador primero).
4. La **Revisión Integral de Producto** (tras 035/036/037, ya prevista en BACKLOG) consume esta
   cola como insumo.

## 6. Respuesta al filtro §31

Sin FIN-037, el gota a gota —el producto más brutal del mercado informal colombiano— se ve en
Milla igual que un préstamo cualquiera: saldo y cuota, sin que la usuaria vea que su cuota apenas
cubre el interés. **Valor diferencial:** la lectura honesta que ningún banco le va a dar ("de tu
cuota, esto es interés y esto baja tu deuda — y si no alcanza, te lo digo sin rodeos"), y el
sobrecupo visible antes del cargo sorpresa. Ninguna FIN previa lo da: FIN-032 representó el
informal sin fecha falsa; esta le pone la verdad del costo encima. Y el mecanismo deja el resto
de la profundidad entrando por config, no por rediseño.

## 7. Componentes

Backend: `depthReadings` en `PRODUCT_TYPE_DESCRIPTORS` (config); `depth-reading.service.ts`
(hoja, compone `toMonthlyEffectiveRate` + los derivados de `CardService`); `depthReadings[]` en la
respuesta de `debts.findOne`. Frontend: la tarjeta de lectura en `DebtDetailScreen` (render puro).
Tests: unit del servicio (informal con/sin tasa, cuota ≤ interés, sobrecupo, config-sin-código);
e2e (lecturas en el detalle por API); grep §32 (lecturas SOLO en el servicio hoja); copy §29.2.

## 8. Base de datos

**Ninguna.** Las lecturas derivan de campos existentes (`currentBalance`, `monthlyPayment`,
`interestRate`, `rateBasis`, cupo/saldo derivados). Cero columnas, cero migración.

## 9. Backend

Cero fórmula financiera nueva: `toMonthlyEffectiveRate` (FIN-012) y los derivados de FIN-031.
La única pieza nueva es la **composición** en un lugar único (§32) y su copy honesto.

## 10. Uso de IA

Ninguno. Lecturas deterministas. Gate DPA+PIA intacto.

## 11. Riesgos

- **La lectura degenerando en juicio** (viola §29.2): copy revisado como criterio — informa el
  costo, jamás culpa ("no seas irresponsable" prohibido); test de copy.
- **Un 2º lugar recalculando la lectura** (viola §32): grep de cierre — la lectura solo existe en
  `DepthReadingService`.
- **Especulación de eventos** (viola DEC-0033): mitigado por §3.3/§5 — ningún evento entra sin
  usuario real o priorización del Fundador.
- **Tasa no declarada en el informal:** no se inventa cifra; se invita a declararla (degradación
  honesta).

## 12. Dependencias

FIN-012 (`toMonthlyEffectiveRate`), FIN-031/032 (derivados de tarjeta + descriptor), FIN-024
(patrón de aviso sin juicio). Ninguna nueva. NO depende de Registrar.

## 13. Criterios de aceptación

1. **La semilla, cumplida:** un gota a gota con tasa declarada muestra su lectura de costo real
   (interés vs capital de la cuota); con cuota ≤ interés, la verdad brutal sin juicio; sin tasa,
   la invitación honesta (tests + captura).
2. **Sobrecupo visible** cuando `usedAmount > creditLimit` (test + captura).
3. **Config-sin-código:** agregar una lectura a una modalidad = una fila del descriptor (test).
4. **§32 (grep):** las lecturas SOLO en `DepthReadingService`; cero recálculo por pantalla; cero
   fórmula nueva (composición de funciones puras existentes).
5. **§29.2/Independencia:** copy que informa sin culpar ni recomendar contratar (revisión + test).
6. **Disciplina de intake documentada** (§5) y cola de candidatas en BACKLOG. NO toca Registrar.
   Suites + typecheck + capturas. Filtro §31 (§6).

## 14. Plan

1. Validación/decisión del CTO (`DEC-ORG-001`) → **DEC-0037** → 2. `depthReadings` en el
   descriptor + `DepthReadingService` (hoja) → 3. lecturas 1 y 2 + UI en el detalle → 4. tests +
   capturas + cola de intake en BACKLOG → 5. **IMP-0037** con SHA y juicio razonado → validación
   del CTO → cierre de la secuencia 035→036→037 → **Revisión Integral de Producto** (Fundador).
