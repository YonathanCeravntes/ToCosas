# Gobernanza oficial del proyecto Milla — Versión 3.0 (CONSOLIDADA, pendiente de autorización final)

- **Basada en:** Propuesta del Fundador "Evolución de la Gobernanza de Milla — v3.0" (2026-07-06) + los 5 refinamientos del CTO, todos aprobados conceptualmente por el Fundador el mismo día.
- **Estado:** Versión consolidada lista para revisión final del Fundador. **No entra en vigor ni se aplica a `docs/GOBERNANZA.md` hasta autorización expresa.**
- **Alcance de esta versión:** añade una capa estratégica de producto **previa** al Backlog. No modifica ninguna regla permanente ya vigente de v2.0 (referencia inmutable de commit, vistas minimizadas para LLM, un FIN a la vez, documentación como única fuente de verdad, estado oficial por artefactos verificables, acciones correctivas). No afecta el estado operativo actual (FIN-012 sigue siendo la única funcionalidad activa).

---

## 1. Organigrama actualizado

```
                     FUNDADOR
               (Yonathan Cervantes)
                         │
                         ▼
     CPSAO — Chief Product, Strategy & AI Officer
                    (ChatGPT)
                         │
                         ▼
                CTO (Claude — Líder)
                         │
         ┌───────────────┴───────────────┐
         ▼                               ▼
Arquitecto (Claude)            Auditor (Claude)
```

El CPO se amplía a **CPSAO**. Sigue sin diseñar arquitectura, sin programar, sin
modificar el Backlog, sin implementar. Su función es generar valor estratégico
permanente para Milla: producto, experiencia de usuario, estrategia de mercado,
capacidades de IA (a nivel de producto, no de implementación — sección 3), innovación,
análisis competitivo, monetización, retención, y roadmap a 1/3/5 años.

**Frontera obligatoria en Inteligencia Artificial (refinamiento #1):** el CPSAO propone
capacidades de IA desde la perspectiva de producto (qué valor aportaría al usuario),
**nunca** aspectos técnicos de arquitectura, modelos, datos o privacidad — eso sigue
siendo competencia exclusiva del CTO/Arquitecto, bajo la regla ya vigente de "vistas
minimizadas obligatorias para toda tool de LLM". Toda propuesta de categoría IA debe
incluir, de forma obligatoria y textual, la nota:

> "Requiere evaluación técnica del CTO antes de autorizar la elaboración del Blueprint."

## 2. Nuevo dominio documental — `docs/producto/`

```
docs/producto/
├── PRODUCT_VISION.md          — misión, visión, propuesta de valor, público objetivo,
│                                 diferenciadores, principios del producto.
├── COMPETITIVE_ANALYSIS.md    — aplicaciones comparadas, fortalezas, debilidades,
│                                 oportunidades, diferenciadores. Documento vivo, se
│                                 actualiza (no acumula una entrada por idea).
├── MONETIZATION.md            — modelos de negocio vigentes y en evaluación
│                                 (freemium, premium, marketplace, publicidad,
│                                 servicios financieros, afiliados, Open Banking,
│                                 alianzas).
├── USER_RESEARCH.md           — registro cronológico append-only (mismo patrón que
│                                 el Historial de BACKLOG.md): comentarios,
│                                 necesidades, solicitudes, problemas, comportamiento
│                                 de usuarios.
├── PRODUCT_DECISIONS.md       — registro histórico append-only de decisiones
│                                 estratégicas (por qué se implementó/descartó X,
│                                 por qué se eligió determinado modelo).
└── lab/
    ├── LAB.md                 — tabla maestra (ID · Nombre · Categoría · Estado ·
    │                             Evaluación del CTO), mismo rol que BACKLOG.md
    │                             para las FIN.
    ├── IDEA-0001.md
    ├── IDEA-0002.md
    └── ...
```

**Reestructuración del laboratorio (refinamiento #2):** en vez de un único
`PRODUCT_LAB.md` de crecimiento indefinido, cada idea vive en su propio documento
(`IDEA-XXXX.md`), indexado en `LAB.md` — la misma filosofía documental ya probada en
`ARQ/AUD/DEC/IMP` + `BACKLOG.md`. Mejora trazabilidad y escalabilidad a medida que el
laboratorio acumula años de ideas.

**Contenido mínimo de un `IDEA-XXXX.md`:** Nombre · Categoría (producto / IA /
monetización / retención / UX / competencia) · Problema u oportunidad · Hipótesis de
valor · Evidencia de mercado si aplica (citada y verificable, no asumida — sección 5) ·
Riesgos · Estado (`en laboratorio` → `evaluada por CTO` → `aprobada → Blueprint` /
`descartada`, con fecha y motivo) · Referencia cruzada a `PRODUCT_DECISIONS.md` cuando
su destino final quede registrado ahí.

## 3. Flujo estratégico

```
Idea → PRODUCT LAB → Evaluación del CTO → Blueprint → Backlog → ARQ → AUD → DEC → IMP → VALIDACIÓN → CERRADO
```

El CTO evalúa cada idea del laboratorio (viabilidad, prioridad, impacto, costo,
dependencias, beneficio esperado) antes de autorizar al Arquitecto a elaborar un
Blueprint. El Blueprint sigue siendo exploratorio — no autoriza implementación. El
Auditor no participa hasta que una funcionalidad entra oficialmente al proceso de
desarrollo (fase `AUD` de un `FIN` ya creado).

## 4. Protección del embudo estratégico (refinamiento #3 — regla dura)

- **Ninguna `IDEA` autoriza desarrollo.**
- **Ningún Blueprint modifica el Backlog.**
- **El Backlog solo se modifica por acción explícita del CTO**, mediante la creación
  formal de nuevas `FIN`.

Esta regla existe para que el laboratorio nunca se convierta en una segunda puerta de
entrada al desarrollo — la misma protección que ya motivó la regla "un FIN a la vez",
aplicada aquí un nivel más arriba en el embudo, antes de que una idea llegue siquiera
al Backlog.

## 5. Cadencia de revisión del laboratorio (refinamiento #4, con el ajuste del Fundador)

La revisión del CTO sobre `LAB.md` **no es continua**. Se inicia bajo cualquiera de
estas tres condiciones:
1. Cuando el Fundador lo solicite.
2. Al finalizar una `FIN` (momento en que el CTO ya revisa el Backlog para decidir qué
   sigue).
3. Cuando el propio CTO identifique una oportunidad estratégica que justifique abrir
   una revisión extraordinaria, por iniciativa propia.

Objetivo: mantener el foco de "un FIN a la vez" sin impedir que el producto evolucione
de forma continua en el laboratorio.

## 6. Verificación de hechos del CPSAO (refinamiento #5)

Toda propuesta del CPSAO relacionada con mercado, competencia, tendencias,
estadísticas, tecnologías o comportamiento de usuarios se considera **hipótesis
estratégica** hasta que el CTO la valide contra fuentes verificables (búsqueda real,
no asumida) cuando corresponda — el mismo estándar de rigor ya aplicado a cualquier
afirmación técnica de Arquitecto o Auditor a lo largo de todo el proyecto (nunca
aprobar por informe, siempre verificar contra la fuente).

## 7. Principios estratégicos permanentes

- El producto evoluciona continuamente; nunca deja de innovar.
- El desarrollo permanece estable; no se interrumpe por nuevas ideas.
- La innovación no modifica el Backlog; las ideas esperan su momento.
- El CTO protege el foco del desarrollo; la innovación nunca genera caos operativo.
- Toda innovación debe demostrar valor; no se implementa solo porque sea técnicamente
  posible.

## 8. Qué NO cambia respecto de Gobernanza v2.0

- El flujo de desarrollo (`FIN → ARQ → AUD → DEC → IMP → VALIDACIÓN → CERRADO`) y la
  regla "un FIN a la vez" permanecen exactamente iguales.
- El Backlog sigue siendo administrado exclusivamente por el CTO.
- Las 5 reglas permanentes de v2.0 (referencia inmutable, vistas minimizadas,
  documentación como única fuente de verdad, estado oficial por artefactos
  verificables, acciones correctivas) permanecen sin cambios.
- Arquitecto y Auditor mantienen exactamente sus responsabilidades actuales.

---

## Próximos pasos (al recibir autorización final)

1. Integrar el contenido de las secciones 1–7 de este documento en `docs/GOBERNANZA.md`
   como versión 3.0 (preservando íntegras todas las reglas permanentes de v2.0).
2. Crear el scaffold de `docs/producto/` (los 5 documentos base + `lab/LAB.md` con la
   tabla maestra vacía, lista para la primera `IDEA-0001`).
3. Registrar la adopción en el Historial de `docs/roadmap/BACKLOG.md`.
4. Confirmar el estado operativo sin cambios: FIN-012 permanece como única
   funcionalidad activa; el nuevo flujo estratégico no genera ninguna entrada nueva de
   Backlog por sí mismo.

---
*Versión consolidada presentada por el CTO para revisión final del Fundador. No es
oficial hasta autorización expresa.*
