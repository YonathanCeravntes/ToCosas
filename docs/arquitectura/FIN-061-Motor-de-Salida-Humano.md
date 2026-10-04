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

## 3. Fase 2 · Gustos, tarjetas y plata del año (servidor implementado 2026-10-04)
Estudio aprobado por el Fundador ("Apruebo todo"): 7 reglas de consumo, 12 de tarjetas, liberar flujo como única regla con el costo de la otra a la vista, categorías Domicilios y Café y antojos, colchón por escalones, orden 2.2 → 2.3 → 2.4 → 2.5. Migración `20261004120000_fin061_fase2`.

- **2.1 (ya en producción):** lo esencial con mercado, transporte y salud; margen estable con la mediana de 3 meses (`SpendingBaselineService`), ahora también con el rango (mes más bajo y más alto).
- **2.2 · Esencial, gustos y mixtos** (`spend-class.util.ts`, `SpendClassService`, tabla `user_category_prefs`): clase sugerida por nombre (esencial / gusto / mixto), la persona la cambia; "Esto me sostiene" (`protected`) y tope mensual opcional. La línea base usa la clase de la persona. Categorías globales nuevas **Domicilios** y **Café y antojos** (la palabra "domicilio" sale de Comida). `GET /v1/spending/classes`, `PATCH /v1/spending/classes/:categoryId`.
- **2.3 · Análisis de consumo** (`consumption.util.ts`, `ConsumptionService`): banda de gustos según la carga de deuda (<20 % → 25/35; 20–35 % → 20/30; >35 % o mora → 15/25), la persona contra su mediana de 3 meses, silencio por defecto (≤1,25×, <$30.000, salidas ≤2 al mes), pico ≥1,5× solo con banda atención/alto o gusto a cuotas con interés mientras debe, espaciar a tu ritmo o a la mitad (nunca a cero), lo protegido solo con nota, suscripciones (repetidas, +10 %, >5 % del ingreso; sin nombrar marcas), gastos hormiga (<$25.000, >8 % del ingreso y 1,5×). Máximo 2 sugerencias, una por categoría, lo positivo primero, botón "Este gusto lo mantengo" (`canKeep` → marca protegida). Las compras con tarjeta cuentan en su categoría. `GET /v1/spending/consumption`. Pendiente: "sin uso en 60 días" (Millo no ve el uso de las plataformas).
- **2.4 · Salud de tu tarjeta** (`card-health.util.ts`, `CardHealthService`, tabla `card_statements`): las 12 reglas — uso del cupo 30/50/70/90 con abono para bajar a 50 % y 30 %, pago sugerido primero (cuota + abono del plan, entre mínimo y total), solo el mínimo dos meses → simulación con $100.000 más, compra pequeña a >3 cuotas, ≥24 cuotas, cuotas de tarjetas >20 % del ingreso con calendario de liberación, avances, cuota de manejo >$15.000 con poco uso, uso total si la cerraras, recordatorio 5 y 1 días antes sin pago, ciclo 25 % sobre el promedio con resumen por categoría. Compras con `categoryId` e `isCashAdvance` (un avance siempre cobra interés). El bot guarda el corte al crear una tarjeta desde un extracto. `GET/POST /v1/debts/cards/:debtId/statements`, `GET /v1/debts/cards/:debtId/health`.
- **Decisión 3 · el costo de la otra regla:** el plan para liberar flujo devuelve `alternative` (interés con el orden del plan frente a mayor tasa primero, con la tasa real de las tarjetas).
- **2.5 · Plata del año** (`year-plan.util.ts`, `YearPlanService`, tablas `annual_expenses` y `windfall_plans`, `income_sources.receives_prima`): gastos grandes del año repartidos entre los meses que faltan (se restan del margen estable y suman a lo esencial); ingreso irregular con el mes flojo de 6 (percentil 25, nunca más que lo estimado); primas (medio salario en junio y diciembre) e intereses de cesantías (12 % en enero) con reparto 60/20/20 editable y aviso 30 días antes — nunca entran al margen del mes; colchón por escalones 1 → 3 (asalariado con prima) → 6 (independiente, variable o único ingreso de la casa), sin cesantías. `GET/POST/PATCH/DELETE /v1/plan/annual-expenses`, `GET /v1/plan/windfalls`, `PUT /v1/plan/windfalls/:kind`, `GET /v1/plan/cushion?onlyIncome=true`.
- **App (siguiente paso):** pantallas Esencial y gustos, Tus gustos este mes, Salud de tu tarjeta (y datos del extracto en el detalle de la tarjeta), Plata extra del año y Tu colchón; categoría y avance al registrar una compra con tarjeta.

## 4. Siguientes fases
- **Fase 3 · Tu salida:** tres ritmos, fecha de libertad, celebraciones.
- **Fase 4 · Palancas de Colombia:** usura mensual, compra de cartera, modificación de condiciones con carta, pago mínimo, gota a gota, insolvencia, cobranza (Ley 2300) y habeas data (Ley 2157); detección de mora.
- **Fase 5 · Copiloto y avisos:** palabras prohibidas en todos los textos, un aviso de acción por semana.

## 5. Verificación
- Fase 1: unitarias 504/504 (nuevas: recomendaciones FIN-061 ×4, meses restantes ×4); e2e 134/134 (nueva: `fin061-cesantias.e2e-spec.ts`); `tsc` limpio en servidor y app.
- Fase 2 (servidor): unitarias 545/545 (nuevas: consumo ×15, tarjeta ×15, plata del año ×5, plan con la otra regla ×1); e2e 138/138 (nueva: `fin061-fase2.e2e-spec.ts` ×4); migración probada en una base vacía con `prisma migrate deploy`; `tsc` limpio.
