# Informe al Fundador — Beta Técnica (14 de julio de 2026)

- **Para:** Fundador (Yonathan Cervantes)
- **De:** CTO (Claude)
- **Alcance:** cierre de la Fase 0 de infraestructura, la tanda funcional FIN-027/028/029,
  los cinco incidentes de Beta Técnica (BT-001…BT-005), la evolución de gobernanza y el
  estado actual del producto.
- **Naturaleza:** informe ejecutivo con trazabilidad. Todo aquí es rastreable a un artefacto
  oficial (commit, DEC, registro de defectos, sección de gobernanza).

---

## 1. Resumen ejecutivo

Millo pasó, en esta etapa, de "infraestructura recién montada" a **producto vivo en manos de
un usuario real (tú) generando aprendizaje**. Concretamente:

- **Backend en producción 24/7** (Render + Neon), con despliegue automático y verificado.
- **Actualizaciones OTA** operativas (EAS Update): la mayoría de mejoras llegan a la app sin
  reinstalar, con un **gate automático de seguridad** que impide publicar configuraciones
  rotas.
- **Tres frentes funcionales cerrados** (ingresos, gestión de movimientos, Telegram) más la
  Experiencia de Simulador.
- **Cinco incidentes de Beta detectados por uso real, todos atendidos** — cuatro corregidos y
  uno resuelto por decisión de producto tuya.
- **Gobernanza reforzada** de v3.13 a v3.18: se institucionalizaron el manejo de defectos, la
  publicación segura, el dispositivo centinela y la continuidad Beta.

**Estado:** producto estable en Beta para un usuario, con proceso maduro para que cada mejora
llegue a producción sin romper lo anterior.

---

## 2. Infraestructura (Fase 0 — finalizada)

| Componente | Proveedor | Estado |
|---|---|---|
| Backend | Render (Node) | ✅ En producción · `https://milla-backend.onrender.com` |
| Base de datos | Neon PostgreSQL | ✅ Conectada · migraciones aplicadas |
| Repositorio | GitHub | ✅ Fuente oficial (código + conocimiento) |
| Actualización de app | EAS Update (OTA) | ✅ Operativo con gate de seguridad |
| DNS/CDN | Cloudflare | ✅ Preparado (config definitiva pendiente) |
| Dominio comercial | — | ⏳ No adquirido (decisión consciente: infra antes que dominio) |

**Dos flujos de despliegue claros:**
- **Backend** → push a GitHub → Render **auto-despliega** (~2-5 min). Sin reinstalar la app.
- **Frontend** → **OTA** por la vía segura `npm run ota:publish`. Llega al reabrir la app.
- **Cambio nativo** → APK nuevo (poco frecuente).

Detalle vivo: `docs/INFRAESTRUCTURA.md` · `docs/tecnico/EAS-UPDATE.md`.

---

## 3. Trabajo funcional cerrado (la "tanda" de la Beta Técnica)

Los tres frentes que autorizaste se abrieron en paralelo (solo diseño), y se implementaron y
cerraron **en secuencia** (un IMP a la vez), cada uno validado de forma independiente por el
CTO (código + suites reejecutadas), no sobre reporte.

| FIN | Qué entregó | Estado |
|---|---|---|
| **FIN-026 · Simulador** | 8 escenarios usables, bug de navegación corregido, veredicto narrado | ✅ Cerrada |
| **FIN-027 · Modelo de ingresos** | Perfil laboral, fuentes fijas/variables, deducciones con base total/parcial, ingreso neto como fuente única | ✅ Cerrada |
| **FIN-028 · Gestión de movimientos** | Editar y **anular** movimientos (anulación lógica, nunca borrado físico); el Motor recalcula automáticamente; anular un pago de deuda **revierte** el saldo | ✅ Cerrada |
| **FIN-029 · Telegram** | Motor conversacional único (reutilizable para WhatsApp), determinista, con acuse explícito y honestidad; **IA apagada** por el gate legal DPA+PIA | ✅ Cerrada |

Cada una respetó tus decisiones y las condiciones del CPSAO. Suites finales verificadas por
el CTO: **unit 355/355 · e2e 44/44 · TypeScript limpio**.

---

## 4. Incidentes de Beta Técnica (registro de defectos)

Todos siguen la directriz que estableciste (`GOBERNANZA.md` §38): el CTO evalúa cada defecto,
lo clasifica y solo las nuevas necesidades se vuelven FIN; el resto se corrige por
mantenimiento con trazabilidad defecto→corrección→commit. Registro completo:
`docs/oficial/REGISTRO-DEFECTOS.md`.

### BT-001 · Formato regional en números (500 al escribir "15,35")
- **Causa raíz:** el frontend borraba la coma decimal → `15,35` viajaba como `1535` y
  desbordaba el campo de la tasa (Decimal 7,4) → error 500.
- **Solución:** normalización de números en dos capas (backend autoritativo + frontend);
  acepta coma/punto decimal y enteros. Fuera de rango → 400 claro, nunca 500.
- **Regla derivada:** `GOBERNANZA.md` §39 — todo campo numérico acepta el formato regional.
- **Estado:** ✅ Corregido y verificado.

### BT-002 · No se podían editar/anular movimientos
- **Encauzado a FIN-028** (tus 10 decisiones de producto). ✅ Cubierto y cerrado.

### BT-003 · "Sin conexión con el backend" con el backend operativo
- **Causa raíz (incidente causado por el CTO):** al publicar el primer OTA, `eas update` no
  hereda las variables del build → el bundle cayó al fallback `localhost` → tu teléfono
  intentaba conectarse a sí mismo.
- **Solución:** URL de producción como fallback; hotfix OTA publicado.
- **Aprendizaje institucional (lo que pediste):** se construyó un **gate automático de
  publicación OTA** (`GOBERNANZA.md` §40) que **bloquea** publicar si detecta `localhost`,
  variables faltantes, config inconsistente o `/health` caído; verificado en ambos sentidos.
  Vía única `npm run ota:publish` + **dispositivo centinela**. Prohibido `eas update` directo.
- **Estado:** ✅ Corregido; el proceso queda blindado para que no se repita.

### BT-004 · "Te queda para gastar" no reflejaba el ingreso
- **Decisión de producto tuya:** el ingreso fijo recurrente **debe** formar parte del cálculo
  principal; luego lo ampliaste a "ingreso neto disponible = salario + variable, menos
  deducciones".
- **Implementación:** la base de "Te queda" pasó de "solo lo recibido" a
  **`max(ingreso neto disponible del mes, recibido)`** (fijo neto + variable estimado), sin
  romper la fuente única §32. Verificado en producción con tu escenario exacto:
  `ingreso neto disponible = 5.609.240`, "Te queda" **positivo**.
- **Hallazgo importante durante el diagnóstico:** tu −$1.552.689 **no era un bug** — tu ingreso
  sí se contaba; el número era el resultado real de tus **movimientos de prueba** (un ingreso
  de $64.144.450 y un pago de deuda de $64.114.451). Al limpiarlos, "Te queda" refleja tu
  salario. *(El cálculo cuadró al peso con tus datos reales.)*
- **Estado:** ✅ Resuelto (decisión de producto implementada y verificada).

### BT-005 · Botón "Anular" trabado (pago de deuda)
- **Causa raíz:** el backend anula bien y rápido (0.93 s; tu deuda se **regeneró** a "activa"
  con su saldo). Lo que se colgaba era la petición **sin timeout** cuando el backend estaba
  dormido (Render plan gratuito se apaga tras 15 min de inactividad y tarda ~30-60 s en
  despertar); la app giraba indefinidamente.
- **Solución:** timeout de 45 s en el cliente HTTP — la app nunca más queda colgada; muestra
  un mensaje claro si el servidor está reactivándose. Publicado por OTA.
- **Nota honesta:** la causa de fondo es el *cold start* del plan gratuito. El timeout lo hace
  tolerable; eliminarlo requeriría plan pagado, que por tu política (§36.4) no escalamos sin
  necesidad demostrada.
- **Estado:** ✅ Corregido (llega al reabrir la app).

---

## 5. Evolución de la gobernanza (v3.13 → v3.18)

Cada regla nace de un hecho real, no de teoría:

| Sección | Regla | Origen |
|---|---|---|
| **§36** | Marco post-Fase 0: modelo híbrido de documentación, CTO único integrador, testing obligatorio, no escalar por anticipación, GitHub como registro histórico, CTO custodio de calidad | Cierre de Fase 0 |
| **§37** | Memorando de Sincronización de Contexto (MSC) ante cambios de etapa | Riesgo de roles con contexto desfasado |
| **§38** | Gestión de defectos en uso real (el CTO clasifica; solo nuevas necesidades → FIN) | Beta Técnica |
| **§39** | Formato regional obligatorio en campos numéricos | BT-001 |
| **§40** | Gate obligatorio de despliegue OTA + dispositivo centinela | BT-003 |
| **§41** | Continuidad Beta: toda FIN cerrada llega al dispositivo Beta por OTA | Directriz tuya |

Gobernanza vigente: **v3.18** (`docs/GOBERNANZA.md`).

---

## 6. Decisiones de producto que tomaste (registradas)

- **DTI/Score sobre ingreso NETO** (con nota de copy para que no se lea como castigo).
- **"Te queda" incluye el ingreso declarado** (fijo neto + variable) — supersede el "solo lo
  recibido" para el ingreso fijo.
- **Anulación lógica** de movimientos (nunca borrado físico), con recálculo automático.
- **Un solo motor conversacional** para todos los canales.
- **No escalar infraestructura** sin necesidad demostrada por datos reales.

---

## 7. Estado actual y próximos pasos

**Vivo en producción / Beta:**
- Backend con todos los cierres (FIN-027/028/029, BT-001…BT-005).
- OTA vigente con el fix de BT-005 (`c9214289`).
- Tu deuda de prueba regenerada; tu cuenta consistente.

**Pendientes conocidos (no bloqueantes):**
- `FIN-025` — aviso proactivo de mora (registrado, sin fecha).
- Reconstrucción de `next_due_date` al anular un pago de deuda (limitación declarada; el
  próximo pago la re-ancla).
- Activación real del bot de Telegram (webhook + token) — paso operativo, cuando decidas.
- Trazabilidad **visible** de anulaciones para el usuario (seguimiento de una futura
  iteración de FIN-028, pedido del CPSAO).
- Gate legal **DPA+PIA** sigue cerrado: la IA del Copiloto/bot no opera con datos reales
  hasta cerrarlo.

**Recomendación del CTO:** seguir usando la Beta con datos realistas (no de stress-test) para
que los indicadores cuenten la verdad de tu mes, y reportar cualquier fricción — cada hallazgo
se convierte en mejora permanente y queda documentado.

---

## 8. Aprendizaje institucional (lo esencial)

El mayor activo de esta etapa no es un feature: es que **el proceso maduró para que los errores
no lleguen a producción**. BT-003 dejó un gate que hace muy difícil repetir un despliegue roto;
BT-001 dejó una regla permanente de formato numérico; la Beta dejó un procedimiento claro para
tratar cada defecto. Ese "trabajo invisible" es lo que permitirá que el equipo crezca sin
perder estabilidad.

---

*Trazabilidad: este informe se commitea en el mismo acto (§34) y queda en GitHub como parte del
registro histórico oficial (§36.5). Referencias: `docs/GOBERNANZA.md`, `docs/oficial/REGISTRO-DEFECTOS.md`,
`docs/INFRAESTRUCTURA.md`, `docs/tecnico/EAS-UPDATE.md`, `docs/roadmap/BACKLOG.md`.*
