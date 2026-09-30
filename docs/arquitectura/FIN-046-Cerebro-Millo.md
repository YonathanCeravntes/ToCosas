# FIN-046 · El cerebro de Millo (plan por fases)

- **Fecha:** 2026-09-29 · **Estado:** Fases 1, 2, 3 y 4 implementadas (Fase 3 se activa con CRON_SECRET + rama `chat`)
- **Pedido:** "Necesitamos potenciar el cerebro de Millo." El Fundador eligió las 4 líneas: Copiloto con IA de verdad, Millo proactivo, que aprenda de ti y bot de Telegram más listo.

## 1. Qué hay hoy (inventario honesto)
| Pieza | Existe | Qué le falta |
|---|---|---|
| Copiloto (`copilot/`) | Plantillas + IA (Claude Haiku; desde 2026-09-30 Google Gemini 3.5 Flash, `DEC-0043`) con 5 tools de solo lectura (snapshot, deudas, score, memoria, simulación). Contexto minimizado (§4.3). | La IA exige que cada persona la active; no conoce el plan de flujo (FIN-045), el presupuesto ni los próximos pagos; no puede proponer acciones. |
| Motor + Insights (`financial-engine/`, `insights/`) | Métricas diarias, insights (riesgo, logro, cambio de tendencia) y `ProactivityJob` 7 AM con tope anti-fatiga (1/día) por push/Telegram/WhatsApp. | Pocos tipos de aviso (no hay "vence en 3 días", "te sobró plata", resumen semanal). **Render free se duerme**: los cron no corren si nadie usa la app. |
| Memoria (`memory/`) | Detecta gastos/ingresos recurrentes (6 meses) y fechas clave. | No lo convierte en acción ("¿lo vuelvo gasto fijo?"); no aprende categorías por comercio. |
| Bot Telegram (`messaging/`) | Registra gastos por texto, lee extractos por foto/PDF, gastos fijos, renegociación. | No conversa (no usa el Copiloto), no entiende notas de voz ni recibos. |

## 2. Plan por fases (cada fase se entrega y valida antes de la siguiente)
**Fase 1 · Copiloto con IA de verdad** (base de todo lo demás)
- IA encendida para la Beta con consentimiento en un toque dentro del onboarding/Copiloto (no escondida).
- Tools nuevas: `get_cashflow_plan` (FIN-045), `get_budget` (Te queda y compromisos), `get_upcoming_payments`, `get_spending_by_category` (agregado, sin notas libres).
- **Acciones propuestas, nunca automáticas:** la IA puede proponer "crear gasto fijo", "registrar abono", "recortar categoría X"; la app muestra un botón **Confirmar**. Sin confirmación no se toca nada.
- Personalidad de asesor: responde con los números de la persona, un consejo y el siguiente paso.

**Fase 2 · Telegram = Copiloto**
- Preguntas libres en el bot → el mismo cerebro de la Fase 1 ("¿cuánto me queda?", "¿qué pago primero?").
- Fotos de recibos/facturas → proponer el gasto (reutiliza FIN-042).
- Notas de voz → transcripción y registro (requiere proveedor de voz, ver §3.3).

**Fase 3 · Millo proactivo**
- Avisos nuevos: cuota vence en 3 días; "este mes te sobró $X → abónalo a <deuda del plan>"; gasto de una categoría muy por encima de lo normal; resumen semanal (domingo) por Telegram.
- Mantiene el tope anti-fatiga y horas de silencio existentes.
- Requiere que los cron corran aunque nadie abra la app (§3.4).

**Fase 4 · Aprende de ti**
- Recurrencias detectadas → "Pagas Netflix cada mes, ¿lo vuelvo gasto fijo?" (un toque).
- Aprende categorías: cuando corriges una, la próxima vez del mismo comercio ya viene bien.
- Ingresos variables detectados → ajustan el plan de flujo y el presupuesto.

## 3. Decisiones del Fundador (pendientes)
1. **Orden de fases.** Recomendado: 1 → 2 → 3 → 4.
2. **IA para todos en la Beta** con consentimiento de un toque (Ley 1581: sigue siendo consentimiento explícito; gates de producción FIN-010 intactos).
3. **Costos.** Claude Haiku ≈ $0,002 USD por mensaje (los $5 cargados alcanzan para ~2.000 mensajes); Sonnet ≈ 10×. Voz: Claude no transcribe audio → otro proveedor (≈ $0,006 USD/min) u omitir voz por ahora.
4. **Cron con Render free.** Opción gratis: un GitHub Actions programado que "despierta" el backend y dispara los avisos; opción paga: plan Render ($7 USD/mes) sin dormirse.

## 4. Decisiones del Fundador (2026-09-29)
1. Orden **1 → 2 → 3 → 4**.
2. **IA para toda la Beta** con permiso de un toque al entrar al Copiloto.
3. **Voz: después** (primero texto y fotos).
4. **Avisos 24/7 con despertador gratis en GitHub Actions** (sin pagar Render).

## 5. Fase 1 · Implementado (2026-09-29)
- **IA primero:** con permiso, clave y cupo, la IA responde todo; las plantillas quedan de respaldo (sin permiso, sin clave, circuito abierto o tope diario).
- **Herramientas nuevas** (`copilot/brain-views.service.ts`, vistas minimizadas en `minimized-views.ts`): `get_cashflow_plan` (FIN-045), `get_budget_now` (Te queda §32), `get_upcoming_payments` (31 días) y `propose_action` (crear gasto fijo, abonar deuda, ver plan, ver presupuesto; máx. 3 por respuesta, validadas en servidor).
- **Prompt de asesor:** trae los números con herramientas, da un consejo con cifras y el siguiente paso; regla de deudas = liberar flujo; nunca afirma haber ejecutado algo.
- **Privacidad intacta:** la IA ve "deuda #N (tipo)" y "gasto fijo #N"; la respuesta se guarda así (el historial vuelve a la IA sin nombres) y **se muestra** con los nombres reales (`humanize`).
- **App:** permiso de un toque al entrar al Copiloto (Acepto / Ver detalles / Ahora no); botones de acción bajo la respuesta (crear gasto fijo se confirma ahí mismo; abonar abre la deuda; plan y presupuesto navegan); preguntas sugeridas nuevas.
- **Limpieza:** sin emoji en títulos de logros/novedades (backend y los ya guardados, en la app).
- **Verificación:** unit 415/415, e2e 97/97 (nuevo `fin046-copiloto-cerebro`: sin permiso = plantilla; con permiso = IA + acciones; nada con nombre cruza a la IA). Web revisada con Playwright (sin clave de IA local → respaldo por plantilla, esperado).
- **Límite diario:** se mantiene en 10 mensajes con IA por día (gratis). Se puede subir si la Beta lo pide.

## 6. Fase 2 · Implementado (2026-09-29) — Telegram = Copiloto
- **Preguntas libres → el mismo cerebro:** el bot manda las preguntas (signos "¿?" o arranques como "cuánto", "me alcanza", "qué", "debo") a `CopilotService.sendMessage` y continúa el hilo de las últimas 2 h. Movimientos, resumen, deshacer, gasto fijo y renegociar siguen por reglas (instantáneos).
- **Mismo permiso que la app:** "activar ia" muestra el texto de consentimiento; "acepto ia" lo otorga; "revocar ia" lo quita. Sin permiso: el bot no llama a la IA, responde lo que las reglas saben (resumen, simulación) y dice cómo activarla; lo que no entiende lo dice claro (§5.2).
- **Acciones:** "crear gasto fijo" queda pendiente y se confirma con *sí* (lo crea `BudgetService`, §32); abonar, ver plan y ver presupuesto se explican con la ruta en la app (el bot no mueve plata).
- **Recibos y facturas:** la lectura por foto (FIN-042) ya los reconocía; se afinó la instrucción para tomar el TOTAL (no subtotal, IVA ni vueltas) y el comercio; facturas de servicios toman "Total a pagar".
- **Verificación:** 6 pruebas nuevas (`telegram-copilot.spec.ts`), unit 421/421, e2e 97/97.

## 7. Fase 3 · Implementado (2026-09-29) — Millo proactivo
- **Hallazgo:** los recordatorios de cuota (3, 1 y 0 días antes, por push/WhatsApp/Telegram) ya existían pero nunca llegaban: Render free se duerme y además corrían a las 8:00 del servidor (3:00 a. m. en Colombia). Ahora: 8:00 de Bogotá.
- **Recorrido diario en una llamada** (`modules/cron/`): `POST /v1/internal/cron/daily` (cabecera `x-cron-secret` = `CRON_SECRET`; sin variable, apagado). Corre en orden: snapshot → tendencias/anomalías → recomendaciones → logros → memoria (domingo) → revisión por corte → **te sobró** → avisos (1/día, anti-fatiga) → recordatorios de cuotas → **resumen semanal** (domingo) → retenciones/purga/suscripciones. Cada paso es idempotente y un fallo no frena al resto.
- **"Te sobró plata":** en los últimos 5 días del ciclo, si "Te queda" ≥ $100.000, un aviso por ciclo con la jugada del plan (FIN-045): cuánto abonar, a qué deuda y cuánto libera; y el colchón si aplica.
- **Resumen semanal por Telegram (domingo):** lo que salió/entró en la semana, lo que queda del ciclo y por día, el próximo pago y la jugada del plan. Una vez por semana; respeta `proactiveEnabled` y el opt-in del chat.
- **Anomalías de gasto por categoría:** ya las detecta `TrendsJob`; ahora sí corren a diario.
- **Despertador gratis:** `.github/workflows/millo-despertador.yml` (6:50 a. m. Bogotá, con reintentos mientras Render despierta). GitHub solo agenda flujos desde la rama principal (`chat`).
- **Activación (Fundador):** 1) crear una clave larga; 2) Render → Environment → `CRON_SECRET`; 3) GitHub → Settings → Secrets → Actions → `CRON_SECRET` (mismo valor); 4) que el flujo llegue a `chat`.
- **Verificación:** e2e `fin046-proactivo` (clave obligatoria, recorrido completo sin fallos, "te sobró" una vez por ciclo y no a mitad de ciclo, resumen semanal); unit 421/421, e2e 103/103.

## 8. Fase 4 · Implementado (2026-09-29) — Aprende de ti
- **Categorías por comercio** (`category_hints`, migración `20260929160000_fin046_category_hints`): cuando la persona elige o **corrige** una categoría, Millo la recuerda para ese comercio (la nota sin montos, tildes ni palabras de relleno: "Pagué Netflix $45.000" → `netflix`). La próxima vez sin categoría (app o bot) ya viene bien; en el bot lo aprendido gana sobre las palabras clave genéricas. La última elección manda. Lo automático (gastos fijos) no enseña.
- **"¿Pagas Netflix cada mes?"**: un comercio registrado **una vez por mes**, en meses seguidos (2 o más, el último este mes o el anterior), con monto ±15% y día ±5, que no sea ya un gasto fijo → propuesta. Varias compras en un mes (almuerzos, Uber) no cuentan.
- **Ingresos que Millo no conoce** (3 meses completos): sin ingresos declarados y lo recibido es estable → "¿Te entra plata cada mes?" (ingreso fijo con lo mínimo recibido); con ingresos declarados y los 3 meses llegó ≥10% más → "Te está entrando más de lo que declaraste" (ingreso variable con lo mínimo que sobró, redondeado a $10.000, desde $50.000). Así el plan de flujo y Mi mes cuentan con esa plata.
- **Un toque, nunca solo:** cada propuesta es una novedad `oportunidad` con `payload.action`; sale una sola vez y, si se descarta, no vuelve. "Sí, hazlo" → `POST /v1/proposals/:id/accept`: crea el gasto fijo (tipo inferido por el nombre) y **enlaza lo ya pagado este ciclo** para no contarlo doble, o crea el ingreso fijo/variable.
- **Dónde se ve:** Copiloto ("Millo notó") y Mi mes. Por Telegram llega como aviso (tope anti-fatiga de siempre) y se confirma en la app.
- **Privacidad:** a la IA solo cruzan los números del payload (nunca el nombre del comercio).
- **Recorrido diario:** nuevo paso `propuestas` después de `memoria`.
- **Verificación:** unit 437/437 (detección y clave de comercio, bot con lo aprendido), e2e 116/116 (nuevo `fin046-aprende`: aprende y corrige categorías, propone Netflix una sola vez, confirma sin doble conteo, ingreso fijo detectado). Web revisada con Playwright.
