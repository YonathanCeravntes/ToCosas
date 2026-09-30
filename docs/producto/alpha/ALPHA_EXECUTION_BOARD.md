# Tablero de Ejecución — Programa Alpha

- **Versión:** 1.2
- **Fecha:** 2026-07-06
- **Autor:** CTO
- **Estado:** Vigente — documento vivo, se actualiza por actividad, no por fase.
  Reemplaza la producción de nuevos documentos de planificación (directriz del
  CPSAO, 2026-07-06: "no autorizo la creación de nuevas fases ALPHA relacionadas con
  planificación"). Es la única fuente oficial del estado operativo de la Alpha
  (directriz del CPSAO, 2026-07-06) — no se crean documentos paralelos de
  seguimiento.
- **Historial:** v1.0 (creación) → v1.1 (PIA entregado, cuello de botella
  identificado: 2 decisiones del Fundador sobre retención/eliminación de datos) →
  v1.2 (Fundador decidió retención/anonimización; PIA y consentimiento cerrados en
  producto/negocio; nuevo cuello de botella: revisión legal, categoría Externa).
- **Referencias cruzadas:** `docs/producto/alpha/ALPHA-004-Preparacion-Legal.md`,
  `docs/producto/alpha/ALPHA-003-Preparacion-Tecnica.md`,
  `docs/producto/alpha/ALPHA-006-Cronograma-Operativo.md`,
  `docs/producto/alpha/CONSENTIMIENTO-ALPHA.md`.

---

Leyenda de estado: ⏳ no iniciada · 🔄 en curso · 🚧 bloqueada (esperando a otra) ·
✅ lista

| # | Actividad | Categoría | Responsable | Depende de | Estado | Próxima acción concreta |
|---|-----------|-----------|-------------|------------|--------|--------------------------|
| 1 | Identificar candidatos reales por celda de la matriz de diversidad (`ALPHA-002`) | Inmediata | Fundador/CPSAO | — | ⏳ | Hacer la lista de 20-25 candidatos (margen sobre 20) con su celda asignada |
| 2 | Crear canal de WhatsApp/Telegram para el Consejo Fundador (`ALPHA-003`) | Inmediata | Fundador | — | ⏳ | Crear el grupo/número y guardar el enlace en este tablero |
| 3 | Revisión legal del `CONSENTIMIENTO-ALPHA.md` (transparencia radical, v1.1 con política de retención/anonimización) | Depende de terceros | Fundador + abogado | Ninguna — listo para enviar | ⏳ | Enviar `CONSENTIMIENTO-ALPHA.md` v1.1 + `PIA-ALPHA.md` v1.1 juntos al abogado |
| 4 | Completar el PIA (evaluación de impacto en privacidad) | Depende de terceros (revisión) | CTO redactó, Fundador decidió | Ninguna | ✅ | Cerrado en producto/negocio (v1.1, decisión del Fundador incorporada). Pendiente solo el concepto del abogado sobre anonimización vs. pseudonimización (actividad 3) |
| 5 | Verificar seguridad base (secretos rotados, sin endpoints de dev expuestos, backups activos) | Desarrollo técnico | CTO | — | ⏳ | CTO ejecuta la verificación contra el repo real y reporta hallazgos |
| 6 | Activar `HEALTH_SCORE_PRODUCTION_ENABLED` solo para el grupo cerrado (allowlist) | Desarrollo técnico | CTO/Arquitecto | Actividad 1 (para saber a quién dar acceso) | 🚧 | Definir mecanismo de allowlist (flag por usuario, no global) |
| 7 | Confirmar que `COPILOT_PRODUCTION_ENABLED` permanece apagado durante la Alpha | Inmediata (ya decidido) | CTO | — | ✅ | Ninguna — ya es el estado por defecto, solo verificar que no se active por error |
| 8 | Preparar distribución privada (APK directo o TestFlight) | Desarrollo técnico | CTO/Arquitecto | — | ⏳ | Decidir canal (APK vs TestFlight) y probarlo con 1 dispositivo antes del lanzamiento |
| 9 | Validar concurrencia bajo uso real (extensión de lo cerrado en FIN-012) | Desarrollo técnico | CTO | Actividad 8 | 🚧 | Definir cómo monitorear sin instrumentación nueva pesada |
| 10 | Fijar fecha de inicio de la ventana de 30 días (`ALPHA-006`) | Inmediata | Fundador | Actividades 3, 4, 5 completas | 🚧 | El Fundador propone fecha una vez los gates legales estén resueltos |
| 11 | Agendar las 3 entrevistas por participante dentro del cronograma (`ALPHA-006`) | Inmediata | Fundador/CPSAO | Actividad 1 | ⏳ | Bloquear fechas aproximadas (~día 7-10, ~15-18, ~24-27) en calendario |

## Cuello de botella actual (tras la decisión del Fundador sobre retención/anonimización)

**Categoría del bloqueo: Externa (terceros).**

El bloqueo de decisión del Fundador quedó resuelto (retención 60 días,
anonimización por defecto con salvedad de pseudonimización, ratificado 2026-07-06).
`PIA-ALPHA.md` v1.1 y `CONSENTIMIENTO-ALPHA.md` v1.1 quedan actualizados y
coherentes entre sí (directriz de coherencia documental del CPSAO). El bloqueo que
queda ahora es puramente externo: **la revisión de un abogado**, algo que ni CPSAO ni
CTO pueden ejecutar internamente.

**Recomendación fundamentada:** enviar ambos documentos juntos al abogado en un solo
paquete (no por separado), pidiendo específicamente su concepto sobre si el mecanismo
técnico de anonimización descrito en `PIA-ALPHA.md` §9 cumple el estándar de la Ley
1581 o si debe tratarse como pseudonimización — esa es la única pregunta legal
abierta, el resto del contenido ya está resuelto.

**Acción pendiente:** el Fundador (o quien designe) contacta al abogado y comparte
`PIA-ALPHA.md` v1.1 + `CONSENTIMIENTO-ALPHA.md` v1.1. Mientras se espera esa
respuesta, el resto del tablero (candidatos, canal de Consejo Fundador, seguridad
base, allowlist, distribución privada, validación de concurrencia) puede avanzar en
paralelo — ninguna de esas actividades depende de la revisión legal.

## Próxima acción única, si solo se pudiera hacer una cosa hoy

Resolver las 2 decisiones de retención/eliminación de datos (Fundador) — desbloquea
simultáneamente las actividades 3 y 4, que hoy dependen del mismo punto. En paralelo,
identificar candidatos reales (actividad 1) sigue sin dependencias y puede avanzar ya.

## Regla de esta directiva

Cada actualización de este tablero debe dejar al menos una acción ejecutable
concreta, con responsable — nunca una fila que solo diga "pendiente" sin siguiente
paso identificado. Cada vez que se complete una actividad, se identifica de inmediato
el siguiente cuello de botella (directriz del CPSAO, 2026-07-06) — el éxito de la
ejecución se mide por bloqueos eliminados, no por tareas completadas.

**Clasificación obligatoria de bloqueos** (CPSAO, 2026-07-06): todo bloqueo que
dependa de una decisión del Fundador se clasifica en una de estas categorías —
Producto · Legal · Técnica · Negocio · Gobernanza · Externa (terceros) — y se
acompaña siempre de una recomendación fundamentada, nunca solo de una pregunta
abierta. El Fundador decide; el equipo llega con el camino propuesto ya construido.
