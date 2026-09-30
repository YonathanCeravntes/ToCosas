# FIN-054 · Mis documentos: facturas, extractos, certificados y borrador de renta

- **Fecha:** 2026-09-30 · **Estado:** Fase 1 implementada (clasificación, bóveda, pantalla opción 1, permiso). Pendiente: claves de R2 en Render, revisión de abogado; siguientes fases: informes y borrador de renta.
- **Pedido del Fundador:** "Que la app vaya creando un backup de toda la información del usuario (extractos, facturas…) y que, cuando tenga que declarar renta, le presente la declaración; si no tiene que declarar, un informe. Informes trimestrales, semestrales y anuales. La factura queda guardada y se puede descargar."

## 1. Decisiones del Fundador (2026-09-30)
1. **Borrador, no presentación:** Millo deja la renta *lista* (borrador + soportes) para que la persona la presente o se la pase a su contador. Millo no radica ante la DIAN.
2. **Separar conceptos:** extracto ≠ factura. La IA identifica qué es cada documento que llega por Telegram (y WhatsApp a futuro) y lo manda a su lugar.
3. **Base de facturación dentro de la plataforma**, amigable: quien entra entiende lo que ve.
4. **Privacidad investigada y presentada al usuario** antes de guardar documentos.
5. **Archivos en Cloudflare R2** (10 GB gratis, descargas sin costo, cifrado).
6. **Factura electrónica → se guarda siempre y se propone el gasto** ("¿lo registro?"); si el gasto ya existe, solo se enlaza (no se cuenta doble).
7. **Orden:** primero bocetos de "Mis documentos" y privacidad; en paralelo, la clasificación de documentos en el bot.

## 2. Qué es cada documento y a dónde va
| Tipo | Señales que usa la IA | Destino |
|---|---|---|
| `extracto_tarjeta` / `extracto_credito` | saldo, cupo, cuota, tasa, "páguese antes del" | **Deudas** (crear/actualizar, como FIN-042) + se archiva en Extractos |
| `extracto_cuenta` (ahorros/corriente) | saldo inicial/final, movimientos del periodo | **Extractos** (patrimonio y consignaciones para la renta) |
| `factura_electronica` | NIT del vendedor, número, **CUFE**, IVA, total, medio de pago | **Base de facturas** + propuesta de gasto |
| `comprobante` (sin factura electrónica) | total y comercio, sin CUFE | **Gastos** (propuesta, como hoy) + se archiva |
| `certificado` (ingresos y retenciones 220, bancario, intereses de vivienda, medicina prepagada, AFC/pensión voluntaria) | título del certificado, año gravable, NIT | **Certificados** (insumo directo del borrador de renta) |
| `desconocido` | — | Se pregunta qué es |

Reglas de extracción que se mantienen (FIN-042 §6): nunca se transcriben cédulas, números de cuenta o tarjeta, direcciones ni nombres de personas. Del **vendedor** sí se guardan razón social y NIT (son datos de empresa, necesarios para la renta).

## 3. Datos de una factura
`comercio`, `nitVendedor`, `numero`, `cufe`, `fecha`, `subtotal`, `iva`, `total`, `medioDePago` (tarjeta / transferencia / efectivo / desconocido), `categoria`, `esSalud` (farmacia, EPS, prepagada → dato sensible), `transaccionId` (enlace al gasto), `archivo` (R2).

**Deducción del 1% (Ley 2277 de 2022, art. 7):** 1% del valor de compras con factura electrónica **pagadas con medio electrónico** de entidad vigilada por la Superfinanciera, hasta 240 UVT de deducción al año. Es un valor que se **resta de la base** del impuesto; el ahorro real = deducción × tarifa marginal. La app lo dice así (no "te ahorras X").

## 4. Pantalla "Mis documentos" (bocetos en el lienzo de diseño)
- **1 · Tu año para la renta:** tarjeta con facturas del año, barra electrónico/efectivo, deducción del 1%; pestañas Facturas/Extractos/Certificados; lista por mes; "Descargar todo (.zip)".
- **2 · Carpetas + lo que te falta:** tres carpetas con conteo; checklist de certificados para la renta; lo último que mandaste.
- **3 · Línea de tiempo:** filtros en chips; resumen compacto (deducción y "vas en X% del tope para declarar"); todo en orden cronológico.

## 5. Informes y renta (fases siguientes)
- **Informes** trimestral / semestral / anual en PDF: ingresos, gastos por categoría, deudas (cómo bajaron), patrimonio, con la lista de soportes.
- **"¿Debes declarar?"** durante el año contra los topes (año gravable 2025: patrimonio bruto > 4.500 UVT; ingresos, consumos con tarjeta, compras o consignaciones ≥ 1.400 UVT; UVT 2025 = $49.799).
- **Borrador de renta:** formulario 210 (cédula general) prellenado + resumen para el contador; si no debe declarar, el informe anual como respaldo. La información exógena de la DIAN es orientativa: el borrador la contrasta con los soportes.

## 6. Privacidad (investigación, 2026-09-30) — requiere revisión de abogado
| Norma | Qué exige | Cómo lo cumple Millo |
|---|---|---|
| **Ley 1581 de 2012 y Decreto 1377 de 2013** (hoy Decreto 1074 de 2015) | Autorización previa, expresa e informada; finalidad; derechos (conocer, actualizar, rectificar, suprimir, revocar); política de tratamiento; aviso de privacidad | **Permiso específico** antes de guardar el primer documento (texto abajo); política completa en la app y la web; borrar documento o todo; exportar |
| **Datos sensibles** (art. 5–6 Ley 1581) | No se puede obligar a autorizarlos; autorización explícita | Facturas de salud (farmacia, EPS, prepagada) se marcan `esSalud`; se pueden excluir, ocultar o borrar aparte |
| **Circular Externa 002 de 2024 SIC** (IA y datos personales) | Idoneidad, necesidad, razonabilidad y proporcionalidad; abstenerse ante duda de daño; datos veraces y verificables | La IA solo extrae lo necesario (sin cédulas ni cuentas); se informa que un servicio de IA lee el documento; el usuario confirma lo extraído |
| **Transferencia internacional** (art. 26 Ley 1581; **Circular 005 de 2017 SIC**) | Solo a países con nivel adecuado | EE. UU. está declarado adecuado; Anthropic (IA) y Cloudflare R2 (archivos) actúan como **encargados** → contrato de transmisión (DPA). **Pendiente el DPA con Anthropic** (gate FIN-010) |
| **RNBD** (Decreto 090 de 2018) | Registro solo para sociedades con activos > 100.000 UVT | Hoy no aplica; política escrita desde ya |
| **Conservación** (art. 632 ET; art. 46 Ley 962 de 2005) | Soportes hasta la firmeza de la declaración (3 años general, 5 con pérdidas) | Se guardan **5 años** por defecto o hasta que el usuario los borre |
| **Seguridad** | Medidas técnicas y administrativas | Archivos cifrados en R2 (bucket privado), descarga solo con enlace firmado de corta duración, nada en logs, borrado real al suprimir |

### Texto del permiso (antes del primer documento)
> **Millo va a guardar tus documentos**
> Guardamos tus facturas, extractos y certificados **cifrados**, para armar tus informes y el borrador de tu renta. Un servicio de inteligencia artificial los lee para sacar los datos; no guardamos tu cédula ni tus números de cuenta. Se almacenan en servidores de Estados Unidos (país con protección adecuada según la SIC). Los conservamos **5 años** o hasta que los borres. Las facturas de salud son datos sensibles: puedes no autorizarlas. Puedes descargar o borrar todo cuando quieras.
> **[Acepto] · [Ver la política completa] · [Ahora no]**

### Política completa (estructura)
Responsable y contacto · datos que se tratan (identificación, financieros, documentos, datos sensibles de salud) · finalidades · encargados y transferencia internacional (Anthropic, Cloudflare, Render, Neon) · conservación · derechos y cómo ejercerlos (en la app y por correo) · seguridad · menores (no se permiten) · cambios a la política · vigencia.

## 7. Almacenamiento (Cloudflare R2) — pasos del Fundador
1. Crear cuenta en Cloudflare → **R2** → activar el plan gratis.
2. Crear un bucket privado `millo-documentos`.
3. **Manage R2 API Tokens** → token con permiso *Object Read & Write* solo para ese bucket.
4. En Render (`milla-backend` → Environment): `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET=millo-documentos`.
Sin estas variables, Millo guarda los **datos** de cada documento pero no el archivo, y lo dice.

## 8. Implementado (2026-09-30) — Fase 1
- **Bóveda** (`modules/documents/`): tabla `documents` (migración `20260930120000_fin054_documents`), permisos `docs_storage_consent_at` y `docs_health_consent` (opt-in). Un CUFE se guarda una sola vez por usuario.
- **Archivos en R2** (`storage.service.ts`): bucket privado, descarga con enlace firmado de 5 min; sin las variables `R2_*` se guardan solo los datos (la app y el bot lo dicen). Borrar un documento, revocar con "borrar todo" o la purga de la cuenta borran también el archivo.
- **API:** `GET/POST /documents/consent`, `POST /documents/consent/revoke`, `GET /documents/summary?year`, `GET /documents?year&kind`, `GET /documents/:id/download`, `DELETE /documents/:id`, `POST /documents/export-link` → `GET /documents/export/:token` (.zip con archivos + `resumen-AAAA.csv`, enlace firmado de 5 min).
- **Bot:** la IA clasifica 7 tipos (`extracto_tarjeta`, `extracto_credito`, `extracto_cuenta`, `factura_electronica`, `comprobante`, `certificado`, `desconocido`) y lee NIT del vendedor, número, CUFE, IVA, medio de pago, salud, tipo y año de certificado. Extractos de tarjeta/crédito → deuda (como FIN-042); extracto de cuenta y certificado → solo se archivan y se explica para qué sirven; factura/comprobante → se archiva y se propone el gasto, o se **enlaza** si ya estaba registrado. Comandos: *guardar documentos* (aviso de privacidad), *acepto guardar* [*con salud*], *incluir salud*, *no guardar documentos*.
- **App:** Más → **Mis documentos** (opción 1): año, permiso, tarjeta del año con la deducción del 1% (resta de la base), pestañas, lista por mes con etiqueta "Cuenta para tu renta / Efectivo: no cuenta / Sin factura electrónica", descargar y borrar, descargar todo (.zip), privacidad (salud, dejar de guardar, borrar todo).
- **Portabilidad:** la exportación de datos (`/auth/me/export`) incluye los documentos.
- **Verificación:** unit 446/446, e2e 124/124 (nuevo `fin054-documentos`; 5 casos nuevos del bot en `document-flow.spec`). Web revisada con Playwright. **R2 activo (2026-09-30):** bucket privado `millo-documentos` creado; `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID` y `R2_SECRET_ACCESS_KEY` en Render (servicio live). Prueba directa con esas credenciales: escribir, leer y borrar un objeto en el bucket, OK. Pendiente: rotar el token (sus claves pasaron por el chat) y la prueba de punta a punta con una factura real por el bot.

## Fuentes
- Topes 2026: https://www.portafolio.co/economia/impuestos/declaracion-de-renta-en-2026-asi-quedaron-los-topes-tras-el-aumento-de-la-uvt-que-anuncio-el-gobierno-484974
- ABC deducciones con factura electrónica (DIAN): https://www.dian.gov.co/impuestos/factura-electronica/Documents/Abece-Deducciones-FE.pdf
- Exógena 2026 (INCP): https://incp.org.co/publicaciones/infoincp-publicaciones/impuestos/2026/07/dian-habilito-informacion-exogena-para-la-declaracion-de-renta-de-personas-naturales-3/
- Conservación de soportes: https://actualicese.com/archivo/por-cuanto-tiempo-se-tienen-que-conservar-los-soportes-de-las-declaraciones-tributarias/
- Circular 002 de 2024 SIC (IA): https://sedeelectronica.sic.gov.co/transparencia/normativa/circular-externa-2-de-2024-de-la-superintendencia-de-industria-y-comercio-lineamientos-sobre-el-tratamiento-de-datos
- Circular 005 de 2017 SIC (transferencias): https://www.sic.gov.co/boletin-juridico-octubre-2017/transferencia-Internacional-de-datos-personales
- RNBD (Decreto 090 de 2018): https://www.sic.gov.co/registro-nacional-de-bases-de-datos
- Competencia: PliP (https://www.larepublica.co/finanzas/carvajal-digital-lanzo-una-aplicacion-para-el-manejo-financiero-4200221), Tributi (https://www.tributi.com/planes)
