# FIN-046 · El cerebro de Millo (plan por fases)

- **Fecha:** 2026-09-29 · **Estado:** decisiones tomadas; Fase 1 en curso
- **Pedido:** "Necesitamos potenciar el cerebro de Millo." El Fundador eligió las 4 líneas: Copiloto con IA de verdad, Millo proactivo, que aprenda de ti y bot de Telegram más listo.

## 1. Qué hay hoy (inventario honesto)
| Pieza | Existe | Qué le falta |
|---|---|---|
| Copiloto (`copilot/`) | Plantillas + Claude (Haiku) con 5 tools de solo lectura (snapshot, deudas, score, memoria, simulación). Contexto minimizado (§4.3). | La IA exige que cada persona la active; no conoce el plan de flujo (FIN-045), el presupuesto ni los próximos pagos; no puede proponer acciones. |
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
