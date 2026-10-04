# FIN-060 · Millo Profesional (lenguaje de banca privada)

- **Fecha:** 2026-10-03/04 · **Pide:** Fundador ("que sientan que están entrando a una plataforma profesional"). Estudio y bocetos: "Millo Profesional" (https://claude.ai/artifact/U4sZnM7Zm7UXbFMGHyvcbb) y "Todas las pantallas", 93 bocetos (https://claude.ai/artifact/5QXPym75yeXoqx5M6bJLZJ).
- **Decisiones del Fundador:** "me encanta esa nueva estructura visual", logo **B**, ver todas las pantallas, y luego **"Perfecto. Arranca con todo."**
- **Ejecuta:** Arquitecto (base, recorrido, logo e integración) + 7 agentes en paralelo (uno por grupo de pantallas, archivos sin cruce).

## 1. Qué cambia (sin mover la organización de ninguna pantalla)
| Pieza | Implementado | Cómo llega |
| --- | --- | --- |
| Paleta "Banca Privada" | `theme/colors.ts`: esmeralda #0B6E4F, neutros marfil (#F7F5F0 / #EFECE4 / #E2DDD2), dorado #C9A24A para metas/logros/Millo+, azul #2B5C8A para deudas y pareja (antes morado y rosado), rojo solo para alertas reales. `chartColors`. | OTA |
| Letra Inter y cifras alineadas | `@expo-google-fonts/inter` (JS + archivos; `expo-font` ya está en la APK, BT-041). `components/AppText.tsx` reemplaza `Text`/`TextInput` en toda la app: elige la familia según el peso (800→Bold, 700→SemiBold), cifras tabulares siempre, herencia correcta en textos anidados. `App.tsx` carga las fuentes (respaldo a la del sistema a los 2,5 s). | OTA |
| Componentes | `ui.tsx`: `Money` (dígitos alineados, $ pequeño gris, signo menos real), `PaceBar` (avance con marca de "hoy"), `Pill`, etiquetas de formulario en mayúscula, botón `dangerOutline`, radios 14. | OTA |
| Pantallas | Las 30 pantallas y sus estados siguen los bocetos aprobados. Destacados: "Te queda" con **barra de ritmo** (ya salió vs. día del ciclo) y diferencia con signo; Salud con escala de un solo verde, marcador dorado y "te faltan X puntos para…" (umbrales 400/600/750/900 = `scoreBand()` del servidor); gastos normales en texto oscuro (no rojo); cero emojis en la interfaz. | OTA |
| Botón central ✓ | `store/registerForm.store.ts` + `RegisterTabButton` en `MainTabs`: en Registrar el + se vuelve ✓ gris (falta información; al tocar dice qué falta) o verde con "Registrar" (guarda). `tabBarHideOnKeyboard`; el botón del formulario queda sobre el teclado como respaldo. | OTA |
| Recorrido de bienvenida | `components/tour/TourOverlay.tsx` + `store/tour.store.ts`: 5 pasos sobre la barra real (Inicio, +, Deudas, Salud, Más), "Saltar", contador; sin SVG (cuatro rectángulos). Se muestra una vez por persona y dispositivo; **Ajustes → "Ver el recorrido otra vez"**. | OTA |
| Primeros pasos | `components/FirstSteps.tsx` en Inicio: 8 pasos que se marcan solos con datos reales (gasto, ingreso, deuda o "No tengo deudas", presupuesto, Telegram, Copiloto, pareja opcional); "Ocultar"; desaparece al completar. | OTA |
| Logo B | `assets/icon.png`; Android adaptativo con **fondo degradado** (`adaptive-background.png`, antes plano) y versión **monocromática** (Android 13+); íconos de la web (192/512/180). | APK (el ícono de Android) · web al publicar |

## 2. No implementado (y por qué)
- **Botón "Saldar" en pareja:** el servidor no registra cuadres; queda como texto destacado.
- **Línea de evolución del puntaje:** sin SVG se dibuja con barras.
- **Modo oscuro:** fase siguiente (los tokens ya están centralizados).

## 3. Verificación
- `tsc` limpio; export Android y web sin errores; preflight OTA en verde (salvo `/health`, bloqueado por el proxy del entorno).
- Recorrido real en la web contra un servidor local con datos de ejemplo: ingreso, recorrido de 5 pasos, Inicio con Primeros pasos y barra de ritmo, Mis deudas, detalle de crédito, Registrar (✓ gris → verde), Salud, Más, Ajustes y Millo en pareja.
- Pendiente en dispositivo: OTA desde el PC del Fundador y, para el ícono de Android, la próxima APK.
