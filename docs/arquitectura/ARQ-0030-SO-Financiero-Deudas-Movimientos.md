# ARQ-0030 · (Umbrella) SO Financiero Personal — Deudas por tipo + Movimientos inteligentes

- **Versión:** 1.0
- **Fecha:** 2026-07-14
- **Autor:** Agente Arquitecto
- **Estado:** Emitido (umbrella) — para validación del CTO y pase a AUD-0030 (§36.2)
- **Historial de cambios:**
  - v1.0 (2026-07-14) — emisión del umbrella tras la autorización del CTO
    (retención de Registrar levantada por el Fundador).
- **Módulo/Feature:** FIN-030 (umbrella) · **Origen (§27):** Directriz de
  producto del Fundador (Beta Técnica) · Prioridad MÁXIMA
- **Documentos base:** `docs/correspondencia/Rediseno-Modulo-Deudas.md`
  (directriz + guardarraíles A–K del CPSAO + 5 decisiones del Fundador) ·
  GOBERNANZA v3.19 §31/§32/§42 · FIN-002 (outbox) · FIN-023/022/021/020/028/029

> **Naturaleza (regla "un FIN a la vez"):** este documento es un **umbrella**.
> Define el ALCANCE, la ESPINA arquitectónica y la relación entre las
> funcionalidades derivadas — **no** el diseño técnico detallado (campos exactos
> por tipo, cada cascada) de más de una funcionalidad. Ese detalle vive en los
> ARQ individuales que el CTO derive de aquí. La única funcionalidad que este
> umbrella diseña a nivel implementable es la **Fase 1 (la espina)**, por ser el
> patrón que todo lo demás replica.

---

## 0. Observación de frontera previa (REQUISITO — el ARQ abre con ella)

Esta iniciativa entra **de lleno** en el módulo Registrar/Transacciones: el flujo
"¿cómo pagaste?" ES el flujo de registro. El Fundador ya entregó sus
observaciones vinculantes (hilo, 2026-07-14) y levantó la retención — este ARQ
las honra como criterios de aceptación (§4.6). **Compromiso operativo:** si
durante cualquier IMP derivado el diseño necesitara modificar Registrar más allá
de lo que estas decisiones autorizan, me detengo y aviso al Fundador antes de
continuar (instrucción permanente). La espina se diseña para EXTENDER Registrar
por composición (una capa de consecuencias sobre el evento que el registro ya
emite), no para reescribir su núcleo.

## 1. Intención

Que Milla deje de ser un cuaderno de gastos y sea un **Sistema Operativo
Financiero Personal**: el usuario registra un HECHO (una compra, un pago, un
préstamo) y Milla registra todas sus CONSECUENCIAS — sin re-preguntar lo que ya
sabe, sin crear duplicados, y con cada efecto **visible, explicable y reversible**
(§42). Y que entienda cada obligación como el producto real que es, no como un
molde único.

## 2. Objetivo del umbrella

1. Elevar los **productos financieros a entidad de primera clase** (de la que
   "deuda por tipo" es una vista) — selección por tipo primero, mínimo
   obligatorio + resto progresivo, extensible por esquema.
2. Introducir una **capa de consecuencias por evento** sobre el outbox de
   FIN-002: una acción del usuario → un evento → todas las consecuencias, cada
   una TRAZABLE a su causa y REVERSIBLE.
3. Hacerlo sin crear **una sola fórmula nueva** (§32): todo número (cupo, saldo,
   cuota, desembolso, "Te queda", fecha de libertad) resuelve a las fuentes
   únicas ya construidas.

## 3. Alcance

**Umbrella (define, no implementa todo):** la taxonomía de tipos (≥11), el
modelo de producto-entidad, la capa de consecuencias, el contrato de
trazabilidad/reversión, y la relación con Registrar (FIN-028) y el motor
conversacional (FIN-029). **Fase 1 (se diseña implementable aquí):** la espina
validada con **compra-con-tarjeta-de-crédito de punta a punta**.

**Fuera del umbrella (declarado):** el detalle campo-por-campo de cada uno de
los ≥11 tipos y cada cascada (van en los ARQ derivados); la confirmación mensual
(Fase final, depende de FIN-029 cerrada — ya lo está); cualquier fórmula nueva
(prohibida por §32); tocar el núcleo de Registrar más allá de las decisiones del
Fundador.

## 4. Diseño — la ESPINA (arquitectura, no catálogo)

### 4.1 · Producto financiero como entidad de primera clase

Hoy la deuda ya es una entidad rica (`Debt` + `AmortizationEntry` + seguros/cargos
de FIN-023). El umbrella la generaliza a **`FinancialProduct`** conceptual, del
que la deuda es la primera vista. Alternativas:

| | **Alt A — `FinancialProduct` como capa sobre los modelos existentes (recomendada)** | **Alt B — Modelo polimórfico nuevo que absorbe Debt/Account** |
|---|---|---|
| Qué es | Un registro de **tipo** (`ProductType` dirigido por esquema: qué campos pide, cuáles obligatorios, qué reglas/validaciones, qué consecuencias emite) + los modelos concretos que YA existen (`Debt`, `Account`, y para tarjeta: la extensión de cupo). El "tipo" es datos+esquema, no una tabla por producto | Reescribir Debt y Account bajo un supertipo `FinancialProduct` con herencia de tabla |
| Ventajas | Extensible por esquema (F): un tipo nuevo es una fila de configuración + su validador, sin migrar; cero ruptura de las 8 FIN que ya consumen `Debt`/`Account`; §32 intacto (las fuentes únicas siguen leyendo los mismos modelos) | "Puro" conceptualmente |
| Desventajas | El "producto" es una vista compuesta, no una tabla única — hay que documentar dónde vive cada pieza | Máximo radio de daño: reescribe el núcleo que 8 FIN auditadas consumen; rehace §32 desde cero — exactamente lo que el CPSAO (C) prohíbe |

**Taxonomía (≥11, nivel umbrella — los campos por tipo van en los ARQ
derivados):** el `DebtType` actual ya tiene 8 (`tarjeta_credito`,
`credito_personal`, `hipotecario`, `libre_inversion`, `vehiculo`, `educativo`,
`gota_a_gota`, `prestamo_familiar`, `otro`). Faltan por añadir: **`libranza`**,
**`compra_a_cuotas`**, **`fintech`**. Cada tipo declara en su ESQUEMA su mínimo
obligatorio (guardarraíl B — solo lo que cambia el número o el consejo) y su
progresivo opcional. Ejemplos de mínimo (ilustrativo, NO especificación):
tarjeta = cupo + tasa; hipoteca = saldo + cuota + tasa; préstamo entre personas
= monto + (interés OPCIONAL) + fecha pactada (guardarraíl D — acuerdos flexibles,
no molde bancario); gota a gota = monto + costo real, representado sin juzgar
(D + §29.2). "Otro" = nombre + monto, la válvula de escape (A).

### 4.2 · Capa de consecuencias por evento (§42 por construcción)

El corazón del "SO Financiero". Alternativas:

| | **Alt A — Consecuencias como CONSUMIDORES del outbox existente (recomendada)** | **Alt B — Orquestador imperativo que llama a cada efecto en la mutación** |
|---|---|---|
| Qué es | La acción (registrar compra) hace UNA mutación + emite UN evento rico (patrón FIN-028) con `causadoPor` (id de la acción). Los efectos (mover cupo/saldo, generar cuotas, recomputar Motor) son LISTENERS de ese evento — ya es como el Motor recalcula hoy (FIN-021/023). Cada efecto persiste su `causadoPor` para la trazabilidad (G) | La mutación llama en cadena a los 9 efectos en línea |
| Ventajas | §42 por construcción: cada consecuencia nace de un evento con causa → trazable y reversible (anular el evento origen revierte la cascada, patrón anular-pago-de-deuda de FIN-028); cero lógica financiera en la mutación (misma disciplina DEC-0028 §5.1); la cascada no puede "coincidir hoy" y divergir mañana | Menos piezas |
| Desventajas | Frescura ~25 s en los efectos del Motor (límite ya aceptado DEC-0021 §4.2); requiere un registro de causalidad | Mete 9 lógicas en la mutación → viola DEC-0028 §5.1 y hace la reversión imposible de rastrear (la caja negra que el CPSAO G prohíbe) |

**Contrato de trazabilidad y reversión (G/§42, innegociable):** cada entidad que
nace de una consecuencia guarda `sourceEventId`/`sourceTransactionId`. La UI
puede responder "esta cuota nació de tu compra del 12 en tal tarjeta" y ofrecer
deshacer desde ahí — anular la transacción origen (servicio central FIN-028)
emite el evento de reversión y la cascada se revierte por los mismos listeners.
Acuse explícito de todo (FIN-029 §5.1): nada cambia en silencio.

**Modelo de confirmación en dos niveles (decisión 3 del Fundador, encódado en
el diseño):**
- **Consecuencia directa del hecho** (cupo, saldo, cuotas, presupuesto, Score,
  proyecciones) → **sin** confirmación, pero visible + reversible.
- **Modificación de datos que el usuario NO ingresó** (refinanciación, cambio de
  plazo, consolidación, condiciones, sustitución de producto) → **confirmación
  explícita** (sobre el motor conversacional único, FIN-029).

### 4.3 · "¿Cómo pagaste?" — heredar, no re-preguntar (H)

Al registrar un gasto, el método de pago se pregunta preguntando **solo el
delta**: efectivo → nada · cuenta → seleccionar cuenta · débito → cuenta asociada
· crédito → flujo de la tarjeta (elegir tarjeta ya registrada + solo lo propio de
esa compra: cuántas cuotas, con/sin interés, diferimiento) · billetera →
seleccionar billetera. La tarjeta ya conoce su corte/cupo/pago: **NO se
re-preguntan** (§42 + guardarraíl H). Registrar un gasto no puede tomar más que
escribirlo — la baja fricción es criterio de aceptación (§4.6), no un extra.

### 4.4 · Sin duplicados (I) y §32 extendido a los números nuevos (J)

- **I:** una compra con tarjeta ACTUALIZA la tarjeta existente (saldo/cupo), no
  engendra una segunda deuda. §32 aplicado al ESTADO del producto.
- **J:** los números nuevos (**cupo disponible**, **saldo utilizado**, **próximas
  cuotas**) tienen UNA definición cada uno, en un servicio hoja inyectado (patrón
  `SpendableService`/`DebtOutlayService`), nunca recalculado por pantalla.
- **"Flujo de caja" pasa el gate del DSS ANTES de existir (J):** hoy no existe
  como indicador. Antes de shipearlo, debe (a) tener fuente única y (b) responder
  una pregunta de decisión que "Te queda" (FIN-020) NO responda ya. Mi lectura
  preliminar: "Te queda" ya cubre "¿cuánto puedo gastar sin sabotear el ciclo?";
  un "flujo de caja" solo se justifica si aporta la dimensión temporal/proyectiva
  que teQueda no da (p. ej. proyección de saldos futuros por cuotas comprometidas).
  Lo dejo como **pregunta para el DEC**, no como decisión mía — si no aporta
  decisión nueva, no se shipea solo por completar la lista.

### 4.5 · Fase 1 (lo único que este umbrella diseña implementable)

**Compra-con-tarjeta-de-crédito de punta a punta** — ejercita G/H/I/J juntos y
valida el patrón antes de replicarlo. Piezas:
1. Extensión de la tarjeta de crédito como producto con cupo (`creditLimit`,
   `usedAmount` derivado) — el primer `ProductType` con esquema.
2. Flujo "¿cómo pagaste? → crédito → tarjeta X → N cuotas / con o sin interés".
3. La compra emite el evento rico con `causadoPor`; listeners: mueven saldo/cupo,
   generan las cuotas (amortización existente), despiertan el Motor.
4. Trazabilidad ("esta cuota nació de tu compra del 12") + reversión (anular la
   compra revierte la cascada) + acuse explícito.
5. §32 verificado: cupo/saldo/cuotas por servicio hoja; "Te queda"/desembolso
   real siguen siendo las fuentes de FIN-020/023.

### 4.6 · Criterios de aceptación explícitos (A–K + §31/§32/§42)

| Guardarraíl | Cómo lo satisface la espina |
|---|---|
| **A** selección por tipo primero | El alta abre eligiendo `ProductType`, no un nombre |
| **B** mínimo obligatorio + progresivo | El esquema de cada tipo separa obligatorio/opcional; grep: ningún alta pide > su mínimo declarado |
| **C** §32 condición dura | Cero fórmula nueva por tipo; test de que cupo/saldo/cuota/desembolso resuelven a las fuentes únicas existentes |
| **D** honesto sin juzgar | gota a gota/préstamo entre personas con acuerdos flexibles; copy §29.2 (el rojo no culpa) |
| **E** confirmación mensual reusa FIN-029/023 | Fase final sobre el motor conversacional único, no flujo paralelo |
| **F** extensible por esquema | Un tipo nuevo = configuración + validador, sin migración de los existentes (test) |
| **G/§42** consecuencia visible+reversible | `sourceEventId`/`sourceTransactionId` en cada entidad de cascada; reversión por anulación del origen; acuse explícito |
| **H** preguntar el delta | "¿cómo pagaste?" hereda del producto; e2e: una compra con tarjeta no re-pregunta corte/cupo |
| **I** sin duplicados | La compra actualiza la tarjeta existente; test: no nace una 2ª deuda |
| **J** §32 en números nuevos + gate flujo de caja | Servicios hoja para cupo/saldo/cuotas; "flujo de caja" pasa el gate del DSS o no entra |
| **K/§42** principio institucionalizado | La espina ES la implementación del §42; G es su prueba |
| **§31** valor diferencial | §5 |

## 5. Respuesta al filtro §31

Sin esta transformación, Milla obliga a registrar la misma realidad dos veces (la
compra a cuotas Y la deuda), y no entiende que una tarjeta tiene cupo, que un
gota a gota tiene un costo brutal representable, que una libranza se retanquea.
Se perdería el salto de "cuaderno" a "copiloto que entiende la obligación de cada
quien y mueve todo con una sola acción". Ninguna FIN previa puede absorberlo: es
la ESPINA que las conecta (productos-entidad + consecuencias por evento). Valor
diferencial: **una sola acción del usuario produce toda su verdad financiera —
visible y reversible.** Es, literalmente, la diferencia entre registrar y
comprender.

## 6. Componentes (nivel umbrella)
Backend: `ProductType` (registro dirigido por esquema), extensión de tarjeta con
cupo, capa de consecuencias (listeners sobre el outbox FIN-002 con causalidad),
servicios hoja de cupo/saldo/cuotas. Frontend: selector por tipo, flujo "¿cómo
pagaste?", vista de trazabilidad/reversión. Reusa: servicio central de
movimientos (FIN-028), motor conversacional (FIN-029), amortización/desembolso
real (FIN-012/023), "Te queda" (FIN-020). El detalle por FIN derivada.

## 7. Base de datos (dirección, no migración final)
Nuevos valores de `DebtType` (`libranza`, `compra_a_cuotas`, `fintech`);
extensión de tarjeta (cupo); columnas de causalidad (`source_event_id`/
`source_transaction_id`) donde nacen consecuencias; tabla/registro de esquema de
tipos. Cada migración concreta va en su FIN derivada.

## 8. Backend
Sin fórmula nueva (§32). La capa de consecuencias es composición sobre el bus
existente; cero lógica financiera en las mutaciones (DEC-0028 §5.1).

## 9. Uso de IA
La confirmación mensual y "¿cambió algo?" corren sobre el motor conversacional
de FIN-029 — gate DPA+PIA intacto (plantillas/dev hasta cerrar el gate legal).

## 10. Riesgos
- **Radio de daño:** toca Registrar (el corazón operativo) y 8 FIN que consumen
  Debt/Account. Mitigación: Alt A (capa sobre lo existente, no reescritura) +
  faseo + §32 como test.
- **Cascada silenciosa** (el riesgo de Confianza que marcó el CPSAO): una compra
  mal interpretada ensucia 9 pantallas sin que la usuaria lo vea. Mitigación: G/
  §42 por construcción (trazable + reversible + acuse) — es la protección
  central, la que pido que el AUD vigile por encima de todo.
- **Fricción en "¿cómo pagaste?":** si se vuelve interrogatorio, se pierde el
  dato. Mitigación: H (heredar, preguntar solo el delta) como criterio de
  aceptación.
- **Frescura ~25 s** en los efectos del Motor (ya aceptada DEC-0021 §4.2).

## 11. Dependencias
FIN-002 (outbox), FIN-028 (servicio central + causalidad + reversión), FIN-029
(motor conversacional para confirmación), FIN-012/023 (amortización/desembolso),
FIN-020/021/022 (fuentes únicas). Ninguna nueva de infraestructura.

## 12. Impacto
La arquitectura del producto pasa de "módulos" a "ecosistema por eventos". Es la
transformación más grande y de mayor riesgo de Confianza de la Beta — por eso G/K
son criterios de aceptación auditables, no aspiraciones.

## 13. Criterios de aceptación (del umbrella)
1. La ESPINA está definida sin fórmula nueva (§32) y con trazabilidad/reversión
   por construcción (§42/G) — verificable en el diseño de Fase 1.
2. Guardarraíles A–K mapeados a mecanismos concretos (§4.6).
3. Filtro §31 respondido (§5). "Flujo de caja" con su gate del DSS planteado al
   DEC (§4.4).
4. Faseo propuesto que respeta "un FIN a la vez" para IMP (§14).
5. El umbrella NO diseña el detalle de más de una funcionalidad (solo la espina/
   Fase 1) — regla del umbrella.

## 14. Plan (faseo — el desglose FIN fino lo fija el CTO en BACKLOG)
1. Validación del CTO de este umbrella → AUD-0030 (foco: §32 no se rompe por
   tipo; G/§42 trazabilidad-reversión reales) → DEC-0030 (decide "flujo de caja",
   confirma faseo).
2. **Fase 1 · FIN derivada:** espina (producto-entidad + capa de consecuencias
   visible/reversible) validada con compra-con-tarjeta de punta a punta
   (G/H/I/J) → su ARQ/AUD/DEC/IMP individual.
3. **Fases siguientes:** enriquecimiento del resto de los ≥11 tipos (cada uno su
   FIN); luego la confirmación mensual (sobre FIN-029). Un IMP a la vez (§36.2).
