# Estilos

Carpeta reservada para CSS modular cuando se decida partir `src/style.css` en archivos por responsabilidad.

## Estado actual

Hoy todo el CSS vive en un solo archivo: `src/style.css`. Los **tokens de diseño** (colores, espaciados, radios) están declarados en `:root` al inicio:

```css
:root {
  --bg: #f4f6f9;
  --surface: #ffffff;
  --sidebar-bg: #1e2535;
  --accent: #3b7dd8;
  --primary: #2563c7;
  --danger: #d94f4f;
  --success: #3aaf6a;
  --warning: #e09b2a;
  /* ... */
}
```

## Cuándo partir el CSS

Cuando `style.css` pase de ~1000 líneas o se vuelva difícil de navegar, se recomienda partirlo así:

```
src/assets/styles/
├── variables.css     # :root con tokens (colores, tipografía, espaciado, radios)
├── reset.css         # Reset/normalize global
├── globals.css       # Reglas base (body, headings, links, focus)
├── layout.css        # Sidebar, topbar, main-area
├── components.css    # Botones, inputs, modales, badges
└── pages/
    ├── login.css
    ├── dashboard.css
    └── ...
```

E importarlas en orden desde `src/main.js`:

```js
import './assets/styles/variables.css'
import './assets/styles/reset.css'
import './assets/styles/globals.css'
import './assets/styles/layout.css'
import './assets/styles/components.css'
```

## Archivo `variables.css` propuesto

Cuando se haga la migración, este archivo es el primer paso — extraer el bloque `:root` actual sin cambiarlo. Después se pueden ir agregando tokens nuevos (tipografía, espaciados consistentes, sombras escalonadas) sin tocar los componentes.
