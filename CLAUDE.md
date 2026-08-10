# BarPOS — La Taberna

Punto de venta para bar y restaurante. Electron + lowdb, base local, sin internet.

## Correr

```bash
npm start          # electron .
npm run build      # instalador NSIS para Windows x64
```

## Estructura

- `main.js` — proceso principal de Electron, ventana, IPC
- `preload.js` — expone `window.api` al renderer
- `database.js` — lowdb: usuarios, productos, categorías, mesas, órdenes
- `src/index.html` — todas las vistas y modales en un solo documento
- `src/renderer.js` — toda la lógica de UI; `State` global, vistas por `showMainView()`
- `src/styles.css` — estilos globales, tokens en `:root`

## Antes de tocar la interfaz

Lee estos dos archivos. Son la fuente de verdad del diseño:

- **[PRODUCT.md](PRODUCT.md)** — quién usa esto, en qué contexto, qué tarea manda, y los anti-referentes.
- **[DESIGN.md](DESIGN.md)** — tokens, paleta OKLCH, tipografía, elevación, componentes, y la lista de Do's / Don'ts.

Lo que más se rompe si no los lees:

- La paleta es **OKLCH** y ningún neutro es neutro. Nada de `#fff`, `#000` ni grises puros.
- **Un solo acento**: azul para acción, verde para cobrado, rojo para ocupado o destructivo. Un cuarto color es un error.
- **Sin sombras** en nada que viva dentro del flujo de la página. Solo modal, toast y login flotan.
- **Nada de franjas laterales** de color (`border-left` mayor a 1px) en tarjetas, filas o alertas.
- **Es una pantalla táctil**: 44px de área táctil como piso, y todo hover que mueva va dentro de `@media (hover: hover) and (pointer: fine)`.
- **Iconos**: SVG de trazo 24×24 con `currentColor`, tomados de `ICON_PATHS` en `src/renderer.js`. Cero emojis.
- **Motion**: por debajo de 250ms, con `--ease-out`, y `:active { transform: scale(.97) }` en todo lo presionable.

## Ojo con

- El CSP vive en el `<meta>` de `src/index.html`. Incluye `img-src 'self' data:` porque los chevrons de los `select` son data-URIs; quitarlo los rompe en silencio.
- No hay build step para el frontend: `index.html` carga `renderer.js` y `styles.css` directo.
