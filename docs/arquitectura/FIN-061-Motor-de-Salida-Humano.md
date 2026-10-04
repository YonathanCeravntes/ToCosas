# FIN-061 · Motor de Salida Humano

- **Fecha:** 2026-10-04 · **Pide:** Fundador ("que alimentemos bien el motor… recomendaciones precisas… sin quebrar la vida de este usuario"; ejemplos: el cine y el tinto son parte del bienestar). Estudio y bocetos: "Motor de Salida Humano" (https://claude.ai/artifact/5Ph1H3QfgDvxqSVkF9uPbb).
- **Decisión del Fundador:** "Este motor me parece algo viable y principalmente aportante." Agrega: las **cesantías** son un ingreso/patrimonio que **no se puede retirar** salvo situaciones particulares.
- **Ejecuta:** Arquitecto. Recomendaciones del estudio tomadas como aprobadas (10 reglas, una sola regla de orden, piso de bienestar 5 %, ritmos 30/50/70, primas 60/20/20, rutas legales como información).

## 1. Las 10 reglas (constitución del motor)
1. Piso de bienestar: lo que la persona marca como "esto me sostiene" no se toca; siempre queda un mínimo para disfrutar (≥ 5 % del ingreso, nunca cero).
2. Recortes solo sobre fugas (comisiones, mora, cuota de manejo, seguros caros, suscripciones sin uso, picos frente a la propia línea base).
3. Cero mora primero.
4. Colchón (1 mes de esenciales) antes de acelerar; mientras tanto, mitad deuda y mitad colchón.
5. Tasa antes que sacrificio (usura, compra de cartera, modificación de condiciones), con advertencia de no volver a llenar la tarjeta.
6. Una sola regla de orden: liberar flujo (FIN-045), con victoria rápida y el costo frente al orden por tasa visible.
7. Tres ritmos: tranquilo 30 %, equilibrado 50 % (por defecto), acelerado 70 % del margen, sin bajar del piso.
8. Plata extra repartida antes de llegar (primas: 60 % deuda / 20 % colchón / 20 % disfrute).
9. Sin culpa: palabras prohibidas, recálculo silencioso, máximo un aviso de acción por semana.
10. Celebrar y automatizar (la cuota de la deuda cerrada pasa a la siguiente).

## 2. Fase 1 · implementada (2026-10-04)
- **Se retira "Recorta 20 % de {categoría}"** (`recorte_categoria`) y la recomendación **avalancha/bola de nieve** (`estrategia`): las ya guardadas dejan de mostrarse (`RETIRED_KINDS`).
- **Una sola regla de orden:** el abono extra va a la primera deuda del plan para liberar flujo (`orderByCashflow`), con tasas convertidas a **Efectiva Anual** (antes tasa cruda: 2,5 % mensual quedaba por debajo de 25 % anual). El aviso de endeudamiento alto ya no dice "prioriza la deuda más cara": manda al plan.
- **Meses restantes sin tabla de pagos** (tarjetas, "saldo y cuota"): fórmula de anualidad (`estimateRemainingMonths`); antes daba 1 mes y la recomendación de abono se perdía.
- **Copiloto:** reglas 6 (sin culpa; no recomendar quitar gustos; llevar a cero mora, tasa, cobros innecesarios y el plan) y 7 (cesantías).
- **Cesantías:** tipo de activo `cesantias` (migración `20261004090000_fin061_cesantias`); siempre **no líquidas** (crear/editar), suman al patrimonio, nunca al colchón ni a la liquidez; `totalCesantias` en el patrimonio. App: opción "Cesantías" en Cuentas con la explicación, y nota en Salud → Patrimonio ("solo se retiran para vivienda, educación o al terminar tu contrato").
- Hallazgo latente: el estado `en_mora` existe pero nada lo asigna; se resuelve en la fase de detección de mora (Fase 4).

## 3. Siguientes fases
- **Fase 2 · Alimentar el motor:** "Lo que te sostiene" (categorías protegidas), "Afinar tu plan", primas e intereses de cesantías, esencial con mercado/transporte/salud, margen estable (no el del día).
- **Fase 3 · Tu salida:** tres ritmos, fecha de libertad, celebraciones.
- **Fase 4 · Palancas de Colombia:** usura mensual, compra de cartera, modificación de condiciones con carta, pago mínimo, gota a gota, insolvencia, cobranza (Ley 2300) y habeas data (Ley 2157); detección de mora.
- **Fase 5 · Copiloto y avisos:** palabras prohibidas en todos los textos, un aviso de acción por semana.

## 4. Verificación (Fase 1)
- Unitarias 504/504 (nuevas: recomendaciones FIN-061 ×4, meses restantes ×4); e2e 134/134 (nueva: `fin061-cesantias.e2e-spec.ts`); `tsc` limpio en servidor y app.
