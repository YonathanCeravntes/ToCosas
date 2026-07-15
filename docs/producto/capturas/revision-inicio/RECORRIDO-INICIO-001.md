# Recorrido integral de Inicio · Observaciones 001

- **Versión:** 1.0
- **Fecha:** 2026-07-11
- **Autor:** Agente Arquitecto
- **Estado:** Observaciones para evaluación del equipo (Auditor, CTO, CPSAO) — **sin decisiones; nada está autoaprobado ni descartado**
- **Historial de cambios:**
  - v1.0 (2026-07-11) — primer recorrido tras el cierre de FIN-017.
- **Método:** recorrido completo (scroll de principio a fin) de Login y Dashboard como
  usuario que abre Milla por primera vez, sobre la app REAL (Expo Web, backend +
  Postgres, usuaria demo). Capturas de página completa:
  `scroll-01-login-completo.png` (780×1688) y `scroll-02-dashboard-completo.png`
  (780×4040). Preguntas guía del CPSAO: (1) ¿aporta valor o solo ocupa espacio?
  (2) ¿la información llega en el momento adecuado? (3) ¿algo rompe el ritmo?
  (4) ¿hay repetición o resumible? (5) ¿el usuario termina con más claridad o solo
  con más información?

---

## Login (`scroll-01-login-completo.png`)

Recorrido: logo → propuesta de valor → 4 pilares → formulario → Ingresar → Crear
cuenta → tagline. Cabe en una pantalla; el ritmo es bueno y la claridad final es
alta (el usuario sabe qué hace la app antes de decidir).

| # | Observación | Pregunta guía | Detalle |
|---|---|---|---|
| L1 | Jerarquía de CTAs invertida para el usuario NUEVO | (2) momento | El recorrido se hace "como quien abre Milla por primera vez": esa persona no tiene cuenta, pero el botón dominante (verde sólido) es "Ingresar" y "Crear cuenta" es secundario. Para el primer contacto, la acción natural está visualmente degradada. Alternativas posibles a evaluar: invertir jerarquía, igualar peso, o mantener (los usuarios recurrentes son mayoría en visitas totales). |
| L2 | Alineación del bloque de pilares | (3) ritmo | Menor/cosmético: las 4 líneas centradas como bloque con anchos distintos dejan bordes irregulares; alinear a la izquierda con ancho fijo podría leerse más limpio. |

## Dashboard (`scroll-02-dashboard-completo.png`)

Recorrido: saludo → hero → gamificación → Deuda total → Patrimonio/Ahorro →
Ingresos/Gastos → Próximos pagos → ¿En qué se te va la plata? → ¿De dónde llega la
plata? → Movimientos recientes (8) → barra de pestañas. El protagonista es claro
(hero único ✓) y las interpretaciones responden "¿qué significa?" ✓.

| # | Observación | Pregunta guía | Detalle |
|---|---|---|---|
| D1 | La interpretación verde del hero repite la cifra grande | (4) repetición | "$6.190.000" y justo debajo "puedes guardar hasta $6.190.000 este ciclo" — en nivel verde el texto no añade información nueva (en amarillo/rojo sí aporta). Posibilidades a evaluar: en verde, un texto que agregue algo distinto (p. ej. relación con el ingreso: "es el 71% de lo que te entró") o una redacción sin el monto. |
| D2 | Ubicación de la línea de gamificación | (2) momento | Está entre el hero financiero y Deuda total: interrumpe la narrativa "plata → deudas → patrimonio" con un dato de hábito. Alternativas a evaluar: junto al saludo, al final del recorrido, o dejarla (es 1 línea y refuerza el hábito temprano). |
| D3 | Información de deuda partida en dos lugares | (2) momento | "Deuda total" (arriba) y "Próximos pagos" (3 bloques después, también de deudas) quedan separados por patrimonio/ahorro/ingresos. Quien lee sobre su deuda debe reencontrarla más abajo. A evaluar: agrupar ambos bloques o enlazarlos. |
| D4 | Desbalance de altura Patrimonio vs Ahorro | (3) ritmo | Menor: la tarjeta de Ahorro carga 4 elementos (título, cifra, interpretación, CTA) y la de Patrimonio 3 — alturas visiblemente desiguales en el par. |
| D5 | Totales fijos repetidos dos veces | (4) repetición | "$1.515.000 fijos del mes" aparece en la tarjeta Gastos Y como fila "📌 Gastos fijos $1.515.000" en la sección de categorías; ídem ingresos fijos ($4.200.000 dos veces). A evaluar: fusionar tarjeta+sección, o quitar la fila repetida. |
| D6 | "Próximos pagos" sin fecha | (5) claridad | Muestra nombre y monto pero NO cuándo — "próximos" obliga a preguntarse "¿cuándo?". El dato existe en el endpoint (`upcoming.dueDate`); mostrarlo parece de bajo costo y alto valor. (Toca una pantalla del alcance de FIN-017 pero no estaba en sus 4 prioridades — requiere decisión del CTO sobre dónde encaja.) |
| D7 | "¿De dónde llega la plata?" con todo "Sin categoría · 100%" | (1) valor | Cuando el ingreso variable no está categorizado, la sección entera solo comunica "no hay datos útiles" — ocupa espacio sin aportar. A evaluar: ocultarla en ese caso, o convertirla en invitación a categorizar. |
| D8 | La cola de movimientos alarga el cierre | (3) ritmo / (5) claridad | 8 tarjetas de altura completa hacen que el recorrido termine en una lista larga de detalle; el usuario cierra con "más información", no con "más claridad". A evaluar: filas compactas, menos ítems + "Ver todos", o ambas. |
| D9 | El recorrido no tiene cierre | (5) claridad | Tras los movimientos no hay ningún elemento conclusivo (síntesis, siguiente paso sugerido). A evaluar si un cierre aporta o si es sobre-diseño. |

## Síntesis del recorrido (respuesta honesta a la pregunta 5)

- **Login:** el usuario termina con claridad — sabe qué es Milla y qué puede hacer.
  Las 2 observaciones son de jerarquía/pulido, no de comprensión.
- **Dashboard:** la mitad superior (saludo → hero → deuda → patrimonio/ahorro →
  ingresos/gastos) deja al usuario con claridad genuina; la mitad inferior acumula
  detalle con repeticiones (D5), un hueco de información (D6), ruido condicional
  (D7) y un cierre largo sin síntesis (D8, D9). La oportunidad más grande no es
  ninguna sección aislada sino el **arco completo del recorrido**: hoy va de más
  claridad a más densidad.

Ninguna de estas observaciones está aprobada ni descartada — quedan para evaluación
del equipo. Si alguna se convierte en trabajo, entiendo que el CTO decidirá si entra
como FIN nueva (¿FIN-018?) y con qué alcance.
