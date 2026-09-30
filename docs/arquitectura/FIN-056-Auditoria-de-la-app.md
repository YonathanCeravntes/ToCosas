# FIN-056 · Auditoría de la app: errores, familiaridad y mejoras

- **Fecha:** 2026-09-30 · **Pide:** Fundador ("Necesito un boceto y un análisis profundo… que no haya bug alguno… familiaridad… mejoras puntuales… Revisar cada pantalla"). Tras ver el informe y el boceto: **"Haz todo. Necesito soluciones."**
- **Ejecuta:** Arquitecto. Informe completo: documento "Auditoría de la app Millo" (Claude Docs); bocetos: lienzo "Bocetos de la auditoría Millo" (7 propuestas).

## 1. Qué se revisó
Las 26 pantallas de la app (código, no capturas), la navegación y las partes del servidor que cada pantalla usa. Resultado: 15 errores (2 graves), 12 puntos de familiaridad y 8 mejoras. Los errores quedaron en `REGISTRO-DEFECTOS.md` como **BT-027 … BT-036** (los leves se agruparon).

## 2. Implementado

### Errores (BT-027…BT-036)
- **Fechas nocturnas (BT-027, grave):** `utils/dates.ts` con `toApiDate` (día local a mediodía UTC). Lo usan Registrar, Editar movimiento y Nueva deuda. Regla: una fecha de "día" nunca viaja con `toISOString()` de la hora local.
- **Falso "sin conexión" (BT-028):** solo `ApiError.status === 0` guarda en el teléfono.
- **Enlaces muertos (BT-029, BT-030, BT-035), Copiloto (BT-031), acuse viejo (BT-032), Simularlo (BT-033), activos (BT-034), onboarding bruto/neto (BT-036).**

### Propuestas (bocetos 1–7)
1. **Registrar rápido** (`AddTransactionScreen`, reescrita): tipo arriba (Gasto · Ingreso · Deuda), monto, categorías **las más usadas primero** (`utils/categoryUsage.ts`: últimos 100 movimientos) con "Todas", medio de pago con el último recordado (`utils/prefs.ts`), y plegados fecha, "¿se repite cada mes?" y nota. Tarjeta de crédito sigue yendo a compra a cuotas; "cada mes" sigue creando el fijo; acuse + deshacer + logros + offline se conservan. **Nuevo dato:** `paymentMethod` en el movimiento (migración `20261001090000_fin056_payment_method`; débito y crédito = `tarjeta`), el mismo enum de Mis documentos, para la deducción del 1 %.
2. **Editar movimiento con categoría** (`EditTransactionModal`): chips con las más usadas; al cambiarla el servidor aprende el comercio (FIN-046 Fase 4). El bot ya apuntaba a este camino.
3. **En qué se te va** (`CategoriesScreen`, ruta `Categories`): categorías del ciclo con barra y %, toque → movimientos filtrados por categoría. Inicio → "Ver todo" llega aquí. El servidor añade `id` a `byCategory` y `categoryId` a los recientes.
4. **Editar deuda** (`EditDebtScreen`, ruta `EditDebt`): nombre, entidad (búsqueda del catálogo), día de pago; en tarjetas, cupo y tasa (mensual o anual, se guarda en EA). Cuotas, plazo, tasa de créditos amortizados y cuota pactada siguen en Renegociar (recalcula el plan). "Eliminar esta deuda" con confirmación. El detalle trae `entity`.
5. **Tasa mensual o anual** (`components/RateInput.tsx`, `utils/rates.ts`): selector "% mensual / % anual (EA)" con la conversión a la vista. En Nueva deuda (campos `rate` del descriptor), Editar deuda, Renegociar (deudas en EA) y Simulador (crédito nuevo, refinanciar). Al servidor siempre llega EA.
6. **Subir documento desde la app** (`POST /v1/documents/upload`, multipart, 8 MB; `DocumentIntakeService`): misma lectura con IA y misma bóveda que el bot; devuelve lo entendido y **propone el gasto**; la app lo registra con `paymentMethod` y lo enlaza (`POST /v1/documents/:id/link`). Si el gasto ya existía, solo se enlaza. En la **web** se usa el selector del navegador (cámara o archivo). En la **app instalada** hace falta `expo-image-picker`, que no viaja por OTA: se muestra el aviso y se agrega en la próxima APK.
7. **Ajustes:** día de corte en cuadrícula (1–28), WhatsApp oculto, "Quitar el permiso de IA", "Descargar mis datos". Además: "Estable" en verde, "3 semanas seguidas", el permiso de documentos nombra a Google Gemini (app y bot), Mi mes invita a armar el mes cuando está vacío y ya no tiene el botón de patrimonio.

## 3. Decisiones tomadas por el Arquitecto (pendientes de confirmar por el Fundador)
| Decisión | Por qué | Alternativa si el Fundador no está de acuerdo |
| --- | --- | --- |
| Editar deuda cambia nombre, entidad, cupo, día de pago y, solo en tarjetas, la tasa. Lo demás va por Renegociar. | Cambiar cuotas o tasa de un crédito amortizado sin recalcular el plan dejaría proyecciones falsas. | Permitir la tasa en créditos y recalcular por Renegociar automáticamente. |
| El onboarding pide el salario **bruto** ("el de tu contrato"). | Mi perfil de ingresos ya descuenta salud y pensión con un toque; pedir el neto las descontaba dos veces (BT-036). | Pedir el neto y marcar la fuente como "ya neta" (cambio de modelo). |
| Débito y crédito se guardan como `tarjeta`. | La deducción del 1 % (Ley 2277) cuenta cualquier medio electrónico; el enum ya existía en Mis documentos. | Enum con `debito` y `credito` aparte. |
| Subir documentos desde la app solo en la web hasta la próxima APK. | El selector de foto nativo no se puede agregar por OTA. | Nada: la próxima APK lo trae. |

## 4. Verificación
- Servidor: `tsc` limpio; unitarias 468/468 (nuevo `document-intake.service.spec.ts`); e2e 124/124 (una prueba de `fin039` falló una vez por concurrencia y pasa sola: no está relacionada).
- App: `tsc` limpio. Sin pruebas automáticas de pantallas en el proyecto; revisión manual pendiente en la web y por OTA.

## 5. Pendiente
- OTA desde el PC del Fundador con todo lo de la app (una sola publicación).
- Próxima APK: `expo-image-picker` para subir desde el teléfono.
- Confirmación del Fundador de las decisiones del §3.
