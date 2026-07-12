# ALPHA-008 — Criterios de paso a Beta

- **Versión:** 1.0
- **Fecha:** 2026-07-06
- **Autor:** CTO
- **Estado:** Entregado — pendiente de aprobación del CPSAO/Fundador. Con esta fase se
  completa la estructura de 8 fases del Programa Alpha (planificación); la ejecución
  real del piloto es un paso posterior, distinto de esta planificación.
- **Referencias cruzadas:** `docs/producto/alpha/ALPHA-001-Objetivos.md` (criterio
  técnico anticipado), `docs/producto/alpha/ALPHA-007-Criterios-Exito.md`,
  `docs/roadmap/BACKLOG.md` (gates de producción, FIN-010).

---

## Objetivo de esta fase

Distinguir con claridad dos cosas que suelen mezclarse: qué es obligatorio para poder
decir "la Alpha terminó bien" (condiciones mínimas de salida), y qué sería deseable
tener antes de abrir Beta a un grupo más amplio (capacidades a construir, no
condiciones de corte).

## 1. Condiciones mínimas de salida de Alpha (obligatorias, no negociables)

Estas son las mismas ya anticipadas desde `ALPHA-001` y confirmadas en `ALPHA-007` —
esta fase no las cambia, las convierte en condición de paso:

1. Cero hallazgos bloqueantes de integridad financiera o de seguridad durante toda la
   ventana de la Alpha (`ALPHA-007`, criterio 6).
2. Infraestructura probada bajo concurrencia real, sin corrupción de datos — la
   Alpha es, precisamente, la primera vez que esto se verifica con tráfico real en
   vez de checkout aislado (extensión de lo cerrado en FIN-012).
3. Evidencia de que una parte significativa del grupo mostró el comportamiento
   objetivo: uso del simulador antes de una decisión real (`ALPHA-007`, criterio 2).
4. Todas las hipótesis de `ALPHA-001` quedaron resueltas en `ALPHA_RESULTS_TEMPLATE.md`
   — validada, descartada, o pendiente con razón documentada. Ninguna sin conclusión.

**Si cualquiera de estas 4 no se cumple, no hay paso a Beta** — se abre una nueva
Alpha o una fase de corrección, según lo que el hallazgo específico requiera (no es
una decisión automática, requiere evaluación del CTO caso por caso).

## 2. Capacidades deseables para Beta (no bloquean la salida de Alpha)

Estas son mejoras que Beta probablemente necesitará, pero cuya ausencia no invalida
el cierre de la Alpha — se convierten en `FIN` o `IDEA` nuevas, según corresponda:

- Ampliar el PIA para cubrir un grupo mayor de usuarios (Beta implica más personas
  que las 20 de Alpha — el mismo gate, pero a mayor escala).
- Decidir si Beta sigue en modo Copiloto plantillas o si se activa IA generativa real
  — esto reabre el gate de DPA con Anthropic si se decide lo segundo; no es una
  decisión técnica de esta fase, es una decisión de producto que debe evaluarse con
  evidencia de la propia Alpha (objetivo 4 de `ALPHA-001`, "suficiencia del Copiloto
  sin IA real").
- Automatizar parte del análisis cualitativo manual que en Alpha se hizo a mano
  (`ALPHA-003`), si el volumen de Beta lo justifica.
- Evaluar si algún hallazgo de "Funcionalidad candidata" en
  `ALPHA_RESULTS_TEMPLATE.md` debe convertirse en `IDEA-XXXX` antes de Beta.

## 3. Qué NO decide esta fase

- No decide si Beta implica monetización — eso sigue dependiendo de los gates ya
  identificados en `BACKLOG.md` (RevenueCat, precio), independientes de la Alpha.
- No decide el tamaño exacto de Beta — es una decisión de negocio posterior,
  informada por lo que la Alpha realmente arroje.

## Con esta fase se completa la planificación del Programa Alpha

Las 8 fases (`ALPHA-001` a `ALPHA-008`) quedan con su estructura definida. El paso
siguiente, una vez aprobada esta fase, ya no es planificación adicional — es ejecutar:
cerrar los gates reales de `ALPHA-004` (PIA, consentimiento firmado, seguridad) y
lanzar la Alpha conforme al cronograma de `ALPHA-006`.

## Aprobación requerida

Con la aprobación de esta fase por el CPSAO/Fundador, el Programa Alpha queda listo
para pasar de planificación a ejecución real.
