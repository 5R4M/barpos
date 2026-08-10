---
name: BarPOS — La Taberna
description: Sistema de punto de venta para bar y restaurante, operado a dedo en un local a media luz.
colors:
  accent-azul: "oklch(62.3% 0.188 260)"
  accent-azul-profundo: "oklch(54.6% 0.215 263)"
  accent-azul-tenue: "oklch(93.8% 0.028 256)"
  verde-cobro: "oklch(72.3% 0.192 150)"
  verde-cobro-profundo: "oklch(62.7% 0.170 149)"
  rojo-ocupada: "oklch(63.7% 0.208 25)"
  rojo-ocupada-profundo: "oklch(57.7% 0.215 27)"
  navy-panel: "oklch(31.8% 0.089 262)"
  tinta: "oklch(27.9% 0.037 260)"
  gris-pizarra: "oklch(55.4% 0.041 257)"
  blanco-azulado: "oklch(99.4% 0.002 258)"
  superficie-elevada: "oklch(97.7% 0.005 256)"
  fondo-azulado: "oklch(96.8% 0.014 254)"
  linea: "oklch(92.5% 0.008 258)"
  linea-marcada: "oklch(86.8% 0.014 256)"
typography:
  display:
    fontFamily: "Segoe UI Variable Text, Segoe UI, Inter, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.5px"
  headline:
    fontFamily: "Segoe UI Variable Text, Segoe UI, Inter, system-ui, sans-serif"
    fontSize: "19px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.3px"
  title:
    fontFamily: "Segoe UI Variable Text, Segoe UI, Inter, system-ui, sans-serif"
    fontSize: "14.5px"
    fontWeight: 650
    lineHeight: 1.35
    letterSpacing: "-0.1px"
  body:
    fontFamily: "Segoe UI Variable Text, Segoe UI, Inter, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Segoe UI Variable Text, Segoe UI, Inter, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.6px"
  data:
    fontFamily: "Segoe UI Variable Text, Segoe UI, Inter, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.5px"
    fontFeature: "tabular-nums"
rounded:
  sm: "8px"
  md: "9px"
  lg: "12px"
  xl: "14px"
  pill: "20px"
  full: "50%"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "22px"
  2xl: "28px"
components:
  button-primary:
    backgroundColor: "{colors.accent-azul}"
    textColor: "{colors.blanco-azulado}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.accent-azul-profundo}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.tinta}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
    height: "40px"
  button-outline-hover:
    backgroundColor: "{colors.accent-azul-tenue}"
    textColor: "{colors.accent-azul-profundo}"
  button-ghost-danger:
    backgroundColor: "transparent"
    textColor: "{colors.rojo-ocupada-profundo}"
    rounded: "{rounded.sm}"
    padding: "5px 11px"
    height: "32px"
  button-cobrar:
    backgroundColor: "{colors.verde-cobro}"
    textColor: "{colors.blanco-azulado}"
    rounded: "{rounded.md}"
    padding: "15px"
    height: "52px"
    width: "100%"
  card-mesa:
    backgroundColor: "{colors.blanco-azulado}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.xl}"
    padding: "14px 14px 12px"
    height: "152px"
  card-mesa-hover:
    backgroundColor: "{colors.superficie-elevada}"
  card-producto:
    backgroundColor: "{colors.blanco-azulado}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.lg}"
    padding: "13px 13px 12px"
    height: "82px"
  input-field:
    backgroundColor: "{colors.blanco-azulado}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.md}"
    padding: "9px 12px"
    height: "42px"
  chip-categoria:
    backgroundColor: "{colors.blanco-azulado}"
    textColor: "{colors.gris-pizarra}"
    rounded: "{rounded.pill}"
    padding: "6px 16px"
    height: "40px"
  chip-categoria-active:
    backgroundColor: "{colors.accent-azul}"
    textColor: "{colors.blanco-azulado}"
  nav-item:
    backgroundColor: "transparent"
    textColor: "rgba(255,255,255,0.62)"
    rounded: "{rounded.md}"
    padding: "11px 14px"
  nav-item-active:
    backgroundColor: "rgba(59,130,246,0.22)"
    textColor: "{colors.blanco-azulado}"
  qty-button:
    backgroundColor: "{colors.blanco-azulado}"
    textColor: "{colors.gris-pizarra}"
    rounded: "{rounded.full}"
    size: "42px"
---

# Design System: BarPOS — La Taberna

## 1. Overview

**Creative North Star: "El Turno de Noche"**

El sistema está calibrado para un local a media luz a las nueve de la noche. Nada deslumbra: no hay blanco puro en ninguna superficie, no hay negro puro en ningún texto. Todo neutro lleva un matiz del azul de marca (hue 258), de modo que la pantalla se lee como un objeto de un solo material y no como una hoja de papel de oficina pegada en una pared oscura. Los números —totales, cantidades, minutos transcurridos— llevan cifras tabulares y peso suficiente para leerse a un brazo de distancia, porque el mesero mira la tablet de reojo mientras camina.

La densidad es de herramienta, no de escaparate. Las mesas caben en una grilla de un vistazo, las tablas de administración corren largas sin aire desperdiciado, y el panel de la orden es una lista plana de filas, no una pila de tarjetas. La jerarquía se construye con escala y peso tipográfico, no con color: el color trabaja poco y por eso significa algo cuando aparece.

El sistema rechaza explícitamente lo que PRODUCT.md nombra como anti-referentes: el POS viejo tipo Windows XP (relieve 3D, degradados grises, iconos pixelados), la landing de SaaS genérica (glassmorphism, degradados morados, la métrica gigante con etiqueta chica), la app de delivery colorida (emojis como iconos, saturación repartida, rebotes) y el dashboard sobrecargado.

**Key Characteristics:**
- Paleta en OKLCH, sin `#fff` ni `#000` en ningún lado
- Un solo acento azul; verde y rojo son semánticos, jamás decorativos
- Superficies planas separadas por tono y borde de 1px, no por sombra
- Objetivos táctiles de 44px como piso; el hover nunca es el único camino
- Iconografía SVG de trazo, 24×24, `currentColor`, un solo set en toda la app
- Movimiento por debajo de 250ms, con curvas propias, y solo cuando comunica estado

## 2. Colors

Azul de marca frío como única voz de acción, verde y rojo estrictamente semánticos, y una escala de neutros que nunca es neutra del todo: todos llevan un matiz del mismo azul.

### Primary
- **Azul Acción**: el único color de acción de la app. Botones primarios, selección activa, foco de teclado, chevrons de `select`, el estado "libre" al pasar el puntero. Reservado a lo que el usuario puede tocar para que algo pase.
- **Azul Profundo**: el `:hover` del anterior y el color del texto sobre fondos azul tenue. Nunca aparece solo.
- **Azul Tenue**: relleno de estados sugeridos, no confirmados. Hover de botones de contorno, contador de la pestaña activa, tinte del tile de una mesa libre bajo el puntero.

### Secondary
- **Verde Cobro**: dinero que ya entró. Botón COBRAR, totales recaudados, badge de disponible. Nunca se usa como color de marca ni de acento decorativo.
- **Verde Cobro Profundo**: texto y cifras sobre superficies verde tenue; el `:hover` del botón COBRAR.

### Tertiary
- **Rojo Ocupada**: estado ocupado y acción destructiva. Punto de estado de la mesa, botón Liberar, badge del icono de confirmación al eliminar.
- **Rojo Ocupada Profundo**: el texto rojo real. El rojo claro solo pinta puntos y bordes; cuando hay letra, sube a esta versión para pasar 4.5:1.

### Neutral
- **Navy Panel**: fondo de la barra lateral. Segunda capa de neutro, más oscura y más fría que el contenido, que separa navegación de trabajo sin necesidad de una línea divisoria.
- **Tinta**: color de todo texto principal. Es azul muy oscuro, no negro.
- **Gris Pizarra**: texto secundario, etiquetas, metadatos, iconos en reposo. El piso de contraste accesible sobre superficies claras.
- **Blanco Azulado**: superficie de tarjetas, tablas, modales, barra superior. El "blanco" del sistema.
- **Superficie Elevada**: un escalón por debajo del blanco. Cabeceras de tabla, fondo del filtro segmentado, hover de fila y de tarjeta.
- **Fondo Azulado**: el lienzo detrás de todo. Es más oscuro que las tarjetas, y ese salto tonal es lo que hace visible una tarjeta sin sombra.
- **Línea** y **Línea Marcada**: bordes de 1px. La primera divide dentro de un componente; la segunda encierra controles que se pueden tocar (campos, botones de contorno, pastillas).

### Named Rules

**La Regla del Matiz.** Ningún neutro es neutro. Todo gris, blanco o casi-negro lleva croma entre 0.002 y 0.041 en hue 255-262. `#ffffff`, `#000000` y cualquier gris puro están prohibidos.

**La Regla de la Voz Única.** El azul es el único acento. Verde significa cobrado, rojo significa ocupado o destructivo. Un cuarto color en la interfaz es un error, no una decisión: el índigo del botón "Ver Corte" ya fue eliminado por esta regla.

**La Regla del Color Acompañado.** El color nunca porta el significado solo. Libre/Ocupada lleva punto de color *y* palabra. Los badges de estado llevan fondo, borde y texto.

## 3. Typography

**Familia única:** Segoe UI Variable Text, con `Segoe UI`, `Inter`, `system-ui` como respaldo.
**Sin fuente de display separada.** Un solo tipo carga títulos, botones, etiquetas, datos y cuerpo.

**Character:** La tipografía nativa de Windows, que es donde vive esta app. No pide descarga, no parpadea al cargar, y a 14px en una tablet se lee mejor que cualquier fuente web. La personalidad viene del peso y del espaciado, no de la elección de familia.

### Hierarchy
- **Display** (800, 28px, 1.2, `-0.5px`): solo el nombre "La Taberna" en el login. No aparece dentro de la app.
- **Headline** (700, 19px, 1.2, `-0.3px`): título de sección en la barra superior. Uno por pantalla, siempre acompañado de un subtítulo de 12.5px con el conteo real.
- **Title** (650, 14.5px, 1.35): nombre de mesa, nombre de producto, encabezado de modal. El escalón que el ojo busca dentro de una tarjeta.
- **Body** (400, 14px, 1.5): texto corrido y contenido de tablas. En prosa, tope de 65-75ch; las tablas de datos pueden correr más anchas.
- **Label** (700, 11px, `0.6px`, mayúsculas): cabeceras de tabla, estado de la mesa, etiquetas de filtro. La versalita es lo que convierte una palabra en metadato.
- **Data** (700, 22-26px, 1, `-0.5px`, `tabular-nums`): total de la orden, total recaudado, órdenes cobradas.

### Named Rules

**La Regla de la Cifra Tabular.** Todo número que cambie en el tiempo o se alinee en columna lleva `font-variant-numeric: tabular-nums`: totales, cantidades, contadores de pestaña, minutos transcurridos, horas. Sin esto los números bailan al actualizarse y el ojo pierde la columna.

**La Regla del Peso Antes que el Color.** Para destacar algo, primero se sube el peso o la escala. El color es el último recurso y está reservado a lo semántico.

## 4. Elevation

**Capas tonales, no sombras.** La profundidad se construye con cuatro escalones de superficie —Fondo Azulado, Blanco Azulado, Superficie Elevada, Navy Panel— y bordes de 1px. Una tarjeta se ve como tarjeta porque es más clara que el lienzo y tiene un borde, no porque proyecte sombra. En reposo, y también en hover, la app entera es plana.

La única excepción son los elementos que flotan sobre el contenido y necesitan despegarse de él: el modal, el toast y la tarjeta de login. Ahí sí hay una sombra, una sola, muy difusa y muy desplazada.

### Shadow Vocabulary
- **Flotante** (`box-shadow: 0 20px 45px -18px oklch(27.9% .037 260 / .35)`): exclusiva de modales, toasts y la tarjeta de login. No se usa en tarjetas, tablas, botones ni paneles.
- **Anillo de foco** (`box-shadow: 0 0 0 3px oklch(62.3% .188 260 / .18)`): no es elevación, es estado. Acompaña al borde azul en campos con foco.

### Named Rules

**La Regla de lo Plano.** Si un elemento vive dentro del flujo de la página, no lleva sombra. Nunca. Si necesita destacarse, se cambia el tono de su superficie o el peso de su borde.

**La Regla del Hover Tonal.** El hover no levanta ni proyecta: tiñe. Tarjeta de mesa a Superficie Elevada, tarjeta de producto a Azul Tenue, fila de tabla a Superficie Elevada. El único desplazamiento permitido es la escala al presionar.

**Test de anti-patrón:** si al quitar todas las sombras la jerarquía se cae, el problema es que los tonos de superficie están mal escalonados, no que falten sombras.

## 5. Components

Carácter general: **táctil y sobrio**. Objetivos grandes, respuesta inmediata al toque, cero adorno.

### Buttons
- **Shape:** esquinas suaves (8px), altura mínima 40px, iconos SVG a la izquierda del texto con 6px de separación.
- **Primary:** relleno Azul Acción, texto Blanco Azulado, `8px 16px`. Para la acción principal de la pantalla, una por vista.
- **Outline:** transparente con borde Línea Marcada y texto Tinta; en hover pasa a fondo Azul Tenue con texto Azul Profundo. Es el botón por defecto de barras de herramientas.
- **Ghost danger:** transparente con borde rojo pálido y texto Rojo Profundo, 32px de alto. Para eliminar en filas de tabla: presente pero nunca gritón.
- **Cobrar:** el botón más grande del sistema (52px, ancho completo, verde). Es la única pieza donde el color ocupa una superficie grande, y está justificado porque es el final del flujo.
- **Estados:** `:hover` cambia fondo o borde; `:active` aplica `scale(0.97)`; `:disabled` baja a Línea Marcada con texto Gris Pizarra y anula el transform.

### Chips
- **Style:** pastilla de 20px de radio, borde de 1px, fondo Blanco Azulado, texto Gris Pizarra.
- **State:** la activa se rellena de Azul Acción con texto blanco. Los tipos de producto (bebida, boquita, comida) tienen su propio relleno al activarse.
- **Sub-nivel:** las categorías concretas usan una pastilla más chica (34px de alto, 11.5px) sobre Superficie Elevada, para que se lea como un escalón por debajo de los tipos.

### Cards / Containers
- **Corner Style:** 14px las tarjetas de mesa, 12px producto, tablas y tarjetas de historial.
- **Background:** Blanco Azulado sobre lienzo Fondo Azulado. Las mesas ocupadas llevan un tinte rojo casi imperceptible.
- **Shadow Strategy:** ninguna. Ver Elevación.
- **Border:** 1px Línea; en hover sube a Línea Marcada.
- **Internal Padding:** 14px en tarjetas de mesa, 13px en producto, 11×16px en celdas de tabla.

### Inputs / Fields
- **Style:** borde de 1px Línea Marcada, radio 9px, altura mínima 42px (40px en la barra de fechas), fondo Blanco Azulado.
- **Focus:** borde Azul Acción más anillo de foco de 3px al 18%.
- **Selects:** `appearance: none` con chevron SVG propio embebido como `data:` URI y 34px de padding derecho. Requiere `img-src 'self' data:` en el CSP.
- **Placeholder:** un tono por encima de Gris Pizarra, nunca del mismo peso que el valor real.

### Navigation
- **Style:** barra lateral fija de 220px sobre Navy Panel. Los ítems son pastillas de 10px de radio con margen lateral de 10px, no filas a sangre completa.
- **Estados:** reposo con texto al 62% de blanco; hover sube el texto a blanco puro con un velo al 7%; activo lleva relleno azul al 22%, borde azul claro al 28% y peso 600.
- **Árbol de administración:** los hijos se revelan con `max-height` y el chevron rota 90°. La sangría es de 14px, sin línea guía vertical.

### Card de Mesa (componente firma)
La pieza central de la app. Estructura fija de tres bloques: arriba el tile con el número o inicial más el estado (punto + palabra en versalita); en medio el nombre y la capacidad con icono; abajo, tras un divisor de 1px, el pie. El pie cambia según el estado: una mesa ocupada muestra el tiempo transcurrido desde que se abrió la orden más el botón Liberar; una mesa libre muestra "Abrir orden →", cuya flecha se desplaza 2px al pasar el puntero. El tiempo se recalcula cada 60 segundos mientras la vista está visible.

## 6. Do's and Don'ts

### Do:
- **Do** usar OKLCH para todo color nuevo, con croma bajo cuando la luminosidad se acerca a los extremos.
- **Do** tintar cada neutro hacia hue 255-262, aunque sea con croma 0.002.
- **Do** dar `:active { transform: scale(0.97) }` a todo lo que se pueda presionar. Un control sin respuesta al toque se siente roto en una pantalla táctil.
- **Do** encerrar todo hover que mueva o levante en `@media (hover: hover) and (pointer: fine)`. La tablet dispara hover al tocar.
- **Do** mantener las transiciones por debajo de 250ms y usar `--ease-out: cubic-bezier(.23, 1, .32, 1)` para entradas y feedback.
- **Do** declarar las propiedades exactas en cada `transition`.
- **Do** acompañar todo estado de color con texto: punto verde *y* la palabra "Libre".
- **Do** usar SVG de trazo 24×24 con `currentColor` para cualquier icono nuevo, tomado del set de `ICON_PATHS` en `renderer.js`.
- **Do** aplicar `tabular-nums` a todo número que se actualice o se alinee.
- **Do** mantener 44×44px de área táctil en cualquier control que se use durante el servicio.

### Don't:
- **Don't** usar `border-left` o `border-right` mayor a 1px como franja de color en tarjetas, filas o alertas. Se eliminó de las cards de mesa, de la navegación y de las tarjetas de estadística; no vuelve.
- **Don't** poner sombra en nada que viva dentro del flujo de la página. Solo modal, toast y login.
- **Don't** escribir `#ffffff`, `#000000` ni ningún gris sin matiz.
- **Don't** introducir un cuarto color. Azul es acción, verde es cobrado, rojo es ocupado o destructivo. Nada más.
- **Don't** usar `transition: all`.
- **Don't** animar desde `scale(0)`. Lo que entra, entra desde `scale(0.95)` o más, con opacidad.
- **Don't** usar `ease-in` en interfaz: arranca lento justo cuando el usuario está mirando.
- **Don't** coreografiar la carga de una vista. Sin stagger, sin secuencias de entrada, sin skeletons animados en la grilla de mesas.
- **Don't** usar emojis como iconos. Se eliminaron todos (⏻ ← 🧾 🔍 ✕ 📊 👤 🕐 🗑 ▼ ▲); volver a introducirlos es un retroceso.
- **Don't** anidar tarjetas. El panel de la orden son filas separadas por líneas, no tarjetas dentro de un panel.
- **Don't** caer en el POS viejo tipo Windows XP: relieve 3D, degradados grises, tablas sin aire, iconos pixelados.
- **Don't** caer en la landing de SaaS genérica: glassmorphism, degradados morados, la métrica gigante con etiqueta chica, tarjetas idénticas de ícono + título + texto.
- **Don't** caer en la app de delivery colorida: saturación repartida por toda la pantalla, ilustraciones, animaciones con rebote.
- **Don't** llenar el historial de gráficas que nadie mira. Es un dashboard sobrecargado disfrazado de reporte.
