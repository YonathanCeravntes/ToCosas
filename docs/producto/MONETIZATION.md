# Estrategia de Monetización — Millo

- **Versión:** 1.0
- **Fecha:** 2026-07-06
- **Autor:** CTO (scaffold inicial, consolidando lo ya decidido en DEC-0009)
- **Estado:** Vigente (modelo v1) — abierto a nuevas propuestas del CPSAO
- **Historial de cambios:**
  - v1.0 (2026-07-06) — creación del documento; consolida las decisiones ya tomadas
    en `DEC-0009-Monetizacion-y-Hardening.md`.

---

## Modelo vigente (implementado, FIN-009)

- **Freemium / Premium ("Millo+")**: matriz Free/Premium con `EntitlementsService`
  como autoridad única. Free nunca gatea Score actual, indicadores ni registro
  (DEC-0004 §principio, DEC-0009 §4).
- **Canal de cobro**: solo tiendas (IAP vía RevenueCat) — decisión del fundador,
  DEC-0009 §4.5. Web/pasarela local queda fuera de alcance por ahora (puerto
  `PaymentProvider` diseñado agnóstico para no cerrar la puerta a futuro).
- **Precio**: aún no fijado en producción — condicionado a telemetría de costo
  variable por usuario (`GET /billing/admin/cost-report`, DEC-0009 §4.6) antes de
  activar cobros reales.
- **Trial**: 7 días de Millo+ al registrarse, una única vez por usuario.
- **Límite free de simulaciones**: 5/mes para todos los usuarios (sin grandfathering).
- **Códigos promocionales**: canje atómico, `maxUses` obligatorio, activación
  administrativa auditada (DEC-0009 §10).

## Modelos en evaluación (sin decisión aún)

*Pendiente de propuestas del CPSAO*: marketplace, publicidad, servicios financieros,
afiliados, Open Banking, alianzas. Ninguno de estos se implementa sin pasar por el
flujo estratégico completo (Gobernanza v3.0, Parte II).

## Gates pendientes antes de escalar cobros reales

Ver `docs/PRODUCCION.md` §8 para el checklist operativo completo (cuenta RevenueCat,
política de tiendas, precio final).
