# 01 · Funcionalidades y priorización (MoSCoW)

Priorización con el método **MoSCoW**: *Must have* (imprescindible para el MVP), *Should have* (importante, siguiente iteración), *Could have* (deseable), *Won't have* (fuera de alcance por ahora, documentado para no perderlo).

---

## 🟥 MUST HAVE — MVP (Fase 1)

### Cuentas y autenticación
- Registro/login con **email + contraseña** y con **teléfono (OTP SMS/WhatsApp)**.
- Recuperación de contraseña.
- Cierre de sesión y eliminación de cuenta (requisito legal, ver [doc 07](07-seguridad-privacidad.md)).

### Entidades financieras y acreedores
- Catálogo precargado de entidades comunes (bancos, cooperativas, fintechs del país objetivo).
- CRUD de entidades personalizadas (nombre, tipo, teléfono, tasa típica, notas).

### Deudas y créditos
- CRUD de deudas: monto original, saldo pendiente, fecha inicio, plazo, tasa (fija/variable, EA/NMV), cuota, entidad, tipo/clasificación.
- Cálculo automático de **tabla de amortización** (sistema francés / cuota fija).
- Cálculo de intereses proyectados y fecha estimada de liquidación.

### Transacciones (compromisos de pago)
- Registro manual: monto, tipo (ingreso / gasto / pago de deuda), categoría, fecha, entidad, etiquetas, nota.
- Asociar un pago a una deuda (reduce el saldo).
- Listado, filtro y edición/borrado de transacciones.

### **WhatsApp — captura por texto (diferenciador núcleo)**
- Webhook que recibe mensajes de WhatsApp Business Cloud API.
- Vinculación de número ↔ cuenta vía OTP/enlace en el primer mensaje.
- Parser NLP (reglas + LLM ligero) que convierte texto libre en transacción estructurada.
- Bot responde con confirmación ("Registré tu gasto de $45.000 en almuerzo el 3 de julio").
- Manejo de ambigüedad: el bot pregunta por categoría/entidad cuando no entiende.

### Recordatorios
- Alertas configurables por deuda (3 días / 1 día / mismo día).
- Notificaciones **push locales** (FCM).

### Dashboard
- Resumen: deuda total, pagos del mes, ingresos del mes, flujo de caja estimado.

### Sincronización y offline
- Cuenta en la nube, datos accesibles tras reinstalar.
- **Modo offline** (SQLite local) con sincronización al reconectar.

---

## 🟧 SHOULD HAVE — Fase 2

- **Sincronización bidireccional completa app ↔ WhatsApp** (lo registrado en app se refleja en el chat como historial/resúmenes on-demand).
- **Recordatorios por WhatsApp** ("Mañana pagas $320.000 al BBVA").
- **Resúmenes por WhatsApp on-demand** ("Tu deuda total es $5.200.000; este mes debes $890.000").
- **Motor de sugerencias basado en reglas:** priorización de deudas por tasa (avalanche), alertas de sobregiro/falta de liquidez, detección de sobregasto por categoría.
- **Simulador de abonos** ("¿cuánto ahorro si abono $X extra?").
- **Multi-dispositivo** (mismo usuario, varios teléfonos sincronizados).
- **Categorías personalizables** por el usuario.
- **Tasas variables** y recálculo de amortización con cambios de tasa.
- **Abonos extraordinarios** (a capital vs. a cuota) reflejados en la amortización.

---

## 🟨 COULD HAVE — Fase 3

- **OCR de comprobantes/facturas** enviados por foto a WhatsApp o desde la app.
- **Visualización avalanche vs. snowball** con simulación comparativa y gráfica de progreso.
- **IA conversacional avanzada** (preguntas abiertas: "¿cómo voy este mes?", "¿puedo darme un lujo?").
- **Sincronización bidireccional en tiempo real** (WebSockets / push a la app cuando llega algo por WhatsApp).
- **Exportación** a CSV/Excel/PDF y reportes mensuales.
- **Metas de ahorro** y presupuestos por categoría.
- **Soporte multi-moneda** con conversión.
- **Registro de deudas donde el usuario es acreedor** (le deben a él — "gota a gota" inverso, préstamos a familiares).
- **Widget de home screen** (Android/iOS) con deuda total y próximo pago.

---

## ⬜ WON'T HAVE (por ahora)

- **Conexión bancaria automática (Open Banking / agregadores tipo Plaid/Belvo).** Alto costo, fricción regulatoria y de certificación. Se registra como visión a largo plazo, pero el diferenciador de ToCosas es justamente **no depender** de integraciones bancarias: WhatsApp cubre el registro.
- **Pagos dentro de la app** (ToCosas *rastrea* pagos, no los *ejecuta*; ser PSP implica licencias financieras).
- **Inversiones / bolsa / cripto.**
- **Versión web completa** (solo landing + portal de soporte en el MVP; el foco es móvil).
- **Modo multiusuario/familiar compartido** (finanzas de pareja/hogar) — evaluado para roadmap futuro.

---

## Matriz resumen

| Épica | Must | Should | Could | Won't |
|-------|:----:|:------:|:-----:|:-----:|
| Auth y cuentas | ✅ | | | |
| Entidades | ✅ | | | |
| Deudas + amortización | ✅ | tasas variables, abonos extra | avalanche/snowball visual | — |
| Transacciones | ✅ | categorías custom | metas/presupuestos | — |
| **WhatsApp captura texto** | ✅ | sync bidireccional, recordatorios | OCR, IA conversacional | — |
| Recordatorios | push local | por WhatsApp | — | — |
| Sugerencias | — | motor de reglas | IA avanzada | — |
| Simulador | — | abonos | comparador avalanche/snowball | — |
| Sync / offline | ✅ | multi-dispositivo | tiempo real | — |
| Integraciones bancarias | — | — | — | ❌ Open Banking |
