# ALPHA-003 — Preparación técnica

- **Versión:** 1.0
- **Fecha:** 2026-07-06
- **Autor:** CTO (incorpora la observación estratégica del CPSAO — participantes como
  "Consejo Fundador de Milla")
- **Estado:** Entregado — pendiente de aprobación del CPSAO/Fundador para habilitar
  `ALPHA-004`
- **Referencias cruzadas:** `docs/producto/alpha/ALPHA-001-Objetivos.md`,
  `docs/producto/alpha/ALPHA-002-Seleccion-Participantes.md`,
  `docs/producto/alpha/ALPHA_REGISTRY.md`.

---

## Objetivo de esta fase

Dejar lista la infraestructura técnica mínima para que los ~20 participantes puedan
usar Milla de forma controlada, **y** para que puedan participar activamente como
Consejo Fundador — no solo generar datos de uso, también explicar su razonamiento.

## 1. Acceso controlado (sin desarrollo nuevo)

- Activar `HEALTH_SCORE_PRODUCTION_ENABLED` para el grupo cerrado (flag ya construido,
  DEC-0004 §10.3).
- Mantener `COPILOT_PRODUCTION_ENABLED` **apagado** — el Copiloto opera en modo
  plantillas durante toda la Alpha, por decisión ya ratificada (`PRODUCT_DECISIONS.md`,
  2026-07-06). No requiere DPA/PIA de IA generativa.
- Distribución privada (APK directo o TestFlight), sin paso por revisión de tiendas.
- Allowlist de acceso: solo los ~20 usuarios seleccionados en `ALPHA-002` pueden
  autenticarse durante la ventana del piloto.
- Validación de concurrencia real bajo uso — extensión natural de lo ya verificado en
  el cierre de FIN-012, ahora bajo tráfico real en vez de checkout aislado.

## 2. Canales del "Consejo Fundador" (nuevo, por solicitud del CPSAO)

El objetivo declarado por el CPSAO es entender **por qué** ocurre el comportamiento,
no solo **qué** ocurrió. Para eso, sin construir infraestructura nueva pesada,
propongo reutilizar los canales ya existentes en el producto (WhatsApp/Telegram,
`PRODUCT_VISION.md` — registro por app o mensajería):

- **Reporte de dificultades:** un canal directo (grupo o número dedicado de
  WhatsApp/Telegram) donde cada participante puede reportar fricciones en el momento,
  sin esperar a una encuesta cerrada.
- **Propuestas de mejora:** el mismo canal, sin formulario separado — se etiqueta y
  se consolida manualmente durante `ALPHA-005`/`ALPHA-006`, no requiere desarrollo.
- **Explicación de decisiones:** 2-3 entrevistas breves por participante durante la
  ventana de 30 días (no una sola al final), enfocadas específicamente en decisiones
  financieras reales que haya tomado — para capturar el razonamiento mientras está
  fresco, no reconstruido después.
- **Señales de confianza:** una pregunta corta y consistente en cada entrevista
  ("¿qué te generó confianza en Milla esta semana, y qué no?") — se registra
  literalmente, sin normalizar la respuesta a una escala numérica todavía.

## 3. Qué NO construye esta fase

- No se construye un panel de feedback dentro de la app — sería desarrollo de
  producto nuevo, y el alcance de la Alpha excluye nuevas funcionalidades (ver
  `ALPHA-001`, "qué NO busca validar").
- No se automatiza el análisis cualitativo — la consolidación de conversaciones es
  manual en esta primera Alpha; automatizarla sería una `IDEA` futura, no parte de
  este programa.

## Conexión con fases siguientes

- `ALPHA-005` (instrumentación) debe definir explícitamente cómo se consolidan estas
  conversaciones junto con las métricas cuantitativas — no como flujos separados.
- `ALPHA-006` (cronograma) debe fijar el calendario de las 2-3 entrevistas por
  participante dentro de la ventana de 30 días.

## Aprobación requerida

`ALPHA-004` (preparación legal) no inicia hasta que el CPSAO (y, si corresponde, el
Fundador) aprueben esta preparación técnica.
