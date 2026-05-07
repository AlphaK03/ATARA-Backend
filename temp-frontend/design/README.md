# Diseño

Carpeta para guardar referencias visuales que **no son código** pero que el equipo necesita consultar: mockups exportados de Figma, bocetos a mano escaneados, paleta de colores, guía de marca, etc.

> Estos archivos no se usan en runtime — Vite los ignora. Sirven solo como documentación viva para el equipo de desarrollo y diseño.

## Subcarpetas

| Carpeta | Qué guardar |
|---|---|
| `mockups/` | Diseños finales o de alta fidelidad exportados como PNG/JPG/PDF desde Figma, Adobe XD, Penpot, etc. Una imagen por pantalla. |
| `wireframes/` | Bocetos de baja fidelidad: cajas, flujos, navegación. Pueden ser fotos de pizarra, dibujos, o exports de herramientas. |
| `style-guide/` | Paleta de colores oficial, escala tipográfica, espaciados, guía de uso del logo, do's & don'ts. |

## Convenciones de nombre

- Prefijo con la pantalla o componente: `login-mockup-v2.png`, `dashboard-wireframe-mobile.jpg`.
- Versionar con sufijo `-v1`, `-v2` cuando haya iteraciones, no sobrescribir.
- Si es exportación directa de Figma, mantener una numeración o fecha: `2026-05-07-login-final.png`.

## Sugerencia: enlazar Figma en lugar de exportar todo

Si el diseño se hace en Figma con cuenta del equipo, basta con dejar un archivo `figma-link.md` aquí con los enlaces a los frames principales — así no hay que re-exportar PNGs cada vez que cambia algo.

```md
# Enlaces de Figma

- [Login — frame final](https://figma.com/file/XXXX?node-id=...)
- [Dashboard docente](https://figma.com/file/XXXX?node-id=...)
- [Sistema de tipografías](https://figma.com/file/XXXX?node-id=...)
```

## Archivos pesados

Si los exports superan 5 MB, considerar `git-lfs` o alojarlos fuera del repo (Drive compartido, Notion) y solo dejar enlaces aquí.
