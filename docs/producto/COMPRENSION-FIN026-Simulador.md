# Comprensión del problema · FIN-026 (Experiencia de Simulador)

- **Versión:** 1.0
- **Fecha:** 2026-07-13
- **Autor:** Agente Arquitecto
- **Estado:** Entregado — para evaluación del CTO y el CPSAO (requisito previo a ARQ-0026)
- **Historial de cambios:**
  - v1.0 (2026-07-13) — respuesta a las 5 preguntas, verificada contra código real.

---

## Verificación previa contra el código (lo que existe HOY)

**El motor está completo; la pantalla expone poco y crudo:**

- El motor (`simulation-engine.ts`) soporta **8 escenarios** auditados:
  `abono_extra`, `nueva_deuda`, `reducir_gastos`, `cambio_ingreso`,
  `estrategia_deudas`, `vender_activo`, `refinanciar`, `proyeccion_ahorro`.
  La pantalla (`SimulatorScreen.tsx:12-51`) expone **5** — faltan `abono_extra`,
  `refinanciar` y `vender_activo` (el abono por deuda vive en el detalle de
  Deudas; refinanciar y vender activo no tienen NINGUNA puerta de entrada).
- **El "gap kind→escenario" es real y peor de lo documentado:** la jugada de
  Salud/Presupuesto mapea 3 de 4 kinds; con `abono_extra` navega sin parámetro
  y la pantalla cae en silencio al PRIMER chip (`SCENARIOS[0]` = "¿Y si tomo un
  crédito?" — `SimulatorScreen.tsx:58-60`): la usuaria que tocó "simular tu
  abono" aterriza en el simulador de deuda NUEVA. Confirmado en código, no de
  memoria.
- **El resultado es una tabla técnica**: Score/DTI/flujo/patrimonio antes→después
  + hasta 4 `specifics` crudos con diccionario de etiquetas. Sin narrativa, sin
  la familia "$N de cada $100" (FIN-017), sin "qué significa para mí", sin
  siguiente paso (el patrón decidir→actuar termina aquí en un número).
- **Sin estados vacíos ni cold-start:** `estrategia_deudas` sin deudas simula un
  portafolio vacío y muestra ceros; ningún escenario explica qué necesita.
- **Historial**: `GET /simulations` (últimas 20) existe y NADIE lo muestra — las
  simulaciones se persisten (con cuota free 5/mes, FIN-009, paywall ya conectado
  en la pantalla ✓) y se pierden de vista al salir.
- **Puertas de entrada existentes** (todo llega aquí): jugada de Salud (FIN-019),
  destino de lo libre de Presupuesto (FIN-020 P5), orden de ataque de Deudas
  (FIN-022), CTA de recorte con margen negativo (FIN-020).

### Inventario §32 — cifras que el Simulador muestra y ya tienen dueño

| Cifra en pantalla | Fuente única existente | Estado |
|---|---|---|
| Estrategia y diferencia de intereses | mismo motor que `attackOrder`/summary (FIN-022) | ✓ misma función — PERO el bloque de Deudas usa `extraBudget: 0` (contrato DEC-0022 §5.3) y la pantalla pide un extra manual: quien llega desde "verlo en el simulador" ve OTRA cifra sin explicación — la divergencia estaba "explicada, no oculta" en docs, no ante la usuaria |
| Score/DTI "antes" | fórmulas únicas (score.util, core-metrics) sobre estado VIVO | ✓ misma fórmula; frescura distinta al persistido de Salud (~25 s) — declarar, no re-derivar |
| Cobertura del fondo (proyección ahorro) | `EMERGENCY_FUND_MILESTONES` (FIN-021) | la pantalla no la menciona — oportunidad de narrar el resultado contra los hitos oficiales SIN nueva fórmula |
| "Te queda"/desembolso real | SpendableService / DebtOutlayService | el Simulador no los muestra hoy — si el rediseño los usa, inyección obligatoria |

## Las 5 preguntas

### 1 · ¿Qué problema cotidiano intenta resolver realmente?

**"¿Me conviene?" con la vida real de la usuaria puesta.** Las decisiones
financieras grandes (tomar el crédito, refinanciar, meterle extra a la deuda,
vender la moto) se toman hoy con la aritmética del banco o del cuñado — cifras
genéricas que no saben cuánto le queda, qué debe ni qué la frena. El motor ya
responde con SUS datos; el problema es que la pantalla habla en DTI y deltas —
responde como un actuario, no como un copiloto. Y la mitad de las preguntas
(refinanciar, vender un activo, abonar) ni siquiera se pueden hacer desde aquí.

### 2 · ¿Por qué merece experiencia propia y no se resuelve desde las otras pantallas?

Porque es el ÚNICO lugar donde se pregunta "¿y si…?" — todas las demás miran lo
que ES (Inicio el presente, Salud las causas, Presupuesto el ciclo, Deudas el
contrato). Además ya es el destino al que TODAS las jugadas apuntan
(Salud/Presupuesto/Deudas cierran en "🧪 Simularlo →"): es la segunda mitad del
patrón decidir→actuar de toda la app. Si esa puerta recibe mal (gap del
abono, tabla técnica, sin siguiente paso), cada jugada de las FIN anteriores
pierde su remate.

### 3 · ¿Qué cambia en la capacidad de decisión del usuario?

Hoy: obtiene deltas técnicos si adivina qué chip tocar y qué número escribir.
Después debería: **llegar con la pregunta ya armada** (desde la jugada, con el
escenario Y los parámetros precargados — la deuda del abono, el extra sugerido,
el recorte propuesto), **leer el veredicto en su idioma** ("terminas 8 meses
antes y te ahorras $2,4M — tu Score subiría a Saludable") y **salir con el paso
siguiente a un tap** (abonar de verdad, crear el fijo del recorte, apartar para
el fondo). De calculadora a copiloto que cierra el círculo.

### 4 · ¿Qué error común evita?

(a) **Decidir con la cifra del vendedor** — el "sí te alcanza" del banco no
descuenta compromisos ni mora; el motor sí. (b) **El error de puerta**: hoy
mismo, la jugada de abono aterriza en "¿y si tomo un crédito?" — la usuaria
puede simular LO CONTRARIO de lo que le recomendamos (verificado). (c) **Probar
y no actuar**: sin puente de vuelta (el resultado no ofrece ejecutar), la
simulación se queda en curiosidad — y con historial invisible, ni siquiera se
recuerda qué se probó.

### 5 · ¿Qué perdería el usuario si esta experiencia no existiera? (anticipo §31)

**El futuro condicional.** Sin Simulador, Milla describe y recomienda pero nunca
deja ENSAYAR: la usuaria vuelve a decidir a ciegas justo en las decisiones más
caras (créditos, refinanciación, venta de activos). Se perdería además el remate
de todas las jugadas (los "🧪 Simularlo" de Salud/Presupuesto/Deudas quedarían
huérfanos) y la única zona segura del producto — donde equivocarse no cuesta
nada porque "nada de esto modifica tus datos reales".

## Nota de alcance para la decisión del CTO/CPSAO (previa al ARQ)

1. **"Conectar, no inventar" aplica limpio:** motor completo y auditado; la FIN
   es de pantalla y puertas (chips faltantes, params precargados desde las
   jugadas, resultado narrado con §29, puente de vuelta a la acción, historial
   visible, estados vacíos honestos).
2. **El gap del abono es corrección de puerta rota** (la jugada aterriza en el
   escenario opuesto): ¿pieza de esta FIN o ajuste inmediato pre-ARQ? Lo dejo
   como pregunta — es pequeño pero está sangrando ya.
3. **Coherencia con el bloque de Deudas:** la pantalla de estrategia debería
   abrir con `extraBudget` precargado en 0 y la explicación del contrato
   DEC-0022 §5.3 visible ("este es el piso; agrega un extra para ver el techo")
   — hoy la divergencia solo está explicada en documentos.
4. **Refinanciar/vender activo:** el motor los soporta sin UI. ¿Entran los 3
   escenarios faltantes o se prioriza profundidad de los 5 existentes? Decisión
   de alcance de producto.
