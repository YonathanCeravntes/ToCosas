# ARQ-0026 · Experiencia de Simulador

- **Versión:** 1.0
- **Fecha:** 2026-07-13
- **Autor:** Agente Arquitecto
- **Estado:** Emitido — para AUD-0026
- **Historial de cambios:**
  - v1.0 (2026-07-13) — emisión con el alcance completo fijado por el CTO
    (P1 escenarios faltantes con `abono_extra` a máxima prioridad, P2 coherencia
    con Deudas, narrativa/historial/vacíos).
- **Módulo/Feature:** FIN-026 · **Origen (§27):** Mejora de revisión de producto
  (hoja de ruta UX: Inicio ✅ · Salud ✅ · Presupuesto ✅ · Deudas ✅ ·
  **Simulador** · Copiloto)
- **Documentos base:** `COMPRENSION-FIN026-Simulador.md` v1.0 · hilo FIN-026 ·
  GOBERNANZA §29/§31/§32

## 0. Intención

Que el "¿y si…?" reciba a la usuaria con su pregunta ya armada, le responda en
su idioma y la devuelva a la acción — el remate del patrón decidir→actuar que
todas las jugadas de la app ya prometen con "🧪 Simularlo →".

## 1. Objetivo

Rediseñar la PANTALLA del Simulador sobre el motor existente (8 escenarios
auditados, cero motor nuevo): cerrar el bug de puerta del abono, exponer los 3
escenarios sin entrada, precargar parámetros desde las jugadas, narrar el
resultado (§29) y cerrar el círculo con historial y puentes de vuelta.

## 2. Problema

Verificado en `COMPRENSION-FIN026` y confirmado por el CTO: la jugada de
`abono_extra` aterriza en "¿y si tomo un crédito?" (fallback silencioso a
`SCENARIOS[0]`); `refinanciar` y `vender_activo` no tienen puerta en toda la
app; quien llega desde el bloque de Deudas ve OTRA cifra de estrategia (extra
manual vs contrato `extraBudget: 0`); el resultado es una tabla técnica sin
narrativa ni siguiente paso; el historial persistido es invisible; no hay
estados vacíos. Detalle adicional verificado: la validación actual rechaza
`0` como valor (`v <= 0` → error), así que el escenario de estrategia ni
siquiera puede reproducir el piso del bloque de Deudas.

## 3. Alcance

Frontend: `SimulatorScreen` (rediseño), tipos de navegación (params de
precarga), mapa jugada→escenario en Salud/Presupuesto (+`abono_extra`), CTA del
bloque de Deudas (pasa `extraBudget: 0`). Backend: **ninguno** (los endpoints
`POST /simulations`, `GET /simulations` y el summary de Deudas ya lo dan todo).
**Fuera (declarado):** motor y escenarios nuevos, cuota FIN-009 (queda igual,
paywall ya conectado), el simulador de abono del DETALLE de deuda (se conserva
— es la vista contractual por deuda), Copiloto (siguiente FIN).

## 4. Diseño — alternativas por pieza

### P1 — Los 3 escenarios sin puerta (con `abono_extra` a máxima prioridad)

| | **Alt A — Escenario propio con selector de deuda/activo (recomendada)** | **Alt B — Solo mapear el kind al escenario de estrategia** |
|---|---|---|
| Qué es | `abono_extra`: selector de deuda (default §32: `attackOrder[0]` del summary — la MISMA deuda que el motor recomienda atacar) + campo extra. `refinanciar`: selector de deuda + nueva tasa/plazo. `vender_activo`: selector de activo (lista real de Cuentas) + precio de venta + destino opcional (deuda) | Redirigir el abono a `estrategia_deudas` "que se parece" |
| Ventajas | La jugada aterriza EXACTAMENTE en lo recomendado; los 3 escenarios del motor por fin usables; el default del selector viene de la fuente única de FIN-022 (inyección, no recálculo) | Menos UI |
| Desventajas | 3 selectores nuevos (deuda ×2, activo ×1) | Responde otra pregunta — el bug de puerta cambiaría de forma, no moriría |

**Precarga (la puerta arreglada de raíz):** `Simulator` acepta
`{ scenario, params }` en la navegación; el mapa de las jugadas
(Salud/Presupuesto) gana `abono_extra` y las CTAs existentes pasan sus
parámetros (p. ej. el bloque de Deudas → `{ scenario: 'estrategia_deudas',
params: { extraBudget: 0 } }`). Escenario desconocido → **primer chip con aviso
visible** ("no encontré ese escenario, elige uno"), nunca más fallback mudo.

### P2 — Coherencia con el bloque de Deudas (contrato DEC-0022 §5.3 en pantalla)

Al abrir estrategia con `extraBudget: 0` precargado: línea fija bajo el campo —
"Con $0 extra ves tu PISO (solo cuotas mínimas) — agrega un extra para ver el
techo". La validación pasa a permitir `0` donde el escenario lo permite (hoy
`v <= 0` lo rechaza — por eso la pantalla no podía reproducir la cifra del
bloque). Mismo motor, misma cifra, divergencia explicada ANTE LA USUARIA.

### P3 — El resultado narrado (§29, "conectar" los formatos ya aprobados)

| | **Alt A — Titular humano desde `specifics` existentes (recomendada)** | **Alt B — Enriquecer `specifics` en el motor** |
|---|---|---|
| Qué es | Cada escenario abre el resultado con UN titular en lenguaje llano compuesto SOLO de cifras que el motor ya devuelve: abono → "Terminas {monthsSaved} meses antes y te ahorras {interestSaved}"; nueva deuda → "Tu cuota sería {monthlyPayment} — tu Score pasaría de {X} a {Y}"; estrategia → el copy honesto de FIN-022 §5.2 (misma redacción); recorte → "Liberas {freedMonthly} al mes"; venta → "Quedarías con {netCash} y tu deuda bajaría {applied}". La tabla antes→después queda debajo como detalle (no se esconde — precedente 3-A) | El motor agrega campos narrativos |
| Ventajas | Cero backend, cero fórmula nueva — solo redacción sobre datos auditados; el cambio de banda ya existente se integra al titular ("…y pasarías a {banda}") | Narrativa centralizada |
| Desventajas | La narración del fondo contra los hitos oficiales queda para después (mencionarlos desde el frontend duplicaría los literales 3/6 — violaría DEC-0021 §5.2); semilla registrada: si el DEC la quiere, es UNA línea de backend exponiendo los hitos en `specifics` | Toca el motor para una necesidad de display |

Reglas §29: sin dato → línea omitida; el titular nunca juzga ("tu banda
bajaría a…" es información, no regaño).

### P4 — El puente de vuelta (decidir→actuar, solo donde la acción REAL existe)

Tras el resultado, un CTA por escenario **solo si hay acción ejecutable**:
abono → "Hazlo real: abonar a capital →" (detalle de ESA deuda, donde vive el
abono real de FIN-012); estrategia → "Ver tu orden de ataque →" (lista de
Deudas); recorte → "Ajusta tus compromisos →" (Presupuesto); venta con destino
→ detalle de la deuda destino. Nueva deuda y refinanciación no tienen acción
real en la app — sin CTA fabricado (§29.1). Ningún CTA escondido (precedente 3-A).

### P5 — Historial visible

| | **Alt A — "Tus últimas simulaciones" al pie (recomendada)** | **Alt B — Seguir sin mostrarlo** |
|---|---|---|
| Qué es | Las últimas 5 del `GET /simulations` existente: emoji del escenario + fecha corta + cifra clave; tap = precarga escenario+params guardados (re-ensayar) | Statu quo |
| Ventajas | Lo persistido por fin sirve; con la cuota free (5/mes) la usuaria VE lo que ya gastó; re-simular sin re-teclear | — |
| Desventajas | Una sección más al pie (colapsable con tap honesto: "Ver tus últimas simulaciones →" anuncia contenido) | El dato pagado se pierde |

### P6 — Estados vacíos honestos (§29.1)

Por escenario, ANTES de pedir datos: estrategia con <2 deudas → "Necesitas al
menos 2 deudas activas para comparar órdenes"; abono/refinanciar sin deudas →
"No tienes deudas activas — nada que abonar 🎉"; venta sin activos → "Registra
un activo en Cuentas para simular su venta →". Chips visibles pero el cuerpo
explica — nunca un formulario que simula sobre el vacío y devuelve ceros.

### 4.7 — Inventario §32 aplicado

Deuda default del abono/refinanciación = `attackOrder`/summary (FIN-022, misma
fuente); estrategia = mismo motor y mismo copy §5.2; activos = lista real de
Cuentas; Score/DTI antes→después = fórmulas únicas sobre estado vivo (misma
fórmula que Salud, frescura distinta — declarado, no re-derivado); hitos del
fondo NO se mencionan desde el frontend (P3). La pantalla no calcula NADA.

## 5. Respuesta al filtro §31

Sin Simulador, Milla describe y recomienda pero nunca deja ensayar: las
decisiones más caras (crédito nuevo, refinanciar, vender, abonar) volverían a
tomarse con la aritmética del vendedor, y los "🧪 Simularlo →" de Salud,
Presupuesto y Deudas quedarían huérfanos — el patrón decidir→actuar de toda la
app perdería su segunda mitad. Valor diferencial: **la única zona segura del
producto — el futuro condicional con los datos propios, donde equivocarse no
cuesta nada.**

## 6. Componentes
Frontend: `SimulatorScreen` (rediseño completo), `navigation/types` (params),
`HealthScreen`/`BudgetScreen` (mapa +`abono_extra` con params),
`DebtsListScreen` (CTA con `extraBudget: 0`). Backend: ninguno. Tests: los de
pantalla no existen como suite (frontend sin tests unitarios — declarado desde
FIN-017); la evidencia es captura + los e2e existentes del motor.

## 7. Base de datos
Ninguna.

## 8. Backend
Ninguno. (Si el DEC pide narrar hitos del fondo: una línea en `specifics` —
pieza opcional declarada en P3.)

## 9. Uso de IA
Ninguno.

## 10. Riesgos
- Selector de activo requiere el endpoint de activos existente de Cuentas —
  verificar shape en implementación (dependencia interna, no nueva).
- Precarga por params: las jugadas de recomendaciones no siempre traen todos
  los parámetros (p. ej. el kind `abono_extra` no carga `debtId` en su
  `impact`) — el default §32 (`attackOrder[0]`) cubre el hueco; declarado.
- Más escenarios visibles = la cuota free (5/mes) se siente antes — el paywall
  ya existe y es honesto; vigilar en RC.

## 11. Dependencias
Motor FIN-007 (intacto), summary/attackOrder FIN-022, cuota FIN-009, activos
FIN-002. Ninguna nueva.

## 12. Impacto
1 pantalla rediseñada + 3 puertas corregidas/creadas; los 8 escenarios del
motor por fin usables; el bug activo de la jugada de abono muere.

## 13. Criterios de aceptación
1. **El bug de puerta muerto:** navegar con `scenario: 'abono_extra'` aterriza
   en el escenario de abono con la deuda recomendada preseleccionada (captura +
   revisión de código del mapa completo de kinds); escenario desconocido →
   aviso visible, nunca fallback mudo.
2. **Coherencia Deudas↔Simulador:** llegar desde el bloque muestra la MISMA
   cifra del bloque (captura con la demo; `extraBudget: 0` aceptado) + la línea
   piso/techo visible.
3. Los 8 escenarios accesibles y con resultado narrado (titular §29 + tabla);
   capturas de al menos abono, estrategia y venta.
4. Historial visible (últimas 5) y re-ensayo por tap; estados vacíos de P6
   capturados con usuario real sin deudas/activos.
5. §32: grep — la pantalla no calcula cifras financieras (solo formatea);
   defaults inyectados de las fuentes únicas.
6. Suites completas verdes; typecheck; capturas antes/después.
7. Filtro §31 respondido (§5).

## 14. Plan
1. AUD-0026 → 2. DEC-0026 → 3. params de navegación + mapa de kinds →
4. escenarios nuevos + P2 → 5. narrativa/historial/vacíos → 6. capturas →
7. IMP-0026 con SHA y juicio razonado → validación → cierre.
