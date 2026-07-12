# ALPHA-004 — Preparación legal

- **Versión:** 1.0
- **Fecha:** 2026-07-06
- **Autor:** CTO
- **Estado:** Entregado — pendiente de aprobación del CPSAO/Fundador para habilitar
  `ALPHA-005`
- **Referencias cruzadas:** análisis técnico-legal del CTO (chat, previo a `IDEA-0002`),
  `docs/producto/PRODUCT_VISION.md` §8 (principio de protección de datos),
  `docs/producto/alpha/ALPHA-003-Preparacion-Tecnica.md`, gates de producción en
  `docs/roadmap/BACKLOG.md`.

---

## Objetivo de esta fase

Resolver, antes del inicio de la Alpha, los tres requisitos legales que ya
identificamos como no negociables incluso para un grupo reducido — sin heredar los
gates que solo aplican a producción completa.

## 1. Requisitos obligatorios para esta Alpha

- **PIA (evaluación de impacto en privacidad, Ley 1581).** Debe completarse antes del
  primer acceso real, no después. Responsable: CTO (ya identificado en la tabla de
  gates de `BACKLOG.md`). Alcance acotado a los datos que efectivamente se procesan
  durante la Alpha (Score real, transacciones/deuda reales, sin Copiloto con IA real).
- **Consentimiento informado + política de privacidad**, incorporando textualmente el
  principio ya ratificado en `PRODUCT_VISION.md` §8: *"Los datos del usuario serán
  almacenados de forma segura y utilizados exclusivamente para prestar los servicios
  de Milla. Nunca serán vendidos, compartidos o utilizados con fines distintos a los
  autorizados por el usuario, salvo cuando exista una obligación legal."* Cada
  participante firma antes de cualquier acceso — no hay excepción por tratarse de
  solo 20 personas.
  - **Redactado bajo transparencia radical** (ampliación del CPSAO, 2026-07-06): el
    consentimiento no es solo un trámite jurídico — es el primer momento en que el
    usuario percibe si Milla merece su confianza. Debe explicar, en lenguaje simple,
    sin tecnicismos: qué información se recopila, para qué se usa, qué información
    nunca se comparte, qué se espera aprender durante la Alpha, y qué papel cumple el
    participante como integrante del Consejo Fundador de Milla.
- **Seguridad base:** secretos rotados, sin endpoints de desarrollo expuestos,
  backups de la base de datos activos durante la ventana del piloto.

## 2. Gates que NO aplican a esta Alpha (diferidos, no eliminados)

- **DPA con Anthropic:** no requerido mientras el Copiloto permanezca en modo
  plantillas (`ALPHA-003`, `PRODUCT_DECISIONS.md`). Si en una fase posterior se
  decide incluir IA generativa real, este gate deja de ser diferible.
- **Política de tiendas (Apple/Google):** no aplica — distribución privada, sin
  publicación en tienda.
- **RevenueCat / precio de Millo+:** no aplica — sin monetización durante la Alpha.

## 3. Quién resuelve qué

- PIA: CTO redacta, Fundador revisa.
- Consentimiento/política de privacidad: requiere participación de un abogado —
  el Fundador es responsable de esa revisión final (mismo patrón que el gate
  equivalente de producción completa en `BACKLOG.md`).
- Seguridad base: CTO, verificable técnicamente (no requiere abogado).

## 4. Qué NO decide esta fase

- No decide si la Alpha se extiende más allá de 30 días — eso es `ALPHA-006`.
- No decide compensación económica a participantes, si la hubiera — decisión de
  negocio del Fundador/CPSAO, no legal en sí misma.

## Conexión con fases siguientes

- `ALPHA-005` (instrumentación) no puede empezar a recolectar datos reales de
  participantes hasta que el consentimiento de esta fase esté firmado — es una
  dependencia dura, no solo una referencia cruzada.

## Aprobación requerida

`ALPHA-005` no inicia hasta que el CPSAO (y, obligatoriamente en este caso, el
Fundador — por tratarse de consentimiento y PIA) aprueben esta preparación legal.
