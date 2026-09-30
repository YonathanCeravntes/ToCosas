# ALPHA-005 — Instrumentación de métricas

- **Versión:** 1.0
- **Fecha:** 2026-07-06
- **Autor:** CTO (incorpora el Principio de Claridad Radical del CPSAO)
- **Estado:** Entregado — pendiente de aprobación del CPSAO/Fundador para habilitar
  `ALPHA-006`
- **Referencias cruzadas:** `docs/producto/alpha/ALPHA-001-Objetivos.md`,
  `docs/producto/alpha/ALPHA-003-Preparacion-Tecnica.md` (canales del Consejo
  Fundador), `docs/producto/alpha/ALPHA_REGISTRY.md` (taxonomía de observaciones,
  Claridad Radical), `docs/producto/METRICS.md`.

---

## Objetivo de esta fase

Definir cómo se mide la Alpha, respondiendo tres preguntas distintas, no solo una:
qué hizo el usuario (uso), qué entendió realmente (comprensión), y qué cambió en su
comportamiento financiero gracias a Milla (impacto). Consolidar métricas cuantitativas
y conversaciones cualitativas (`ALPHA-003`) en un solo marco, no en flujos separados.

## 1. Uso — ¿qué hizo el usuario?

Reutiliza fuentes ya existentes, sin desarrollo nuevo: `AiInteractionLog`,
`Challenge`, eventos de simulación (FIN-007/FIN-012). Indicadores: activación
(onboarding + primer registro real), frecuencia de apertura, uso del simulador antes
de una decisión real (objetivo 2 de `ALPHA-001`), retención dentro de la ventana de
30 días.

## 2. Comprensión — ¿qué entendió realmente?

Esta es la capa nueva, por el Principio de Claridad Radical: no basta con que el
usuario haga clic en algo, hay que saber si entendió lo que vio.

- Durante las entrevistas breves ya definidas en `ALPHA-003`, pregunta fija: "¿Puedes
  explicarme con tus palabras qué te dijo el Score / qué te mostró el simulador?" —
  si la explicación del usuario no coincide con lo que la funcionalidad realmente
  comunica, se registra como hallazgo de categoría **Usabilidad** (taxonomía de
  `ALPHA_REGISTRY.md`), nunca como "el usuario no supo usar la app".
- Cualquier confusión detectada por los canales de WhatsApp/Telegram (`ALPHA-003`) se
  clasifica de la misma forma — la primera hipótesis siempre es mejorar diseño o
  lenguaje, no capacitar al usuario (Claridad Radical, `ALPHA_REGISTRY.md`).

## 3. Impacto — ¿qué cambió en su comportamiento financiero?

- Uso del simulador antes de una decisión financiera real reportada (objetivo 2 de
  `ALPHA-001`) — la métrica más directa de cambio de comportamiento, no solo de uso.
- Señal de confianza espontánea (objetivo 3 de `ALPHA-001`): capturada literalmente
  en la pregunta fija de cada entrevista ("¿qué te generó confianza esta semana, y qué
  no?"), sin normalizar todavía a una escala numérica.
- Cero incidentes de integridad financiera o privacidad — condición no negociable
  para cualquier lectura positiva de impacto.

## 4. Cómo se consolidan uso + comprensión + impacto

Una sola tabla de seguimiento por participante (no tres reportes separados), cruzada
además con la matriz de diversidad de `ALPHA-002` — para poder ver si la comprensión o
el impacto varían por perfil, no solo en agregado. Cada fila registra: uso agregado,
hallazgos de comprensión clasificados por la taxonomía de 5 categorías, y evidencia de
impacto (uso del simulador antes de decisión real + cita textual de la señal de
confianza).

## 5. Qué NO mide esta fase

- No mide satisfacción genérica (NPS o similar) — no responde ninguna de las 3
  preguntas del CPSAO, y el objetivo no es "que les guste", es que confíen y cambien
  comportamiento.
- No automatiza el análisis cualitativo — la clasificación por taxonomía es manual en
  esta primera Alpha, consistente con lo ya definido en `ALPHA-003`.

## Conexión con fases siguientes

- `ALPHA-006` (cronograma) debe fijar cuándo se revisa esta tabla de seguimiento
  (no solo al final de los 30 días — revisión intermedia para detectar hallazgos de
  Claridad Radical a tiempo de actuar, no solo de documentarlos).
- `ALPHA-007` (criterios de éxito) se construye directamente sobre estas tres
  dimensiones.

## Aprobación requerida

`ALPHA-006` no inicia hasta que el CPSAO (y, si corresponde, el Fundador) aprueben
esta instrumentación.
