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
- Pendientes de esta línea, por orden: tipografía propia (Inter, OTA), modo oscuro (BP-14),
  splash con logo (APK). Se abren cuando el Fundador lo pida.
