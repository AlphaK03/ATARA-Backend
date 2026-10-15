# OCR con PDFBox + Tess4j en Spring Boot

> Guía de implementación basada en el módulo PIAD de ATARA-Backend.
> **Objetivo de este nuevo uso:** _(completar aquí)_

---

## Stack tecnológico

| Librería | Versión | Rol |
|---|---|---|
| Apache PDFBox | 3.0.3 | Renderiza cada página del PDF a `BufferedImage` |
| Tess4j | 5.11.0 | Wrapper Java para Tesseract OCR — extrae texto de la imagen |
| Tesseract (engine) | 5.x | Motor OCR subyacente (instalado vía sistema o incluido por Tess4j en Windows) |

**Flujo:**
```
PDF (bytes/stream)
  → PDFBox: renderizar cada página a BufferedImage (alta resolución)
  → Preprocesamiento: detectar bandas con contenido, recortar sub-imágenes
  → Tess4j/Tesseract: OCR sobre cada recorte → texto plano
  → Regex / parser: extraer campos estructurados del texto
```

---

## 1. Dependencias Maven (`pom.xml`)

```xml
<!-- PDF → imagen (renderizado para OCR) -->
<dependency>
    <groupId>org.apache.pdfbox</groupId>
    <artifactId>pdfbox</artifactId>
    <version>3.0.3</version>
</dependency>

<!-- Tesseract OCR — wrapper Java -->
<dependency>
    <groupId>net.sourceforge.tess4j</groupId>
    <artifactId>tess4j</artifactId>
    <version>5.11.0</version>
</dependency>
```

> Tess4j incluye los DLL de Tesseract para Windows en el JAR — **no requiere instalación adicional en Windows**.

---

## 2. Modelos de idioma (tessdata)

Tesseract necesita archivos `.traineddata` para reconocer texto.

### Windows (desarrollo local)

1. Descargar `spa.traineddata` (español):
   ```
   https://github.com/tesseract-ocr/tessdata/raw/main/spa.traineddata
   ```
2. Colocarlo en `scripts/extractor-piad/tessdata/spa.traineddata`
   _(o en cualquier carpeta configurada como `piad.tessdata.dir`)_

### Linux / Docker (producción)

```dockerfile
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-spa \
    && rm -rf /var/lib/apt/lists/*
```

Tesseract detecta automáticamente los modelos instalados por el sistema.

---

## 3. Configuración en `application.properties`

```properties
# Ruta a la carpeta tessdata con los .traineddata
piad.tessdata.dir=scripts/extractor-piad/tessdata
```

Si no se configura, el servicio intenta en orden:
1. La propiedad `piad.tessdata.dir`
2. La variable de entorno `TESSDATA_PREFIX`
3. Rutas estándar de Linux (`/usr/share/tesseract-ocr/5/tessdata`, etc.)

---

## 4. Patrón de implementación (Service)

### 4.1 Renderizar PDF a imágenes

```java
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.ImageType;
import org.apache.pdfbox.rendering.PDFRenderer;

private List<BufferedImage> renderizarPDF(byte[] bytes) throws Exception {
    List<BufferedImage> paginas = new ArrayList<>();
    try (PDDocument doc = Loader.loadPDF(bytes)) {
        PDFRenderer renderer = new PDFRenderer(doc);
        for (int i = 0; i < doc.getNumberOfPages(); i++) {
            // 500 DPI captura mejor letras delgadas en fuentes pequeñas
            paginas.add(renderer.renderImageWithDPI(i, 500, ImageType.RGB));
        }
    }
    return paginas;
}
```

**Nota sobre DPI:** 300 DPI es el mínimo razonable. 500 DPI mejora la precisión en PDFs con fuentes pequeñas o delgadas. A mayor DPI, mayor uso de memoria.

### 4.2 Crear instancia de Tesseract

```java
import net.sourceforge.tess4j.Tesseract;

private Tesseract crearTesseract() {
    Tesseract t = new Tesseract();
    t.setDatapath("/ruta/a/tessdata");   // carpeta que contiene spa.traineddata
    t.setLanguage("spa");                // idioma español
    t.setPageSegMode(7);                 // 7 = línea única de texto
    t.setOcrEngineMode(1);               // 1 = LSTM (red neuronal, más preciso)
    return t;
}
```

**Page Segmentation Modes (PSM) más usados:**

| PSM | Descripción |
|-----|-------------|
| 3 | Automático (por defecto) — bueno para páginas completas |
| 6 | Bloque de texto uniforme — bueno para párrafos/tablas |
| 7 | Línea de texto única — ideal para recortes de fila |
| 8 | Palabra única |
| 11 | Texto disperso (sin orden) |

### 4.3 Ejecutar OCR sobre una imagen

```java
import net.sourceforge.tess4j.TesseractException;

try {
    String texto = tesseract.doOCR(bufferedImage).trim();
    // normalizar saltos de línea y espacios múltiples
    texto = texto.replaceAll("[\\r\\n]+", " ").replaceAll("\\s{2,}", " ").trim();
} catch (TesseractException e) {
    log.warn("OCR falló: {}", e.getMessage());
}
```

### 4.4 Recibir el archivo en el Controller (multipart)

```java
@PostMapping(value = "/mi-endpoint", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
public ResponseEntity<?> procesar(@RequestParam("archivo") MultipartFile archivo) throws Exception {
    byte[] bytes = archivo.getBytes();
    // pasar bytes al servicio
}
```

---

## 5. Técnica de detección de bandas horizontales (opcional)

Cuando el PDF contiene filas de tabla, es más eficiente segmentar la imagen por filas antes de hacer OCR que procesar la página completa. El módulo PIAD usa este algoritmo:

1. Para cada fila de píxeles, calcular el brillo promedio.
2. Si el brillo promedio ≥ umbral (ej. 245), la fila se considera "vacía" (fondo blanco).
3. Las filas no vacías contiguas forman una "banda" (posible fila de tabla).
4. Se agrupa bandas separadas por menos de N píxeles (para manejar celdas con varias líneas).
5. Se recorta cada banda con `imagen.getSubimage(...)` y se aplica OCR individual.

Referencia: `PiadServiceImpl.detectarBandas()` y `agruparBandas()`.

---

## 6. Resolución de la ruta tessdata (helper reutilizable)

```java
@Value("${piad.tessdata.dir:}")
private String tessdataDir;

private String resolverRutaTessdata() {
    if (tessdataDir != null && !tessdataDir.isBlank() && new File(tessdataDir).isDirectory()) {
        return tessdataDir;
    }
    String env = System.getenv("TESSDATA_PREFIX");
    if (env != null && new File(env).isDirectory()) return env;

    for (String path : List.of(
            "/usr/share/tesseract-ocr/5/tessdata",
            "/usr/share/tesseract-ocr/4/tessdata",
            "/usr/local/share/tessdata")) {
        if (new File(path).isDirectory()) return path;
    }
    return ".";
}
```

---

## 7. Limitaciones conocidas

- **PDFs vectoriales / texto como trazados:** Algunos PDFs (como los de SIGCE/MEP) convierten el texto a trazados vectoriales, lo que hace imposible la extracción directa de texto. Para estos casos **sí se necesita OCR** (este flujo).
- **PDFs con texto embebido:** Si el PDF tiene texto seleccionable, PDFBox puede extraerlo directamente con `PDFTextStripper` — más rápido y sin Tesseract.
- **Precisión del OCR:** Depende fuertemente de la resolución (DPI), el contraste de la imagen y el modelo de idioma. Siempre validar la salida con regex o post-procesamiento.
- **Memoria:** Renderizar a 500 DPI páginas A4 genera imágenes de ~4000×5800 px ≈ 70 MB en RAM por página. Procesar de a una página a la vez.
