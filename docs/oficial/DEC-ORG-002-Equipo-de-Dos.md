# DEC-ORG-002 — Equipo de dos: Fundador decide, Arquitecto ejecuta

- **Versión:** 1.0
- **Fecha:** 2026-09-27
- **Autor:** Fundador (Yonathan Cervantes) — instrucción textual: *"Ya CTO, no existe,
  solo seremos tú y yo, yo tomo decisiones. Haz las soluciones y todo lo necesario."*
  Redactada e incorporada a `docs/GOBERNANZA.md` §44 por el Arquitecto en el mismo acto
  (v3.20 → v3.21, §34).
- **Estado:** Aprobado por el Fundador (decisión verbal en sesión, 2026-09-27).
- **Supersede parcialmente:** `DEC-ORG-001` (el rol CTO deja de existir).

---

## Objetivo

Reducir el equipo a dos actores reales y quitar toda intermediación: el **Fundador
decide**, el **Arquitecto ejecuta**. Se conservan los controles que protegen al
producto (pruebas antes de integrar, fuente única §32, claridad radical §42, despliegue
seguro §40, formato regional §39) y se eliminan las fases que existían solo para que un
tercer rol auditara.

## 1. Eliminación del rol CTO

El rol CTO deja de existir. Sus funciones se reparten así:

**Pasan al Fundador (decisión):** aprobar o rechazar propuestas, fijar prioridades,
autorizar cambios de reglas de negocio, experiencia, alcance o gobernanza, encender
gates legales/de producción, decidir precio y monetización.

**Pasan al Arquitecto (ejecución):** análisis técnico, diseño, implementación,
pruebas, integración a GitHub, administración del Backlog y de `ESTADO_PROYECTO.md`,
registro de defectos, publicación OTA por la vía segura (§40) cuando el Fundador la
ejecute desde su equipo, mantenimiento de la documentación oficial, y **autoridad
correctiva inmediata** ante bugs, incidentes y regresiones (heredada de §43.7).

## 2. Flujo oficial

```
Fundador (decide) ⇄ Arquitecto (ejecuta, verifica, documenta)
```

- **Paso 1 — Fundador:** define la necesidad o aprueba una propuesta del Arquitecto.
- **Paso 2 — Arquitecto:** ejecuta de punta a punta (diseño + implementación + pruebas
  + documentación) y entrega con SHA y evidencia (suites, capturas cuando aplique).
- **Paso 3 — Fundador:** valida en su dispositivo (APK Beta) y cierra o devuelve.
- **Paso 4 — Freno obligatorio:** si durante la ejecución aparece una decisión que
  cambia reglas de negocio, definición §32, experiencia de usuario visible, alcance,
  legal/gates o gobernanza, el Arquitecto **se detiene y pregunta** antes de seguir.
  Un bug se corrige sin preguntar; una regla no.

## 3. Ciclo documental compacto

Para una FIN ya no hay `ARQ` → `DEC` → `IMP` como tres documentos: hay **un documento
`FIN-XXXX` en `docs/arquitectura/`** con las 14 secciones del ARQ más dos finales:
*"Implementado"* (qué se construyó, SHA, suites) y *"Decisiones del Fundador"* (qué
decidió y cuándo). El Backlog sigue siendo la tabla maestra; `ESTADO_PROYECTO.md` el
snapshot. `REGISTRO-DEFECTOS.md` sigue append-only.

El Blueprint (§6) sigue siendo exploratorio; ahora es el **Fundador** quien elige qué
candidatas `BP-nn` se convierten en FIN, y el Arquitecto las numera en el Backlog.

## 4. Controles que se conservan sin cambio

§15 verificación de hechos · §29 tono · §31 filtro "qué perdería el usuario" · §32
fuente única · §33 EOC · §34 commit en el mismo acto · §35 git no destructivo · §36.3
testing antes de integrar · §36.4 no escalar infraestructura sin autorización · §38
defectos · §39 formato regional · §40 gate OTA · §41 continuidad Beta · §42 claridad
radical · aviso anticipado sobre Registrar (queda satisfecho para las tareas que el
Fundador ordena expresamente, como este encargo).

## 5. Verificación sin tercero

Al no haber auditor, la verificación se apoya en **artefactos, no en personas**: `tsc`
back+front limpios, suites unitarias y e2e verdes contra Postgres real, grep de §32/§39
en cada entrega, y la prueba del Fundador en el dispositivo. El Arquitecto declara
explícitamente lo que **no** pudo verificar.

## 6. Autorización inmediata

Con esta decisión el Fundador autoriza al Arquitecto a ejecutar el
`BLUEPRINT-0001` completo por olas (H0 → H1 → H2), incluido `SPRINT-PULIDO-001` y las
candidatas que tocan el módulo Registrar, deteniéndose únicamente ante las decisiones
del Paso 4.
