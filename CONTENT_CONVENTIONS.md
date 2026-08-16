# Imágenes de producto en posts listicle

Convención para insertar imágenes de producto (fotos aisladas con fondo blanco de Amazon) dentro de `contenido_html` en `data/blog-posts.json`.

## Regla

- **`<h2>` = producto específico** (ej. "Hisense 58E63QT 4K Ultra HD"): la imagen va **ANTES** del `<h2>`.
- **`<h2>` = categoría genérica** que agrupa uno o más productos recomendados (ej. "Power bank", "Auricolari wireless compatibili"): la imagen (o imágenes) va **DESPUÉS** del `<h2>`, antes del primer `<p>` que sigue.
  - Si la categoría no tiene todavía un ASIN/producto asignado, no se inserta imagen.

En ambos casos, la imagen queda dentro de un contenedor con fondo suave (`bg-gray-50`), altura fija y `object-contain`, para que el producto completo sea siempre visible, centrado, sin recortarse ni deformarse, y sin franjas de espacio vacío excesivas.

## Snippet: imagen simple

```html
<div class="w-full max-w-sm mx-auto h-64 bg-gray-50 rounded-xl mb-4 flex items-center justify-center overflow-hidden">
  <img src="URL" alt="NOMBRE" class="max-w-full max-h-full object-contain">
</div>
```

## Snippet: fila de 2 imágenes

Usar cuando una categoría agrupa dos productos alternativos (ej. dos auriculares o dos power banks a comparar).

```html
<div class="flex flex-col sm:flex-row gap-4 mb-4">
  <div class="flex-1 h-56 bg-gray-50 rounded-xl flex items-center justify-center overflow-hidden">
    <img src="URL_1" alt="NOMBRE_1" class="max-w-full max-h-full object-contain">
  </div>
  <div class="flex-1 h-56 bg-gray-50 rounded-xl flex items-center justify-center overflow-hidden">
    <img src="URL_2" alt="NOMBRE_2" class="max-w-full max-h-full object-contain">
  </div>
</div>
```

## Origen de la URL de imagen

La URL de imagen sale de `data/offers.json` (campo `image_url`), indexado por `id` de `data/catalogo.json` — **no** por ASIN.
