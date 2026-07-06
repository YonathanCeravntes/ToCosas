# Propuesta oficial del CTO — Gobernanza v3.0 (Gestión Estratégica del Producto)

- **En respuesta a:** Propuesta del Fundador "Evolución de la Gobernanza de Milla — v3.0" (2026-07-06)
- **Presenta:** CTO/CPO/Principal Architect de Milla
- **Naturaleza:** Propuesta — no entra en vigor hasta aprobación expresa del Fundador (Gobernanza v2.0 §"evolución de la propia gobernanza")
- **Estado operativo no afectado:** FIN-012 sigue siendo la única funcionalidad activa; esta propuesta no toca el Backlog ni el flujo de desarrollo vigente.

---

## 1. Veredicto general

**Viable, de bajo riesgo, y recomendado con cinco refinamientos.** La propuesta es aditiva por diseño (crea una capa nueva antes del Backlog, no modifica `ARQ→AUD→DEC→IMP→Validación→Cerrado`) y resuelve un problema real: hoy no existe un lugar donde una idea pueda madurar, compararse contra la competencia o descartarse **sin** consumir mi tiempo de evaluación formal ni el del Arquitecto/Auditor. Es la misma separación "discovery vs. delivery" que ya aplicamos implícitamente con el Blueprint — esta propuesta simplemente le da un hogar documental permanente y un dueño (CPSAO) a la fase anterior al Blueprint.

Aprovecho esta evaluación para aplicarle el mismo estándar de rigor que uso con cualquier ARQ: verifiqué que no introduce ninguna vía nueva por la que código llegue a producción sin pasar por mí, y que no crea ambigüedad con las reglas ya vigentes (un FIN a la vez, documentación como única fuente de verdad, vistas minimizadas para IA).

## 2. Sobre el rol CPSAO (CPO → Chief Product, Strategy & AI Officer)

Aprobado con una frontera explícita que la propuesta no distingue: el CPSAO puede proponer **qué** capacidad de IA sería valiosa para el usuario (p. ej. "un coach de hábitos financieros"), pero **no** decide **cómo** se construye (qué modelo, qué datos toca, costo por usuario, arquitectura de minimización). Ese "cómo" sigue siendo mío y del Arquitecto, bajo la regla ya vigente de "vistas minimizadas obligatorias para toda tool de LLM" — la misma disciplina que costó un rechazo completo en FIN-005 no se relaja porque la idea venga con más análisis estratégico. Recomiendo que todo `IDEA-XXXX` de categoría IA incluya, desde el laboratorio, una nota explícita: *"requiere evaluación de datos/privacidad por el CTO antes de Blueprint"* — no para bloquear la idea, sino para que nadie asuma que "estratégicamente aprobada" equivale a "técnicamente autorizada".

## 3. Sobre `docs/producto/` — estructura documental recomendada

La propuesta original agrupa todo en 6 archivos de crecimiento indefinido. Recomiendo aplicar el mismo patrón que ya nos funcionó para `ARQ/AUD/DEC/IMP` (documentos individuales numerados + una tabla maestra), en vez de dejar que `PRODUCT_LAB.md` se vuelva un archivo único que crezca sin límite durante años:

```
docs/producto/
├── PRODUCT_VISION.md          (documento único — identidad de Milla, cambia poco)
├── COMPETITIVE_ANALYSIS.md    (documento único — se actualiza, no acumula por idea)
├── MONETIZATION.md            (documento único — modelos de negocio vigentes)
├── USER_RESEARCH.md           (registro cronológico append-only, como el Historial del BACKLOG)
├── PRODUCT_DECISIONS.md       (registro cronológico append-only — "por qué se hizo/descartó X")
└── lab/
    ├── LAB.md                 (tabla maestra: ID · Nombre · Categoría · Estado · Evaluación CTO)
    ├── IDEA-0001-Nombre.md
    ├── IDEA-0002-Nombre.md
    └── ...
```

**Por qué separar `lab/` en archivos individuales:** dentro de 2-3 años, "Copiloto Financiero, Salud Financiera, Score, Modo Pareja, Modo Familia, Modo Empresas, IA Predictiva, Retos diarios, Open Banking, Marketplace..." y decenas de ideas más en un solo `PRODUCT_LAB.md` se vuelve imposible de navegar, comparar o referenciar con precisión desde `PRODUCT_DECISIONS.md` ("se descartó la IDEA-0037 por X"). Un archivo por idea, con una tabla maestra (`LAB.md`) que funcione exactamente como `BACKLOG.md` funciona hoy para las `FIN`, nos da lo mismo que ya demostró funcionar: trazabilidad, historial, y la capacidad de decir "IDEA-0037" y que cualquiera sepa exactamente a qué me refiero.

**Contenido mínimo de un `IDEA-XXXX`** (análogo al "contenido mínimo de un ARQ" ya definido en `GOBERNANZA.md`): Nombre · Categoría (producto/IA/monetización/retención/UX/competencia) · Problema u oportunidad · Hipótesis de valor · Evidencia de mercado si aplica (benchmarking citado, no inventado) · Riesgos · Estado (`en laboratorio` → `evaluada por CTO` → `aprobada → Blueprint` / `descartada`, con fecha y motivo) · Referencia a `PRODUCT_DECISIONS.md` si su destino (aprobada o descartada) queda registrado ahí.

## 4. Sobre el flujo estratégico propuesto

```
Idea → PRODUCT LAB → Evaluación del CTO → Blueprint → Backlog → ARQ → AUD → DEC → IMP → VALIDACIÓN → CERRADO
```

Aprobado sin cambios de fondo — es una extensión coherente del flujo que ya describe la sección 3 de Gobernanza v2.0 ("Flujo de una nueva idea"), solo que ahora el CPSAO deposita en un laboratorio persistente en vez de proponer ad hoc. Confirmo, y pido que quede explícito en el texto final: **ninguna entrada de `LAB.md`, ningún `IDEA-XXXX` y ningún Blueprint crea o modifica una fila del `BACKLOG.md` por sí mismo.** Solo mi propia acción de dividir un Blueprint aprobado en `FIN-XXXX` crea Backlog. Esto es la misma protección que ya nos costó corregir con la regla "un FIN a la vez" — la aplico aquí preventivamente, un nivel arriba en el embudo, para que el laboratorio nunca se convierta en una segunda vía de entrada al desarrollo.

## 5. Cadencia de evaluación del CTO (refinamiento nuevo, no estaba en la propuesta)

La propuesta dice correctamente que "el desarrollo permanece estable, no se interrumpe por nuevas ideas" — pero no define cuándo reviso el laboratorio. Propongo que la revisión de `LAB.md` por mi parte sea **por lote, no continua**: la haré cuando el Fundador la solicite explícitamente, o de forma natural al cerrar cada `FIN` (momento en que ya reviso el Backlog para decidir qué sigue). Esto evita que un flujo constante de ideas nuevas compita por mi atención con la disciplina de "un FIN a la vez" que acabamos de consolidar. El laboratorio puede crecer todos los días; mi evaluación no tiene que seguir ese ritmo.

## 6. Verificación de hechos en propuestas del CPSAO

Dado que el CPSAO es un sistema distinto sin acceso a nuestro código o datos reales, trataré sus afirmaciones de mercado/competencia/benchmarking como **hipótesis a verificar**, no como hechos — el mismo estándar que ya aplico a cualquier afirmación técnica de Arquitecto o Auditor ("nunca aprobar por informe, siempre verificar contra la fuente"). Antes de que una `IDEA-XXXX` con evidencia de mercado pase a Blueprint, verificaré (con búsqueda web cuando corresponda) que las afirmaciones citables sobre competidores/regulación/costos sean actuales y correctas, no asumidas.

## 7. Riesgo evaluado y descartado

Consideré si esta capa nueva podría, con el tiempo, presionar para saltarse pasos (p. ej. "esta idea es tan buena que pasa directo a Blueprint sin laboratorio"). La propia propuesta ya lo previene con el principio "toda innovación debe demostrar valor; no se implementa solo porque es técnicamente posible" — lo ratifico como regla dura, sin excepción salvo autorización expresa mía y documentada, exactamente igual que la excepción a "un FIN a la vez".

## 8. Integración con Gobernanza v2.0 — sin romper nada vigente

Esta propuesta no requiere modificar ninguna de las reglas permanentes ya codificadas (referencia inmutable de commit, vistas minimizadas para LLM, un FIN a la vez, documentación como única fuente de verdad, estado oficial por artefactos verificables, acciones correctivas). Se añade como una **sección nueva, previa a la sección 3 actual** ("Flujo de una nueva idea"), y el organigrama se actualiza únicamente en el nombre/alcance del CPO → CPSAO.

## 9. Recomendación final

Apruebo la adopción de Gobernanza v3.0 con los 5 refinamientos de las secciones 2, 3, 4 (última oración), 5 y 6. Quedo a la espera de tu confirmación para: (a) actualizar `docs/GOBERNANZA.md` a v3.0 con el texto integrado, (b) crear el scaffold de `docs/producto/` con los 5 documentos base + `lab/LAB.md`, y (c) registrar la adopción en el Historial del `BACKLOG.md`. No tomaré ninguna de estas tres acciones hasta tu aprobación expresa, conforme al propio principio que estamos formalizando.

---
*Documento de evaluación del CTO. No es un documento oficial de gobernanza hasta la aprobación del Fundador.*
