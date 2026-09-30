# IMP-0018 · Evolución de la experiencia Inicio (segunda iteración)

- **Versión:** 1.2
- **Fecha:** 2026-07-11
- **Autor:** Agente Arquitecto/Desarrollador
- **Estado:** Entregado (v1.2, cuarta iteración incluida) — a la espera de la validación del CTO para programar la sesión real de Revisión de Comprensión
- **Historial de cambios:**
  - v1.0 (2026-07-11) — emisión con el alcance COMPLETO de DEC-018 (+ adendo §6.1).
  - v1.1 (2026-07-11) — tercera entrega pedida por CTO/CPSAO tras validar v1.0:
    **pieza 8** (avance de `nextDueDate` al registrar pagos, ARQ §4.9) implementada
    con E2E versionado, y **análisis narrativo** documentado en ARQ §5.1. Captura
    del Dashboard retomada con la fecha ya corregida en datos reales.
  - v1.2 (2026-07-11) — **cuarta iteración** (última antes de la RC real, autorizada
    por el CPSAO): D2 resuelto (gamificación al cierre), puente narrativo
    implementado, "ciclo" eliminado del vocabulario visible, "abono a capital" en
    beneficio-primero (ARQ §4.10). Capturas finales retomadas.
- **Módulo/Feature:** FIN-018 · **Origen (v3.5 §27):** Mejora de revisión de producto
- **Documentos base:** `ARQ-0018-Evolucion-Inicio.md` v1.4 · `AUD-0018` · `DEC-0018` (+ adendo §6.1) · RC-0001 v1.1 · instrucciones CTO/CPSAO de 3ª y 4ª iteración
- **Referencia inmutable (regla GOBERNANZA):** commit **`8016bfd26a22861791c78f993ca9321fe13ef7bb`**
  - Código en 4 commits: `3fb4072` (5 piezas: L1-A, D1-A, D3-B+D6, D5-A, D7-B),
    `82caa0d` (pieza 7: Movimientos compactados), `8c42edf` (pieza 8: nextDueDate +
    ARQ v1.3) y `8016bfd` (4ª iteración). Correcciones triviales L2/D4 previas en
    `4223e11` (fuera de este ciclo, ya verificadas por el CTO).

## 1. Resumen
Las **8 piezas** de FIN-018 implementadas (7 de DEC-018 + la corrección de
`nextDueDate` incorporada por el CPSAO tras validar v1.0). El recorrido completo de
Inicio pasó de **2020px a 1490px lógicos (−26%)** eliminando una sección entera
(Próximos pagos, absorbida con fecha en la tarjeta de deuda), las filas duplicadas
de fijos, el ruido de "Sin categoría · 100%" y la cola de 8 tarjetas de movimientos
— sin perder ningún dato. Y el dato más visible de la tarjeta de deuda (el próximo
pago) ya no puede quedar vencido tras un pago.

**Pieza 8 — `nextDueDate` (v1.1):** el `UPDATE` atómico del pago normal ahora
avanza la fecha hasta la próxima ocurrencia FUTURA conservando el día ancla (con
atraso de k meses salta k+1 — "+1 mes" a secas seguiría vencida) y la limpia al
saldar. E2E versionado `test/fin018-next-due-date.e2e-spec.ts` (3/3 contra BD
real). Verificado además con los datos reales de la demo: la tarjeta pasó de
"vence 28 de abr" (vencida) a "vence 28 de jul" al registrar la cuota — la captura
final refleja este estado. Semántica declarada en ARQ §4.9: un pago normaliza la
fecha visible; la gestión de mora acumulada queda fuera de alcance.

**Análisis narrativo (v1.1, ARQ §5.1):** el orden del recorrido ya guía bien; el
hueco está localizado en hero y deuda ("responden pero no proponen"). Propuesta
mínima documentada SIN implementar (línea condicional "Tienes margen — simula un
abono →") junto a la alternativa de no añadir nada — decisión de producto.

**Cuarta iteración (v1.2, ARQ §4.10):** (1) **D2** — la gamificación pasa al CIERRE
del recorrido (decidido por el recorrido mental: la racha no responde "¿cómo estoy?",
refuerza el hábito que sostiene las respuestas; desaparece la interrupción
hero→deuda); orden final: … movimientos → "Ver el detalle completo →" → 🔥 racha.
(2) **Puente narrativo aprobado e implementado**: "💡 Tienes margen: adelanta un
pago y ahorra intereses →" — condicional (margen verde + deuda activa), navega al
detalle de la deuda del próximo pago (simulador FIN-012); verificada la navegación
en vivo. (3) **"Ciclo" eliminado** del vocabulario visible: "Te queda para gastar ·
hasta el 31 de jul" / "pagado desde el 1 de jul" / amarillo sin "ciclo" — las fechas
concretas explican el periodo sin exigir el término; verificado: la pantalla
completa no contiene la palabra. (4) **"Abono a capital" beneficio-primero**: nota
nueva "Adelanto a tu deuda (terminas antes / baja tu cuota)", payoff "Pagaste toda
tu deuda"; en el detalle el término se conserva por precisión con subtítulo llano.
Nota: las filas históricas de movimientos conservan la nota vieja (son DATO escrito
al momento del pago, no plantilla) — los pagos nuevos usan la redacción nueva.

**Criterio rector del CPSAO, aplicado al recorrido completo** (ARQ §4.10): con la
captura final a la vista — si esta fuera la única pantalla de Milla, el usuario
entiende QUÉ pasa (cuánto le queda y hasta cuándo, cuánto debe y cuánto ya pagó
desde cuándo, qué tiene guardado) en pesos y fechas concretas sin un solo término
interno, y QUÉ HACER (adelantar un pago si hay margen, organizar ingresos, ver el
detalle, sostener la racha). El único conocimiento que exige es leer pesos.

## 2. Archivos modificados
- **Backend** — `dashboard.service.ts`: texto verde de `interpretCashflow` en formato
  "$ de cada $100" (D1-A); `dashboard.spec.ts` actualizado al texto exacto.
- **Frontend** — `LoginScreen.tsx`: "Crear cuenta" primario / "Ingresar" secundario
  (L1-A). `DashboardScreen.tsx`: línea "📅 Próximo: <deuda> · <monto> · vence
  <fecha corta>" dentro de la tarjeta Deuda total y sección "Próximos pagos"
  eliminada (D3-B, absorbe D6 — verificado: la cadena solo sobrevive en un
  comentario); filas "📌 fijos" eliminadas y títulos "· día a día" (D5-A);
  invitación accionable "🏷️ Tus ingresos aún no tienen categoría — toca para
  organizarlos →" cuando todo el ingreso variable está sin categoría (D7-B);
  Movimientos recientes compactados a **4 filas densas en una sola tarjeta** +
  enlace de transición (pieza 7).

## 3. Cumplimiento de los criterios (ARQ-0018 §13 + DEC-018 §6.1)

| # | Criterio | Evidencia |
|---|---|---|
| 1 | L1: jerarquía aprobada | Captura `despues-scroll-01-login.png` + grep: "Crear cuenta" primero/primario (línea 78), "Ingresar" secundario (79) |
| 2 | D1: verde sin repetir el monto | Test unitario exacto ("De cada $100 que te entraron, aún tienes $50 libres" en el caso 50%) + captura: hero "$6.190.000" con línea "$71 libres" — cifra distinta |
| 3 | D3/D6: deuda en UN lugar, con fecha | Captura: tarjeta única con total, pagado del ciclo, interpretación y "Próximo: Tarjeta de crédito · $97.199 · vence 28 de abr"; grep: "Próximos pagos" = 0 en UI (solo comentario) |
| 4 | D5: cada total fijo UNA vez | Grep: `📌` = 0; los totales fijos solo en las tarjetas Ingresos/Gastos |
| 5 | D7: sin "Sin categoría · 100%" | Captura: invitación accionable en su lugar (caso real de la usuaria demo) |
| 6 | §5 evaluado con decisión | CPSAO la incorporó como pieza 7 (DEC-018 §6.1) — implementada |
| 7 | Capturas antes/después + regresión | Antes: `capturas/revision-inicio/` (scroll completo, commit `1b74f41`). Después: `capturas/fin-018/` (scroll completo). Suite **299/299**; typecheck ambos lados; bundle Android 200 (6,59 MB) |

**Criterios de producto de la pieza 7 (DEC-018 §6.1):**
1. Enlace NO genérico: `"Ver el detalle completo de tus movimientos →"` — nombra la
   vista de destino (detalle) y el objeto (tus movimientos); pasa §29.2. Documentado
   con su alternativa descartada en ARQ §4.8.
2. Juicio razonado — ver §4.

## 4. Juicio razonado (criterio 2 del CPSAO): ¿el usuario termina el recorrido entendiendo mejor su situación que cuando abrió la app?

**Sí, y por primera vez el arco completo lo sostiene — con dos reservas honestas.**

El recorrido final (captura `despues-scroll-02-dashboard.png`) es una narrativa
continua donde CADA bloque responde una pregunta del usuario en orden de urgencia:
¿cuánto me queda? (hero + margen en "$ de cada $100") → ¿mi hábito va bien? (1
línea) → ¿cómo voy con mis deudas? (un solo bloque: total, pagado, interpretación,
próximo pago con fecha) → ¿qué tengo? (patrimonio/ahorro, ambos interpretados) →
¿cómo se mueve mi plata? (totales fijo/variable + categorías del día a día) → ¿está
todo registrado? (4 movimientos de muestra) → y una salida explícita al detalle. La
mitad inferior dejó de ser acumulación: no hay cifras repetidas, no hay secciones
sin valor, y el cierre es una transición deliberada, no un final por agotamiento.
El usuario que llega al fondo tiene más comprensión, no solo más datos — la pantalla
ahora es ejecutiva de punta a punta.

**Reservas (actualizadas en v1.1):** (1) ~~la fecha vencida del "Próximo" pago~~ —
**resuelta por la pieza 8**: tras un pago la fecha siempre queda futura (verificado
en datos reales); persiste solo el caso de una deuda que NUNCA registra pagos, cuyo
tratamiento pertenece al dominio de mora (fuera de alcance, declarado en ARQ §4.9);
(2) la línea de gamificación entre el hero y la deuda (D2) sigue pendiente de la
decisión de narrativa del CPSAO; (3) nueva, del análisis §5.1: hero y deuda
responden pero no proponen — el puente hacia "¿qué hago ahora?" queda propuesto
para decisión de producto. Ninguna impide el veredicto positivo.

## 5. Incidencias
- **Destapada por D3-B/D6 y reportada al equipo (no auto-corregida):** `nextDueDate`
  no avanza con el tiempo, solo con pagos — una deuda sin pagos muestra fecha
  vencida como "Próximo". No es regresión (la sección vieja usaba el mismo dato sin
  fecha visible). Pertenece al dominio deudas/recordatorios, fuera de FIN-018.
- Tooling de captura (no producto): instancias headless de corridas previas
  permanecían vivas compartiendo el puerto de debug y contaminaban la captura de
  Login con sesión vieja — corregido matando por puerto antes de capturar; las
  capturas entregadas están verificadas limpias.

## 6. Limitaciones
- El fallback offline de Movimientos (caché local sin conexión) conserva el formato
  anterior de tarjetas — la compactación aplica a la vista servida (la normal); el
  caso offline es borde y quedó fuera para no tocar la capa offline en esta FIN.
- Mejora futura registrada (ARQ v1.1 §10): `nextDueDate` en la lista de Deudas.

## 7. Resultado
FIN-018 completo conforme a DEC-018 + adendo §6.1: 7/7 piezas implementadas y
verificadas en vivo, recorrido 26% más corto sin pérdida de información, criterios
§29 aplicados, juicio razonado documentado. Listo para VALIDACIÓN del Auditor y
cierre del CTO.
