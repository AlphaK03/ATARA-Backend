# Aquí va la imagen de fondo del login

Reemplace este archivo con la imagen que se usará como fondo de la pantalla de login.

## Nombre que debe usar

Guarde el archivo con este nombre exacto (en minúsculas, sin espacios):

```
login-fondo.webp
```

Si su imagen es JPG en lugar de WebP:

```
login-fondo.jpg
```

> **Solo uno de los dos**, no ambos. WebP pesa menos con la misma calidad y es lo recomendado.

## Recomendaciones

| Aspecto | Recomendación |
|---|---|
| Formato | WebP (preferido) o JPG |
| Resolución | 1920 × 1080 px (Full HD) o 2560 × 1440 px (2K) |
| Orientación | Horizontal (landscape) |
| Peso máximo | 200 KB |
| Composición | Evite texto en la imagen y deje el centro más despejado (el formulario va encima) |

## Optimización antes de subir

Si la imagen pesa más de 200 KB, pásela por:

- [Squoosh](https://squoosh.app) — convertir a WebP con calidad 75–80
- [TinyPNG](https://tinypng.com) — comprimir JPG/PNG

## Después de agregar la imagen

1. Borre este archivo `AQUI-VA-EL-FONDO-LOGIN.md` — ya no hace falta.
2. El archivo será referenciado desde `src/main.js` con la línea:

   ```js
   import fondoLogin from './assets/images/backgrounds/login-fondo.webp'
   ```

   (cuando se conecte el login con la imagen).
