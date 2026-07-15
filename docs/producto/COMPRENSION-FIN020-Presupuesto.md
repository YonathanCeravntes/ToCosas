# Comprensión del problema · FIN-020 (Experiencia de Presupuesto)

- **Versión:** 1.0
- **Fecha:** 2026-07-12
- **Autor:** Agente Arquitecto
- **Estado:** Entregado — para evaluación del CTO y el CPSAO (requisito previo a ARQ-020)
- **Historial de cambios:**
  - v1.0 (2026-07-12) — respuesta a las 5 preguntas del CPSAO, verificada contra el
    código real.

---

## Verificación previa contra el código (lo que existe HOY)

`BudgetScreen.tsx` + `budget.service.ts`, verificados en esta fecha:

- La pantalla muestra: "Te queda este ciclo · jul 2026" con `available`, el % de
  ingreso comprometido con barra, desglose fijos−cuotas, botón a Cuentas, CRUD de
  compromisos fijos (con día del mes) y la lista de cuotas de deuda.
- **Hallazgo central, verificable en `budget.service.ts:106`:** `available =
  ingresos fijos − gastos fijos − cuotas programadas`. Es un número **ESTÁTICO** —
  no resta ni un peso del gasto variable real del ciclo. El día 1 y el día 29
  muestra lo mismo aunque el usuario haya gastado todo.
- Consecuencia visible con la usuaria demo: **hay dos "te queda" distintos en la
  app** — Inicio dice "Te queda para gastar · hasta el 31 jul: $6.092.801" (flujos
  reales del ciclo) y Presupuesto dice "Te queda este ciclo: $2.233.766"
  (compromisos estáticos). Misma promesa verbal, números distintos, sin explicación.
- Lo que el producto YA sabe del usuario y esta experiencia podría conectar:
  compromisos fijos **con día del mes**, cuotas de deuda **con fecha**, día de corte
  del ciclo (FIN-016), gasto variable diario por categoría (FIN-014), fondo de
  emergencia y cuentas de ahorro, gasto esencial del Motor, retos de gamificación,
  recomendaciones priorizadas (FIN-007).
- Lo que NO existe: ningún modelo de **metas/objetivos explícitos** (verificado en
  `schema.prisma`). Los "objetivos" de hoy son implícitos: fondo de 3–6 meses
  (FIN-004), salir de deudas, sostener la racha.

## Las 5 preguntas

### 1 · ¿Qué problema cotidiano intenta resolver realmente?

**El momento de decidir un gasto con un número que miente.** El saldo del banco —
y hoy también el `available` estático de esta pantalla — no le dice al usuario lo
único que necesita en la caja del supermercado o frente a un antojo: *"¿puedo
gastar esto HOY sin que el 25 no me alcance para el arriendo y las cuotas?"*. Parte
de su plata ya tiene dueño (fijos con fecha, cuotas con fecha) y parte pertenece a
los días que faltan del ciclo. El problema real es **la conversión de "cuánto
tengo" en "cuánto es realmente mío para gastar, repartido en el tiempo que queda"**
— el cálculo mental que todo el mundo hace mal por optimismo.

### 2 · ¿Por qué merece experiencia propia y no se resuelve desde Inicio o Salud?

Por **cadencia y dirección temporal**. Inicio es una foto del presente (¿cómo
estoy? — ejecutiva, FIN-018 la dejó deliberadamente limpia); Salud es mensual y
causal (¿por qué estoy así?). La decisión de gasto es **diaria y prospectiva**:
mira hacia los días que faltan y los compromisos que vienen, y necesita interacción
(¿y si gasto X?) que en Inicio sería ruido — meterle proyección diaria al hero
destruiría la claridad que costó cuatro iteraciones. Además esta pantalla es la
**casa de los compromisos** (el dato que alimenta el `available`, el gasto esencial
del Score y el flujo de Inicio): administrarlos y decidir con ellos es una tarea
propia, no un widget de otra experiencia.

### 3 · ¿Qué cambia en la capacidad de decisión del usuario?

Hoy decide **mirando el pasado o el saldo bruto** (cuánto gasté / cuánto hay en la
cuenta). Después debería decidir **mirando el futuro comprometido**: cuánto queda
de verdad después de apartar lo que ya tiene dueño, cuánto es eso por día/semana
hasta el corte, y qué pasa si hace el gasto que está considerando. El cambio de
capacidad es concreto: pasa de "espero que alcance" a **poder responder en el
momento de la compra** — la misma diferencia que hay entre un espejo retrovisor y
un copiloto.

### 4 · ¿Qué error común evita?

**Gastarse la plata comprometida** — confundir saldo con disponible. Es EL error
que produce los sobregiros de fin de ciclo, el pago mínimo de la tarjeta y el "no
sé en qué se me fue": el usuario ve $2M en la cuenta sin ver que $1,4M son el
arriendo del día 3 y las cuotas del 15 y el 28. El producto ya OBSERVA este error
(el `committedRatio` existe; los insights de FIN-006 avisan del sobregiro *después*
de que ocurre) — pero hoy nadie se lo advierte **a tiempo**, que es cuando la
decisión todavía se puede cambiar. Y hay un segundo error que hoy causamos
nosotros: los dos "te queda" contradictorios (verificación previa) enseñan al
usuario a desconfiar del número.

### 5 · ¿Qué perdería el usuario si esta experiencia no existiera?

**La única vista prospectiva del dinero.** Todo lo demás mira lo que ya pasó
(movimientos, categorías), el estado presente (Inicio) o las causas de largo plazo
(Salud). Sin Presupuesto, Milla sería un espejo excelente: capaz de explicar por
qué te quedaste corto, incapaz de evitarlo. Se perdería además la administración de
los compromisos fijos — la materia prima de la que viven el `available`, el gasto
esencial del Score y el desglose fijo/variable de Inicio. En términos del filtro
§31 (que el ARQ-020 deberá responder formalmente): la capacidad irreemplazable es
**decidir el gasto de hoy sin sabotear el resto del ciclo** — ninguna otra
experiencia mira hacia adelante dentro del ciclo.

## Nota de alcance para la decisión del CTO/CPSAO (previa al ARQ)

La guía dice "sin poner en riesgo **mis objetivos**" — hoy no existe ningún modelo
de metas explícitas (verificado). El ARQ-020 tendrá que resolver una decisión de
alcance que no es mía: ¿los objetivos implícitos que el producto ya conoce (fondo
de emergencia 3–6 meses, salir de deudas, el reto del mes) bastan como "objetivos a
proteger" en esta primera iteración, o nace un concepto de meta definida por el
usuario (que sería modelo nuevo, backend nuevo y una FIN considerablemente mayor)?
Mi lectura preliminar, coherente con "iteraciones pequeñas": los implícitos bastan
para la primera versión — pero lo dejo planteado como pregunta, no como decisión.
