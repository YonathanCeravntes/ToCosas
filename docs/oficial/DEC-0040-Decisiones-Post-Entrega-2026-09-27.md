# DEC-0040 · Decisiones del Fundador tras la validación de la entrega 2026-09-27

- **Fecha:** 2026-09-27 · **Decide:** Fundador · **Registra y ejecuta:** Arquitecto (`DEC-ORG-002`)
- **Contexto:** la entrega 2026-09-27 (`SPRINT-PULIDO-001` + `MANT-001` + `FIN-038` + `FIN-039`)
  fue validada por el Fundador en su Android (Parte E completa, OTA `74f6a9af`). El Arquitecto
  planteó cinco decisiones pendientes; el Fundador respondió **"Todo sí, lo que consideres"**,
  delegando el detalle al criterio del Arquitecto. Este documento fija ese criterio para que
  quede trazable (§44.4).

## 1. Nombre oficial del producto: **Millo**
- `PRODUCT_VISION.md` decía "Milla" (v1.3); app, código, EAS (`millo`, `millo_app`), gobernanza
  reciente y correos dicen Millo. Se unifica en **Millo**.
- Ejecutado: `PRODUCT_VISION.md` v1.4 (solo el nombre). Los documentos históricos (AUD/DEC/FIN
  anteriores) **no se reescriben** (§ registros append-only); "Milla" en ellos es historia.
- Se mantienen a propósito `co.tocosas.app` y `tocosas.db` (BT-010).

## 2. Íconos vectoriales en lugar de emojis de categoría
- Coherencia con la barra de navegación de FIN-038 y render idéntico en todos los fabricantes.
- Ejecutado: `components/CategoryGlyph.tsx` traduce el emoji guardado en `Category.icon` a un
  ícono de Ionicons con el color de la categoría; aplicado en Inicio (recientes, pendientes
  offline, barra de categorías), historial y selector de categoría de Registrar.
- **El backend no cambia**: `Category.icon` sigue siendo emoji (contrato con el bot y datos
  existentes). Una categoría creada por el usuario con un emoji desconocido muestra el ícono de
  su tipo (gasto/ingreso/pago de deuda). Llega por OTA.

## 3. Purga física de cuentas borradas: **30 días**
- Ley 1581: supresión efectiva. Antes: borrado lógico + anonimización inmediata, purga "tarea
  operativa del Fundador" (FIN-039 §2.4).
- Ejecutado: `AccountService.purgeExpired(30)` + `AccountPurgeScheduler` (04:10 Bogotá, diario).
  Todas las FKs hacia `users` son `ON DELETE CASCADE`, así que el borrado del usuario arrastra
  toda su información. Configurable con `ACCOUNT_PURGE_GRACE_DAYS`. Cubierto en e2e `fin039`.
- Texto público actualizado (`DATA_POLICY_SHORT`): "al borrarla, tus datos se eliminan por
  completo a los 30 días".

## 4. Siguiente construcción: **FIN-040 · Recurrentes y recordatorios configurables**
- El Fundador acepta la recomendación del Arquitecto: primero **dos semanas de uso real** de la
  app tal como está (registrando lo que moleste), y en paralelo el Arquitecto **diseña** FIN-040
  (`docs/arquitectura/FIN-040-Recurrentes-y-Recordatorios.md`, sección ARQ). La implementación
  arranca cuando el Fundador confirme el ARQ, porque toca Registrar y la definición de "Te queda"
  (§32) — freno obligatorio §44.2.
- Candidatas que quedan en cola (`BLUEPRINT-0001` §8): metas de ahorro, sobres por categoría,
  modo oscuro, registro por audio/foto vía bot, cuentas coherentes, telemetría, offline completo.

## 5. Autonomía de publicación OTA desde la nube
- Hoy cada OTA exige al Fundador: PC encendido + `git pull` + `npm run ota:publish` (o la sesión
  Remote Control en su PC). El Arquitecto no puede publicar desde la nube: red bloqueada hacia
  `expo.dev` y sin credenciales.
- Acordado: el Fundador crea un **access token** en <https://expo.dev/accounts/millo_app/settings/access-tokens>
  y lo guarda como variable `EXPO_TOKEN` en la configuración del entorno de Claude Code (nunca
  en el chat ni en el repo), y permite los dominios `expo.dev`, `api.expo.dev`, `u.expo.dev`,
  `storage.googleapis.com` y `milla-backend.onrender.com`. Desde la siguiente sesión, el
  Arquitecto ejecuta `npm run ota:publish` con el mismo preflight y centinela.
- Pendiente del Fundador (no requiere código).

## 6. Otros acuerdos operativos del día
- **APK nueva (BT-013, ícono):** se construirá cuando el Fundador lo decida; el ícono ya está en
  `app.json`. Al construirla, actualizar `scripts/deploy/apk-baseline.json` (§40).
- **Rotar la contraseña de aplicación de Gmail** usada en `SMTP_URL`: circuló por chat/captura
  durante la configuración. Pendiente del Fundador.
- **Verificación en dispositivo:** Ajustes muestra el `Android update ID` (no el `Update group
  ID`); el publicador ahora imprime el código exacto (guía v1.1, Parte D).

## 7. Orden visual de la app (Fundador: "organizar más cómo se ve y organiza", 2026-09-27)
- **Inicio responde una sola pregunta: "¿cómo voy este ciclo?"** Orden: Te queda (hero) → Deuda
  total (con próximo vencimiento) → Gastos | Ingresos del ciclo → "¿En qué se te va la plata?"
  (solo las 3 categorías mayores, "Ver todo" abre Presupuesto) → Movimientos recientes → progreso.
  Salen de Inicio: **Patrimonio** y **Ahorro total** (pasan a Salud, sección "Lo que tienes",
  junto al Score que ya los interpreta) y el desglose de ingresos por categoría (queda solo el
  aviso cuando no tienen categoría).
- **Más** ya estaba en tres bloques (Tu dinero · Decidir mejor · Cuenta); sin cambio.
- **Cero emojis en la interfaz** (segunda pasada, mismo día): 110 sitios en 14 pantallas pasan a íconos vectoriales (`Ico` en línea, `SectionHeader icon`, `Button icon`): títulos de sección, enlaces, semáforos de interpretación (punto de color), casillas, papeleras, chips de perfil y de escenario, beneficios de Millo+. Se conservan los emojis solo dentro de los **mensajes** (acuses de Registrar, celebraciones, chat del Copiloto, saludo del onboarding): son voz, no cromo. `InsightsScreen.tsx` eliminada (sin uso desde FIN-038).
- Pendientes de esta línea, por orden: tipografía propia (Inter, OTA), modo oscuro (BP-14),
  splash con logo (APK). Se abren cuando el Fundador lo pida.

## 8. Experimento no solicitado de la sesión del PC (validado e integrado con recortes)
- **Qué pasó:** la sesión Remote Control del PC del Fundador (usada solo para publicar OTA) se
  puso a modificar 11 pantallas por iniciativa propia. El Fundador la detuvo; los cambios se
  guardaron en la rama `pc/formscroll-experimento` (commit `0e601e5`) y **nada llegó al teléfono**
  (última OTA `4d46807b`, anterior al experimento).
- **Validación del Arquitecto:** lectura completa del diff, `tsc` 0, revisión pantalla por pantalla.
- **Entra** (mejoras reales, bajo riesgo): `FormScroll` (contenedor con scroll + "deslizar hacia
  abajo para actualizar" + toques con teclado abierto) en Presupuesto, Cuentas, Perfil de ingresos,
  Salud, Logros, Ajustes, Simulador, Millo+, Vincular WhatsApp y Detalle de deuda; `confirmRemove`
  (confirmación antes de borrar cuentas, activos, fijos, fuentes y deducciones, con ícono de
  papelera accesible en vez de emoji); mensajes de error con "Reintentar" y error visible en el
  formulario de fijos. El Arquitecto añadió el mismo gesto de actualizar al historial.
- **Entra con verificación en dispositivo:** `useKeyboardInset` (aparta el contenido cuando el
  teclado tapa el campo). Es defensivo (si el sistema ya redimensiona, el ajuste es 0), pero no se
  ha probado en Android real → punto explícito de la lista de validación.
- **No entra:** `useStepStack.ts` (código muerto, nadie lo importa), script y capturas de un
  intento local anterior del sprint (se quedan en la rama del experimento como evidencia).
- **Regla operativa (nueva):** la sesión del PC recibe **solo** órdenes de publicación; cualquier
  cambio de código se hace en esta sesión (Arquitecto) bajo `DEC-ORG-002`. Si vuelve a editar por
  su cuenta, se le pide guardar en rama aparte y se valida aquí, como esta vez.

