# ARQ-0018 · Evolución de la experiencia Inicio (segunda iteración)

- **Versión:** 1.1
- **Fecha:** 2026-07-11
- **Autor:** Agente Arquitecto
- **Estado:** Decidido (DEC-018: 5 piezas autorizadas; propuesta §5 en consulta al CPSAO) — corrección §10 aplicada, en confirmación directa del CTO
- **Historial de cambios:**
  - v1.0 (2026-07-11) — emisión con el alcance aprobado por el CPSAO (L1, D1, D3,
    D5, D6, D7) + análisis amplio de la mitad inferior (D2/D8/D9) exigido como
    acompañamiento.
  - v1.1 (2026-07-11) — corrección de redacción del riesgo D3-B en §10 (hallazgo de
    AUD-018 confirmado por el CTO): la lista de Deudas muestra `payoffDate`, no
    `nextDueDate`; se registra la mejora futura fuera de ciclo.
  - v1.2 (2026-07-11) — el CPSAO aprobó incorporar la propuesta analítica de §5
    (compactación de Movimientos recientes) como **pieza 7** del alcance (DEC-018
    §6.1); se documenta su diseño final en §4.8, incluidos los dos criterios de
    producto del CPSAO y el texto exacto del enlace.
  - v1.3 (2026-07-11) — tercera entrega pedida por el CTO/CPSAO antes del cierre:
    (a) la incidencia de `nextDueDate` entra al alcance como **pieza 8** (§4.9) —
    corrección acotada implementada con la misma familia de sentencia atómica;
    (b) **análisis narrativo** "¿qué debería hacer ahora?" documentado en §5.1,
    con una propuesta mínima para decisión del equipo.
- **Módulo/Feature:** FIN-018 · **Origen (v3.5 §27):** Mejora de revisión de producto (`RECORRIDO-INICIO-001`, commit `1b74f41`)
- **Referencia visual:** `docs/producto/capturas/revision-inicio/` (scroll completo real)

---

## 1. Objetivo
Que el recorrido COMPLETO de Inicio mantenga el estándar de la mitad superior:
cada bloque debe ayudar al usuario a **entender mejor su situación** o a **decidir
mejor qué hacer** (estándar del CPSAO). Iteración pequeña y medible.

## 2. Problema
El recorrido va "de claridad a densidad" (síntesis de RECORRIDO-INICIO-001,
verificada por el CTO contra las capturas): 6 observaciones comprometidas con
defecto objetivo (L1, D1, D3, D5, D6, D7) y una pregunta estructural abierta sobre
la mitad inferior (D2/D8/D9).

## 3. Alcance
**Incluye:** las 6 piezas comprometidas (2 pantallas: Login y Dashboard; backend solo
el texto de una interpretación) + el análisis de la mitad inferior (§5).
**Excluye:** L2/D4 (correcciones triviales ya autorizadas por fuera), cualquier
sección nueva, otras pantallas, cambios al Motor/Score.

## 4. Diseño — alternativas por pieza comprometida

### L1 — Jerarquía de CTAs del Login (usuario nuevo)

| | **Alt A — "Crear cuenta" primario (recomendada)** | **Alt B — Peso igual** | **Alt C — Jerarquía contextual** |
|---|---|---|---|
| Qué es | Invertir: "Crear cuenta" sólido dominante, "Ingresar" secundario debajo | Ambos botones con el mismo estilo | Primer arranque → "Crear cuenta" primario; si el dispositivo ya tuvo sesión (flag local) → "Ingresar" primario |
| Ventajas | Optimiza para el público real de esta pantalla: la sesión PERSISTE (tokens en storage seguro), así que el usuario recurrente casi nunca ve el Login — quien lo ve es, en su gran mayoría, alguien sin cuenta o tras un logout deliberado | Nadie queda degradado | Cada público ve SU acción dominante |
| Desventajas | El recurrente post-logout tiene su acción en secundario (un caso raro y consciente) | Sin jerarquía = decisión más lenta para todos; contradice "la jerarquía visual deja clara la acción principal" (pregunta 4 del AUD UX) | Lógica extra y DOS estados de pantalla que documentar, auditar y capturar — sobre-ingeniería para el beneficio que da |

### D1 — Interpretación verde del hero repite la cifra

| | **Alt A — Formato "$ de cada $100" (recomendada)** | **Alt B — Texto corto sin monto** | **Alt C — Verde sin línea** |
|---|---|---|---|
| Qué es | 🟢 "De cada $100 que te entraron, aún tienes $71 libres" — proporción, información NUEVA, y el MISMO formato de la interpretación de deuda (familia coherente) | 🟢 "Vas bien este ciclo" | En verde no se muestra línea; solo amarillo/rojo la llevan |
| Ventajas | Aporta algo distinto de la cifra grande; coherencia de lenguaje entre interpretaciones; sigue §29.2 (pesos, no porcentajes) | Mínimo | Menos texto cuando todo va bien |
| Desventajas | Una línea apenas más larga | Genérico: no dice cuánto margen hay — roza "ocupar espacio sin aportar" | La línea aparece y desaparece según el nivel → puede generar la pregunta "¿por qué hoy no me dice nada?" (viola §29.1) |

### D3 — Deuda partida en dos lugares

| | **Alt A — Mover "Próximos pagos" bajo Deuda total** | **Alt B — Integrar el próximo pago EN la tarjeta (recomendada)** |
|---|---|---|
| Qué es | La sección completa se reubica inmediatamente después de la tarjeta Deuda total | La tarjeta Deuda total gana una línea: "Próximo: Tarjeta de crédito · $97.199 · vence 28 jul" (el más cercano); la sección aparte desaparece — la lista completa vive en la pestaña Deudas, a un tap |
| Ventajas | Cero pérdida de información; solo reordena | Un solo bloque de deuda; COMPACTA el recorrido (elimina una sección — alineado con la pregunta del CPSAO); resuelve D6 de paso (la línea lleva fecha) |
| Desventajas | El recorrido no se acorta; la mitad superior se alarga antes de Patrimonio/Ahorro | Con varias deudas solo se ve el próximo pago más urgente en Inicio (el resto a un tap en Deudas) |

### D5 — Totales fijos duplicados

| | **Alt A — Quitar las filas repetidas (recomendada)** | **Alt B — Fusionar tarjeta + sección** |
|---|---|---|
| Qué es | Las filas "📌 Gastos fijos $1.515.000" / "📌 Ingresos fijos $4.200.000" salen de las secciones de categorías (las tarjetas Ingresos/Gastos ya muestran esos totales); los títulos de sección pasan a aclarar el alcance: "¿En qué se te va la plata? (gastos del día a día)" | La tarjeta Gastos se convierte en encabezado de su desglose por categorías (una sola unidad visual); ídem Ingresos |
| Ventajas | Mínima y quirúrgica; cero estructura nueva | Estructura más limpia a largo plazo; menos bloques totales |
| Desventajas | El desglose por categorías queda sin el recordatorio del fijo local (mitigado por el título) | Cambio estructural mayor: fusiona dos formatos distintos (par de tarjetas / lista con barras) — más riesgo del necesario para esta iteración |

### D6 — Fecha en "Próximos pagos"

| | **Alt A — Fecha corta por fila (recomendada si D3-A)** | **Alt B — Urgencia relativa** |
|---|---|---|
| Qué es | Cada fila muestra "vence 28 jul" (dato `dueDate` ya presente en el endpoint, confirmado por el CTO) | Además, etiqueta relativa ("en 3 días") con orden por urgencia |
| Ventajas | Directo, costo casi nulo | Más accionable |
| Desventajas | — | Lógica de fechas relativas y casos borde (hoy/mañana/vencido) — más de lo que el hueco exige |

**Nota de composición:** si el DEC elige **D3-B**, D6 queda resuelto DENTRO de la
línea "Próximo: … · vence 28 jul" y esta pieza no requiere trabajo aparte.

### D7 — "¿De dónde llega la plata?" sin valor cuando todo es "Sin categoría"

| | **Alt A — Ocultar la sección en ese caso** | **Alt B — Invitación accionable (recomendada)** |
|---|---|---|
| Qué es | Si el 100% del ingreso variable está sin categoría, la sección no se muestra | La fila "Sin categoría · 100%" se reemplaza por: "Tus ingresos aún no tienen categoría — toca para organizarlos", navegando a la lista de movimientos existente |
| Ventajas | Quita el ruido con cero costo | Convierte el ruido en una acción con retorno (mejores desgloses después); la sección es estable (no aparece/desaparece) |
| Desventajas | La sección aparece y desaparece entre ciclos → inconsistencia que puede generar la pregunta "¿dónde quedó?" | Requiere el tap a la lista (pantalla ya existente — costo bajo, no nulo) |

### 4.8 — Pieza 7: compactación de "Movimientos recientes" (incorporada por DEC-018 §6.1, v1.2)

Diseño final conforme a los dos criterios de producto del CPSAO:

- **4 filas densas** (elegido dentro del rango 3–4: con 4 caben, con los datos
  típicos, al menos un ingreso, un gasto y un pago de deuda — la muestra ejecutiva
  conserva variedad) en UNA sola tarjeta: ícono + concepto + fecha corta + monto,
  una línea por movimiento, separadas por filete.
- **Texto del enlace (criterio 1, pasado por §29.2):**
  `"Ver el detalle completo de tus movimientos →"` — comunica explícitamente el paso
  de la vista ejecutiva ("recientes") a la vista de detalle ("el detalle completo"),
  sin jerga y entendible a la primera; navega a la pestaña Registrar, donde vive la
  lista completa. Alternativa descartada: "Ver todos →" (genérico — no dice a QUÉ
  se pasa, justo lo que el criterio prohíbe).
- **Criterio 2** (¿el usuario termina el recorrido entendiendo mejor su situación?):
  se valida y documenta como juicio razonado en IMP-0018, sobre la captura de scroll
  completo final.

### 4.9 — Pieza 8: avance de `nextDueDate` al registrar pagos (incorporada por el CTO/CPSAO, v1.3)

La incidencia destapada por D3-B/D6 (fecha vencida mostrada como "Próximo") se
elevó a riesgo de experiencia y entró al alcance. Corrección acotada, misma familia
de sentencia atómica de FIN-012 (todo dentro del mismo `UPDATE` del manejador de
`pago_deuda`):

- Un pago **avanza `next_due_date` hasta la próxima ocurrencia FUTURA conservando el
  día ancla** — no "+1 mes" a secas: desde una fecha ya vencida por k meses, +1 la
  dejaría vencida; la sentencia calcula los meses de atraso con `age()` y salta
  k+1 meses (Postgres ajusta fines de mes solo).
- Si el pago salda la deuda, `next_due_date` queda `NULL` (no hay próximo pago).
- Semántica declarada: con cuotas atrasadas acumuladas, UN pago normaliza la fecha
  visible a la próxima ocurrencia (no reconstruye el histórico de atrasos — eso
  pertenece al dominio de mora, fuera de alcance).
- Las rutas de FIN-012 ya eran correctas (prepay regenera el plan y toma la fecha
  del cronograma nuevo; payoff limpia) — solo faltaba el manejador de pago normal.
- Evidencia: `test/fin018-next-due-date.e2e-spec.ts` (3 casos contra BD real:
  vencida→futura con día ancla, futura→+1 mes exacto, saldada→NULL).

## 5. Análisis amplio de la mitad inferior (requisito del CPSAO — acompaña, no compromete)

**Pregunta guía:** ¿la mitad inferior sigue ayudando a DECIDIR o se convierte en
pantalla de CONSULTA? Aplicando el estándar "entender mejor o decidir mejor" bloque
por bloque:

| Bloque | ¿Entender / decidir? | Lectura |
|---|---|---|
| Próximos pagos | **Decidir** (¿aparto plata ya?) — con la fecha (D6) cumple pleno; sin ella, cojea | Pertenece. Si D3-B, se integra arriba y la mitad inferior se acorta |
| ¿En qué se te va la plata? | **Entender + decidir** (dónde recortar; las barras jerarquizan solas) | Pertenece tal cual |
| ¿De dónde llega la plata? | Condicional: con categorías reales, **entender**; sin ellas, ninguna de las dos (D7) | Pertenece SOLO con D7 resuelto |
| Movimientos recientes | **Consulta** casi pura: su función real es confianza ("mi registro está al día") y puerta a corrección — valor de decisión bajo | Es el bloque que más convierte el Inicio en pantalla de consulta (raíz de D8/D9) |
| Gamificación (D2) | **Decidir** el hábito (registrar hoy para no perder la racha) — argumento para mantenerla arriba, donde empuja; la lectura alternativa (cierre motivacional al final, conectando con D9) también es defendible | Ambas lecturas documentadas; decisión de narrativa del CPSAO, no técnica |

**Propuesta ANALÍTICA derivada (para evaluación del equipo, no comprometida):** el
patrón que resolvería D8 y D9 dentro del estándar es compactar "Movimientos
recientes" a 3–4 filas densas + "Ver todos →" (la lista completa ya existe en la
pestaña Registrar) — la consulta se degrada a resumen con salida explícita, y el
"Ver todos" funciona de cierre natural del recorrido, haciendo innecesario un cierre
artificial (D9). Si el equipo la aprueba, cabe en esta misma FIN (es la misma
pantalla y reduce, no añade); si no, el recorrido igual mejora con las 6 comprometidas.

### 5.1 — Análisis narrativo (v1.3): ¿el recorrido también guía hacia "¿qué debería hacer ahora?"

Evaluación bloque por bloque sobre la captura final: qué pregunta RESPONDE
("¿cómo estoy?") y qué decisión EMPUJA ("¿qué hago ahora?"):

| Bloque | Responde | Empuja | Lectura |
|---|---|---|---|
| Hero "Te queda este ciclo" | ✓ cuánto queda + margen | ✗ | **Gap principal**: el protagonista informa el margen pero no propone qué hacer con él |
| Gamificación (1 línea) | ✓ hábito | ✓ registrar hoy (tocable → Logros) | Cumple |
| Deuda total (unificada) | ✓ total, pagado, interpretación, próximo | ✗ directo | **Gap secundario**: la acción de mayor valor que Milla ya construyó (abono a capital, FIN-012) está a 2 taps sin puente desde aquí |
| Patrimonio | ✓ | — | Correcto: no todo bloque necesita acción |
| Ahorro | ✓ | ✓ CTA proyección | Cumple |
| Ingresos/Gastos + categorías | ✓ | ✓ implícito (las barras jerarquizan dónde recortar) | Cumple |
| Invitación a categorizar (D7-B) | — | ✓ | Cumple |
| Movimientos + enlace de detalle | ✓ registro al día | ✓ transición explícita | Cumple |

**Conclusión:** el ORDEN ya guía bien (urgencia correcta, cada bloque con salida);
el hueco es mínimo y está localizado exactamente en los DOS bloques de mayor
jerarquía: hero y deuda **responden pero no proponen**. La combinación es
elocuente: la pantalla le dice al usuario "te quedan $71 libres de cada $100" y
"tu tarjeta está al 26% EA" — y no conecta ambas frases.

**Propuesta mínima (para decisión del equipo — NO implementada):** una sola línea
condicional en la tarjeta de Deuda, visible solo cuando hay margen verde Y deudas
activas: `"Tienes margen este ciclo — simula un abono a tu deuda →"` (navega al
detalle de la deuda de mayor tasa, donde el simulador de abono de FIN-012 ya
existe; cero lógica financiera nueva, reutiliza pantallas construidas). Alternativa
igualmente válida: **no añadir nada** — los empujes periféricos ya existen y cada
elemento extra compite con la limpieza recién ganada; si se elige esta, el gap
queda registrado como semilla de una futura iteración de "recomendación en Inicio"
(que conectaría con el motor de recomendaciones de FIN-007, hoy visible solo en
Copiloto). La decisión es de producto (CPSAO/CTO), no técnica.

## 6. Componentes
`LoginScreen.tsx`, `DashboardScreen.tsx`; `dashboard.service.ts` SOLO para el texto
de D1 (+ su test). Cero componentes nuevos.

## 7. Base de datos
Ninguna.

## 8. Backend
Solo D1: nuevo texto del nivel verde de `interpretCashflow` (formato "$ de cada
$100"), con actualización del test exacto. Nada más.

## 9. Uso de IA
Ninguno.

## 10. Riesgos
- D3-B reduce visibilidad de pagos múltiples en Inicio → mitigación (redacción
  corregida en v1.1 por hallazgo de AUD-018/CTO): la línea del pago MÁS URGENTE
  queda siempre visible en Inicio, y la pestaña Deudas está a un tap — aunque la
  lista de Deudas hoy muestra la fecha de TÉRMINO (`payoffDate`) por deuda, no la
  fecha del próximo pago (`nextDueDate`); el detalle de cada deuda sí muestra su
  plan con fechas. Añadir `nextDueDate` a la lista de Deudas queda registrado como
  **mejora futura fuera de este ciclo** (tocaría una tercera pantalla, fuera del
  alcance de FIN-018).
- Cambios de copy (D1) requieren pasar §29.2 — textos definitivos en este ARQ.
- L1-A degrada al recurrente post-logout → caso raro y deliberado; reversible.

## 11. Dependencias
Datos ya expuestos (`upcoming.dueDate`, agregados del home). Ninguna nueva.

## 12. Impacto
2 pantallas + 1 texto de backend. Sin migraciones ni contratos rotos.

## 13. Criterios de aceptación
1. L1: captura del Login con la jerarquía aprobada por el DEC.
2. D1: en verde, la interpretación NO contiene el mismo monto del hero (verificable
   por test unitario del texto y por captura).
3. D3/D6: la información de deuda vive en UN lugar del recorrido, con fecha visible
   del próximo pago (captura).
4. D5: grep de los totales fijos — cada total aparece UNA vez en la pantalla.
5. D7: con ingresos 100% sin categoría, la sección no muestra "Sin categoría · 100%"
   (test/captura del caso).
6. §5 evaluado por el equipo con decisión registrada (entra / no entra / futura).
7. Capturas de scroll completo antes/después; suite completa verde; typecheck;
   bundle Android.

## 14. Plan
1. AUD-018 (con las 6 preguntas UX) → DEC-018 elige alternativas y resuelve §5 →
2. backend D1 + test → 3. frontend (Login + Dashboard según lo aprobado) →
4. capturas de scroll completo después → 5. IMP-0018 con SHA → validación → cierre.
