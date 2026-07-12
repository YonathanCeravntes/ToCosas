# ARQ-0020 · Experiencia de Presupuesto

- **Versión:** 1.0
- **Fecha:** 2026-07-12
- **Autor:** Agente Arquitecto
- **Estado:** Propuesto — en espera de AUD-020 y DEC-020
- **Historial de cambios:**
  - v1.0 (2026-07-12) — emisión conforme a la autorización del CTO/CPSAO: alcance
    de objetivos implícitos + las dos condiciones de diseño (§32 definición única
    de "Te queda"; la experiencia ayuda a decidir QUÉ HACER con el dinero).
- **Módulo/Feature:** FIN-020 · **Origen (v3.5 §27):** Mejora de revisión de producto
- **Insumos:** `COMPRENSION-FIN020-Presupuesto.md` (commit `5b5c3b1`) · GOBERNANZA §32 · precisión del CPSAO sobre "objetivos"

---

## 0. Intención

> **Al abandonar Presupuesto, el usuario debe poder decidir el gasto de hoy sin
> sabotear el resto del ciclo: sabe cuánto es suyo de verdad, qué está protegido y
> para qué, y qué hacer con lo libre.** No es un registro de gastos: es la vista
> prospectiva del dinero — el copiloto del momento de la compra.

"Objetivos" (precisión del CPSAO): cualquier compromiso futuro que el usuario quiera
proteger — sus fijos con fecha, sus cuotas con fecha, su fondo de emergencia, el
margen del propio ciclo. No requiere modelo de metas (alcance ratificado).

## 1. Objetivo
Una sola definición oficial de "Te queda" (§32) consumida por todas las pantallas, y
una experiencia que convierta ese número en decisiones: cuánto por día, qué viene,
qué hacer con lo libre.

## 2. Problema
El documentado en COMPRENSION-FIN020 y ratificado en §32: dos fórmulas de "Te queda"
contradictorias ($6.092.801 vs $2.233.766, misma usuaria); el `available` estático
no resta el gasto real; nadie advierte a tiempo el error de gastarse la plata
comprometida; y la pantalla actual es administrativa (CRUD), no decisoria.

## 3. Alcance
**Incluye:** definición única de "Te queda" en UN servicio de backend consumido por
Presupuesto E Inicio (el cambio en Inicio es parte inseparable de §32 y se declara
aquí); rediseño de `BudgetScreen`; conservación del CRUD de compromisos.
**Excluye:** modelo de metas explícitas (ratificado), notificaciones nuevas,
cambios al Motor/Score, otras pantallas más allá del consumo del servicio único.

## 4. Diseño — alternativas por pieza

### P1 — La única definición oficial de "Te queda" (§32, condición 1 y 2)

| | **Alt A — "Tuyo de verdad" conservador (recomendada)** | **Alt B — Proyección a fin de ciclo** | **Alt C — Flujos reales (Inicio actual)** |
|---|---|---|---|
| Fórmula | `(ingresos reales del ciclo) − (gastos y pagos reales) − (compromisos PENDIENTES del resto del ciclo: fijos con dayOfMonth por venir + cuotas con nextDueDate dentro del ciclo)` | Como A, pero SUMANDO los ingresos fijos aún no recibidos del ciclo | `ingresos reales − gastos reales − pagos reales` (sin restar compromisos pendientes) |
| Qué representa | Lo que puede gastar HOY sin tocar plata que ya tiene dueño | Cómo terminará el ciclo si todo entra y sale según lo previsto | Lo que no ha gastado de lo que entró |
| Ventajas | **Nunca miente hacia arriba** — el error #1 del usuario es el optimismo (COMPRENSION §1/§4); es el número correcto para la decisión de compra; datos 100% disponibles | Útil para planear | Ya existe |
| Desventajas | Antes del día de pago puede verse bajo — pero ESA es la verdad ("hasta que llegue tu sueldo, lo libre es esto") | Cuenta plata que aún no llega — exactamente el optimismo que causa el error; peligrosa como número de decisión | Sobreestima: ignora el arriendo del día 3 y las cuotas del 15/28 — es la fórmula que hoy engaña en Inicio |

**Por qué A representa mejor la realidad (condición 2 del CTO):** la pregunta real
del usuario es prospectiva y del presente ("¿puedo gastar esto HOY?"); solo A
descuenta lo que ya tiene dueño sin contar lo que aún no existe. B responde OTRA
pregunta legítima ("¿cómo cierro el ciclo?") — si el DEC la quiere, debe vivir como
concepto distinto con nombre distinto ("proyección de cierre"), nunca como segundo
"Te queda" (§32).

### P2 — Fuente única (§32, condición 3)

| | **Alt A — Servicio único de backend (recomendada)** | **Alt B — Util compartida importada por ambos servicios** |
|---|---|---|
| Qué es | Nuevo `SpendableService.compute(userId)` en el módulo budget → devuelve `{amount, perDay, daysLeft, until, pendingCommitments[]}`; `GET /budget/monthly` y `GET /dashboard/home` lo INYECTAN y exponen el mismo objeto `teQueda` | Función pura compartida que cada servicio llama con sus propios datos cargados |
| Ventajas | Una sola consulta de datos y un solo cálculo — imposible divergir ni por datos ni por fórmula; testeable una vez | Menos acoplamiento entre módulos |
| Desventajas | Dashboard importa del módulo budget (aceptable: ya importa `financialPeriod` — consumidor autorizado por FIN-016) | La misma fórmula con datos cargados dos veces puede divergir por filtros distintos — el bug §32 renacería por la puerta de atrás |

**Efecto declarado en Inicio:** el hero "Te queda para gastar · hasta el 31 jul"
pasa a mostrar el valor del servicio único (baja respecto al actual porque ahora
descuenta compromisos pendientes — se vuelve honesto). Su interpretación (FIN-017)
se recalcula sobre el nuevo valor sin cambiar de forma.

### P3 — El reparto en el tiempo

| | **Alt A — Por día (recomendada)** | **Alt B — Por semana** | **Alt C — Solo el total** |
|---|---|---|---|
| Qué es | Bajo el número: "≈ $X por día hasta el 31 jul" (`amount/daysLeft`) | "≈ $X por semana" | Nada |
| Ventajas | La unidad de decisión cotidiana es el día; división simple, cero magia | Menos presión | Minimal |
| Desventajas | Puede sentirse restrictivo (mitigable con "≈") | La semana cruza el corte y confunde | Pierde la conversión a decisión diaria — media experiencia |

### P4 — Lo protegido, visible (los "objetivos" del CPSAO)

| | **Alt A — Línea de tiempo de compromisos del ciclo (recomendada)** | **Alt B — Solo el total protegido** |
|---|---|---|
| Qué es | "Protegido para lo que viene: $X" + lista cronológica de lo PENDIENTE del ciclo (arriendo · día 3 · $1.1M ✓pagado / cuota tarjeta · 28 jul · $97.199 ⏳), mezclando fijos y cuotas ordenados por fecha | Una sola cifra "Comprometido: $1.4M" |
| Ventajas | El usuario VE por qué el número es el que es — la protección deja de ser una resta invisible; usa datos existentes (dayOfMonth, nextDueDate) | Compacta |
| Desventajas | El "✓pagado" de fijos es aproximado en v1 (sin matching pago↔fijo, se marca por fecha pasada — declarado) | La resta sigue siendo una caja negra — reproduce la desconfianza |

### P5 — Qué hacer con lo libre (condición del CPSAO: decidir, no solo calcular)

| | **Alt A — Puente a la jugada (recomendada)** | **Alt B — Tips estáticos** |
|---|---|---|
| Qué es | Si hay margen tras compromisos: "Te quedan $X libres — tu mejor destino: {recomendación top de FIN-007} →" (mismo patrón de la jugada de Salud, misma fuente); si el margen es negativo: aviso honesto + puente al simulador de recorte | Textos genéricos ("ahorra el 10%") |
| Ventajas | El destino del dinero libre sale del motor real priorizado por impacto; cierra el ciclo decidir→actuar; cero lógica nueva | Simple |
| Desventajas | Depende del estado del motor (mismo fallback de FIN-019: indicador más débil) | Generalidades — lo que el CPSAO pidió evitar |

### P6 — La casa de los compromisos (se conserva)

El CRUD de fijos y la lista de cuotas se mantienen (es la administración de la
materia prima), reubicados DEBAJO de la zona de decisión (número → por día →
protegido → destino), con el patrón de tap honesto para el formulario de alta.
Alternativa considerada y descartada: moverlo a Ajustes (rompería "la casa de los
compromisos" — COMPRENSION §2 — y alejaría el mantenimiento del lugar donde sus
efectos se ven).

### 4.7 — Composición integrada (si el DEC aprueba las recomendadas)

```
[Presupuesto]
┌─ Tuyo de verdad (verde Millo) ────────────┐
│ Te queda para gastar · hasta el 31 jul    │
│ $ 4.6xx.xxx          ← servicio ÚNICO §32 │
│ ≈ $232.000 por día (20 días)              │
└───────────────────────────────────────────┘
┌─ 🛡️ Protegido para lo que viene: $1.4M ──┐
│ ✓ Arriendo         día 3    $1.100.000   │
│ ⏳ Cuota tarjeta    28 jul   $97.199      │
│ ⏳ Cuota crédito    15 ago*  (fuera ciclo)│
└───────────────────────────────────────────┘
┌─ ⭐ Con lo libre: tu mejor destino ────────┐
│ Aparta para tu fondo de emergencia →      │
└───────────────────────────────────────────┘
[➕ Compromisos fijos (CRUD, tap honesto)]
[Cuotas de deuda · Cuentas y patrimonio]
```

## 5. Respuesta al filtro §31 (pregunta obligatoria de cierre)

Si elimináramos Presupuesto, el usuario perdería **la capacidad de decidir el gasto
de hoy sin sabotear el resto del ciclo** — la única vista prospectiva del dinero.
Inicio no puede reemplazarla: es una foto ejecutiva del presente y FIN-018 la
definió deliberadamente sin interacción prospectiva; cargarla con reparto diario,
compromisos cronológicos y destino del libre la devolvería a la densidad que costó
4 iteraciones quitar. Salud no puede: su cadencia es mensual y su pregunta es
causal. Movimientos mira el pasado. Además se perdería la casa de los compromisos
fijos — la materia prima de la que viven el gasto esencial del Score, el desglose
fijo/variable de Inicio y el propio "Te queda". El valor diferencial es claro:
**ninguna otra experiencia mira hacia adelante dentro del ciclo.**

## 6. Componentes
Backend: `SpendableService` (módulo budget) + consumo en `budget.service` y
`dashboard.service` + tests. Frontend: `BudgetScreen` rediseñada; `DashboardScreen`
solo cambia la fuente del hero (mismo layout).

## 7. Base de datos
Ninguna.

## 8. Backend
Solo el servicio único y su exposición en los dos endpoints (campo `teQueda`
idéntico). Sin migraciones, sin cambios al Motor.

## 9. Uso de IA
Ninguno.

## 10. Riesgos
- El hero de Inicio BAJA de valor al volverse honesto (descuenta compromisos
  pendientes) → riesgo de percepción "perdí plata"; mitigación: la sección
  protegida explica la diferencia, y el cambio se documenta para la RC.
- "✓ pagado" aproximado por fecha en v1 (sin matching transacción↔fijo) →
  declarado en UI con lenguaje neutro ("ya pasó su fecha") si el DEC lo prefiere.
- Margen negativo (gastó de más) → texto honesto sin juicio (§29.2) + palanca.

## 11. Dependencias
`financialPeriod` (FIN-016), fijos con `dayOfMonth`, cuotas con `nextDueDate`,
recomendaciones (FIN-007). Ninguna nueva.

## 12. Impacto
2 pantallas (Presupuesto rediseñada; Inicio cambia la fuente del hero) + 1 servicio
nuevo. §32 queda cumplido por construcción: un solo cálculo, dos consumidores.

## 13. Criterios de aceptación
1. **§32 verificable:** `grep` demuestra que ni `budget.service` ni
   `dashboard.service` calculan "te queda" por su cuenta — ambos consumen
   `SpendableService`; test de igualdad: el mismo usuario recibe el MISMO valor en
   ambos endpoints.
2. Test unitario de la definición A con caso a mano (ingresos/gastos/compromisos
   pendientes dentro y fuera del ciclo).
3. Captura: número + por día + protegido cronológico + destino, sin interacción.
4. El hero de Inicio muestra el valor del servicio único (test de igualdad E2E).
5. Cero segundas fórmulas: la palabra "Te queda" aparece solo sobre el valor único.
6. Capturas antes/después de AMBAS pantallas; suite completa; typecheck; bundle.
7. Filtro §31 respondido (§5 de este documento).

## 14. Plan
1. AUD-020 → DEC-020 → 2. `SpendableService` + tests + consumo en ambos endpoints →
3. `BudgetScreen` rediseñada + hero de Inicio a la fuente única → 4. capturas de
scroll completo antes/después (ambas pantallas) → 5. IMP-0020 con SHA y juicio
razonado → validación → cierre.
