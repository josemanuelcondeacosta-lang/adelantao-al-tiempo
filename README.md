# Adelanta’o al Tiempo

Tienda de zapatos deportivos y urbanos. Catálogo, selección de talla, carrito y pedidos por WhatsApp.

## Inicio

Abre `adelantao-inicio.dc.html` desde un servidor HTTP local. Por ejemplo, ejecuta `python -m http.server 8000` y visita `http://localhost:8000/adelantao-inicio.dc.html`. Vercel dirige la raíz a esta página.

Los estilos compartidos (sistema de diseño) están en `adelantao-tienda.css`, los productos en `adelantao-productos.js`, el carrito en `adelantao-carrito.js`, la búsqueda/filtros del catálogo en `adelantao-listado.js` y el contador del encabezado en `adelantao-ui.js`. La dirección anterior se conserva como redirección.

Los precios de los 99 zapatos y las 34 chancletas se asignan desde el libro de costos con `scripts/asignar-precios.py`. El libro, el script y los archivos de asignación y revisión de precios son privados y no se incluyen en este repositorio (ver `.gitignore`). Los carritos guardados muestran el precio vigente del catálogo.

## Verificación

Ejecuta `node tests/tienda.cjs` para comprobar catálogo, imágenes, enlaces, filtros, selección de productos, cantidades y mensaje de WhatsApp. Incluye casos de almacenamiento dañado o bloqueado.

La prueba `node tests/navegador.cjs` usa un navegador de prueba con depuración remota en `127.0.0.1:9222` y la tienda servida en `http://127.0.0.1:8765`. Comprueba escritorio y móvil, búsqueda, colores, carrito y WhatsApp. Usa un perfil de navegador independiente, sin pedidos personales.
