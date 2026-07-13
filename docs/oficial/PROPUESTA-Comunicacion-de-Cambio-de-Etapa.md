# PROPUESTA (para decisión del Fundador) — Comunicación oficial de cambio de etapa

- **De:** CTO (Claude)
- **Para:** Fundador (Yonathan Cervantes)
- **Fecha:** 2026-07-13
- **Estado:** ⚠️ **PROPUESTA EN EVALUACIÓN — NO INCORPORADA A LA GOBERNANZA.** Requiere decisión expresa del Fundador antes de convertirse en regla permanente. No se ha tocado `GOBERNANZA.md` para esto.
- **Origen:** "Consideración adicional" del memo del Fundador (2026-07-13): evaluar si cada cambio relevante de etapa debe ir acompañado de una comunicación oficial al equipo, y presentar la propuesta antes de decidir.

---

## 1. Recomendación del CTO

**Sí, con alcance acotado.** Recomiendo institucionalizar la comunicación de cambio de
etapa, pero **solo para transiciones estructurales**, no para cada ciclo `FIN`. Un
disparador demasiado amplio genera ruido y termina ignorándose; uno bien acotado
mantiene al equipo sincronizado justo cuando el contexto cambia de verdad.

---

## 2. Problema que resuelve

El proyecto opera con varios roles (Fundador, CPSAO, CTO, Arquitecto, Auditor) que no
siempre comparten sesión. Cuando se institucionaliza un cambio estructural (infraestructura,
gobernanza, producción), los roles ausentes siguen trabajando sobre un contexto anterior
— exactamente el riesgo que el Fundador identificó y que este mismo memorando de
sincronización tuvo que corregir *a posteriori*. Un procedimiento permanente convierte esa
corrección reactiva en una garantía proactiva.

## 3. Qué se propone

Un artefacto nuevo, el **Memorando de Sincronización (MSC)**: comunicación oficial,
estructurada y ejecutiva, que el CTO emite al equipo al cerrarse un **cambio de etapa**,
fijando la nueva línea base documental. Formato: el de este memorando
(`MEMO-Sincronizacion-Contexto-Operativo-2026-07-13.md`) como plantilla.

### 3.1 Disparadores propuestos (cuándo SÍ)
Solo transiciones estructurales:
- **Infraestructura:** cierre/apertura de una fase (p. ej. Fase 0 → Fase 1).
- **Gobernanza:** cambio de versión *mayor* de `GOBERNANZA.md` (v3 → v4), o cualquier
  cambio que altere el flujo de roles, permisos o responsabilidades.
- **Producción:** salida a producción, o cruce de un gate legal de `PRODUCCION.md`.
- **Producto:** cierre de un bloque completo de roadmap (p. ej. las 6 experiencias UX), no
  una FIN individual.
- **Arquitectura:** decisión arquitectónica transversal que redefine cómo trabajan varios módulos.

### 3.2 Cuándo NO (para evitar ruido)
- El cierre de una `FIN` individual (ya trazado en `BACKLOG.md` + su correspondencia).
- Un `DEC`/`IMP`/`AUD` rutinario dentro de un ciclo.
- Ajustes menores de documentación.

### 3.3 Contenido mínimo del MSC
Estado actual (una frase) · cambios institucionalizados · decisiones de gobernanza
vigentes · estado real de infraestructura · nuevas responsabilidades · punto exacto de
continuación · lectura mínima obligatoria. Todo rastreable a artefacto oficial (hereda la
regla "la documentación oficial es la única fuente de verdad").

### 3.4 Responsable y trazabilidad
Lo emite el **CTO** (coherente con §36.6, custodio de la calidad técnica y trazabilidad).
Se archiva en `docs/correspondencia/` y se referencia desde `BACKLOG.md`. Se commitea en
el mismo acto (§34).

## 4. Evaluación de conveniencia, impacto y frecuencia

- **Conveniencia:** alta. Elimina el desfase de contexto entre roles, que es un riesgo real
  ya materializado, no hipotético.
- **Impacto operativo:** bajo si el disparador se mantiene acotado a lo estructural. El
  esfuerzo de redacción es marginal frente al costo de que un rol produzca un `ARQ`/`AUD`
  sobre premisas obsoletas.
- **Frecuencia recomendada:** baja por diseño — estimada en unos pocos MSC por trimestre.
  Si empezara a emitirse con más frecuencia, sería señal de que el disparador está mal
  calibrado y habría que revisarlo.
- **Riesgo principal:** que se degrade en "otro documento de trámite". Mitigación: mantener
  el disparador estrictamente estructural y el formato ejecutivo (una página).

## 5. Qué NO hago ahora

Por instrucción expresa del Fundador ("No la incorpores todavía"), **no** he modificado
`GOBERNANZA.md` ni creado un tipo de artefacto nuevo en el flujo. Esta propuesta queda a
la espera de tu decisión.

## 6. Decisión solicitada al Fundador

1. ¿Se institucionaliza el MSC como procedimiento permanente de gobernanza?
2. Si sí: ¿el conjunto de disparadores propuesto en §3.1 es correcto, o lo ajustas?
3. Si sí: al aprobarlo, lo incorporaré como nueva sección de `GOBERNANZA.md` (v3.15),
   citando este documento como origen.

---

**MENSAJE PARA FUNDADOR** — propuesta preparada y NO incorporada, a la espera de tu
decisión sobre los 3 puntos de §6.
