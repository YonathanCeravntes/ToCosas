# PIA — Evaluación de Impacto en Privacidad (Ley 1581) — Alpha Cerrada de Milla

- **Versión:** 1.1 — **cerrado por el Fundador, enviado a revisión legal**
- **Fecha:** 2026-07-06
- **Autor:** CTO (v1.0), decisión de retención/anonimización del Fundador incorporada
  en v1.1
- **Estado:** Cerrado desde la perspectiva de producto/negocio — pendiente únicamente
  de la revisión de un abogado (actividad 3/4 de `ALPHA_EXECUTION_BOARD.md`), que
  confirmará si el mecanismo técnico propuesto cumple el estándar legal de
  anonimización o si corresponde tratarlo como pseudonimización.
- **Referencias cruzadas:** `docs/producto/alpha/ALPHA-004-Preparacion-Legal.md`,
  `docs/producto/alpha/CONSENTIMIENTO-ALPHA.md`, `docs/GOBERNANZA.md` (regla de
  vistas minimizadas), `docs/PRODUCCION.md`.

---

## 1. Alcance de este PIA

Cubre exclusivamente el tratamiento de datos durante la Alpha Cerrada: ~20
participantes, ventana de 30 días, distribución privada, sin monetización. **No
cubre** un eventual Beta o producción completa a mayor escala — cada uno requeriría
su propia actualización de este PIA (ver `ALPHA-008`, capacidades deseables para
Beta).

## 2. Datos que se procesan

| Categoría | Dato | Fuente |
|---|---|---|
| Identificación | Nombre, contacto (WhatsApp/Telegram o correo) | Registro + consentimiento |
| Financiero | Deudas, presupuesto, ingresos, gastos, transacciones | Registrado directamente por el usuario en la app |
| Derivado | Score de salud financiera, resultados de simulaciones | Calculado internamente por el Motor Financiero (FIN-003/004) |
| Uso | Pantallas visitadas, funciones usadas, frecuencia | `AiInteractionLog`, `Challenge`, eventos de simulación (ya construidos) |
| Cualitativo | Respuestas de entrevistas (comprensión, confianza), reportes por WhatsApp/Telegram (`ALPHA-003`) | Recolectado manualmente por el equipo durante el piloto |

**Lo que explícitamente NO se procesa en esta Alpha:** ningún dato pasa por el
Copiloto con IA generativa real — permanece en modo plantillas (`ALPHA-003`,
`PRODUCT_DECISIONS.md`), por lo que **no hay envío de datos a Anthropic** durante
esta fase. Esto reduce el alcance del PIA frente a lo que exigiría producción
completa (donde sí aplicaría el DPA, `BACKLOG.md`).

## 3. Finalidad del tratamiento

Únicamente dos finalidades, ambas ya comunicadas en `CONSENTIMIENTO-ALPHA.md`: (1)
prestar el servicio (mostrar Score, presupuesto, deuda, simulaciones reales al
propio usuario), y (2) aprender si Milla cambia el comportamiento financiero real y
genera confianza, para decidir la evolución del producto (`ALPHA-001`).

## 4. Base legal

Consentimiento informado, expreso y previo (Ley 1581 de 2012, Habeas Data) —
documentado en `CONSENTIMIENTO-ALPHA.md`, firmado antes de cualquier acceso. No se
invoca ninguna otra base legal (no hay obligación legal ni interés legítimo que
sustituya el consentimiento en esta fase).

## 5. Flujo de datos

Usuario → app móvil → backend (Postgres) → Motor Financiero/Score (cálculo interno,
sin terceros) → de vuelta al usuario. Los datos cualitativos (entrevistas, WhatsApp/
Telegram) se consolidan manualmente por el equipo en `ALPHA_RESULTS_TEMPLATE.md`, sin
identificar al participante por nombre completo en ese documento — solo por ID de
participante, para reducir exposición si el documento se comparte internamente entre
CPSAO y CTO.

## 6. Terceros involucrados

Ninguno que reciba datos financieros del usuario. No hay Anthropic (Copiloto en
plantillas), no hay RevenueCat (sin monetización en Alpha), no hay tiendas de
aplicaciones (distribución privada). Infraestructura de hosting/base de datos ya
existente del proyecto — sin nuevos proveedores para esta fase.

## 7. Riesgos identificados y mitigación

| Riesgo | Mitigación |
|---|---|
| Acceso no autorizado a datos financieros reales de 20 personas | Allowlist técnica (actividad 6 del tablero), secretos rotados, backups activos (actividad 5) |
| Corrupción de saldo por concurrencia bajo uso real | Validación de concurrencia real antes del lanzamiento (actividad 9, extensión de FIN-012) |
| Identificación indebida en documentos internos de aprendizaje | Uso de ID de participante, no nombre completo, en `ALPHA_RESULTS_TEMPLATE.md` |
| Retención indefinida de datos tras el fin de la Alpha | Definir plazo de retención/eliminación post-Alpha (ver §8, pendiente de decisión del Fundador) |
| Participante quiere retirarse y eliminar sus datos | Ya comprometido en `CONSENTIMIENTO-ALPHA.md` — falta definir el mecanismo técnico exacto de borrado (pendiente, ver §9) |

## 8. Retención de datos — **DECIDIDO por el Fundador, 2026-07-06**

Se conservan los datos durante toda la Alpha y **60 días adicionales tras su cierre**,
para consolidar resultados, resolver incidencias y documentar los aprendizajes
(`ALPHA_RESULTS_TEMPLATE.md`). Cumplido ese plazo: si el participante continúa a la
siguiente etapa (Beta), sus datos continúan como parte de su historial; si no
continúa, sus datos dejan de identificarlo (ver §9).

## 9. Derechos de los titulares (Habeas Data) — **DECIDIDO por el Fundador, 2026-07-06**

Acceso, corrección y eliminación, ya prometidos en `CONSENTIMIENTO-ALPHA.md`.
**Mecanismo por defecto: anonimización**, siempre que sea jurídicamente válida —
prevalece sobre el aprendizaje agregado del piloto sin conservar datos personales.
**Salvedad vinculante:** si la revisión legal determina que la implementación técnica
actual (romper el vínculo nombre↔ID, conservar solo datos agregados) corresponde en
realidad a pseudonimización y no a anonimización en sentido estricto de la Ley 1581,
se aplican todas las obligaciones legales correspondientes hasta cumplir el estándar
exigido — la política no asume por defecto que el mecanismo técnico ya califica como
anonimización. **Borrado físico** se ejecuta cuando exista obligación legal, o cuando
la solicitud del participante lo exija conforme al concepto jurídico aplicable —no es
la opción por defecto, pero tampoco está descartada.

**Principio permanente adoptado** (CPSAO, ratificado por el Fundador): siempre que
sea técnica y legalmente viable, Milla prefiere anonimizar antes que destruir
conocimiento — la privacidad del usuario y el aprendizaje del producto no deben
competir entre sí cuando ambos pueden protegerse adecuadamente.

## 10. Conclusión del CTO

Con la decisión del Fundador, los dos puntos que mantenían este PIA abierto quedan
resueltos desde la perspectiva de producto/negocio. El PIA queda cerrado en ese
sentido y pasa a revisión legal junto con `CONSENTIMIENTO-ALPHA.md` — la única
pieza que falta es la confirmación del abogado sobre si el mecanismo técnico
propuesto satisface el estándar legal de anonimización, conforme a la salvedad de
§9. Si el abogado concluye que se trata de pseudonimización, este documento y
`CONSENTIMIENTO-ALPHA.md` se actualizan juntos, en la misma revisión, nunca por
separado (directriz de coherencia documental).
