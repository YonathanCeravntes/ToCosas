# DEC-0041 · Encender la IA (Copiloto) en la Beta cerrada

- **Fecha:** 2026-09-28 · **Decide:** Fundador · **Registra:** Arquitecto (`DEC-ORG-002`)
- **Contexto:** el Copiloto con Claude (FIN-005/DEC-0005) estaba apagado en producción por el
  gate legal DPA+PIA (`PRODUCCION.md` §1, `render.yaml`: `COPILOT_PRODUCTION_ENABLED=false`).
  Tras vincular Telegram, el Fundador pidió leer extractos de tarjeta por foto (futura FIN-042),
  que requiere IA con visión, y decidió "vamos a terminarlo".

## Decisión
1. **Se enciende el Copiloto en la Beta cerrada**, cuyo único usuario con datos reales es el
   Fundador, titular de sus propios datos. Mismo criterio que la activación del Score
   (BT-006, 2026-07-14): decisión ejecutiva del Fundador para la Beta; **el gate DPA+PIA sigue
   obligatorio antes de abrir la IA a terceros** (FIN-010).
2. Configuración en Render (panel, no en el repo): `ANTHROPIC_API_KEY` (llave de
   console.anthropic.com con saldo prepagado; la suscripción Claude Max **no** da acceso a la
   API) y `COPILOT_PRODUCTION_ENABLED=true`. Modelo: `claude-haiku-4-5-20251001` (LLM_MODEL).
3. El consentimiento en la app (DEC-0005 §14.1) sigue siendo obligatorio por usuario.
4. Siguiente paso técnico autorizado a diseñar: **FIN-042 · Lectura de extractos y
   comprobantes por foto/PDF vía bot** (extracción con Claude visión → propuesta → confirmación
   del usuario → alta de deuda/movimiento). Nunca se registra nada sin confirmación (DEC-0029).

## Riesgos aceptados
- Datos financieros reales del Fundador viajan a Anthropic bajo sus términos de API (sin DPA
  firmado). Aceptado para la Beta cerrada; no extensible a otros usuarios.
- Costo variable por uso: Haiku 4.5 es el modelo de menor costo; el módulo ya tiene límite
  diario por usuario (10 mensajes; 100 con Millo+) y reporte de costo (`billing/cost-report`).
