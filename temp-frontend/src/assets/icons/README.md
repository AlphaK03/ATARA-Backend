# Íconos

Íconos pequeños de interfaz, decorativos o de marca.

## Subcarpetas

| Carpeta | Para qué |
|---|---|
| `ui/` | Íconos funcionales de interfaz: candado, ojo (mostrar/ocultar contraseña), usuario, búsqueda, basurero, lápiz, check, alerta, etc. |
| `brand/` | Íconos de marca: favicon, app icon (PWA), íconos para redes sociales si aplica. |

## Recomendación principal: SVG, no PNG

Para íconos siempre prefiera **SVG**. Razones:

- Escalan a cualquier tamaño sin perder calidad (Retina, 4K).
- Pesan poco (<3 KB típicamente).
- Se pueden colorear con CSS (`fill: currentColor`).
- Son accesibles para lectores de pantalla.

## Tres formas de usar íconos

### 1. SVG como archivo importado (recomendado para íconos personalizados)

```js
import iconoOjo from '../assets/icons/ui/icono-ojo-mostrar.svg'

const html = `<img src="${iconoOjo}" alt="Mostrar contraseña" class="icono">`
```

### 2. SVG inline dentro del template (cuando quiere colorear con CSS)

Pegue el contenido del `<svg>` directamente en el HTML del componente:

```js
const html = `
  <button class="btn-icono">
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
      <path d="M12 4.5C7 4.5 2.7 7.6 1 12c1.7 4.4 6 7.5 11 7.5..." />
    </svg>
  </button>
`
```

CSS:

```css
.btn-icono { color: var(--accent); }
.btn-icono:hover { color: var(--accent-hover); }
```

### 3. Librería de íconos (recomendado para íconos comunes)

Si va a usar muchos íconos estándar (Material, Bootstrap, Lucide), no inventen los suyos: instalen una librería. Por ejemplo, **Lucide** funciona genial con vanilla JS:

```bash
npm install lucide
```

```js
import { createIcons, Eye, Lock, User } from 'lucide'

createIcons({ icons: { Eye, Lock, User } })
// luego en el HTML: <i data-lucide="eye"></i>
```

Solo se importan los íconos que se usan, así que el bundle final es pequeño.

## Convenciones de nombre

- **kebab-case** y prefijo `icono-`: `icono-candado.svg`, `icono-ojo-mostrar.svg`, `icono-ojo-ocultar.svg`.
- Tamaño base 24×24 (estándar Material) o 20×20 si es para inputs pequeños.
- `viewBox="0 0 24 24"` siempre presente para que escale bien.

## ¿Qué va en `brand/` y qué en `public/`?

- Favicon de pestaña del navegador → `public/favicon.svg` y `public/favicon.ico` (Vite los sirve desde la raíz `/`).
- Íconos de marca usados *dentro* de la app (logo pequeño en topbar, badge institucional) → `src/assets/icons/brand/`.
