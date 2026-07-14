# Registro oficial de defectos (Bug Tracker) — Millo

- **Naturaleza:** registro append-only de defectos detectados durante el uso real de la
  aplicación. Trazabilidad obligatoria **defecto → clasificación → corrección → commit**
  (`GOBERNANZA.md` §38).
- **Regla de clasificación (§38):** todo defecto lo evalúa el CTO de inmediato y lo
  clasifica en: implementación · arquitectura · experiencia de usuario · nueva necesidad
  funcional. **Solo las nuevas necesidades funcionales se convierten en FIN**; los
  defectos se corrigen por el flujo de mantenimiento, preservando la estabilidad.
- **Numeración:** `BT-XXX` (Beta Técnica / Bug Tracker), correlativa.

| ID | Descripción | Clasificación (CTO) | Estado | Corrección / commit |
|----|-------------|---------------------|--------|---------------------|
| BT-001 | Registrar una tasa de interés con coma decimal (`15,35`) producía **500**: el frontend borraba la coma → `1535`, que desbordaba `interest_rate Decimal(7,4)` (máx 999.9999) en Prisma. | **Defecto de implementación** (parseo de entrada). No es FIN. | ✅ **Corregido y verificado** | Ver detalle abajo. Commit del fix + este registro en el mismo acto (§34). |
| BT-002 | No se podían editar ni anular movimientos ya registrados. | Continúa dentro de **FIN-028** (decisiones del Fundador ya emitidas). | ✅ Cubierto por `FIN-028` (CERRADA, `65104e1`) | `docs/oficial/DEC-0028-Gestion-de-Movimientos.md` |
| BT-003 | La app mostraba "Sin conexión con el backend" pese a que Render/`/v1/health` respondían. **Incidente causado por el CTO** al publicar el primer OTA: `eas update` no hereda el `env` del perfil de build → el bundle cayó al fallback `localhost`. | **Defecto operativo/de configuración** (despliegue OTA). No es FIN. | ✅ **Corregido y publicado por OTA** | Ver detalle abajo. |
| BT-004 | Un ingreso fijo **declarado** (perfil de ingresos, FIN-027) no aparece en "Te queda para gastar". | **Decisión de producto del Fundador** — cambia la definición §32 de "Te queda". | ✅ **Resuelto** (decisión del Fundador, 2026-07-14) — implementado y verificado | Análisis + resolución abajo. Commit del fix registrado. |

---

## BT-001 · Formato regional en campos numéricos

**Reportado por:** Fundador (Beta Técnica, 2026-07-13) — "intenté registrar una tasa de
interés de 15,35 / 15,35, no me permitió, arrojando error".

**Causa raíz (verificada en código por el CTO):**
- Frontend `AddDebtScreen.tsx:20`: `parseFloat(s.replace(/[^\d.]/g, ''))` **descartaba la
  coma** → `"15,35"` se convertía en `1535`.
- Backend: `interest_rate` es `@db.Decimal(7,4)` (máx 999.9999). `1535` tiene 4 dígitos
  enteros → Prisma lanzaba al escribir → **500**. El `@IsNumber()` del DTO no lo atrapaba
  porque el frontend ya enviaba un número.

**Corrección (defensa en dos capas):**
- **Backend (autoritativo, "antes del Motor"):** `common/parse-number.util.ts` —
  `normalizeNumberInput` + decorador `@NormalizeNumber()` aplicado a los campos numéricos
  del DTO de deuda. Acepta coma decimal, punto decimal y enteros; miles vs. decimal
  desambiguados por el último separador. Se añadió `@Max(999.9999)` a `interestRate`: un
  valor genuinamente fuera de rango devuelve **400 claro, nunca 500**.
- **Frontend:** `utils/format.ts` — `parseDecimal` (decimales regionales) y `parseAmount`
  (montos COP enteros, descarta miles). `AddDebtScreen` usa el parser correcto por campo.

**Verificación (por el CTO):**
- Unit `parse-number.util.spec.ts`: 9/9 (`15,35`/`15.35`/`1535`/`1.234,56`/`1,234.56`/…).
- e2e `bt001-formato-regional.e2e-spec.ts`: 4/4 — `"15,35"` → **201** y guarda 15.35 (antes
  500); `"15.35"` → 201; entero → 201; valor fuera de rango → **400**, no 500.
- Suites completas sin regresión: unit 340/340 (44 suites), e2e 31/31 (9 suites), `tsc`
  backend y frontend exit 0.

**Regla permanente derivada:** la decisión del Fundador ("todos los campos numéricos deben
aceptar la escritura natural del usuario según su configuración regional, normalizada antes
del Motor") queda institucionalizada como invariante del sistema en `GOBERNANZA.md` §39.
Los futuros DTO con campos numéricos deben usar `@NormalizeNumber()`.

## BT-003 · "Sin conexión con el backend" con el backend operativo

**Reportado por:** Fundador (Beta Técnica, 2026-07-14) — la app mostraba "Sin conexión con
el backend. Tus datos locales siguen disponibles.", pero `/v1/health` respondía y Render
estaba operativo.

**Causa raíz (PROBADA por el CTO, no teorizada):**
- La resolución de la URL en `client.ts` era
  `process.env.EXPO_PUBLIC_API_URL ?? extra.apiUrl ?? 'http://localhost:3000/v1'`.
- `eas build` **sí** inyecta `EXPO_PUBLIC_API_URL` desde el `env` del perfil de `eas.json`
  → el APK original apuntaba a producción. Pero **`eas update` (OTA) NO hereda ese `env`**
  → en el bundle publicado por OTA, `EXPO_PUBLIC_API_URL` quedó `undefined` y la resolución
  cayó a `extra.apiUrl` de `app.json`, que era **`http://localhost:3000/v1`**.
- Prueba: `npx expo export` sin la variable hornea `http://localhost:3000/v1` en el bundle.
  En el teléfono, `localhost` = el propio teléfono (sin servidor) → todo fetch falla →
  `summary.error` (`DashboardScreen.tsx:330`) dispara el mensaje. Por eso `/v1/health`
  respondía para el Fundador pero la app nunca llamaba a Render.
- **El incidente lo causó el CTO** al publicar el primer OTA (`c1d5c328`) sin la variable.

**Solución aplicada (frontend/config → EAS Update, sin backend):**
- `app.json` `extra.apiUrl` → `https://milla-backend.onrender.com/v1` (viaja en el
  manifiesto del OTA; es el valor que ahora resuelve en runtime). Verificado con
  `expo config` → `apiUrl: https://milla-backend.onrender.com/v1`.
- `client.ts`: fallback final cambiado de `localhost` a la URL de producción, con comentario
  del incidente — ningún camino de código puede volver a enviar `localhost` a usuarios.
- OTA HOTFIX republicado: update group `f166ac42` (branch `preview`, runtime `0.1.0`).

**Lección permanente (documentada en `docs/tecnico/EAS-UPDATE.md`):** `eas update` no hereda
el `env` del perfil de build; el fallback de URL debe ser producción, nunca `localhost`.

**Cierre institucional (política del Fundador, `GOBERNANZA.md` §40):** BT-003 no cierra como
"bug corregido" sino como **mejora permanente del proceso de despliegue**. Se construyó un
**gate automático** (`frontend/scripts/deploy/preflight-ota.mjs`) que **bloquea** la
publicación si detecta `localhost`/host local, variables faltantes, config inconsistente,
canal/runtime inválidos o `/health` caído; y la **vía única** `npm run ota:publish`
(`publish-ota.mjs`) que corre el gate y exige el **dispositivo centinela** antes de publicar.
Verificado por el CTO en ambos sentidos: config correcta → pasa (exit 0); `localhost`
reintroducido (simulación BT-003) → **bloquea** (exit 1). Prohibido correr `eas update`
directamente.

## BT-004 · Ingreso fijo declarado no aparece en "Te queda para gastar"

**Reportado por:** Fundador (Beta Técnica, 2026-07-14, P1) — registró un ingreso fijo, se
almacenó, pero "Te queda para gastar" no lo refleja.

**Investigación del CTO (evidencia, no hipótesis) — las 4 preguntas del Fundador:**
1. **¿Se almacena?** Sí. `POST /v1/income/sources` persiste la fuente; `fin027` e2e:
   `netFixedTotal = 3.740.000` tras deducciones.
2. **¿El dashboard incluye el ingreso fijo?** Sí, en **"Ingresos fijos"**:
   `dashboard.service.ts:101` `fixedIncome = income.netFixedTotal` (fuente FIN-027). e2e fija
   `fixedIncome = 3.740.000`.
3. **¿"Te queda" consume la estructura FIN-027?** Sí, pero solo para las **deducciones**
   auto-pagadas, no como ingreso.
4. **¿Caché/sincronización?** No: `SpendableService.compute` calcula en vivo por request.

**Causa raíz (no es un defecto de implementación):** `SpendableService` (única definición de
"Te queda", §32) es, por diseño ratificado (FIN-020 Alt A, "nunca mentir hacia arriba"):
`amount = ingresos RECIBIDOS (transacciones) − gastos/pagos reales − compromisos pendientes`.
El ingreso fijo **declarado** (no recibido aún) **no** cuenta — decisión ratificada en
FIN-020/021/023/024 y **preservada a propósito por FIN-027** (documentado en
`fin020-tequeda.e2e-spec.ts`: *"sigue sin contar en teQueda… solo lo REALMENTE recibido"*).
El salario declarado SÍ aparece en "Ingresos fijos" y en el Score; "Te queda" lo sumaría al
registrarse como **movimiento** de ingreso (eso funciona — `fin020` e2e verde).

**Por qué no se corrige unilateralmente:** cambiar "Te queda" para contar dinero no recibido
**rompería la definición §32** que el CPSAO y el Fundador ratificaron cuatro veces. Es una
**decisión de producto**, no un fix de mantenimiento. Escalada al Fundador/CPSAO.

**Opciones propuestas por el CTO (recomendación en negrita):**
- **A (recomendada, honesta):** cuando una fuente fija declarada tiene día de pago ya
  **pasado** en el ciclo y no hay un movimiento de ingreso que le corresponda, la app ofrece
  un CTA de un toque: *"¿Ya recibiste tu salario del 28? Regístralo"* → crea el movimiento →
  "Te queda" lo refleja. Cierra la brecha SIN romper "solo lo recibido cuenta".
- B: dejar "Te queda" intacto y solo clarificar en la UI que cuenta lo recibido y que el
  salario declarado vive en "Ingresos fijos" (copy).
- C (no recomendada): contar el ingreso declarado con día pasado como recibido — asume el
  pago, viola "nunca mentir hacia arriba" y §32.

Cualquiera de A/B es maintenance/UX; C sería un cambio de la definición §32 (requiere DEC y
visto del CPSAO). Pendiente de la decisión del Fundador/CPSAO.

**Resolución (decisión del Fundador, 2026-07-14 — supersede la propuesta del CTO):** el
Fundador decidió, como autoridad de producto y sin re-escalar, que **el ingreso fijo
recurrente declarado forma parte del cálculo principal ("Te queda")**, porque es un flujo
predecible que la usuaria configura para planificar su mes; el impacto en credibilidad de que
el indicador ignore ese ingreso supera el beneficio de la regla anterior. Esto **supersede el
"Alt A / solo lo recibido" de FIN-020 para el ingreso fijo** (los ingresos VARIABLES siguen
contando solo al recibirse — no son certeza).

**Aclaración del Fundador (2026-07-14, tras primera validación):** la base debe ser el
**ingreso neto disponible del mes completo = salario + variable, menos deducciones** (su
número real: 5.609.240 = fijo neto + variable). No solo el fijo.

**Implementación (CTO), hecha con cuidado de NO romper §32 (una sola definición):**
- `SpendableService` (fuente única de "Te queda"): la base de ingreso pasa de
  `receivedIncome` a **`max(ingreso neto disponible del mes, recibido)`** donde
  `ingreso neto disponible del mes = netFixedTotal + selfPaidDeductionsTotal +
  grossVariableEstimate` (= `netMonthlyEstimate` en forma take-home). El `max` **evita el
  doble conteo** si el ingreso además se registra como movimiento. Incluye el variable
  estimado (decisión explícita del Fundador; se documenta que el variable es estimación).
- Se expone `incomeBase` en el objeto `TeQueda` y `interpretCashflow` (interpretación §4.1-ter
  del Inicio) pasa a dividir por `incomeBase` en vez de `receivedIncome` — si no, con ingreso
  declarado daba proporciones absurdas ("$283 de cada $100"); copy ajustado a "de tu ingreso".
- Como es la fuente única, Presupuesto e Inicio heredan el cambio automáticamente.
- **Verificación del CTO:** `tsc` BE+FE 0; unit **355/355** (46 suites); e2e **43/43** (11
  suites). e2e `fin020` actualizado: con salario declarado 4.000.000, arriendo 1.200.000 y
  gasto 250.000, "Te queda" = **2.550.000** (antes −550.000) e interpretación verde.
- **Verificación en PRODUCCIÓN (CTO, backend en vivo, escenario exacto del Fundador):**
  salario fijo 5.200.000 − deducciones 487.760 + variable 897.000 + arriendo 1.582.688 →
  `income/summary.netMonthlyEstimate = 5.609.240` (el número exacto del Fundador) y
  `budget/monthly.teQueda = { amount: 4.026.552, incomeBase: 5.609.240 }` — **positivo**.
  El deploy nuevo confirmado activo (`incomeBase` incluye el variable).
- **Despliegue (§41):** backend-only → llega a Beta por el auto-deploy de Render (confirmado
  activo), sin OTA. El Fundador solo debe recargar la app.
- **Estado:** ✅ **Resuelto y verificado en producción.** Pendiente únicamente la confirmación
  visual del Fundador tras recargar la app (§41: no lo doy por cerrado hasta que él lo compruebe).

## Historial
- 2026-07-13 — Creación del registro. BT-001 corregido y verificado; BT-002 encauzado a
  FIN-028. Directriz de gestión de defectos institucionalizada (`GOBERNANZA.md` §38) e
  invariante de formato regional (§39).
- 2026-07-14 — BT-003 (incidente de producción "sin conexión") corregido por OTA HOTFIX
  `f166ac42`. Causa raíz probada (OTA no hereda el `env` → fallback `localhost`). Commit
  del fix registrado abajo.
