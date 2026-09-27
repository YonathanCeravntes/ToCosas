# Análisis Competitivo — Millo

- **Versión:** 2.0
- **Fecha:** 2026-09-27
- **Autor:** Arquitecto — por instrucción directa del Fundador (2026-09-27: "estudio de
  mercado donde revises las app de gestor de finanzas, y que compares, a nivel mundial").
- **Estado:** **Poblado — pendiente de validación del CTO (§15).** Toda afirmación sobre
  un competidor lleva su fuente; lo que no pude verificar queda marcado como
  **hipótesis**. Este documento no autoriza nada por sí mismo: alimenta el Blueprint
  exploratorio `docs/arquitectura/BLUEPRINT-0001-Analisis-Integral-Millo.md` y, si el
  CTO lo decide, futuras `IDEA`/`FIN`.
- **Historial de cambios:**
  - v1.0 (2026-07-06) — creación del documento como parte del scaffold de Gobernanza v3.0 (vacío).
  - v2.0 (2026-09-27) — primera ronda de benchmarking mundial (EE. UU., Reino Unido/Europa,
    LatAm, Colombia, Asia), 30+ productos, con fuentes web consultadas el 2026-09-27.
- **Referencias cruzadas:** `PRODUCT_VISION.md` §10 (diferenciadores como hipótesis a
  validar aquí), `MONETIZATION.md`, `docs/GOBERNANZA.md` §15, `BLUEPRINT-0001`.

---

## 0. Método y límites (léase antes que nada)

- **Fuentes:** búsquedas web reales el 2026-09-27 (herramienta de búsqueda del entorno).
  Se citan al final de cada sección. No se descargó ninguna app ni se pagó ninguna
  suscripción: la comparación es sobre lo publicado por cada producto y por reseñas
  de terceros de 2026.
- **Regla §15:** precios y funciones cambian; cada dato tiene fecha implícita
  (septiembre 2026). Un dato que dependa de una sola reseña de terceros está marcado
  con ⚠️. Lo que es inferencia mía está marcado como **hipótesis**.
- **Qué NO es este documento:** no es un ranking ni una recomendación de copiar
  funciones. `PRODUCT_VISION.md` §12 es explícito: el crecimiento se guía por
  necesidades verificadas del usuario, no por lo que hacen los competidores.
  Este documento sirve para saber **dónde está el piso del mercado** (lo que un
  usuario da por sentado) y **dónde hay espacio** que nadie ocupa bien.

## 1. Tamaño y dinámica del mercado

Las cifras de tamaño de mercado divergen enormemente según la firma (definiciones
distintas de "app de finanzas personales"):

| Fuente | Valor 2026 | Proyección | CAGR |
|---|---|---|---|
| Research and Markets | USD 207,7 B | USD 507,6 B (2030) | 25 % |
| Fortune Business Insights (software) | USD 38,2 B | — | — |
| Business Research Insights | USD 25,8 B | USD 167,6 B (2035) | 20,6 % |
| Research Nester | USD 9,4 B | USD 17,7 B (2035) | — |

**Lectura honesta:** el único consenso es la dirección (crecimiento de dos dígitos)
y los motores (penetración de smartphones, banca digital, demanda de control de
gasto). No usar ninguna cifra absoluta como argumento de negocio sin elegir y
citar la metodología.

**Hechos estructurales de 2026 con fuente:**
- **Mint cerró definitivamente** (acceso perdido el 23-mar-2026). Dejó a millones de
  usuarios migrando hacia Monarch, YNAB, Simplifi, Copilot y Rocket Money — el
  mercado premium de EE. UU. se consolidó alrededor de ~USD 100/año.
- **Fintonic se retiró de LatAm**: cerró Chile (mar-2023) y ya no opera en México
  (jun-2026); hoy solo soporta bancos españoles. **Colombia no tiene un agregador
  líder claro** (hipótesis reforzada por las listas locales de 2026, que mezclan apps
  de inversión, neobancos y trackers globales).
- **Colombia hizo obligatorias las finanzas abiertas**: Decreto 0368 de 2026, vigente
  desde el 7-abr-2026 para todas las vigiladas por la SFC; la SFC tiene 6 meses para
  publicar el cronograma de estándares y 12 para el registro de participantes.
  Terceros no vigilados (fintechs, agregadores) participan voluntariamente si cumplen
  criterios. **Implicación:** la agregación bancaria en Colombia pasará de "imposible"
  a "estándar" en un horizonte de 12–36 meses (hipótesis de plazo).
- **Endeudamiento de hogares en Colombia (contexto del problema que Millo ataca):**
  el Banco de la República (Reporte de Estabilidad Financiera 1S-2026) reporta que el
  endeudamiento vuelve a crecer, con ligeros aumentos de mora en libre inversión,
  libranzas, tarjetas y vehículo; la deuda de hogares es el 45,4 % de la cartera de las
  vigiladas. Prensa económica cita que los hogares destinan entre ~27 y ~37 de cada
  100 pesos de ingreso al pago de créditos (La República / El Tiempo, cifras de
  distintos cortes — ⚠️ no homogéneas).

Fuentes: [Research and Markets](https://www.researchandmarkets.com/report/personal-finance-app-market) ·
[Fortune Business Insights](https://www.fortunebusinessinsights.com/personal-finance-software-market-112683) ·
[Business Research Insights](https://www.businessresearchinsights.com/market-reports/personal-finance-app-market-117811) ·
[Research Nester](https://www.researchnester.com/reports/personal-finance-apps-market/8243) ·
[Mint shutdown 2026](https://pocketclear.app/blog/mint-app-shut-down-2026-update.html) ·
[Fintonic México ya no opera](https://asesoresinversion.com/academia/finanzas-personales/fintonic-el-app-para-controlar-gastos/) ·
[SFC — finanzas abiertas obligatorias](https://www.superfinanciera.gov.co/publicaciones/10116081/finanzas-abiertas-obligatorias-impulsaran-el-desarrollo-del-sistema-y-la-inclusion-financiera-en-el-pais/) ·
[Decreto 0368 (Facephi)](https://facephi.com/observatory/finanzas-abiertas-en-colombia-decreto-0368/) ·
[Holland & Knight — plazo SFC](https://www.hklaw.com/en/insights/publications/2026/02/sfc-amplia-el-plazo-para-que-entidades-en-colombia-se-ajusten) ·
[Banrep — Recuadro 2, REF 1S-2026](https://www.banrep.gov.co/es/publicaciones-investigaciones/reporte-estabilidad-financiera/recuadro-2-primer-semestre-2026) ·
[La República — 27 de cada 100](https://www.larepublica.co/finanzas-personales/los-hogares-colombianos-destinan-27-de-cada-100-al-pago-de-creditos-4431172) ·
[El Tiempo — más del 37 %](https://www.eltiempo.com/economia/sector-financiero/hogares-siguen-destinando-mas-del-37-de-sus-ingresos-mensuales-al-pago-de-deudas-bancarias-3430782)

## 2. Mapa mundial por segmento

### 2.1 Agregadores premium de EE. UU. (el estándar de "app completa")

| App | Modelo / precio 2026 | Qué la define | Deuda | Simulación | IA |
|---|---|---|---|---|---|
| **YNAB** | USD 14,99/mes o 109/año, sin tiers; 34 días de prueba; hasta 6 personas | Presupuesto base cero ("cada dólar con trabajo"), metodología + comunidad | Loan planner, calculadora de pago de deudas | Sí (targets, loan planner) | No como asistente |
| **Monarch Money** | Core USD 99,99/año; Plus 199,99/año; una suscripción cubre pareja | El "reemplazo de Mint": patrimonio, inversiones, pareja | Sí (cuentas de crédito agregadas) | Forecasting en desarrollo (2026) | AI Assistant, insights, recap semanal, escaneo de recibos |
| **Copilot Money** | USD 95/año; solo Apple | Diseño premium, categorización con ML | Básico | Limitado | Sí (categorización) |
| **Rocket Money** | Free + Premium USD 6–12/mes (escala libre) | Detecta y cancela suscripciones/cargos recurrentes | Básico | No | Sí (detección) |
| **Quicken Simplifi** | ~USD 48/año | Barato, flujo de caja proyectado | Básico | Proyección de caja | Parcial |
| **PocketGuard** | Plus USD 12,99/mes o 74,99/año; **eliminó el plan free** | "In my pocket" (lo que te queda tras cuentas) | Plan de pago de deudas | Limitado | No |
| **EveryDollar** | Free (manual) + Premium | Base cero de Ramsey; "baby steps" | Snowball | No | No |
| **Goodbudget** | Free + Premium USD 80/año | Sobres digitales, manual | No | No | No |
| **Tiller** | USD 99/año | Hoja de cálculo automatizada | Vía plantillas | Vía plantillas | No |

**Lectura:** el usuario que paga ~USD 100/año espera **sincronización bancaria,
presupuesto por categorías, metas, patrimonio y algún grado de IA**. El concepto
"lo que te queda" de PocketGuard es exactamente el hero de Millo ("Te queda para
gastar") — validación externa de la métrica central, no una amenaza directa (no
operan en Colombia).

Fuentes: [YNAB features](https://www.ynab.com/features) · [YNAB pricing 2026](https://costbench.com/software/personal-finance/ynab/) ·
[Copilot vs Monarch vs WalletHub](https://wallethub.com/edu/b/copilot-vs-monarch-vs-wallethub/148207) ·
[Rocket Money vs Monarch](https://www.getitplanned.com/blog/rocket-money-vs-monarch) ·
[Monarch review 2026](https://walletgrower.com/blog/monarch-money-review-2026) ·
[Monarch Winter Release](https://www.monarch.com/blog/winter-release) · [AI in Monarch](https://help.monarch.com/hc/en-us/articles/37526856682260-AI-in-Monarch) ·
[Mint alternatives 2026 (precios)](https://www.financialaha.com/articles/mint-alternatives-after-shutdown/) ·
[Engadget — best budgeting apps 2026](https://www.engadget.com/apps/best-budgeting-apps-120036303.html)

### 2.2 Reino Unido / Europa (open banking maduro)

| App | Precio 2026 | Qué la define |
|---|---|---|
| **Emma** | Free útil; Plus £4,99/mes | Auditoría de suscripciones; el tracker "más pulido" |
| **Snoop** | Free; Plus £4,99/mes | Busca ofertas más baratas en tus facturas; alerta cuando una sube |
| **Plum** | Free + premium (mejor tasa de ahorro solo en pago) | Mueve dinero a ahorro automáticamente (reglas) |
| **Fintonic (España)** | Free (se financia con ofertas de crédito/seguros) | Agregación + FinScore (score crediticio propio) |

**Lectura:** cuando la agregación es un commodity (open banking), la diferenciación
se mueve a **qué haces con los datos**: cancelar, negociar, ahorrar automáticamente.
Fintonic monetizó con un **score propio + oferta de crédito** — el camino que
`PRODUCT_VISION.md` §6 y `DEC-0009` §4.5.6 prohíben expresamente para Millo (no
vender el Score ni datos a terceros). Es una frontera de identidad, no una falla.

Fuentes: [Which? budgeting apps 2026](https://www.which.co.uk/money/banking/banking-security-and-payment-methods/open-banking-budgeting-and-saving-apps-aLl3e0g9I7Ft) ·
[Snoop vs Emma vs Plum](https://easyearns.com/articles/snoop-vs-emma-vs-plum) ·
[Emma review UK 2026](https://pennywisefinance.co.uk/emma-review-uk.html) ·
[Fintonic — quiénes somos](https://www.fintonic.com/es-ES/quienes-somos/)

### 2.3 Trackers manuales globales (el segmento de Millo hoy, en lo técnico)

| App | Precio 2026 | Qué la define |
|---|---|---|
| **Wallet by BudgetBakers** | USD 29,99/año, 5,99/mes, Lifetime 49,99 | Multi-cuenta, sync bancario opcional, presupuestos, metas; muy citada en Colombia |
| **Spendee** | ~USD 2–4/mes | Wallets compartidas, gráficas limpias |
| **Toshl** | Pro USD 19,99/año; Medici 39,99/año (importación bancaria) | Multi-moneda, humor |
| **Money Manager (Realbyte)** | Pro €4,49 pago único (quita ads) | Doble entrada, manual puro, sin suscripción |
| **Fortune City** | Free + IAP | Gamificación total: tu ciudad crece al registrar gastos (reseñas 2026 reportan crashes) |
| **Monefy** | Free + Pro | Simplicidad extrema de registro |

**Lectura:** el piso del segmento manual es **USD 20–30/año** y todos ofrecen
presupuesto por categoría, metas, gráficas y multi-cuenta. Millo hoy **no** ofrece
presupuesto por categoría, metas de ahorro ni gráficas (ver Blueprint §5–§8), aunque
sí ofrece lo que ninguno de ellos tiene: deuda profunda por modalidad, simulador y
Score explicable.

Fuentes: [BudgetBakers — Premium](https://support.budgetbakers.com/hc/en-us/articles/7151349344018-Everything-about-Premium) ·
[Freenance — expense trackers Europe 2026](https://freenance.io/comparisons/best-expense-tracker-apps-europe-2026/) ·
[Finny — money manager apps 2026](https://getfinny.app/blog/best-money-manager-apps-2026) ·
[Fortune City — Google Play](https://play.google.com/store/apps/details?id=com.fourdesire.fortunecity&hl=en_US) ·
[Gamified finance apps 2026](https://www.expenie.com/alternatives/gamified-finance-apps)

### 2.4 Deuda, IA conversacional y comportamiento (el segmento de Millo, en lo estratégico)

| App | Precio 2026 | Qué la define | Estado |
|---|---|---|---|
| **Cleo** | Free; Plus 5,99; Pro 8,99; Builder 14,99 USD/mes | Chat-first con personalidad ("roast mode"); Debt Reset organiza deudas y prioriza pagos; cash advance; tarjeta constructora de crédito | Activa (EE. UU./UK) |
| **Bright Money** | Free limitado; Premium USD 14/mes (~8/mes anual) | "MoneyScience": 34 algoritmos para plan de pago de tarjetas + transferencias automáticas + crédito | Activa (EE. UU.) |
| **Undebt.it** | Free (web) | 8 métodos de pago (avalancha, bola de nieve…), calendario, fecha libre de deuda | Activa; referencia del nicho |
| **Tally** | — | Consolidaba tarjetas con línea de crédito propia | **Cerró en 2024** |
| **Debt Payoff Planner** y similares | Free + IAP | Calculadoras de payoff | Activas |
| **Qapital** | Suscripción | Reglas de ahorro conductual ("redondeo", "si me salto el café") | Activa |

**Lectura clave para Millo:**
1. Las apps de deuda que **prestan dinero** (Tally, Bright, Cleo advance) viven de
   márgenes de crédito — Millo no es captador ni prestamista (`PRODUCT_VISION.md` §6).
   Su espacio es el de **Undebt.it + Cleo sin el crédito**: plan honesto + acompañamiento.
2. Ninguna de estas apps modela **gota a gota, libranza, compra a cuotas colombiana
   o cuota de manejo**. El catálogo de 11 modalidades de FIN-032/037 no tiene
   equivalente en el mercado revisado — **diferenciador real, no hipotético**.
3. Cleo demuestra que el **chat como interfaz principal** retiene (aunque su tono
   "sarcástico" es lo opuesto a la personalidad §7 de Millo: calmada, adulta).

Fuentes: [Cleo pricing 2026](https://www.fincomparelab.com/guides/cleo-pricing/) · [Cleo review 2026](https://lendedu.com/blog/cleo-app-review/) ·
[Bright Money](https://brightmoneyapp.com/) · [Bright Money review 2026](https://creditbooster.ai/learn/bright-money-review-2026/) ·
[Undebt.it](https://undebt.it/) · [Best debt payoff apps 2026 (InCharge)](https://www.incharge.org/tools-resources/best-debt-payoff-apps/) ·
[Tally cerró — Spendify](https://spendify.money/blog/best-debt-payoff-apps/) · [Qapital — Google Play](https://play.google.com/store/apps/details?id=com.qapital&hl=en_US)

### 2.5 Registro por chat / WhatsApp (el canal donde Millo ya está)

| Producto | Origen | Modelo | Qué hace |
|---|---|---|---|
| **Chanchito** | Chile | Free + Pro | "La más rápida": gastos por WhatsApp, Apple Pay y correo, con IA |
| **Finy** | Argentina | Free + Pro | Voz, foto de recibo, PDF de extracto → transacciones; espacios compartidos; 40+ monedas; **sync con Mercado Pago en AR, BR, MX, CO, CL, PE, UY** |
| **AI Money** | LatAm/ES | Free: 2 registros/día por WhatsApp, audio ≤30 s, 10 imágenes/día | WhatsApp-first |
| **Gastobot** | ES/LatAm | Free/Pro | Gastos e ingresos por WhatsApp, recordatorios |
| **POQT** | Global | Suscripción | Asistente financiero 100 % WhatsApp, sin app |
| **Whispend** | Global | — | Tracker por WhatsApp con IA |
| Bots caseros (GitHub, n8n, Gemini + Sheets) | Comunidad | Gratis | Plantillas reproducibles en una tarde |

**Lectura:** el registro por WhatsApp **dejó de ser diferenciador en 2026**: es una
categoría propia con docenas de entrantes y plantillas gratuitas. Lo que sigue siendo
raro es **WhatsApp + un motor financiero serio detrás** (consecuencias visibles,
deuda real, Score). Millo tiene ese motor; le falta que el canal se sienta tan
inmediato como el de estos productos (audio, foto, "45 almuerzo" sin ceremonia).
**Hipótesis:** los bots ligeros gratis fijarán el precio del "registro por chat" en
cero; Millo debe cobrar por la inteligencia, no por el canal.

Fuentes: [Chanchito](https://www.chanchito.app/blog/app-para-controlar-gastos) · [Finy — Argentina 2026](https://www.finyapp.io/guias/mejor-app-de-gastos-argentina) ·
[AI Money — WhatsApp](https://www.ai-money.app/es/blog/mejor-app-para-controlar-gastos-por-whatsapp/) · [Gastobot](https://www.gastobot.com/) ·
[POQT](https://poqt.cloud/en/blog/whatsapp-expense-tracker-bot) · [Whispend](https://whispend.vercel.app/) ·
[bot-gastos-whatsapp (GitHub)](https://github.com/toba456/bot-gastos-whatsapp) · [n8n template](https://n8n.io/workflows/5201-whatsapp-expense-tracker-with-multi-input-text-image-and-audio/)

### 2.6 América Latina y Colombia

| Producto | País | Precio 2026 | Qué la define |
|---|---|---|---|
| **Mobills** | Brasil → LatAm | Free + Pro ~USD 25/año ⚠️ | "Millones de usuarios"; gestor de tarjetas con control de cupo y pagos; 4,8★ |
| **Organizze** | Brasil | Conectada ~R$35/mes ⚠️ | Interfaz "más limpia y rápida"; 4,6★ |
| **Finy** | Argentina | Free + Pro | IA multimodal + Mercado Pago (incluye Colombia) |
| **Vuallet** | México | — | "Sin conectar tu banco"; ranking propio |
| **MonAI** | Colombia | — | IA, recomendaciones, metas de ahorro (citada por prensa local) |
| **Gestiona Plus** | Colombia | — | Registro manual, "sin claves bancarias"; blog compara |
| **Tyba** | Colombia | Free | Inversión (fondos), aparece en listas de "finanzas personales" |
| **Wallet / YNAB / Monefy** | Global | ver 2.1–2.3 | Las que recomiendan Portafolio, La República, SURA, BBVA |

**Neobancos y billeteras como competencia indirecta (donde vive la plata):**
- **Nu Colombia — Cajitas:** metas de ahorro separadas del saldo, hasta 11,25 % EA
  desde abr-2026, disponibilidad inmediata. **Nubank Brasil** prepara un "AI Private
  Banker" (asistente con recomendaciones de gasto, crédito e inversión) y ya tiene
  "Assistente de Pagamentos" y sugerencias personalizadas en app.
- **Nequi / Daviplata:** billeteras masivas; en 2026 topes de cuentas de bajo monto
  (~COP 11,0 M/mes) y 4x1.000 sobre lo que exceda 65 UVT/mes. Funciones de
  "bolsillos"/metas dentro de la billetera.

**Lectura:** en Colombia el usuario **ya tiene metas de ahorro dentro de su banco**
(Cajitas) y **ya registra gastos por WhatsApp si quiere** (bots). Lo que **nadie** le
da hoy es una lectura honesta de **toda** su deuda (banco + fintech + gota a gota +
cuotas) con un plan y un simulador. Ese es el hueco de Millo; hay que ocuparlo
antes de que Nu lo cierre desde adentro con IA (**amenaza principal, hipótesis**).

Fuentes: [Aplazo — apps México 2026](https://aplazo.mx/blog/comprar-a-plazos/mejores-apps-para-controlar-finanzas-2026) ·
[Control del Dinero — 10 apps](https://controldeldinero.com/mejores-aplicaciones-finanzas-personales/) ·
[Portafolio — 5 apps gratuitas](https://www.portafolio.co/mis-finanzas/ahorro/top-5-apps-gratuitas-para-optimizar-y-medir-tus-finanzas-personales-615067) ·
[La República — apps para finanzas](https://www.larepublica.co/finanzas-personales/conozca-cuales-son-las-aplicaciones-que-pueden-ayudarle-a-administrar-sus-finanzas-4072931) ·
[Gestiona Plus — blog](https://gestionaplus.com.co/blog/mejor-app-de-finanzas-personales-colombia-2026) ·
[Candela — apps Colombia 2026](https://www.candelaestereo.com/curiosidades/adios-a-los-gastos-hormiga-las-mejores-apps-para-controlar-tu-dinero-en-colombia-en-2026/) ·
[Vuallet — México](https://www.vuallet.com/guia/mejores-apps-finanzas-personales-mexico) ·
[Nu Colombia — Cajitas 11,25 %](https://www.elcolombiano.com/negocios/nu-colombia-rentabilidad-cajitas-ahorro-tasas-interes-CN35295575) ·
[Nubank — AI Private Banker](https://finsidersbrasil.com.br/bancos-digitais/nubank-reforca-uso-da-ia-como-camada-estrategica-no-credito/) ·
[Nubank — Assistente de Pagamentos](https://nubank.com.br/nu/conta/assistente-de-pagamentos) ·
[Infobae — Nequi/Daviplata topes 2026](https://www.infobae.com/colombia/2026/01/08/nequi-y-daviplata-tienen-nuevos-topes-y-reglas-en-2026-asi-cobran-ahora-por-el-impuesto-del-4x1000-en-las-transferencias/)

### 2.7 Asia (referencias de patrón)

- **India — Jupiter / Fi Money:** neobancos con "Pots" (metas) que auto-mueven dinero y
  auto-invierten un % de cada pago UPI; **Walnut** (leía SMS bancarios para registrar
  solo) fue adquirida por Paytm y **cerró**. Patrón: el registro automático vía SMS fue
  reemplazado por el banco mismo.
- **Japón — Zaim / Moneytree:** Zaim escanea recibos de supermercado; Moneytree es
  agregador sin publicidad con feed vertical de patrimonio.

**Lectura:** en mercados donde el banco absorbe el registro, sobreviven los que
aportan **una capa de sentido** (recibos, patrimonio, consejo). Mismo mensaje que 2.2.

Fuentes: [Decentro — apps India 2026](https://decentro.tech/blog/best-money-saving-apps/) · [Moneyview — expense trackers India](https://moneyview.in/insights/best-personal-finance-management-apps-in-india) ·
[JP Campus — budgeting apps Japan 2026](https://jpcampus.net/guide/budget-apps)

## 3. Matriz de capacidades (piso del mercado vs. Millo hoy)

Leyenda: ✅ tiene · ◐ parcial · ✗ no · — no aplica. Millo evaluado **contra el código
real** de `frontend/src` y `backend/src` el 2026-09-27 (ver Blueprint §4–§6).

| Capacidad | YNAB | Monarch | Cleo | Wallet | Mobills | Finy | Undebt.it | **Millo** |
|---|---|---|---|---|---|---|---|---|
| Registro manual rápido | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ (wizard 1 decisión/pantalla; sin "atrás" — P0 del sprint) |
| Registro por chat (WhatsApp/Telegram) | ✗ | ✗ | ✅ (propio) | ✗ | ✗ | ✅ | ✗ | ✅ (WA + TG, motor único) |
| Voz / foto de recibo | ✗ | ✅ recibos | ◐ | ◐ | ◐ | ✅ | ✗ | ✗ (`attachmentUrl`/`ocr` existen en el modelo, sin uso) |
| Sync bancario | ✅ | ✅ | ✅ | ◐ | ◐ | ◐ (Mercado Pago) | ✗ | ✗ (open finance CO en despliegue) |
| Presupuesto por categoría (sobres/límites) | ✅ | ✅ | ◐ | ✅ | ✅ | ✅ | — | ✗ (solo "Te queda" global + gastos fijos) |
| "Lo que te queda" (safe-to-spend) | ◐ | ◐ | ✅ | ◐ | ◐ | ◐ | — | ✅ **fuente única §32, por día, hasta fecha** |
| Metas de ahorro | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✗ (solo flag fondo de emergencia) |
| Deudas: catálogo por modalidad | ◐ | ◐ | ◐ | ◐ | ◐ tarjetas | ✗ | ◐ | ✅ **11 modalidades, informal incluido** |
| Estrategia avalancha/bola de nieve | ✅ | ◐ | ✅ | ✗ | ✗ | ✗ | ✅ 8 métodos | ✅ (con diferencia en pesos) |
| Abono a capital real + recibo | ◐ | ✗ | ✗ | ✗ | ✗ | ✗ | ◐ | ✅ |
| Compras a cuotas con tarjeta | ✗ | ✗ | ✗ | ✗ | ✅ | ✗ | ✗ | ✅ |
| Simulador "¿qué pasa si?" | ◐ | ◐ (forecast 2026) | ✗ | ✗ | ✗ | ✗ | ◐ | ✅ **8 escenarios + delta de Score** |
| Score / salud explicable | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✅ (0–1000, 4 pilares, "cómo se calcula") |
| Asistente IA | ✗ | ✅ | ✅ | ✗ | ✗ | ✅ | ✗ | ◐ (plantillas; LLM gateado por DPA+PIA) |
| Detección de recurrentes/suscripciones | ◐ | ✅ | ✅ | ◐ | ◐ | ◐ | — | ✗ (gastos fijos manuales) |
| Historial de movimientos con filtros | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✗ (Inicio muestra 4; "ver detalle" lleva a Registrar) |
| Gráficas | ✅ | ✅ | ◐ | ✅ | ✅ | ✅ | ✅ | ✗ (solo barras de porcentaje) |
| Multiusuario / pareja | ✅ (6) | ✅ | ✗ | ✅ | ◐ | ✅ | ✗ | ✗ |
| Offline-first | ◐ | ✗ | ✗ | ✅ | ✅ | ◐ | — | ◐ (crear sí; editar/anular no) |
| Gamificación sobria | ✗ | ✗ | ◐ | ✗ | ✗ | ✗ | ✗ | ✅ (rachas, XP, retos; sin infantilizar) |
| Recordatorios de cuota configurables | ✅ | ✅ | ✅ | ✅ | ✅ | ◐ | ✅ | ◐ (modelo `Reminder` existe; sin pantalla) |
| Modo oscuro | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✗ |
| Recuperar contraseña / borrar cuenta | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✗ / ✗ |
| Precio | 109 USD/a | 99,99 USD/a | 0–14,99 USD/m | 29,99 USD/a | ~25 USD/a | Free+Pro | Free | Millo+ sin precio (COP 0, "próximamente") |

## 4. Precios: dónde puede pararse Millo+

| Banda | Ejemplos | Qué incluyen |
|---|---|---|
| Gratis total | Undebt.it, Money Manager (ads), bots WhatsApp | Una función bien hecha |
| USD 20–30/año | Wallet, Toshl, Mobills ⚠️ | Tracker manual completo + metas + gráficas |
| USD 48–80/año | Simplifi, PocketGuard, Goodbudget | Agregación básica + presupuesto |
| USD 95–110/año | Copilot, Monarch Core, YNAB | Agregación + metodología/IA + pareja |
| USD 5–15/mes | Cleo, Bright, Emma/Snoop (£4,99) | Chat/IA + productos de crédito o ahorro |

**Hipótesis para `MONETIZATION.md` (no decisión):** Millo+ hoy vende "histórico de
Score + 100 mensajes IA + simulaciones ilimitadas". Frente al mercado, eso es una
oferta de **USD 20–30/año** (≈ COP 8.000–12.000/mes), no de USD 100. Para justificar
más habría que sumar lo que la banda alta vende: metas, presupuesto por categoría,
pareja/hogar, y —cuando exista— agregación. Coherente con `DEC-0009`: el free nunca
gatea Score actual, indicadores ni registro.

## 5. Fortalezas / debilidades / oportunidades / amenazas de Millo (con evidencia)

**Fortalezas (verificadas en código):**
1. **Deuda como ciudadano de primera clase**: 11 modalidades con descriptor, cuotas
   de tarjeta, seguros y cuota de manejo, mora sin culpa, lecturas de profundidad
   (sobrecupo). Nadie del mapa lo hace así.
2. **Una sola verdad por concepto (§32)**: "Te queda", fondo de emergencia,
   desembolso real, orden de ataque — fuentes únicas por construcción. Es una ventaja
   de confianza que las apps de agregación rara vez logran (sus números divergen entre
   pantallas).
3. **Simulador de 8 escenarios con delta de Score** y puente a la acción real.
4. **Score explicable con "cómo se calcula"** y disclaimer honesto.
5. **Canal conversacional con motor único** (WhatsApp + Telegram) y offline-first.
6. **Personalidad**: honesta, calmada, adulta — en un mercado que oscila entre el
   regaño (YNAB) y el sarcasmo (Cleo).

**Debilidades (verificadas en código, detalle en Blueprint):**
1. Sin metas de ahorro, sin presupuesto por categoría, sin historial navegable de
   movimientos, sin gráficas, sin recordatorios configurables desde la app.
2. Fachada de scaffold: 7 pestañas con emojis, sin sistema de iconos, sin
   onboarding, sin modo oscuro, cero accesibilidad, marca "ToCosas" visible.
3. Autenticación mínima: solo correo/contraseña; sin recuperar contraseña, sin
   borrar cuenta, sin consentimiento de datos en el registro (`dataConsentAt` existe
   en BD, no se captura).
4. Monetización sin precio ni tienda; telemetría de producto inexistente
   (`METRICS.md` vacío).
5. Cold start de Render free (BT-005) y sin monitoreo de errores en cliente.

**Oportunidades:**
1. **Colombia sin agregador líder** tras la salida de Fintonic; los rankings locales
   recomiendan apps extranjeras genéricas.
2. **Open finance obligatorio (Decreto 0368/2026)**: en 12–36 meses la agregación
   será posible; quien tenga un motor de deuda listo la aprovechará mejor que quien
   solo agrega.
3. **Gota a gota e informalidad**: ninguna app del mapa le habla al usuario que debe
   a un prestamista; Millo ya lo modela (FIN-032) y el Fundador pidió que sea el
   primero en recibir lectura honesta de costo real (FIN-033→037).
4. **WhatsApp como puerta**: 2026 validó el canal; Millo puede ser "el bot con
   cerebro".

**Amenazas:**
1. **Nu / Nubank con IA dentro del banco** (Cajitas + AI Private Banker): pueden dar
   la lectura de deuda "gratis" para sus clientes. Mitigación: Millo ve **toda** la
   deuda (multi-entidad + informal), el banco solo la suya.
2. **Finy** ya opera en Colombia con IA multimodal y Mercado Pago; **Mobills** con
   escala LatAm.
3. **Bots WhatsApp gratis** fijan el precio del registro en cero.
4. **Regulatorio**: el Score requiere validación legal antes del lanzamiento público
   (`PRODUCCION.md` §2); la IA requiere DPA+PIA.

## 6. Diferenciadores: cuáles sostener y cuáles construir

| Diferenciador | Estado | Acción sugerida (para el CTO) |
|---|---|---|
| Deuda por modalidad + informal | ✅ real, único | Sostener; hacerlo **visible en la fachada** (hoy se descubre solo al entrar al detalle) |
| "Te queda" único + por día | ✅ real | Sostener; es el hero correcto |
| Simulador + delta Score | ✅ real | Sostener; exponerlo desde Inicio |
| Score explicable | ✅ real (gate legal público) | Sostener; agregar visualización (anillo/sparkline) |
| WhatsApp/Telegram con motor | ✅ real | Igualar inmediatez del mercado (audio/foto) — **hipótesis de valor**, validar con Beta |
| Metas de ahorro | ✗ | Piso del mercado; candidata `IDEA` |
| Presupuesto por categoría | ✗ | Piso del mercado; candidata `IDEA` (cuidando §32: un solo "Te queda") |
| Historial de movimientos | ✗ | Piso del mercado; candidata de mantenimiento/FIN pequeña |
| Agregación bancaria | ✗ | Esperar estándares SFC; preparar puerto de importación (PDF/CSV) |
| Pareja/hogar | ✗ | Horizonte 3; requiere modelo nuevo |

## 7. Lo que este documento NO valida (para el CTO, §15)

- Ratings de tiendas (4,8★ Mobills, 4,6★ Organizze) y "millones de usuarios" vienen de
  una sola fuente de terceros (⚠️).
- Precio de Mobills/Organizze en COP no verificado en Play Store Colombia.
- Que Finy sincronice Mercado Pago **en Colombia** viene de su propia página.
- Las cifras de mercado global no son comparables entre sí.
- Que Nu lance IA de asesoría **en Colombia** es inferencia desde Brasil (hipótesis).

## Responsabilidades

- **Fundador:** define qué de aquí se convierte en `IDEA-XXXX` (`lab/LAB.md`).
- **CTO:** valida las afirmaciones (§15) antes de que ninguna sirva de base a una FIN;
  decide entrada al Backlog.
- **Arquitecto:** mantiene la matriz §3 alineada al código real en cada actualización.
