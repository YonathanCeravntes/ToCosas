# Decisiones Estratégicas de Producto — Millo

- **Versión:** 1.1
- **Fecha:** 2026-07-06
- **Autor:** CTO
- **Estado:** Vigente — registro histórico append-only
- **Historial de cambios:**
  - v1.0 (2026-07-06) — creación del documento; se registran retroactivamente las
    decisiones estratégicas de producto ya tomadas durante el roadmap técnico
    (FIN-001 a FIN-016), para no perder ese contexto fuera de `docs/roadmap/BACKLOG.md`.
  - v1.1 (2026-07-06) — se registran 4 decisiones ratificadas por el Fundador tras el
    análisis conjunto CPSAO-CTO sobre la Alpha Cerrada (ver `IDEA-0002`).

---

> Registro histórico append-only de decisiones estratégicas: por qué se implementó,
> por qué se descartó, o por qué se eligió determinado modelo. Complementa (no
> sustituye) el Historial técnico de `docs/roadmap/BACKLOG.md` — aquí vive el "por
> qué" de producto/negocio; allá vive el "cómo" técnico.

## Registro

- **2026-07-04/05 — Se implementó el Score Millo explicable (no una caja negra).**
  Motivo: diferenciador de producto frente a apps que solo agregan transacciones sin
  dar una lectura clara de salud financiera (ARQ-0001, ratificado en DEC-0004).
- **2026-07-05 — Se descartó pgvector/RAG para la memoria del Copiloto (FIN-006).**
  Motivo: criterio de evidencia — no había evidencia de que la memoria estructurada
  sin embeddings fuera insuficiente; se prefirió la solución más simple y auditable
  hasta que exista esa evidencia (ARQ-0006 §4.6, cierra el gate de ARQ-0001 §5.2).
  Reemplaza este mismo criterio para la clasificación discrecional en FIN-007 y FIN-013.
  Sin decisión de revisar todavía.
- **2026-07-06 — Se eligió el canal de cobro solo-tiendas (IAP/RevenueCat) para
  Millo+**, descartando web/pasarela local para este ciclo. Motivo: decisión directa
  del fundador (DEC-0009 §4.5); el puerto de pago quedó diseñado agnóstico para no
  cerrar la puerta a un canal web futuro si la economía de la comisión de tienda lo
  justifica.
- **2026-07-06 — Se decidió NO fijar un precio de producción para Millo+ todavía.**
  Motivo: el fundador señaló que el precio depende de costos variables reales por
  usuario (Anthropic, WhatsApp Business API) que no se habían medido; se construyó
  telemetría de costo (`GET /billing/admin/cost-report`) antes de fijar precio
  (DEC-0009 §4.6).
- **2026-07-06 — Se decidió que la proyección de ahorro con interés compuesto (FIN-015)
  sea solo ilustrativa, sin que Millo capte ni ofrezca rendimiento real.** Motivo:
  evitar convertir a Millo en un producto financiero regulado (equivalente a captación)
  sin pasar por una revisión legal de fondo — decisión de riesgo, no solo de producto.
- **2026-07-06 — Se decidió que la siguiente gran meta de producto, antes de la salida
  completa a producción (FIN-010), sea una Alpha Cerrada con ~20 usuarios reales**
  (`IDEA-0002`), en vez de continuar desarrollando funcionalidades nuevas. Motivo:
  Milla tiene 13 funcionalidades cerradas que ningún usuario real ha usado todavía;
  antes de comprometerse a un lanzamiento general, se prioriza aprender de un grupo
  reducido y controlado.
- **2026-07-06 — Se adoptó el principio de que la Alpha Cerrada valida cambio de
  comportamiento financiero real del usuario, no solo el funcionamiento de la
  aplicación.** Motivo: evitar que el éxito del piloto se mida por uso superficial
  (aperturas, registros) en vez de por evidencia de que el producto influye en
  decisiones financieras reales.
- **2026-07-06 — Se adoptó la confianza como indicador principal de éxito de la
  Alpha: que el usuario decida consultar Milla antes de tomar una decisión
  financiera importante**, no solo que use la aplicación o registre gastos. Motivo:
  es el indicador más exigente y más alineado con la obsesión de producto ("claridad
  antes que cobertura", `PRODUCT_VISION.md` §9).
- **2026-07-06 — Se decidió que el Copiloto opere en modo plantillas (sin IA
  generativa) durante la Alpha Cerrada**, dejando la IA real fuera de su alcance
  inicial. Motivo: reducir complejidad técnica y legal — evita el gate de DPA con
  Anthropic mientras se valida el resto del producto con usuarios reales.
