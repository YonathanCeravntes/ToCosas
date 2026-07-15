# AUD-0009 · Auditoría de ARQ-0009 (Monetización Millo+ + Hardening de producción)

- **Documento auditado:** `docs/arquitectura/ARQ-0009-Monetizacion-y-Hardening.md`
- **Módulo/Feature:** FIN-009 — último ciclo del roadmap de ARQ-0001
- **Documentos base revisados:** `ARQ-0001/DEC-0001`, `DEC-0002`, `DEC-0004`, `DEC-0005 v2+adenda`, `ARQ-0007/IMP-0007`, `ARQ-0008/DEC-0008/IMP-0008`, `GOBERNANZA.md`
- **Referencia inmutable verificada:** `git show HEAD:backend/prisma/schema.prisma` y `grep` sobre `backend/src/modules/auth/` — no se encontró ningún rol de administrador, guard de admin, ni campo `role`/`isAdmin` en todo el backend (solo existe `MessageRole`, que distingue mensajes de usuario/asistente en el chat, sin relación con autorización administrativa). No se auditó contra working tree (persiste la desincronización ya documentada en ciclos anteriores).
- **Fecha:** 2026-07-05
- **Auditor:** Auditor Oficial de Milla (rol de solo lectura)

> Esta auditoría no modifica el ARQ ni el código. Es el último ciclo del roadmap original
> de `ARQ-0001` y el primero que toca dinero real (suscripciones, códigos promocionales);
> se aplicó el mismo nivel de escrutinio que a FIN-005 (primera integración de riesgo
> equivalente), no el nivel reducido de ciclos de bajo riesgo como FIN-008.

---

## Resumen Ejecutivo

ARQ-0009 consolida con disciplina las señales de monetización ya sembradas en ciclos anteriores en un sistema coherente (`EntitlementsService` como autoridad única, `Subscription` agnóstica de pasarela, puerto de pago intercambiable) y aborda de frente, no de forma dispersa, los pendientes de hardening acumulados en cinco DEC distintos. La decisión de posponer el cifrado a nivel de campo viene con un argumento técnico explícito y controles compensatorios, no como silencio — exactamente el estándar que este proceso exige para una decisión de riesgo aceptado.

Sin embargo, esta auditoría encuentra dos huecos que tocan directamente la integridad del dinero y del acceso premium — el primer ciclo del proyecto donde eso está en juego — y por eso se elevan a observación crítica: (1) el canje de `PromoCode` no especifica un incremento atómico de `usedCount`, exactamente el mismo tipo de condición de carrera que el proyecto ya resolvió con rigor para el outbox de FIN-002 (`UPDATE ... FOR UPDATE SKIP LOCKED`), pero que aquí no se menciona; (2) la "activación administrativa auditada" del `ManualPromoProvider` no tiene ningún mecanismo de autorización que la respalde — se verificó que no existe ningún rol de administrador en todo el backend, y el ARQ no incluye crear uno en su lista de componentes. Además, se identifica una inconsistencia con un precedente directo del propio proyecto: el guardarraíl de Ley 1266 (no compartir el Score con terceros) se propone solo como comentario/documentación, cuando `DEC-0004` ya estableció que un gate legal puramente procesal es insuficiente y debe reforzarse con un control técnico.

## Hallazgos

1. **Canje de `PromoCode` sin incremento atómico especificado — riesgo de exceder `maxUses` con canjes concurrentes.** §4.3/§6 describen el modelo (`maxUses`, `usedCount`) pero no el mecanismo de actualización. Si la implementación usa un `SELECT` de verificación seguido de un `UPDATE` separado (el patrón naíf que el propio proyecto ya identificó y corrigió para el outbox en `DEC-0002 §10.1`/`IMP-0002`), dos canjes simultáneos cerca del límite podrían ambos pasar la verificación antes de que cualquiera incremente el contador, otorgando más activaciones premium gratuitas que las autorizadas.
2. **"Activación administrativa auditada" sin mecanismo de autorización — no existe ningún rol de administrador en el backend.** Verificado: `grep` sobre `backend/src/modules/auth/` y sobre `schema.prisma` no encuentra ningún campo de rol, guard de admin, ni tabla de permisos. El componente `ManualPromoProvider` (§4.3) depende de una "activación administrativa" que hoy no tiene dónde apoyarse, y el ARQ no lista la creación de un mecanismo de autorización administrativa entre sus componentes nuevos (§5). Sin resolver esto, la única vía de otorgar Millo+ gratis (aparte de los códigos promocionales) queda sin control de acceso definido — la puerta más sensible del sistema de monetización no tiene cerradura especificada.
3. **Guardarraíl de Ley 1266 implementado solo como comentario/documentación, no como control técnico — inconsistente con el precedente de DEC-0004.** §4.5.6 propone "constante/documentación... comentario en `health.service.ts`" para prohibir compartir el Score con terceros. `DEC-0004 §10.3` ya estableció, para un riesgo legal de la misma naturaleza (exposición prematura a producción), que un acuerdo de proceso sin enforcement en código es insuficiente y exigió un flag técnico obligatorio. Este ARQ no aplica esa misma lección a un riesgo que el propio documento reconoce como el más severo del plan legal (activaría Ley 1266 y registro ante la SIC).
4. **Ambigüedad sobre si `EntitlementsService.hasPremium()` lee `Subscription` (fuente de verdad) o la caché `plan`.** §4.2 dice que `UserSettings.plan` "pasa a ser caché derivada de `Subscription`... se mantiene por compatibilidad y para lecturas baratas", pero no aclara explícitamente si las verificaciones de acceso (`hasPremium`) leen siempre `Subscription` o pueden leer la caché en algún camino. Si algún gate leyera la caché, un retraso entre la expiración/cancelación real y la sincronización del webhook dejaría acceso premium activo más tiempo del debido.

## Riesgos

- Los Hallazgos 1 y 2 son, juntos, la superficie de fraude más directa del sistema de monetización: activar Millo+ sin pagar, vía canje concurrente que excede el límite o vía una "activación administrativa" sin control de acceso. En un ciclo cuyo objetivo es "convertir señales de monetización en un negocio operable", dejar precisamente esta puerta sin control es el riesgo de mayor impacto de todo el documento.
- El Hallazgo 3, si no se corrige, repite un patrón que el propio proyecto ya identificó como insuficiente una vez (DEC-0004) — dejarlo pasar sin comentario debilitaría la disciplina que ese precedente estableció para el resto del proyecto.
- El Hallazgo 4, si se confirma que algún gate lee la caché, es de impacto acotado (ventana de sincronización, no un bypass permanente), pero merece una respuesta explícita, no una suposición.

## Fortalezas

- `EntitlementsService` como autoridad única con catálogo tipado de features es la solución correcta al problema real que el propio documento diagnostica (gates dispersos en `HealthService`/`CopilotService`).
- El puerto `PaymentProvider` agnóstico de proveedor, con `ManualPromoProvider` como implementación v1, permite monetizar desde el día 1 sin bloquear el diseño en la elección de pasarela — decisión de secuenciación de negocio acertada.
- La decisión de diferir el cifrado a nivel de campo viene con argumento técnico explícito (agregados ya almacenan los mismos valores en claro por necesidad de cómputo) y controles compensatorios enumerados, no como silencio — exactamente el estándar de "decisión de riesgo aceptado" que este proceso exige, y coherente con cómo se trató el mismo pendiente en DEC-0002/DEC-0004.
- Regresión explícita exigida sobre los gates ya existentes de FIN-004/FIN-005 como criterio de aceptación (§13) — protege contra el riesgo más probable de un refactor de este tipo (romper comportamiento ya validado).
- Consolida en un solo documento (`docs/PRODUCCION.md`) pendientes que estaban dispersos en cinco DEC distintos — mejora real de auditabilidad para el cierre de todo el roadmap.
- Reutiliza el patrón ya validado de webhook firmado (Meta/Telegram) para el webhook de pago, en vez de diseñar uno nuevo desde cero.
- Transparencia consistente con el resto del proceso: declara como decisiones de negocio explícitas (§17) el precio, el canal de cobro, el límite de simulaciones y el trial, en vez de fijarlos unilateralmente.
- Reconoce honestamente que reducir simulaciones de "ilimitadas" a "5/mes" es una regresión para usuarios existentes y propone la alternativa de grandfathering, en vez de ocultar el impacto del cambio.

## Oportunidades

- Especificar el canje de `PromoCode` con un `UPDATE ... WHERE usedCount < maxUses RETURNING` (o equivalente transaccional atómico), replicando el patrón ya probado del outbox.
- Definir un mecanismo mínimo de autorización administrativa (aunque sea simple: un rol único `admin` en `User`, o una lista de emails autorizados vía variable de entorno) antes de implementar `ManualPromoProvider`, en vez de asumir que "administrativa" ya implica control de acceso.
- Elevar el guardarraíl de Ley 1266 de comentario a control técnico verificable (p. ej. un test que falle si aparece cualquier endpoint que exponga el Score a un `userId` distinto del propietario, o una revisión obligatoria de gobernanza marcada en código que bloquee el build si se detecta un nuevo endpoint sin la anotación correspondiente).
- Aclarar explícitamente en el ARQ (o en la implementación) que toda verificación de acceso premium debe leer `Subscription` directamente, nunca la caché `plan`, y dejarlo como contrato documentado de `EntitlementsService`.

## Observaciones críticas

- **Hallazgo 1** (canje de `PromoCode` sin atomicidad especificada): se eleva a crítica por tratarse de dinero real y por existir ya, en el propio proyecto, el patrón correcto para resolverlo (outbox), que este ARQ no reutiliza ni menciona.
- **Hallazgo 2** (activación administrativa sin mecanismo de autorización, verificado que no existe ningún rol de admin en el código): se eleva a crítica por ser la puerta de mayor sensibilidad del sistema de monetización sin control de acceso definido.

## Observaciones menores

- Hallazgo 3 (guardarraíl legal solo documental) y Hallazgo 4 (ambigüedad de fuente de verdad para `hasPremium`) son observaciones importantes pero de corrección de bajo costo, no defectos estructurales del diseño.

## Recomendaciones

1. Especificar un incremento atómico para el canje de `PromoCode`, reutilizando el patrón ya validado del outbox.
2. Definir un mecanismo mínimo de autorización administrativa antes de implementar `ManualPromoProvider`, e incluirlo explícitamente en los componentes nuevos del ARQ.
3. Elevar el guardarraíl de Ley 1266 de comentario/documentación a un control técnico verificable, aplicando la misma lección que `DEC-0004` ya estableció para gates legales.
4. Confirmar explícitamente que `EntitlementsService.hasPremium()` (y cualquier verificación de acceso premium) lee `Subscription` directamente, nunca la caché `plan`.

## Priorización

| Recomendación | Clasificación |
|---|---|
| Atomicidad en el canje de `PromoCode` (Rec. 1) | Debe hacerse antes del desarrollo |
| Mecanismo de autorización administrativa (Rec. 2) | Debe hacerse antes del desarrollo |
| Control técnico del guardarraíl Ley 1266 (Rec. 3) | Debe hacerse antes de producción |
| Confirmar fuente de verdad de `hasPremium` (Rec. 4) | Debe hacerse antes del desarrollo (aclaración de contrato, bajo costo) |

## Veredicto

**APROBADO CON OBSERVACIONES.**

ARQ-0009 tiene una arquitectura de monetización sólida (autoridad única, puerto agnóstico, decisión de cifrado razonada) y consolida el hardening disperso con disciplina genuina. No amerita rechazo: los defectos encontrados son omisiones puntuales sobre componentes nuevos (canje de códigos, autorización administrativa), no una falla del mecanismo central como ocurrió en el ciclo de FIN-005. Pero, al ser el primer ciclo que maneja dinero real y el último del roadmap original, recomiendo que el CTO trate los Hallazgos 1 y 2 como condición de entrada para `IMP-0009` — no basta con documentarlos como pendientes menores — antes de autorizar la implementación de `ManualPromoProvider` y el canje de códigos.

---
*Esta auditoría no implementa ni decide. Queda a la espera de la decisión oficial del CTO (`DEC-0009`).*
