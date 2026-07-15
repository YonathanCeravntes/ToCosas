# IMP-0020 · Experiencia de Presupuesto ("Te queda" con fuente única)

- **Versión:** 1.0
- **Fecha:** 2026-07-12
- **Autor:** Agente Arquitecto/Desarrollador
- **Estado:** Entregado — para VALIDACIÓN del Auditor y posterior cierre del CTO
- **Historial de cambios:**
  - v1.0 (2026-07-12) — emisión tras la confirmación puntual del CTO a las dos
    correcciones de P1 (DEC-0020 §5, resueltas en ARQ-0020 v1.1).
- **Módulo/Feature:** FIN-020 · **Origen (§27):** Mejora de revisión de producto
  (hallazgo §32 del documento de comprensión: dos fórmulas de "Te queda")
- **Documentos base:** `ARQ-0020-Experiencia-Presupuesto.md` v1.1 · `AUD-0020` ·
  `DEC-0020` · `COMPRENSION-FIN020-Presupuesto.md`
- **Referencia inmutable (regla GOBERNANZA):** commit
  **`125c5c6f296d36fe6126067e90e09d12c7c4fc5f`**

## 1. Resumen

El problema que abrió esta FIN — dos definiciones distintas de "Te queda"
conviviendo en Inicio y Presupuesto — queda resuelto **por construcción**, no por
disciplina: existe un único `SpendableService` en el módulo budget, y los dos
endpoints lo INYECTAN y exponen el mismo objeto `teQueda`. Cualquier fórmula
paralela futura tiene que romper un test e2e de igualdad para nacer. Sobre esa
fuente única se montó la zona de decisión de Presupuesto (número → por día →
protegido cronológico → destino de lo libre) y el hero de Inicio cambió de
proyección estructural a valor honesto (Alt A: nunca miente hacia arriba).

## 2. Archivos del commit

| Área | Archivos | Qué |
|---|---|---|
| Backend nuevo | `budget/spendable.service.ts` (+spec), `test/fin020-tequeda.e2e-spec.ts` | La definición oficial + su evidencia |
| Backend tocado | `budget.module/service`, `dashboard.module/service` (+spec) | Inyección del servicio único; `interpretCashflow` recalibrada §4.1-ter |
| Frontend | `BudgetScreen.tsx` (rediseño), `DashboardScreen.tsx` (solo fuente del hero), `api/types.ts` | Zona de decisión; mismo layout de Inicio |
| Evidencia | `docs/producto/capturas/fin-020/` + `scripts/captura/capture-fin020.js` | Full-scroll reales de AMBAS pantallas |

Sin migraciones, sin cambios al Motor, sin IA — como declaró el ARQ (§7–§9).

## 3. Cumplimiento por pieza (DEC-0020)

| Pieza | Implementación | Verificación |
|---|---|---|
| P1 (Alt A + §4.1-bis) | `teQueda = ingresos REALES − salidas REALES − pendientes`; fijos de gasto cuentan TODO el ciclo tengan o no fecha pasada (política ii — solo sesga hacia abajo); cuotas solo si `nextDueDate` cae en lo que RESTA (su pago SÍ es observable, FIN-018); ingresos futuros NO cuentan | Caso a mano en `spendable.service.spec.ts` (4 tests, incl. fijo vencido-sin-transacción y corte de ciclo 15); e2e: el salario declarado de $4M no suma |
| P1 (§4.1-ter) | `interpretCashflow` sobre `teQueda.amount / receivedIncome`; corte 10% conservado con justificación (holgura relativa — bajo Alt A el amarillo llega ANTES, dirección correcta); rojo SIN culpa ("Lo que viene comprometido supera lo que te queda — mira qué puedes mover"); verde "$N de cada $100… después de apartar lo que viene" | Captura Inicio: "🟢 $39 quedan libres…" = 1.795.602/4.550.000 ✓; test e2e del texto rojo |
| P2 (fuente única §32) | `SpendableService` exportado por BudgetModule e inyectado por AMBOS servicios — una consulta, un cálculo, dos consumidores | e2e `home.teQueda === budget.teQueda` (igualdad estructural completa); grep: "Te queda" solo existe sobre el valor único (2 heros); `available` estructural quedó SIN esa etiqueta |
| P3 (por día) | "≈ $X por día (N días)" bajo el número (`amount/daysLeft`); se omite sin margen | Captura: "≈ $89.780 por día (20 días)" |
| P4 (protegido visible) | "🛡️ Protegido para lo que viene: $X" + lista cronológica fijos+cuotas; fecha pasada = etiqueta NEUTRA "ya pasó su fecha (3 de jul)" — nunca "pagado" (§4.1-bis); sin-fecha al final; cierre "Esto ya está descontado del número de arriba" | Captura: Arriendo/Internet/Servicios (fecha pasada) + Tarjeta 28 jul; total $1.612.199 = suma exacta ✓; la cuota del crédito NO aparece (vence fuera del ciclo) y sí en la casa de compromisos |
| P5 (destino de lo libre) | Margen positivo → jugada top del motor FIN-007 (mismo patrón/fuente de Salud) con puente al simulador por `kind`; motor vacío → puente honesto al simulador; margen negativo → aviso sin juicio + "Simular un recorte →" (`reducir_gastos`) | Captura: "Aparta $1.066.500/mes para tu fondo…" (recomendación REAL del motor) |
| P6 (casa de compromisos) | CRUD conservado DEBAJO de la decisión; formulario con tap honesto ("➕ Nuevo compromiso fijo (gasto o ingreso) →" colapsado anuncia su contenido); listas y cuotas intactas | Captura: orden decisión→casa; el formulario ya no ocupa media pantalla |

## 4. Suites y criterios (§13 del ARQ)

- Unitaria **303/303** (299 previas + 4 de `SpendableService`) — sin BD.
- E2E **9/9** (6 previas + 3 de FIN-020) — app y Postgres reales.
- `tsc --noEmit` frontend limpio; bundle web compilado (las capturas SON el bundle).
- §13.1 grep ✓ · §13.2 caso a mano ✓ · §13.3–4 capturas + igualdad e2e ✓ ·
  §13.5 "Te queda" único ✓ · §13.6 antes/después (antes = `capturas/fin-018/` y
  `lote-02/`; después = `capturas/fin-020/`) ✓ · §13.7 filtro §31 en ARQ §5 ✓.

## 5. Juicio razonado contra la intención

**¿El usuario puede decidir el gasto de hoy sin sabotear el resto del ciclo, y
entiende de dónde sale el número? Sí — y por primera vez el número es el mismo
en toda la app.**

La captura de Presupuesto se lee como una decisión completa: "te quedan
$1.795.602 hasta el 31 de jul, unos $89.780 por día; ya te aparté $1.612.199
para el arriendo, los servicios y la cuota de la tarjeta — míralos; y con lo
libre, tu mejor destino es el fondo de emergencia — simúlalo". La resta dejó de
ser una caja negra (P4) y la pantalla dejó de ser una calculadora estructural
para ser una vista prospectiva del ciclo real.

El costo declarado en el ARQ §10 se materializó y es visible: el hero de Inicio
**bajó** (antes mostraba la proyección estructural; hoy $1.795.602 tras apartar
compromisos). Es la honestidad buscada, pero en la RC integral debe vigilarse la
percepción "perdí plata" — la mitigación (sección protegida que explica la
diferencia) vive en Presupuesto, a un tab de distancia, no en Inicio.

**Reservas honestas:** (1) el doble descuento transitorio de un fijo pagado sin
transacción vinculable sigue existiendo por diseño (sesgo hacia abajo aceptado —
`fixedItemId` registrado como mejora futura en ARQ §4.1-bis); (2) el corte del
10% de la interpretación quedó comprometido a revisión con datos reales
post-RC (ARQ §13); (3) `teQueda.amount === 0` exacto no muestra ni jugada ni
aviso — caso límite improbable que decidí dejar mudo antes que fabricar un
mensaje sin diseño aprobado.

## 6. Para la validación

- Reproducir: `npx jest` (sin BD) · `npm run test:e2e` (docker arriba) ·
  `npx tsc --noEmit` en frontend.
- Capturas: `docs/producto/capturas/fin-020/` (método:
  `frontend/scripts/captura/README.md` + `capture-fin020.js`).
- Checkout aislado sobre el commit de referencia.
