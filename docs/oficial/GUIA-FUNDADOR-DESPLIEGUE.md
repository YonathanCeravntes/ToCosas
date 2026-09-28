# Guía del Fundador — cómo llevar una entrega a tu celular (Windows, sin conocimientos técnicos)

- **Versión:** 1.1 · **Fecha:** 2026-09-27 · **Autor:** Arquitecto
- **Ejecutada por primera vez el 2026-09-27:** Partes A, B y C completadas por el Fundador
  (OTA `03d425e3`). Lo aprendido quedó incorporado: la carpeta real es
  `C:\Users\yonat\ToCosas`, `npm install` requiere borrar antes `node_modules` si venía
  de otro SDK, y `eas-cli login` abre el navegador (no pide clave en la ventana negra).
- **Para qué sirve:** cada vez que el Arquitecto te diga "entrega lista", estos son los
  únicos pasos que dependen de ti. Son los mismos siempre. Si algo falla, copia TODO el
  texto de la ventana negra y pégamelo: yo lo arreglo.

---

## Parte A — Backend (Render): 3 clics y 3 variables

Render está conectado a la rama `claude/finance-app-design-pr8qd5` con despliegue
automático. **Cada vez que yo hago `push`, Render despliega solo.** Tú solo verificas.

1. Entra a <https://dashboard.render.com> → servicio **milla-backend**.
2. Pestaña **Events**: la fila de arriba debe decir **"Deploy live"** con el commit más
   reciente (hoy: `2ce4747`). Si dice **"Deploy failed"**, abre **Logs**, copia las
   últimas 40 líneas y envíamelas.
3. Pestaña **Environment** → **Add Environment Variable** → agrega estas tres → **Save
   Changes** (Render vuelve a desplegar solo, tarda 2–4 min):

   | Key | Value | Para qué |
   |---|---|---|
   | `SMTP_URL` | ver Parte B | Enviar el código de "Olvidé mi contraseña" por correo |
   | `MAIL_FROM` | `Millo <TU_CORREO@gmail.com>` | Remitente que verá el usuario |
   | `WHATSAPP_DISPLAY_NUMBER` | `+57XXXXXXXXXX` (solo si ya tienes el número del bot) | La app muestra el número y abre WhatsApp con el código |

4. Comprobación: abre en el navegador <https://milla-backend.onrender.com/v1/health>.
   Debe mostrar algo con `"ok"`. Si tarda hasta 60 segundos es normal (plan gratis
   dormido). Si sale "servicio suspendido", en el dashboard pulsa **Resume**.

## Parte B — Correo para recuperar contraseña (Gmail, 5 minutos)

Necesitas una cuenta de Gmail con **verificación en dos pasos** activada.

1. Ve a <https://myaccount.google.com/apppasswords>.
2. Escribe un nombre (`Millo`) → **Crear**. Google te muestra 16 letras (ej.
   `abcd efgh ijkl mnop`). Cópialas **sin espacios**: `abcdefghijklmnop`.
3. Arma el valor de `SMTP_URL` así (cambia lo que está en MAYÚSCULAS y escribe `%40`
   en lugar de `@` dentro del correo):

   ```
   smtps://TUCORREO%40gmail.com:abcdefghijklmnop@smtp.gmail.com:465
   ```

   Ejemplo real: si tu correo es `yonathancrc@gmail.com`:
   `smtps://yonathancrc%40gmail.com:abcdefghijklmnop@smtp.gmail.com:465`
4. Pégalo en Render (Parte A, paso 3). Listo. Alternativa sin Gmail: Brevo (gratis,
   300 correos/día): `smtp://TU_LOGIN:TU_CLAVE_SMTP@smtp-relay.brevo.com:587`.

## Parte C — Publicar la app en tu celular (OTA), desde tu PC

Abre **Símbolo del sistema** (tecla Windows → escribe `cmd` → Enter) y pega **una
línea a la vez**, esperando a que termine cada una.

```
set PATH=%PATH%;C:\Program Files\Git\cmd
cd C:\Users\yonat\ToCosas
git checkout claude/finance-app-design-pr8qd5
git pull
```

Si `git pull` dice **"Your local changes would be overwritten"**, escribe esto y vuelve
a hacer `git pull`:

```
git checkout -- .
```

Ahora el frontend:

```
cd frontend
rmdir /s /q node_modules
npm install
npx eas-cli whoami
```

(`rmdir` borra la instalación anterior; tarda unos segundos y no imprime nada. Los avisos
amarillos "deprecated" y las "vulnerabilities" de `npm install` son normales: **no**
ejecutes `npm audit fix`, cambiaría versiones que deben coincidir con la APK.)

`whoami` debe responder **`millo_app`**. La primera vez pregunta `Ok to proceed? (y)`:
escribe `y` y Enter. Si dice `Not logged in`, escribe `npx eas-cli login`: se abre el
navegador para iniciar sesión (usuario `millo_app`); al volver a la ventana dice
`Logged in`. Repite `whoami` para confirmar.

Antes de publicar, **despierta el backend**: abre en el navegador
<https://milla-backend.onrender.com/v1/health> y espera a ver `ok` (el publicador lo
comprueba y se niega a publicar si el backend no responde).

```
npm run ota:publish -- --branch preview --message "Entrega 2026-09-27: fachada, sprint, cuenta y datos"
```

El publicador corre el **preflight** (unos 2 minutos: revisa URL de producción, que el
proyecto siga en SDK 54 como tu APK, que no haya módulos nativos nuevos, que no haya
`localhost`, y el `/health`). Si todo está bien, se detiene y te pide el **centinela**.
El centinela es solo una etiqueta que tú escribes (el nombre de tu celular, terminado en
`OK`) para que quede registrado quién verifica la entrega; no hay que buscarla en ningún
lado. Repite el mismo comando añadiendo al final tu dispositivo:

```
npm run ota:publish -- --branch preview --message "Entrega 2026-09-27: fachada, sprint, cuenta y datos" --sentinel "Android de Yonathan — OK"
```

Al terminar verás `Update group` con un código. Publicado.

## Parte D — Verlo en el celular

1. Cierra Millo **por completo**. La forma segura en Android: Ajustes del teléfono →
   Aplicaciones → Millo → **Forzar detención** (deslizarla de las apps recientes a veces
   no la cierra de verdad).
2. Ábrela con wifi → espera **15 segundos** en Inicio → fuérzala a detener otra vez →
   ábrela. (La primera apertura descarga la actualización; la segunda la aplica.)
3. En **Más → Ajustes**, abajo, debe decir `Millo v0.1.0 · actualización XXXXXXXX` con
   el código que el publicador imprime al final como **"Código que verás en Más →
   Ajustes"**. Ojo: NO es el `Update group ID`, es el `Android update ID` (son
   distintos). Si el código no cambió, la actualización no llegó: repite el paso 2.

## Parte E — Lista de comprobación de la entrega 2026-09-27

- [ ] Barra inferior con 5 pestañas e íconos (no emojis), botón verde central **+**.
- [ ] Registrar → Un gasto → escribe `45.000` → el monto grande dice **$45.000**.
- [ ] En Registrar hay flecha **Atrás** y conserva el monto al volver; el botón físico
      de Android retrocede un paso, no cambia de pestaña.
- [ ] Al registrar un gasto y volver a **Inicio**, "Te queda" ya cambió sin refrescar.
- [ ] Tras registrar aparece abajo **"Deshacer · 12s"** con barra que se agota.
- [ ] Inicio → **Ver todos** abre el historial con búsqueda y filtros.
- [ ] Toca el hero verde de Inicio → abre **Presupuesto**.
- [ ] En **Salud**, "Evolución de tu Score" muestra barras.
- [ ] En **Deudas → una deuda**, arriba hay "Próximo vencimiento · en N días" y el
      plan de pago está plegado ("Plan de pago · N cuotas").
- [ ] Cierra sesión → en Login existe **"Olvidé mi contraseña"** → pide correo → si
      configuraste SMTP, llega un código de 6 dígitos.
- [ ] Crear una cuenta de prueba exige marcar la casilla de política de datos, y al
      entrar aparece el **onboarding** de 3 pasos (saltable).
- [ ] Más → Ajustes → **Exportar mis datos** abre el menú de compartir; **Eliminar mi
      cuenta** (con la cuenta de prueba) cierra la sesión y ese correo se puede
      registrar de nuevo.

Marca lo que falle y dímelo tal cual ("el punto 4 no pasa: sigue mostrando el valor
viejo"). Yo corrijo y vuelves a la Parte C.

## Parte F — Registrar por Telegram (gratis, 10 minutos)

WhatsApp requiere un proveedor de pago (Meta/Twilio); **Telegram es gratis** y el bot ya está
programado (FIN-029). Solo hay que crearlo y conectarlo.

1. En Telegram, abre **@BotFather** → `/newbot` → nombre `Millo` → usuario (debe terminar en
   `bot`, p. ej. `millo_finanzas_bot`). BotFather responde con un **token** (`123456:ABC…`).
   No lo compartas por chat.
2. Inventa una clave secreta larga (p. ej. 24 letras y números): es `TELEGRAM_WEBHOOK_SECRET`.
3. Render → **milla-backend** → **Environment** → agrega y guarda (redespliega solo):

   | Key | Value |
   |---|---|
   | `TELEGRAM_BOT_TOKEN` | el token de BotFather |
   | `TELEGRAM_BOT_USERNAME` | el usuario del bot, sin `@` (p. ej. `millo_finanzas_bot`) |
   | `TELEGRAM_WEBHOOK_SECRET` | tu clave secreta |

4. Cuando Render diga **Deploy live**, abre en el navegador (cambia TOKEN y SECRETO):

   ```
   https://api.telegram.org/botTOKEN/setWebhook?url=https://milla-backend.onrender.com/v1/webhooks/telegram&secret_token=SECRETO
   ```

   Debe responder `{"ok":true,"result":true,"description":"Webhook was set"}`.
5. En la app: **Más → Ajustes → Vincular Telegram → Generar código** → botón "Abrir Telegram"
   (o envía el código de 6 dígitos al bot). El bot responde "¡Listo! … quedó vinculado".
6. Escríbele como a una persona: `Gasté 45.000 en almuerzo`, `Me entraron 500.000 de
   freelance`, `Pagué 300.000 de la tarjeta`, `resumen`, `ayuda`. Cada registro aparece en la
   app al instante; con Telegram vinculado también llegan los recordatorios y el código de
   "Olvidé mi contraseña".

## Si algo sale mal

- **"git no se reconoce"** → te faltó la primera línea `set PATH=...`.
- **"npm ERR!" durante `npm install`** → borra la carpeta `frontend\node_modules` y
  repite `npm install`.
- **Preflight bloqueado** → el mensaje dice exactamente qué revisó y qué falló; cópialo
  y envíamelo. Nunca uses `eas update` directo (§40): el bloqueo existe para proteger tu
  APK.
- **La app se queda en blanco tras actualizar** → desinstala y vuelve a instalar la APK
  original; luego avísame antes de publicar de nuevo.
