# FIN-058 · Detalle de deuda renovado

- **Fecha:** 2026-10-02 · **Pide:** Fundador ("esa pantalla de deuda… se ve como vetusta, no se alinea al diseño actual de la app. Presentarme boceto"). Tras ver el boceto: **"Aprobado."**
- **Ejecuta:** Arquitecto. Boceto: lienzo "Detalle de deuda renovado" (https://claude.ai/artifact/GUezDenFxsnTy24ugqw1yJ).

## 1. Decisiones del Fundador (2026-10-02, con la recomendación del Arquitecto)
| Decisión | Elegida |
| --- | --- |
| "Abonar a capital" y "Simulador de abono extra" | Una sola tarjeta **"Adelanta plata"** con pestañas Una vez / Cada mes. |
| Montos rápidos | Calculados desde la cuota: **media cuota, una cuota, dos cuotas** (redondeados a mil) y "Otro". Sin cuota: 200.000 / 500.000 / 1.000.000. |
| Cabecera | **Blanca**, como "Te queda" en Inicio; el bloque verde desaparece. |
| Plan de pago | **Plegado** con la próxima cuota a la vista y "Ver las N cuotas". |

## 2. Implementado (`screens/debts/DebtDetailScreen.tsx`, solo app)
- **Cabecera (`DebtHeader`):** "Debes" + cifra protagonista; chip de vencimiento ("Vence en 5 días · 7 de oct.", ámbar a 7 días o menos; "Venció hace N días" si hay mora); línea "Cuota de $X al mes · 28,3 % EA"; barra pagado/faltan (`SegmentBar`) cuando se conoce el monto inicial, y si no, una línea discreta "¿Cuánto te prestaron al inicio? Agrégalo…" con edición en línea (antes era una tarjeta entera vacía); chips: cuotas restantes, "Libre el…", último pago, "Al día". Tarjeta de crédito: "Usas del cupo", barra de uso (roja en sobrecupo) y "Cuota del mes · corte". Informal: chip "Sin cronograma formal", sin barra ni fecha de libertad (§29.2).
- **Botones** Editar datos / Renegociar debajo de la cabecera (sin cambios de función).
- **Sin cambios:** confirmación por corte (FIN-036), lecturas de profundidad (FIN-037), aviso de cuota vencida (FIN-024), compras a cuotas de la tarjeta (FIN-031, ahora bajo la etiqueta "Tu tarjeta"), seguros y cargos (FIN-013/023).
- **"Este crédito" (`CreditTiles`):** cuatro mosaicos — Terminas de pagar, Cuotas restantes ("56 de 72"), Intereses por pagar (rojo), Total que pagarás; debajo, la tarjeta de seguros y cargos.
- **"Adelanta plata" (`AdvanceSection`):** reemplaza `PrepaySection` y el simulador. Pestaña **Una vez** = abono real (FIN-012): monto rápido → el recibo del backend (`prepayPreview`) se muestra al instante como frase ("Con $881.000 hoy te ahorras $X en intereses y terminas 2 meses antes (mar. 2031)"), Terminar antes / Bajar la cuota, botón "Registrar abono de $X", y "Pagar todo" como enlace discreto. Pestaña **Cada mes** = simulación (FIN-007, `simulateExtra` + impacto en el Score) con aviso de que es una simulación. Mismos endpoints y cálculos (§32).
- **"Plan de pago" (`PaymentPlan`):** la próxima cuota sin pagar a la vista (capital, interés, número); "Ver las N cuotas" despliega la lista (12 primero, luego el resto) con las pagadas atenuadas.

## 3. Verificación
- App: `tsc` limpio. Sin pruebas automáticas de pantallas; revisión visual pendiente por OTA (Android) y web (iPhone).
- Sin cambios de servidor ni de datos.

## 4. Cargos de la tarjeta (BT-040, Fundador 2026-10-02, "Aprobado")
- **App:** en una tarjeta, debajo de "Tu tarjeta", la sección **"Cargos de la tarjeta"** (misma `InsuranceSection` con `variant="card"`: cuota de manejo preseleccionada, texto propio). El servidor ya aceptaba el cargo y lo sumaba al desembolso del mes y a "Te queda"; solo faltaba la puerta en la app.
- **Bot:** el lector de extractos pide `handlingFee` ("Cuota de manejo", "Cuota de administración"); la propuesta de tarjeta lo muestra como "Cuota de manejo: $X al mes → la registro como cargo aparte"; se corrige con `manejo 29.900` (0 para quitarla); al confirmar, `applyProposal` crea el cargo `cuota_manejo` aparte (FIN-023). Un valor implausible (≥ 500.000) se descarta como lectura errada. Pruebas en `document-proposal.spec.ts`.

## 5. Pendiente
- OTA desde el PC del Fundador (junto con FIN-056, FIN-057, BT-038 y BT-039).
