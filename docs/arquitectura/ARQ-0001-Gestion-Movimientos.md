# ARQ-0001 · Gestión de Movimientos

| Campo | Valor |
|-------|-------|
| **ID** | ARQ-0001 |
| **Módulo** | Gestión de Movimientos (editar · eliminar · historial y filtro por periodo) |
| **Autor** | Arquitecto (Claude) |
| **Fecha** | 2026-07-04 |
| **Estado** | Borrador → En auditoría |
| **Versión** | 1.0 |
| **Backlog** | Backlog Inicial de Desarrollo de Millo v1.0 |

---

## 1. Objetivo
Permitir al usuario **corregir y organizar** sus movimientos: editar un movimiento
mal registrado, eliminarlo, y consultar su **historial filtrado por mes** (y por
tipo/categoría), tanto online como offline.

## 2. Problema que resuelve
Hoy el usuario solo puede **crear** movimientos. Si se equivoca (monto, categoría,
fecha) no puede corregirlo desde la app, y el dashboard solo muestra el **mes
actual** sin poder navegar meses anteriores. Esto genera datos incorrectos y
desconfianza, y limita la utilidad del historial.

## 3. Alcance

**Incluye (in-scope):**
- Editar un movimiento: monto, categoría, fecha y nota.
- Eliminar un movimiento (soft-delete) con confirmación.
- Pantalla **"Movimientos"**: lista con **selector de mes** y filtro por tipo/categoría.
- Navegación de meses en el dashboard (mes anterior / siguiente).
- Reflejo correcto de estas acciones en **modo offline** (outbox) y su sincronización.
- **Reversión de saldo** al editar/eliminar un movimiento de tipo `pago_deuda`
  (el saldo de la deuda debe recalcularse correctamente).

**No incluye (out-of-scope) en esta versión:**
- Búsqueda por texto libre.
- Exportación de movimientos.
- Edición masiva / multiselección.
- Papelera / restauración de eliminados (el soft-delete queda, pero sin UI de restauración).

## 4. Arquitectura propuesta
Se **reutiliza** la infraestructura existente y se añaden pantallas + una regla de
negocio de reversión de saldo.

```
App (Movimientos/Editar) ──REST──▶ TransactionsController
    │  offline: outbox (update/delete)        │
    ▼                                          ▼
WatermelonDB/SQLite local  ◀──sync──▶  TransactionsService
                                          │  (revierte saldo si pago_deuda)
                                          ▼
                                       PostgreSQL (transactions, debts)
```

- **Filtro por mes:** el endpoint `GET /transactions` ya acepta `from`/`to`; el
  dashboard ya acepta `month`. La app calcula el rango del mes seleccionado.
- **Editar/eliminar:** endpoints `PATCH /transactions/:id` y `DELETE /transactions/:id`
  ya existen; se les añade la lógica de reversión de saldo para `pago_deuda`.

## 5. Componentes involucrados
- **Backend · TransactionsModule** (existente): se amplía `update` y `remove` para
  revertir/ajustar el saldo de la deuda cuando el movimiento es `pago_deuda`.
- **Backend · SyncModule** (existente): `push` ya soporta `deleted`; se completa el
  soporte de `updated` para movimientos con reversión de saldo.
- **Frontend** (nuevo): pantalla `MovimientosScreen`, `EditTransactionScreen`,
  navegación de mes en `DashboardScreen`.
- **Frontend · offline** (existente): `transactionsRepo` + `outbox` se amplían con
  operaciones `update` y `delete`.

## 6. Base de datos
**Sin cambios de esquema.** `transactions` ya tiene `deletedAt` (soft-delete),
`updatedAt` (LWW) y `debtId`. Se recomienda validar el índice
`transactions(userId, occurredAt)` para el listado por mes (ya existe).

## 7. Backend
- `PATCH /transactions/:id` — editar; si cambia monto/tipo y afecta un `pago_deuda`,
  **recalcular el saldo de la deuda** (revertir el efecto anterior y aplicar el nuevo),
  de forma atómica (`$transaction`).
- `DELETE /transactions/:id` — soft-delete; si era `pago_deuda`, **devolver** el monto
  al saldo de la deuda (sin superar el monto original), atómico.
- `GET /transactions?from=&to=&kind=&categoryId=` — ya existe; se confirma su uso.
- Reglas: nunca dejar `currentBalance` negativo ni mayor al `originalAmount`.

## 8. Frontend
- **MovimientosScreen** (nueva pestaña o acceso desde Inicio): lista paginada del
  mes seleccionado, con **selector de mes** (‹ Julio 2026 ›) y chips de filtro por tipo.
- **Acciones por movimiento:** tocar → editar; botón/gesto → eliminar (con diálogo
  de confirmación).
- **EditTransactionScreen:** reutiliza el formulario de registro (monto, categoría
  con iconos, fecha, nota) precargado.
- **DashboardScreen:** flechas ‹ › para cambiar de mes; el desglose "¿En qué se te va
  la plata?" y los totales se recalculan para ese mes.
- **Offline:** editar/eliminar funcionan sin conexión (van al outbox) y se sincronizan.

## 9. IA involucrada
**No aplica.** Es gestión de datos; no interviene NLP/OCR ni modelos.

## 10. Riesgos identificados
| Riesgo | Mitigación |
|--------|-----------|
| Reversión de saldo incorrecta al editar/eliminar `pago_deuda` (doble conteo, saldo negativo) | Operación atómica `$transaction`; recalcular = revertir efecto previo + aplicar nuevo; clamp `[0, originalAmount]`; tests unitarios dedicados |
| Conflicto offline al editar el mismo movimiento en 2 dispositivos | Last-write-wins por `updatedAt` (ya definido en SyncModule) |
| Confusión del usuario al borrar sin querer | Diálogo de confirmación obligatorio |
| Recalcular amortización tras cambiar un pago | Fuera de alcance v1: se ajusta `currentBalance`; el recálculo de la tabla de amortización se evalúa en ARQ posterior |

## 11. Dependencias
- **Sin librerías nuevas obligatorias.** El gesto "swipe para borrar" se puede hacer
  con un botón simple para evitar añadir `react-native-gesture-handler`/`reanimated`
  en v1 (se puede proponer en un ARQ futuro si se desea el gesto).
- Depende de módulos existentes: Transactions, Sync, Categories.

## 12. Impacto esperado
- **Confianza en los datos** (pueden corregir) → mayor retención y uso diario.
- **Engagement con el historial** (navegar meses) → refuerza el hábito.
- Métricas afectadas: retención D30, nº de movimientos editados/gestionados, sesiones.

## 13. Criterios de aceptación
- [ ] El usuario puede editar monto, categoría, fecha y nota de un movimiento.
- [ ] El usuario puede eliminar un movimiento con confirmación; deja de aparecer.
- [ ] Editar/eliminar un `pago_deuda` ajusta el `currentBalance` de la deuda correctamente (sin negativos ni exceder el original).
- [ ] Existe una pantalla de historial con selector de mes y filtro por tipo.
- [ ] El dashboard permite cambiar de mes y recalcula totales y desglose.
- [ ] Editar/eliminar funciona offline y sincroniza sin duplicar ni perder datos.
- [ ] Pruebas: unitarias de reversión de saldo (verde) + verificación end-to-end.

## 14. Plan de implementación
| Paso | Descripción | Verificación |
|------|-------------|--------------|
| 1 | Backend: reversión de saldo en `update`/`remove` de `pago_deuda` (atómico) | Tests unitarios de saldo; smoke test |
| 2 | Backend/Sync: completar `push` de `updated` para transacciones | Smoke test offline→online |
| 3 | Frontend: `MovimientosScreen` (lista + selector de mes + filtros) | tsc + bundle; prueba en dispositivo |
| 4 | Frontend: `EditTransactionScreen` (formulario precargado) | tsc + bundle; edición end-to-end |
| 5 | Frontend: navegación de mes en Dashboard | tsc + bundle |
| 6 | Offline: operaciones `update`/`delete` en repo + outbox | Prueba sin conexión |
| 7 | Informe `IMP-0001-Gestion-Movimientos.md` | Checklist de aceptación cumplido |

---

> **Estado:** propuesta lista para **Auditoría** y **decisión del CTO**.
> La implementación **no comienza** hasta que exista `DEC-0001` aprobado en `docs/oficial/`.
