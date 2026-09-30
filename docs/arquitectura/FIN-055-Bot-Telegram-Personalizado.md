# FIN-055 · Bot de Telegram personalizado

- **Fecha:** 2026-09-30 · **Decide:** Fundador. Aprobó el boceto de 4 pantallas y las recomendaciones: "Todo sí, dale pues".
- **Ejecuta:** Arquitecto.

## Decisiones del Fundador
1. **Perfil del bot.** Nombre, descripción (lo que se ve antes de "Iniciar") y "Acerca de" con los textos del boceto. La foto la sube el Fundador en @BotFather → `/setuserpic`.
2. **Menú "/" con 6 comandos:** `/queda`, `/pagos`, `/deudas`, `/documentos`, `/app`, `/ayuda`. Sin `/gasto` ni `/ingreso`: basta con escribir el movimiento.
3. **Bienvenida.** Saluda por el nombre, da ejemplos y muestra 4 botones fijos: *Anotar gasto*, *¿Cuánto me queda?*, *Guardar factura*, *Mis deudas*.
4. **Acuse de cada gasto o ingreso.**
   - Dice cuánto queda en el mes y por día, con la misma fuente de "Te queda" (§32).
   - Trae los botones *Cambiar categoría* y *Deshacer*.
   - *Cambiar categoría* muestra las 6 categorías más usadas y "Otra". Elegir una usa el servicio central, así que Millo aprende el comercio (FIN-046 Fase 4).

## Implementado
- `messaging/bot-menu.ts`: textos del perfil, comandos, teclado fijo y reconocimiento de comandos.
  - Callbacks compactos, por el límite de 64 bytes de Telegram:
    - `un:<tx>`: deshacer.
    - `ct:<tx>`: ver categorías.
    - `sc:<tx>:<8 hex>`: elegir una categoría.
    - `co:<tx>`: otra categoría.
- `ConversationService`:
  - `handleRich`, con botones para Telegram. `handle` sigue devolviendo texto para WhatsApp.
  - `runMenu`, `handleCallback`, `upcomingPayments`, `debtsList` y `teQuedaLine`. Esta última lee `SpendableService` por el contenedor.
- `TelegramProvider`:
  - Al arrancar configura nombre, descripción, "Acerca de", comandos y botón de menú. Solo con token y fuera de pruebas; nunca bloquea el arranque.
  - `sendReply` envía con `inline_keyboard` o con el teclado fijo.
  - `answerCallback` responde el toque de un botón.
  - `parseInbound` entiende `callback_query`.
- Defecto corregido de paso: "almuerzo 18.500" o "mercado 86.000" (concepto de gasto + monto, sin verbo) preguntaba "¿gasto, ingreso o pago?". Ahora se anota como gasto (`rule.parser`). Un concepto desconocido sigue preguntando.
- Pruebas:
  - `bot-menu.spec.ts`: 10 casos.
  - Nuevo caso en `rule.parser.spec.ts`.
  - Unitarias 462/462; de extremo a extremo 124/124.
