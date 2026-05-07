# Imágenes

Recursos visuales tipo bitmap o vectorial usados en la app.

## Subcarpetas

| Carpeta | Para qué | Formatos recomendados |
|---|---|---|
| `logos/` | Logo ATARA, escudo MEP, logos de instituciones aliadas | SVG (preferido), PNG transparente |
| `backgrounds/` | Fondos de pantalla completos (login, hero del dashboard, secciones destacadas) | WebP, JPG (1280–1920 px de ancho, <200 KB) |
| `illustrations/` | Ilustraciones decorativas o explicativas (estado vacío, éxito, error 404) | SVG (preferido), PNG transparente |
| `photos/` | Fotografías reales (avatares demo, fotos de eventos) | WebP, JPG |

## Convenciones de nombre

- **kebab-case**: `logo-atara.svg`, no `LogoAtara.svg` ni `logo_atara.svg`.
- **Prefijo descriptivo**: `login-fondo-aulas.jpg`, `dashboard-ilustracion-vacio.svg`.
- **Variantes**: si hay versión clara/oscura o tamaños, sufijo al final: `logo-atara-blanco.svg`, `logo-atara-2x.png`.

## Cómo importarlas en JS (Vite)

```js
// En cualquier módulo de src/pages/ o src/components/
import logoAtara from '../assets/images/logos/logo-atara.svg'
import fondoLogin from '../assets/images/backgrounds/login-fondo-aulas.webp'

// Uso en plantilla HTML (template literal):
const html = `
  <div class="login-card">
    <img src="${logoAtara}" alt="ATARA" class="login-logo" />
    <img src="${fondoLogin}" alt="" class="login-bg" aria-hidden="true" />
  </div>
`
```

Vite reescribe la ruta y agrega un hash al nombre del archivo en `build` para invalidar caché del navegador automáticamente.

## Optimización antes de comitear

- Pasar JPG/PNG por [TinyPNG](https://tinypng.com).
- Convertir a WebP con [Squoosh](https://squoosh.app) (mantener JPG/PNG como fallback solo si se necesita compatibilidad antigua).
- SVG: limpiar con [SVGOMG](https://jakearchibald.github.io/svgomg/) — quita metadata innecesaria.

## Tamaño máximo recomendado por categoría

- Logos SVG: <20 KB
- Logos PNG: <60 KB
- Ilustraciones SVG: <50 KB
- Fondos WebP/JPG: <200 KB
- Fotos: <300 KB

Si una imagen pasa de 500 KB, casi seguro está sin optimizar.
