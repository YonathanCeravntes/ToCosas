# ALPHA-001 — Objetivos de la Alpha Cerrada

- **Versión:** 1.0
- **Fecha:** 2026-07-06
- **Autor:** CTO (consolidación de análisis conjunto CPSAO-CTO ya ratificado por el
  Fundador)
- **Estado:** Entregado — pendiente de aprobación del CPSAO/Fundador para habilitar
  `ALPHA-002`
- **Referencias cruzadas:** `docs/producto/lab/IDEA-0002.md`,
  `docs/producto/PRODUCT_DECISIONS.md` (2026-07-06), `docs/producto/PRODUCT_VISION.md`
  §9 (La obsesión de Milla), `docs/producto/alpha/ALPHA_REGISTRY.md`.

---

## Objetivo de esta fase

Fijar, sin ambigüedad, qué se va a validar con la Alpha Cerrada, para que las fases
siguientes (selección de participantes, instrumentación, criterios de éxito) se
diseñen directamente sobre estos objetivos y no se redefinan a mitad de camino.

## Objetivo general de la Alpha

Determinar si Milla cambia el comportamiento financiero real de un usuario — no si
la aplicación funciona correctamente ni si el usuario simplemente la usa.

## Objetivos específicos (hipótesis a validar)

1. **Comprensión.** Un Score explicable (no caja negra) cambia genuinamente cómo el
   usuario entiende su situación financiera, frente a solo mostrarle un número.
2. **Comportamiento previo a la decisión.** El usuario usa el simulador (FIN-007/
   FIN-012) antes de tomar una decisión financiera real (abono, refinanciación) — la
   hipótesis central de la obsesión de Milla ("claridad antes que cobertura").
3. **Confianza.** El usuario decide consultar a Milla antes de una decisión
   financiera importante, de forma espontánea — no basta con abrir la app o registrar
   gastos. Este es el indicador principal de éxito de la Alpha (decisión ratificada
   por el Fundador, `PRODUCT_DECISIONS.md`).
4. **Suficiencia del Copiloto sin IA real.** El Copiloto en modo plantillas sigue
   aportando valor percibido suficiente durante la Alpha, o su ausencia de IA
   generativa limita significativamente la experiencia — esto informa si conviene
   acelerar el DPA/PIA para una fase posterior.
5. **Fricción del periodo financiero.** El día de corte (FIN-016) reduce fricción de
   registro frente a un mes calendario genérico.

## Qué NO busca validar esta Alpha

- No busca validar escalabilidad ni infraestructura de producción a gran escala (eso
  es FIN-010).
- No busca validar monetización — la Alpha no tiene componente de cobro.
- No busca validar el Copiloto con IA generativa real — queda explícitamente fuera
  de alcance (`PRODUCT_DECISIONS.md`, 2026-07-06).

## Cómo se conecta con las fases siguientes

- `ALPHA-002` (selección de participantes) debe elegir perfiles que puedan
  genuinamente ejercitar las hipótesis 2 y 3 (usuarios con al menos una deuda activa
  o decisión financiera pendiente durante la ventana del piloto).
- `ALPHA-005` (instrumentación) debe medir directamente estas 5 hipótesis, no métricas
  de vanidad.
- `ALPHA-007` (criterios de éxito) y `ALPHA-008` (paso a Beta) se construyen sobre el
  cumplimiento verificable de estos objetivos, no sobre percepciones subjetivas.

## Aprobación requerida

Esta fase no habilita el inicio de `ALPHA-002` hasta que el CPSAO (y, si lo considera
necesario, el Fundador) confirmen que estos objetivos son los correctos y suficientes.
