package com.atara.deb.ataraapi.service.impl;

import com.atara.deb.ataraapi.dto.piad.EstudiantePIADDto;
import com.atara.deb.ataraapi.service.PiadService;
import net.sourceforge.tess4j.Tesseract;
import net.sourceforge.tess4j.TesseractException;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.ImageType;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.awt.image.BufferedImage;
import java.io.File;
import java.util.*;
import java.util.regex.*;

@Service
public class PiadServiceImpl implements PiadService {

    private static final Logger log = LoggerFactory.getLogger(PiadServiceImpl.class);

    /** DPI para renderizado — 500 captura mejor letras delgadas ('i', 'l') en fuentes pequeñas. */
    private static final int RENDER_DPI = 500;

    private static final int BRIGHTNESS_THRESHOLD = 245;
    private static final int MIN_GAP_HEIGHT        = 2;
    private static final int BAND_PADDING          = 4;

    private static final Pattern CEDULA = Pattern.compile(
        "(\\d-\\d{3,5}-[\\dU]{3,5}|[A-Z]{1,3}\\d{4,}-[\\d/|]+)"
    );

    private static final Pattern TIPO_ADECUACION = Pattern.compile(
        "(Si?n adecuaci[oó]n|Con adecuaci[oó]n|"
        + "Adecuaci[oó]n significativa|Adecuaci[oó]n no significativa|"
        + "Adecuaci[oó]n de acceso)",
        Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE
    );

    private static final Pattern NIVEL = Pattern.compile(
        "([PF]r[a-záéíóúñ]{2,7}ro|Primero|Segundo|Tercero|Cuarto|Quinto|Sexto"
        + "|S[eé]timo|Octavo|Noveno|D[eé]cimo|Und[eé]cimo)",
        Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE
    );

    private static final Pattern FECHA = Pattern.compile("(\\d{1,2}/\\d{1,2}/\\d{1,4})");

    @Value("${piad.tessdata.dir:}")
    private String tessdataDir;

    @Override
    public List<EstudiantePIADDto> extraerEstudiantes(MultipartFile archivo) throws Exception {
        byte[] bytes = archivo.getBytes();
        List<BufferedImage> paginas = renderizarPDF(bytes);

        Tesseract tesseract = crearTesseract();
        List<EstudiantePIADDto> resultado = new ArrayList<>();

        for (int p = 0; p < paginas.size(); p++) {
            BufferedImage pagina = paginas.get(p);
            log.info("Procesando página {}/{} ({}x{} px)", p + 1, paginas.size(), pagina.getWidth(), pagina.getHeight());

            List<int[]> filas = agruparBandas(detectarBandas(pagina));

            for (int[] fila : filas) {
                int yStart = fila[0];
                int yEnd   = fila[1];
                int alto   = yEnd - yStart;

                if (alto < 8 || alto > 150) continue;

                int yStartPad = Math.max(0, yStart - BAND_PADDING);
                int yEndPad   = Math.min(pagina.getHeight(), yEnd + BAND_PADDING);
                BufferedImage recorte = pagina.getSubimage(0, yStartPad, pagina.getWidth(), yEndPad - yStartPad);

                int psm = (alto > 30) ? 6 : 7;
                tesseract.setPageSegMode(psm);

                String textoFila;
                try {
                    textoFila = tesseract.doOCR(recorte).trim();
                } catch (TesseractException e) {
                    log.warn("OCR falló en y={}-{}: {}", yStart, yEnd, e.getMessage());
                    continue;
                }

                textoFila = normalizarLineaOCR(textoFila);
                if (textoFila.isEmpty()) continue;

                Matcher cedulaMatcher = CEDULA.matcher(textoFila);
                if (!cedulaMatcher.find()) continue;

                EstudiantePIADDto est = parsearLinea(textoFila, cedulaMatcher);
                if (est != null) {
                    resultado.add(est);
                    log.info("✓ Fila {} — {} {} {}", est.getNumero(), est.getCedula(), est.getPrimerApellido(), est.getNombre());
                }
            }
        }

        resultado.sort(Comparator.comparingInt(EstudiantePIADDto::getNumero));
        log.info("Extracción completada: {} estudiante(s)", resultado.size());
        return resultado;
    }

    // ─── Renderizado PDF → imágenes ───────────────────────────────────────────

    private List<BufferedImage> renderizarPDF(byte[] bytes) throws Exception {
        List<BufferedImage> paginas = new ArrayList<>();
        try (PDDocument doc = Loader.loadPDF(bytes)) {
            PDFRenderer renderer = new PDFRenderer(doc);
            log.info("PDF cargado: {} página(s). Renderizando a {} DPI...", doc.getNumberOfPages(), RENDER_DPI);
            for (int i = 0; i < doc.getNumberOfPages(); i++) {
                paginas.add(renderer.renderImageWithDPI(i, RENDER_DPI, ImageType.RGB));
            }
        }
        return paginas;
    }

    // ─── Detección de bandas horizontales ────────────────────────────────────

    private List<int[]> detectarBandas(BufferedImage imagen) {
        int ancho = imagen.getWidth();
        int alto  = imagen.getHeight();
        List<int[]> bandas = new ArrayList<>();

        boolean enBanda    = false;
        int     bandaStart = 0;
        int     gapCount   = 0;

        for (int y = 0; y < alto; y++) {
            long sumaRGB = 0;
            int  muestras = 0;
            for (int x = 0; x < ancho; x += 4) {
                int rgb = imagen.getRGB(x, y);
                int r = (rgb >> 16) & 0xFF;
                int g = (rgb >> 8)  & 0xFF;
                int b = rgb & 0xFF;
                sumaRGB += (r + g + b) / 3;
                muestras++;
            }
            boolean filaVacia = ((double) sumaRGB / muestras) >= BRIGHTNESS_THRESHOLD;

            if (!enBanda && !filaVacia) {
                enBanda    = true;
                bandaStart = y;
                gapCount   = 0;
            } else if (enBanda && filaVacia) {
                gapCount++;
                if (gapCount >= MIN_GAP_HEIGHT) {
                    enBanda = false;
                    bandas.add(new int[]{bandaStart, y - gapCount + 1});
                    gapCount = 0;
                }
            } else if (enBanda) {
                gapCount = 0;
            }
        }

        if (enBanda) bandas.add(new int[]{bandaStart, alto});
        return bandas;
    }

    private List<int[]> agruparBandas(List<int[]> bandas) {
        final int MAX_INTRA_ROW_GAP = 12;
        List<int[]> grupos = new ArrayList<>();
        if (bandas.isEmpty()) return grupos;

        int gStart = bandas.get(0)[0];
        int gEnd   = bandas.get(0)[1];

        for (int i = 1; i < bandas.size(); i++) {
            int bStart = bandas.get(i)[0];
            int bEnd   = bandas.get(i)[1];
            if (bStart - gEnd <= MAX_INTRA_ROW_GAP) {
                gEnd = bEnd;
            } else {
                grupos.add(new int[]{gStart, gEnd});
                gStart = bStart;
                gEnd   = bEnd;
            }
        }
        grupos.add(new int[]{gStart, gEnd});
        return grupos;
    }

    // ─── Configuración Tesseract ──────────────────────────────────────────────

    private Tesseract crearTesseract() {
        Tesseract t = new Tesseract();
        t.setDatapath(resolverRutaTessdata());
        t.setLanguage(OCR_LANG);
        t.setPageSegMode(7);
        t.setOcrEngineMode(1);
        return t;
    }

    /** Idioma usado por Tesseract; el modelo correspondiente debe existir como {LANG}.traineddata. */
    private static final String OCR_LANG = "spa";

    /**
     * Resuelve la carpeta de tessdata que efectivamente contiene el modelo de
     * idioma ({@code spa.traineddata}). Antes esta función devolvía el primer
     * directorio existente aunque NO tuviera el modelo, lo que provocaba que
     * Tesseract fallara fila por fila (excepción capturada y descartada) y la
     * extracción terminara con 0 estudiantes sin explicación. Ahora exige que
     * el modelo exista y, si no lo encuentra en ningún lado, falla de forma
     * explícita con un mensaje accionable.
     */
    private String resolverRutaTessdata() {
        List<String> candidatos = new ArrayList<>();
        if (tessdataDir != null && !tessdataDir.isBlank()) {
            candidatos.add(tessdataDir);                                   // ruta configurada (puede ser relativa)
            candidatos.add(new File(tessdataDir).getAbsolutePath());       // misma ruta resuelta a absoluta
        }
        String env = System.getenv("TESSDATA_PREFIX");
        if (env != null && !env.isBlank()) {
            candidatos.add(env);
            candidatos.add(env + File.separator + "tessdata");
        }
        candidatos.add("/usr/share/tesseract-ocr/5/tessdata");
        candidatos.add("/usr/share/tesseract-ocr/4/tessdata");
        candidatos.add("/usr/share/tessdata");
        candidatos.add("/usr/local/share/tessdata");

        for (String path : candidatos) {
            File dir = new File(path);
            File modelo = new File(dir, OCR_LANG + ".traineddata");
            if (dir.isDirectory() && modelo.isFile()) {
                log.info("Tessdata: {} (modelo {}.traineddata encontrado)", dir.getAbsolutePath(), OCR_LANG);
                return dir.getAbsolutePath();
            }
        }

        String mensaje = "No se encontró el modelo de idioma '" + OCR_LANG + ".traineddata' para el OCR. "
                + "Descárguelo de https://github.com/tesseract-ocr/tessdata/raw/main/" + OCR_LANG + ".traineddata "
                + "y colóquelo en la carpeta configurada por 'piad.tessdata.dir' (actual: '" + tessdataDir + "'), "
                + "o instale el paquete del sistema (tesseract-ocr-" + OCR_LANG + ") en el entorno de despliegue. "
                + "Rutas revisadas: " + candidatos;
        log.error(mensaje);
        throw new IllegalStateException(mensaje);
    }

    // ─── Parseo de línea OCR ──────────────────────────────────────────────────

    private EstudiantePIADDto parsearLinea(String linea, Matcher cedulaMatcher) {
        try {
            String cedula      = normalizarCedula(cedulaMatcher.group(1));
            int    cedulaStart = cedulaMatcher.start();
            int    cedulaEnd   = cedulaMatcher.end();

            String prefijo      = linea.substring(0, cedulaStart).trim();
            int    numero       = extraerNumeroFila(prefijo);
            String codigoEstado = extraerCodigoEstado(prefijo);

            if (numero <= 0) return null;

            String sufijo = linea.substring(cedulaEnd).trim();

            Matcher tipoMatcher = TIPO_ADECUACION.matcher(sufijo);
            if (!tipoMatcher.find()) {
                log.warn("Fila {}: tipo adecuación no encontrado en: {}", numero, sufijo);
                return null;
            }

            String antesDelTipo   = sufijo.substring(0, tipoMatcher.start()).trim();
            String tipoAdecuacion = normalizar(tipoMatcher.group(1));
            String despuesDelTipo = sufijo.substring(tipoMatcher.end()).trim();

            List<String> tokens = new ArrayList<>();
            for (String t : antesDelTipo.split("\\s+")) {
                String limpio = limpiarToken(t);
                if (!limpio.isEmpty()) tokens.add(limpio);
            }
            if (tokens.size() < 3) {
                log.warn("Fila {}: tokens insuficientes para nombre ({}): '{}'", numero, tokens.size(), antesDelTipo);
                return null;
            }

            String primerApellido  = tokens.get(0);
            String segundoApellido = tokens.get(1);
            String nombre = String.join(" ", tokens.subList(2, tokens.size()));

            Matcher nivelMatcher = NIVEL.matcher(despuesDelTipo);
            if (!nivelMatcher.find()) {
                log.warn("Fila {}: nivel no encontrado en: {}", numero, despuesDelTipo);
                return null;
            }
            String nivel           = nivelMatcher.group(1);
            String despuesDelNivel = despuesDelTipo.substring(nivelMatcher.end()).trim();

            String[] resto = despuesDelNivel.split("\\s+", 3);
            if (resto.length < 2) return null;

            int grupo;
            try {
                grupo = Integer.parseInt(resto[0]);
            } catch (NumberFormatException e) {
                log.warn("Fila {}: grupo no numérico '{}'", numero, resto[0]);
                return null;
            }

            String textoResto = String.join(" ", Arrays.copyOfRange(resto, 1, resto.length));
            Matcher fechaMatcher = FECHA.matcher(textoResto);
            if (!fechaMatcher.find()) return null;

            return EstudiantePIADDto.builder()
                .numero(numero)
                .cedula(cedula)
                .primerApellido(primerApellido)
                .segundoApellido(segundoApellido)
                .nombre(nombre)
                .tipoAdecuacion(tipoAdecuacion)
                .nivel(nivel)
                .grupo(grupo)
                .fechaMatricula(fechaMatcher.group(1))
                .codigoEstado(codigoEstado)
                .build();

        } catch (Exception e) {
            log.warn("Error parseando línea: {} | {}", linea, e.getMessage());
            return null;
        }
    }

    // ─── Utilidades ───────────────────────────────────────────────────────────

    private int extraerNumeroFila(String prefijo) {
        if (prefijo.isEmpty()) return -1;
        String p = prefijo.trim()
            .replace("|", "1").replace("]", "1").replace("l", "1").replace("Z", "2")
            .replaceAll("[^0-9a-zA-Z\\s]", " ").trim();
        Matcher m = Pattern.compile("^(\\d{1,3})").matcher(p);
        if (m.find()) {
            try { return Integer.parseInt(m.group(1)); } catch (NumberFormatException ignored) {}
        }
        return -1;
    }

    private String extraerCodigoEstado(String prefijo) {
        Matcher m = Pattern.compile("^\\d+\\s+([A-Za-z][A-Za-z0-9]*)").matcher(prefijo.trim());
        return m.find() ? m.group(1) : null;
    }

    private String normalizarLineaOCR(String s) {
        return s.replaceAll("[\\r\\n]+", " ").replaceAll("\\s{2,}", " ").trim();
    }

    private String limpiarToken(String s) {
        if (s == null) return "";
        String limpio = s.replaceAll("[^\\p{L}\\p{M}'\\- ]", "").trim();
        return limpio.replaceAll("^[-\\s]+|[-\\s]+$", "").trim();
    }

    private String normalizar(String s) {
        return s.replace("adecuacion", "adecuación").replace("Adecuacion", "Adecuación");
    }

    private String normalizarCedula(String raw) {
        String clean = raw.replace("U", "0").replace("|", "1").replace("Z", "2");
        Matcher m = Pattern.compile("^(\\d)-(\\d{5,})-(\\d{3,5})$").matcher(clean);
        if (m.matches()) {
            String medio = m.group(2);
            medio = medio.substring(medio.length() - 4);
            clean = m.group(1) + "-" + medio + "-" + m.group(3);
        }
        return clean;
    }
}
