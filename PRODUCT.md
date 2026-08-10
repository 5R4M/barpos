# Product

## Register

product

La app (mesas, órdenes, cobro, administración) es la superficie primaria y manda sobre todo lo demás. Existe una segunda superficie de marca prevista (sitio del bar, carta pública); cuando se trabaje sobre ella se cambia el registro a `brand` por tarea, sin tocar este default.

## Users

Tres perfiles con contextos físicos distintos, todos en un bar-restaurante de noche con poca luz ambiente:

- **Mesero con tablet táctil.** De pie, en movimiento, muchas veces con una mano ocupada. Sin mouse, sin precisión fina, sin teclado. Es el usuario de mayor volumen de toques por turno.
- **Cajero en monitor + mouse.** Sentado en la barra, pantalla fija, con teclado disponible. Cobra y cierra cuentas mientras el cliente espera enfrente.
- **Dueño/admin en laptop.** Sesiones largas y espaciadas: alta de productos, usuarios, revisión del corte de caja.

El trabajo a resolver: llevar la cuenta de cada mesa sin equivocarse y cobrar rápido, en medio del ruido y la prisa de un servicio.

## Product Purpose

BarPOS reemplaza la comanda de papel y la calculadora. Registra qué consumió cada mesa, cobra, imprime el recibo y deja constancia de lo vendido para el corte del día. Corre en Electron sobre Windows, con base local (lowdb): funciona sin internet, que en un bar es un requisito, no una comodidad.

Éxito es que un mesero nuevo abra una mesa y cargue tres productos sin que nadie le explique nada, y que al cierre los números del corte cuadren con la caja.

## Brand Personality

**Rápido, claro, confiable.**

La herramienta desaparece dentro de la tarea. No pide atención, no celebra, no explica de más. Voz de las etiquetas: directa y en español neutro de Guatemala ("Liberar", "Cobrar", "Sin ítems"), verbos en infinitivo, nada de tono publicitario ni de asistente simpático. El único momento donde puede haber algo de carácter es el login, que es la cara de "La Taberna" antes de entrar al trabajo.

Referencias de categoría: Linear, Stripe Dashboard, Raycast. Rapidez percibida, jerarquía tipográfica clara, un solo acento.

## Anti-references

- **POS viejo tipo Windows XP.** Botones con relieve 3D, degradados grises, tablas apretadas sin aire, iconos pixelados, ventanas modales del sistema. Es lo que usa la competencia y es exactamente lo que no somos.
- **Landing de SaaS genérica.** Degradados morados, glassmorphism, tarjetas idénticas de ícono + título + texto, el número gigante con etiqueta chica. Nada de eso pertenece a una herramienta de trabajo.
- **App de delivery colorida.** Emojis como iconos, colores saturados repartidos por toda la pantalla, ilustraciones, animaciones con rebote.
- **Dashboard sobrecargado.** Gráficas y KPIs que nadie mira, todo compitiendo por atención al mismo tiempo.

## Design Principles

1. **La mesa es la tarea.** El flujo mesa → productos → cobro es el que se optimiza. Todo lo demás (admin, historial, corte) se subordina y puede ser más denso, más lento y más textual.
2. **El dedo manda sobre el mouse.** Ningún control esencial vive detrás de un hover. Objetivos de toque de 44px como piso. El hover es un lujo del cajero, nunca el único camino a una acción.
3. **Una sola voz de acento.** El azul marca acción primaria, selección y foco. Verde solo para dinero cobrado, rojo solo para destructivo u ocupado. Ningún color decorativo.
4. **Movimiento que informa, nada más.** Feedback de presión, cambio de estado, entrada de un modal. Cero coreografía de carga: el mesero abre la app para trabajar, no para verla aparecer.
5. **Que los números se lean de lejos.** Totales, cantidades y tiempos con cifras tabulares y peso suficiente para leerse a un brazo de distancia, en un local a media luz.

## Accessibility & Inclusion

- **WCAG 2.1 AA** como piso: contraste 4.5:1 en texto normal, 3:1 en elementos de interfaz.
- **El color nunca es el único indicador.** Libre/Ocupada lleva punto de color *y* etiqueta de texto. Lo mismo para los badges de estado en las tablas de administración.
- **Objetivos táctiles de 44×44px mínimo** en todo lo que se toque durante el servicio.
- **`prefers-reduced-motion`** respetado globalmente: se anulan transiciones y animaciones, se conservan los cambios de color y opacidad que comunican estado.
- **Foco visible por teclado** en todo control, incluidas las cards de mesa (`role="button"`, Enter y Espacio).
- **Tema oscuro: pendiente reconocido.** El local es oscuro y el turno de noche lo justifica. El tema claro documentado en DESIGN.md es la base actual; el oscuro es un objetivo futuro, no un descuido.
