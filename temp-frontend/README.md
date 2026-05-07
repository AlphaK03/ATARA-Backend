# ATARA — Temporary Frontend

Minimal Vite + Vanilla JS frontend to test the ATARA backend API.
This folder is safe to delete at any time — it has no effect on the backend.

## Requirements

- Node.js 18+ (check with `node -v`)
- ATARA backend running on `http://localhost:8081`

## Run

```bash
cd temp-frontend
npm install
npm run dev
```

Open **http://localhost:3000** in your browser.

Requests to `/api/*` are proxied to `http://localhost:8081` automatically — no CORS issues.

## Screens

| Screen | What you can do |
|--------|----------------|
| Años Lectivos | List, create, and activate school years |
| Estudiantes | List (filtered by status), create, and edit students |
| Matrículas | Enroll a student in a section; query by student or section ID |
| Evaluaciones | Create evaluations, add score details, search by student or evaluation ID |
| Alertas | View alerts by student ID or section ID, with level summary |

## Notes

- The sidebar shows a live **Backend UP / DOWN** indicator (polls every 15 s).
- Forms require entity IDs (student, section, period, etc.). Use the list screens to find them.
- The backend seed data (`V2__sample_data.sql`) provides initial records to explore.

## Folder structure

```
temp-frontend/
├── public/                       # Archivos servidos tal cual (favicon, robots.txt)
├── src/
│   ├── assets/
│   │   ├── images/
│   │   │   ├── logos/            # Logo ATARA, MEP, instituciones aliadas
│   │   │   ├── backgrounds/      # Fondos de login, headers, hero images
│   │   │   ├── illustrations/    # Ilustraciones SVG/PNG (login, vacíos, errores)
│   │   │   └── photos/           # Fotografías reales (perfiles demo, etc.)
│   │   ├── icons/
│   │   │   ├── ui/               # Íconos SVG de interfaz (candado, usuario, ojo)
│   │   │   └── brand/            # Íconos de marca (favicon, app icon)
│   │   ├── fonts/                # Fuentes propias (.woff2) si se requieren
│   │   └── styles/               # CSS modular cuando se extraiga de style.css
│   ├── pages/                    # Módulos de cada pantalla (.js)
│   ├── components/
│   │   ├── common/               # Botones, inputs, modales reutilizables
│   │   ├── layout/               # Sidebar, topbar, footer
│   │   └── forms/                # Componentes específicos de formularios
│   ├── services/                 # Cliente API (api.js vive aquí cuando se mueva)
│   ├── hooks/                    # Helpers de estado/efectos
│   ├── utils/                    # Funciones utilitarias puras
│   ├── config/                   # URL base del API, constantes de entorno
│   └── style.css                 # Estilos globales (tokens en :root)
└── design/
    ├── mockups/                  # PNG/JPG de Figma o bocetos visuales
    ├── wireframes/               # Bocetos de baja fidelidad
    └── style-guide/              # Paleta, tipografía, espaciados, guía de marca
```

### ¿Dónde agrego una imagen nueva?

1. **Decida la categoría** según la tabla:

   | Tipo de imagen | Carpeta |
   |---|---|
   | Logo (ATARA, MEP, escudos) | `src/assets/images/logos/` |
   | Fondo de pantalla (login, hero) | `src/assets/images/backgrounds/` |
   | Ilustración (vacío, éxito, error) | `src/assets/images/illustrations/` |
   | Foto real (perfil, evento) | `src/assets/images/photos/` |
   | Ícono de UI (candado, ojo, usuario) | `src/assets/icons/ui/` |
   | Favicon / app icon | `src/assets/icons/brand/` o `public/` |

2. **Nómbrela** en `kebab-case` y descriptivo: `logo-atara.svg`, `login-fondo-aulas.jpg`, `icono-ojo-mostrar.svg`. Nunca `IMG_1234.png`.

3. **Impórtela** en su módulo JS (Vite resuelve la URL y le agrega hash de cache):

   ```js
   import logoAtara from './assets/images/logos/logo-atara.svg'
   // luego, dentro del template HTML:
   `<img src="${logoAtara}" alt="ATARA" class="login-logo">`
   ```

   Para `main.js` la ruta sería `./assets/images/logos/logo-atara.svg`.

### Recomendaciones por formato

- **Logos e íconos**: SVG siempre que sea posible (escalan sin perder calidad, pesan menos).
- **Fondos y fotos**: WebP comprimido (`<200 KB`), o JPG como fallback. Ancho 1280–1920 px.
- **Favicon**: SVG en `public/favicon.svg` + ICO de respaldo en `public/favicon.ico`.
- **Antes de subir**: pase las imágenes por [TinyPNG](https://tinypng.com) o [Squoosh](https://squoosh.app).
- **Accesibilidad**: todo `<img>` lleva `alt` descriptivo; las decorativas con `alt=""`.

### Tokens de diseño (colores, tipografía)

Hoy viven en `src/style.css` dentro de `:root { --bg, --surface, --accent, ... }`. Cuando se separe el frontend a su propio repositorio, mover esos tokens a `src/assets/styles/variables.css` y dejar `style.css` solo con reglas globales.

## Migrar a proyecto separado en el futuro

Cuando se decida partir el frontend a su propio repositorio:

1. Mover toda la carpeta `temp-frontend/` a un repo nuevo (`ATARA-Frontend`).
2. Renombrar la carpeta a `frontend/` o dejarla como raíz.
3. Actualizar `vite.config.js` para apuntar al backend desplegado (variable de entorno `VITE_API_BASE_URL`).
4. Eliminar `temp-frontend/` del repo backend.

La estructura actual de carpetas ya está alineada con convenciones de Vite/React, por lo que la migración no requiere reorganización.

## Delete

```bash
# From the project root
rm -rf temp-frontend
```
