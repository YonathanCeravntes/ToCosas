# ARQ-0019 · Experiencia de Salud (Score Millo)

- **Versión:** 1.1
- **Fecha:** 2026-07-11
- **Autor:** Agente Arquitecto
- **Estado:** Decidido (DEC-019: P2–P7 autorizadas; P1 corregida por ruta (b)) — en confirmación puntual del CTO para habilitar IMP-0019
- **Historial de cambios:**
  - v1.0 (2026-07-11) — emisión con la intención aprobada por el CPSAO como §0 y la
    directriz de acción de mayor impacto incorporada.
  - v1.1 (2026-07-11) — corrección de P1 según DEC-019: se adopta la **ruta (b)**
    (barras de progreso 0–100 SIN semáforo por pilar — §4.1-bis); consecuencia
    derivada corregida: "Lo que más te frena" se deriva del peor INDICADOR (niveles
    auditados), no de comparar pilares. El resto de P1 (nombres llanos, "715 de
    1.000", retiro de "v1") se conserva tal como fue aprobado.
- **Módulo/Feature:** FIN-019 · **Origen (v3.5 §27):** Mejora de revisión de producto
- **Insumos:** `RECORRIDO-SALUD-001.md` (9 observaciones S1–S9 + 3 fortalezas, commit `6e5b002`) · respuesta de intención aprobada · directriz CTO/CPSAO de acción de mayor impacto

---

## 0. Intención (aprobada por el CPSAO — rige cada decisión de este documento)

> **Al abandonar Salud, el usuario debe sentir que su situación tiene explicación y
> tiene palanca: "ahora entiendo por qué estoy así — y sé exactamente qué mueve la
> aguja." Nunca calificado; siempre orientado.**

Con la directriz adicional: **debe salir sabiendo cuál es LA acción de mayor
impacto** que puede tomar — no varias; al menos una, clara. Pregunta rectora
presente en cada alternativa: *¿qué decisión concreta puede tomar el usuario
inmediatamente después de recorrer esta pantalla?* Y el principio que gobierna: la
mejor pantalla de Salud no es la que mejor explica el Score — **es la que logra que
el usuario quiera mejorar porque entiende que puede**.

Consecuencias de diseño ya confirmadas: el número nunca viaja solo · todo
rojo/amarillo lleva su palanca al lado · el tono califica estados, jamás personas ·
el cold-start también tiene emoción asignada.

## 1. Objetivo

Que Salud responda las 3 preguntas obligatorias — ¿cómo estoy? / ¿por qué? / ¿qué
hago? — y deje visible la acción de mayor impacto. Continuidad narrativa: Inicio
responde "¿cómo estoy?"; Salud responde "¿por qué estoy así?" (y hacia dónde).

## 2. Problema

Veredicto del recorrido (RECORRIDO-SALUD-001): "¿cómo estoy?" parcial (número sin
escala), "¿por qué?" NO respondida (el Score viaja solo — S1/S6/S9), "¿qué hago?"
escondida tras un tap que no anuncia su contenido (S4). Más: banda "Estable" en
color alerta (S3), jerga y porcentajes secos inconsistentes con Inicio (S2),
cold-start mudo (S7), "Evolución" plana (S5), cierre sin salida (S8). Emocionalmente
hoy el usuario sale **calificado, no orientado**.

## 3. Alcance

**Incluye:** `HealthScreen.tsx` completa (única pantalla). **Cero backend, cero BD**:
toda la materia prima ya está expuesta — `pillars` (pesos/estado/delta),
`coldStart.remainingDays`, indicadores con `meaning/actions/ranges`, y el motor de
recomendaciones de FIN-007 (`GET /recommendations`, priorizado por impacto
ΔScore × urgencia × viabilidad) — verificado contra `types.ts`/`endpoints.ts`.
**Excluye:** cambios al Motor/Score/umbrales, monetización (el gate Millo+ del
historial se conserva), gráficos nuevos con librerías, otras pantallas.

## 4. Diseño — alternativas por pieza

### P1 — El Score con sus causas (S1, S6, S9): responder "¿por qué?"

| | **Alt A — Pilares dentro de la tarjeta del Score (recomendada)** | **Alt B — Sección aparte "¿Por qué 715?"** | **Alt C — Gauge visual con desglose al tap** |
|---|---|---|---|
| Qué es | La tarjeta muestra "715 **de 1.000**" + banda como chip + los 4 pilares como mini-filas (nombre llano, barra de estado verde/amarillo/rojo, delta) + 1 línea: "Lo que más te frena: tu fondo de emergencia" | Tarjeta simple; los pilares en una sección separada debajo | Anillo/gauge; pilares al tocar |
| Ventajas | El porqué es INSEPARABLE del número (consecuencia 1 de la intención); datos ya en el API; el pilar débil conecta directo con P2 | Hero limpio | Vistoso |
| Desventajas | Tarjeta más alta | Reproduce el mal actual atenuado: número y causas separados | Re-esconde (contra "destapar y conectar"); gráfica nueva sin librería = costo alto |

Nombres llanos de pilares (§29.2): Liquidez → "Tu colchón" · Endeudamiento → "Tus
deudas" · Ahorro → "Tu ahorro" · Patrimonio → "Lo que tienes". "v1" sale de la
vista (S2); el disclaimer corto "No es un puntaje crediticio" se conserva.

#### 4.1-bis — Corrección de DEC-019 (v1.1): pilares SIN semáforo — ruta (b)

El semáforo por pilar de la v1.0 **no tenía sustento** (hallazgo del Auditor
confirmado por el CTO contra el código): `ScorePillar` expone `value` y `status`
(disponibilidad, no salud) sin umbrales de color auditados, y `wealthPillar()` es
cuasi-binario (≈70 para cualquier patrimonio positivo — riesgo diferido aceptado en
DEC-0004 precisamente porque el pilar no se mostraba). Colorearlo habría fabricado
exactamente la calificación sin fundamento que la intención §0 prohíbe.

**Diseño corregido:**
- Cada pilar se muestra como **barra de progreso 0–100 en color neutro** (el relleno
  en el verde institucional de Milla sobre pista gris — el MISMO tratamiento para
  los 4, sin juicio relativo entre ellos) + su nombre llano + su delta mensual si
  existe. El valor comunica magnitud; el color no afirma nada que el Motor no haya
  calculado.
- **El semáforo queda reservado a los INDICADORES** (P3), que sí tienen niveles
  verde/amarillo/rojo calculados y auditados desde FIN-004.
- **Consecuencia derivada, también corregida:** la línea "Lo que más te frena: …"
  ya no compara pilares (habría heredado el mismo problema — comparar curvas de
  naturaleza distinta, una de ellas cuasi-binaria). Se deriva del **peor indicador**
  (rojo primero, luego amarillo, con sus niveles auditados); si todos los
  indicadores están en verde, la línea SE OMITE (patrón §29.1 — nunca un juicio
  fabricado para llenar el espacio).
- Se registra como **mejora futura fuera de este ciclo**: refinar la curva de
  `wealthPillar()` (el riesgo diferido de DEC-0004 sigue vigente; ahora el pilar
  será visible pero como magnitud neutra, no como juicio).

### P2 — "Tu jugada de mayor impacto" (directriz del CPSAO): responder "¿qué hago?"

| | **Alt A — Recomendación top del motor FIN-007 (recomendada)** | **Alt B — Heurística del pilar más débil** | **Alt C — Des-esconder todas las acciones** |
|---|---|---|---|
| Qué es | Bloque único bajo el Score: la recomendación #1 de `GET /recommendations` (ya priorizada por **impacto en el Score** × urgencia × viabilidad) con su título, su "qué pasa si no" y CTA a su acción (simulador/pantalla correspondiente) | Derivar la acción localmente del indicador más rojo (sus `actions[]` ya existen) | Mostrar siempre las 2–3 acciones de cada indicador |
| Ventajas | "Mayor impacto" es LITERALMENTE lo que el motor ya calcula (auditado en FIN-007); una sola fuente de verdad; cero lógica nueva; el `whatIfNot` da el "por qué ahora" | Sin dependencia del estado del motor | Todo visible |
| Desventajas | Si el motor no tiene recomendaciones activas se necesita fallback (→ usar B como respaldo, documentado) | Duplica criterio de priorización que ya existe en el backend (contra el precedente del Motor: una sola fuente) | "Varias = ninguna" — viola la directriz explícita |

**Recomendación compuesta:** A con B de respaldo (si `/recommendations` viene vacío,
la jugada se deriva del indicador más débil con su primera acción).

### P3 — Indicadores destapados y jerarquizados (S4, S2)

| | **Alt A — Interpretación siempre visible; palanca donde duele (recomendada)** | **Alt B — Expandir todo siempre** |
|---|---|---|
| Qué es | Cada tarjeta muestra SIEMPRE valor + interpretación en el lenguaje de Inicio ("De cada $100 de tu ingreso, $10 se van en cuotas — sano"); si está amarillo/rojo, su acción principal + "🧪 Simularlo →" quedan visibles; la fórmula y los rangos van tras un tap con etiqueta honesta: "¿Cómo se calcula? →" | Todas las tarjetas nacen expandidas con fórmula, rangos y acciones |
| Ventajas | Cumple el precedente 3-A de FIN-017 (interpretación sin interacción); la palanca aparece exactamente donde hay dolor; el tap ahora anuncia su contenido | Nada escondido |
| Desventajas | Tarjetas amarillas/rojas más altas | Pantalla enorme; la fórmula es contenido de profundización, no de recorrido — densidad sin jerarquía |

### P4 — Tono y color (S3): calificar estados, no personas

| | **Alt A — Score neutro + banda como chip (recomendada)** | **Alt B — Recalibrar el mapa de color de bandas** |
|---|---|---|
| Qué es | La tarjeta del Score usa SIEMPRE el verde institucional de Milla; la banda vive en un chip pequeño con su color; el semáforo se reserva para pilares e indicadores (los estados) | Mantener la tarjeta coloreada por banda pero con mapa nuevo (estable→neutro, solo crítico→rojo) |
| Ventajas | El elemento más grande de la pantalla deja de gritar el juicio; consistencia con el hero de Inicio (verde Millo); "Estable" ya no se ve naranja-alerta | Cambio mínimo |
| Desventajas | Se pierde el impacto cromático de banda (que hoy juega en contra) | El juicio sigue teñido en el elemento dominante; con banda "crítico" la pantalla entera regaña — contra la intención |

### P5 — Cold-start con emoción (S7)

| | **Alt A — Estado propio de construcción (recomendada)** | **Alt B — Nota bajo el "—"** |
|---|---|---|
| Qué es | Sin Score: la tarjeta se convierte en "Tu Score se está construyendo · te faltan ~N días de historia" (usa `coldStart.remainingDays`, ya expuesto) + qué va a poder saber + 2 cosas que ya puede hacer hoy (registrar movimientos, marcar su fondo en Cuentas) | Mantener "—" y añadir una línea explicativa |
| Ventajas | Expectativa + agencia desde el día cero (consecuencia 4 de la intención); convierte la espera en preparación | Mínimo |
| Desventajas | Un estado más que mantener | El "—" sigue pareciendo pantalla rota; explica pero no orienta |

### P6 — Evolución con lectura (S5)

| | **Alt A — Narrativa por casos (recomendada)** | **Alt B — Sparkline** |
|---|---|---|
| Qué es | 1 punto: "Tu primera medición: 715 · desde aquí construyes" · 2+ puntos: "▲ +12 desde junio" con la lista como detalle | Mini-gráfico de línea |
| Ventajas | Texto puro, convierte la lista plana en lectura; útil desde el primer mes | Visual |
| Desventajas | Plantillas por caso | Sin librería de gráficos hoy (alcance excluye añadirla); con 1–3 puntos un gráfico no dice nada — candidata a iteración futura |

### P7 — Cierre del recorrido (S8)

| | **Alt A — Puente al Copiloto (recomendada)** | **Alt B — Sin cierre nuevo** |
|---|---|---|
| Qué es | Última pieza antes del disclaimer: "¿Preguntas sobre tu Score? El copiloto te lo explica →" (pestaña Copiloto, donde las tools de FIN-005 ya responden sobre el score) | El disclaimer cierra, como hoy |
| Ventajas | Continuidad narrativa hacia la siguiente experiencia; salida para el que quedó con dudas | Cero cambios |
| Desventajas | Un elemento más | El recorrido muere en texto legal — S8 sin resolver |

### 4.8 — Composición integrada (si el DEC aprueba las recomendadas)

```
[Salud]
┌─ Score (verde Millo) ─────────────────────┐
│ Score Millo                 715 de 1.000  │
│ [chip: Estable]            ▲ +12 este mes │
│ Tu colchón      ▓░░░░░░░░░  (barra neutra)│
│ Tus deudas      ▓▓▓▓▓▓▓▓░░       0–100    │
│ Tu ahorro       ▓▓▓▓▓▓▓░░░  sin semáforo  │
│ Lo que tienes   ▓▓▓▓▓▓▓░░░  (ruta b)      │
│ Lo que más te frena: tu fondo de          │
│ emergencia        ← del peor INDICADOR    │
└───────────────────────────────────────────┘
┌─ ⭐ Tu jugada de mayor impacto ────────────┐
│ Aparta $X al mes para tu fondo: pasarías  │
│ de 1,3 a 3 meses de colchón.              │
│ [ Simularlo → ]                           │
└───────────────────────────────────────────┘
[Indicadores: interpretación visible; acción
 + Simularlo si amarillo/rojo; "¿Cómo se
 calcula? →" al tap]
[Evolución: lectura narrativa + detalle]
[¿Preguntas? El copiloto te lo explica →]
[Disclaimer legal (se conserva)]
```

**Respuesta a la pregunta rectora:** la decisión concreta al salir es ejecutar (o
simular) **la jugada** — una sola, nombrada, con su beneficio en pesos/meses y su
CTA. El resto de la pantalla existe para que esa jugada tenga sentido: el Score y
sus pilares explican POR QUÉ esa es la jugada.

## 5. Componentes
Solo `HealthScreen.tsx` (+ consumo de `recommendationsApi.list()` ya existente).
Cero componentes de librería nuevos.

## 6. Base de datos
Ninguna.

## 7. Backend
Ninguno. (Verificado: `pillars`, `coldStart`, `indicators.actions/meaning/ranges` y
`GET /recommendations` con `priorityScore` ya están expuestos y auditados.)

## 8. Frontend
Rediseño de `HealthScreen.tsx` según las piezas aprobadas; textos §29.2.

## 9. Uso de IA
Ninguno nuevo (P7 solo navega a la pestaña Copiloto existente).

## 10. Riesgos
- La jugada depende del estado del motor de recomendaciones → fallback B documentado.
- Más contenido siempre-visible alarga tarjetas → mitigado: solo interpretación
  (1 línea) es incondicional; fórmulas siguen tras tap anunciado.
- Cambio de color del Score puede leerse como pérdida de "semáforo global" →
  el semáforo vive en los INDICADORES (única fuente con niveles auditados; los
  pilares son barras neutras por la ruta (b) — frase corregida en v1.1 conforme
  al detalle señalado en la confirmación del CTO).

## 11. Dependencias
Todas existentes: Score/pilares (FIN-004), indicadores (FIN-004), recomendaciones
(FIN-007), simulador (FIN-007/012), Copiloto (FIN-005). Ninguna nueva.

## 12. Impacto
1 pantalla; API intacto; gate Millo+ del historial intacto; disclaimer conservado.

## 13. Criterios de aceptación
1. Las 3 preguntas obligatorias respondidas SIN interacción, verificables en la
   captura de scroll completo (score con escala y causas; interpretaciones; jugada).
   **1-bis (ruta b):** los 4 pilares con barra neutra idéntica en tratamiento (cero
   semáforo por pilar, verificable en captura); "Lo que más te frena" presente solo
   si existe un indicador amarillo/rojo.
2. **UNA** acción de mayor impacto visible y nombrada, con CTA funcional (navegación
   verificada) y fallback probado con el motor vacío.
3. Cero "v1" y cero porcentajes secos en la vista (grep + captura); lenguaje
   consistente con Inicio.
4. La tarjeta del Score no usa color de alerta en ninguna banda (captura).
5. Cold-start: usuario nuevo ve el estado de construcción con días restantes
   (captura con usuario recién registrado).
6. Test de 5 segundos emocional sobre la captura: ¿el usuario se siente calificado
   u orientado? (evaluación CPSAO).
7. Capturas antes (`revision-salud/`) / después; suite completa verde; typecheck;
   bundle Android.

## 14. Plan
1. AUD-019 (6 preguntas UX + §29) → DEC-019 elige alternativas → 2. frontend por
piezas → 3. capturas de scroll completo después (incluido cold-start con usuario
nuevo) → 4. IMP-0019 con SHA y juicio razonado contra la intención → validación →
cierre.
