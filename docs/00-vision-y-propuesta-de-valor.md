# 00 · Visión general del producto y propuesta de valor

## 1. Elevator pitch

> **ToCosas** es la app de finanzas personales que convierte WhatsApp en tu contador. Registras un gasto o el pago de una cuota escribiendo un mensaje normal —"Pagué $250.000 a Bancolombia cuota casa"— y ToCosas lo entiende, lo clasifica, lo guarda y te responde. Además centraliza **todas tus deudas**, proyecta tus cuotas e intereses, te recuerda cuándo pagar y te dice **qué deuda conviene atacar primero** para salir de deudas más rápido y pagando menos intereses.

## 2. El problema

Las personas con múltiples deudas (tarjetas de crédito, créditos de libre inversión, hipotecas, "gota a gota", préstamos familiares) enfrentan tres dolores:

1. **Falta de visibilidad consolidada.** No saben cuánto deben en total, a quién, ni cuánto van a pagar de intereses. La información está dispersa en apps de cada banco, correos y su memoria.
2. **Fricción para registrar.** Las apps de finanzas exigen abrir la app, navegar menús y llenar formularios. La mayoría abandona el hábito en semanas. **El registro tiene que ocurrir donde el usuario ya vive: WhatsApp.**
3. **Falta de estrategia.** Aun sabiendo cuánto deben, no saben *cómo* pagar de forma óptima (¿abono a la de mayor tasa o a la de menor saldo?), ni qué recortes tendrían mayor impacto.

## 3. La solución

Una app móvil multiplataforma + un bot de WhatsApp + un backend inteligente que:

- **Consolida** entidades financieras, deudas y transacciones en un solo lugar.
- **Calcula** amortizaciones, proyecciones de intereses y flujo de caja.
- **Captura sin fricción** por WhatsApp (texto y foto de comprobantes con OCR).
- **Recomienda** con un motor de reglas + IA ligera (estrategias *avalanche*/*snowball*, recortes de gasto, alertas de sobregiro).
- **Recuerda** vencimientos por push y por WhatsApp.
- **Protege** los datos con sincronización en la nube, cifrado y modo offline.

## 4. Propuesta de valor diferencial

| Diferenciador | Por qué importa |
|---------------|-----------------|
| **Registro por WhatsApp con lenguaje natural** | Elimina la fricción #1 de las apps de finanzas. El usuario no cambia de hábito; usa la app que ya tiene abierta 20 veces al día. Es nuestro *moat*. |
| **Foco en deudas, no solo en gastos** | La mayoría de apps (Fintonic, Mobills, Wallet) son "trackers de gasto". ToCosas es un **copiloto de salida de deudas** con motor de estrategia. |
| **Sincronización bidireccional app ↔ WhatsApp** | Lo registrado en la app aparece en el chat y viceversa: una sola verdad, dos interfaces. |
| **Inteligencia accionable** | No solo muestra gráficas: dice *qué hacer* ("prioriza la deuda del Banco X", "recorta $50.000 en comidas y adelanta una cuota"). |
| **Funciona offline** | Zonas con mala conexión o usuarios con datos limitados siguen registrando; sincroniza al reconectar. |

## 5. Público objetivo (personas)

| Persona | Perfil | Necesidad principal |
|---------|--------|---------------------|
| **"Camila, la sobreendeudada"** | 32 años, 3 tarjetas + 1 crédito de libre inversión, paga mínimos | Ver el panorama completo y una estrategia para salir de deudas |
| **"Andrés, el informal"** | 28 años, ingresos variables (freelance), sin hábito de registro | Registrar rápido por WhatsApp sin abrir apps |
| **"Doña Marta, la del gota a gota"** | 50 años, presta y le prestan de forma informal | Registrar acreedores/deudores particulares y recordatorios de cobro/pago |
| **"Julián, el ordenado"** | 35 años, quiere optimizar | Simuladores, proyecciones y ver progreso de pago |

## 6. Objetivos de negocio y métricas (North Star)

- **North Star Metric:** *transacciones registradas por usuario activo por semana* (mide el hábito, que es la clave de retención).
- **Métricas secundarias:**
  - % de usuarios que vincularon WhatsApp (activación del diferenciador).
  - Retención D30 / D90.
  - Deuda total gestionada (proxy de valor entregado).
  - % de recordatorios que resultan en un pago registrado.
  - Nº de sugerencias aceptadas / accionadas.

## 7. Modelo de negocio (para contexto de decisiones técnicas)

- **Freemium.** Gratis: registro manual + WhatsApp (límite de mensajes/mes), 1 dispositivo sincronizado, deudas ilimitadas.
- **Premium (suscripción):** OCR de comprobantes, WhatsApp ilimitado, simuladores avanzados, multi-dispositivo, exportación, reportes PDF, recordatorios por WhatsApp.
- *(El modelo de negocio no bloquea el MVP; se documenta para dimensionar límites y feature flags.)*

## 8. Alcance del MVP (una frase)

> Un usuario puede crear su cuenta, registrar sus deudas y entidades, registrar transacciones **desde la app y desde WhatsApp en lenguaje natural**, ver un dashboard con su deuda total y flujo del mes, y recibir recordatorios de pago.

Todo lo demás (OCR, simuladores avanzados, avalanche/snowball visual, multi-dispositivo) es incremental y está priorizado en el [documento 01 (MoSCoW)](01-funcionalidades-moscow.md).
