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

import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.File;
import java.lang.management.ManagementFactory;
import java.lang.management.MemoryMXBean;
import java.util.*;
import java.util.regex.*;

@Service
public class PiadServiceImpl implements PiadService {

    private static final Logger log = LoggerFactory.getLogger(PiadServiceImpl.class);
    private static final MemoryMXBean MEM = ManagementFactory.getMemoryMXBean();

    /**
     * 100 DPI: ~690×977 px en GRAY para A4 = ~0.67 MB por página.
     * Suficiente para texto impreso de tamaño estándar en listas PIAD.
     * Subir a 120 si hay errores de reconocimiento en cédulas pequeñas.
     */
    private static final int RENDER_DPI = 100;

    /** Porcentaje superior a ignorar (encabezado: logos, título, datos del centro). */
    private static final double CROP_TOP    = 0.18;

    /** Porcentaje inferior a ignorar (pie de página: firmas, leyendas). */
    private static final double CROP_BOTTOM = 0.08;

    private static final int MAX_PAGINAS_PIAD = 20;

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

    // ── Entrada principal ────────────────────────────────────────────────────

    @Override
    public List<EstudiantePIADDto> extraerEstudiantes(MultipartFile archivo) throws Exception {
        log.info("PIAD inicio — {}", mem());

        // Transferir a archivo temporal para no cargar el PDF completo en heap Java.
        File temp = File.createTempFile("piad_", ".pdf");
        try {
            archivo.transferTo(temp);
            log.info("PDF en temp ({} KB) — {}", temp.length() / 1024, mem());
            return procesarPDF(temp);
        } finally {
            temp.delete();
        }
    }

    // ── Procesamiento del PDF ────────────────────────────────────────────────

    private List<EstudiantePIADDto> procesarPDF(File pdfFile) throws Exception {
        List<EstudiantePIADDto> resultado = new ArrayList<>();

        log.info("Cargando PDF — {}", mem());
        try (PDDocument doc = Loader.loadPDF(pdfFile)) {
            int totalPaginas = doc.getNumberOfPages();
            if (totalPaginas > MAX_PAGINAS_PIAD) {
                throw new IllegalArgumentException(
                    "El PDF tiene " + totalPaginas + " páginas; el máximo permitido es "
                    + MAX_PAGINAS_PIAD + ".");
            }
            log.info("PDF cargado: {} página(s) — {}", totalPaginas, mem());

            PDFRenderer renderer = new PDFRenderer(doc);
            Tesseract tesseract = crearTesseract();

            for (int p = 0; p < totalPaginas; p++) {
                procesarPagina(renderer, tesseract, p, totalPaginas, resultado);
            }
        }

        resultado.sort(Comparator.comparingInt(EstudiantePIADDto::getNumero));
        log.info("Extracción completada: {} estudiante(s) — {}", resultado.size(), mem());
        return resultado;
    }

    private void procesarPagina(PDFRenderer renderer, Tesseract tesseract,
                                 int p, int total,
                                 List<EstudiantePIADDto> resultado) throws Exception {
        BufferedImage pagina = null;
        BufferedImage tabla  = null;

        try {
            // 1. Renderizar página completa en escala de grises.
            pagina = renderer.renderImageWithDPI(p, RENDER_DPI, ImageType.GRAY);
            log.info("Página {}/{} renderizada ({}×{} px) — {}",
                    p + 1, total, pagina.getWidth(), pagina.getHeight(), mem());

            // 2. Recortar solo el área de la tabla (descartar encabezado y pie).
            tabla = recortarAreaTabla(pagina);
            log.info("Tabla recortada ({}×{} px) — {}", tabla.getWidth(), tabla.getHeight(), mem());

            // 3. Liberar la página completa ANTES del OCR para reducir el pico.
            pagina.flush();
            pagina = null;
            log.info("Página liberada — {}", mem());

            // 4. Un solo OCR sobre el área de tabla (PSM 4: columna de texto).
            log.info("Iniciando OCR — {}", mem());
            String textoCompleto = tesseract.doOCR(tabla);
            log.info("OCR completado — {}", mem());

            // 5. Parsear el texto resultante línea por línea.
            parsearTextoOCR(textoCompleto, resultado);
            log.info("Parseo completado: {} estudiante(s) acumulados — {}",
                    resultado.size(), mem());

        } catch (TesseractException e) {
            log.warn("OCR falló en página {}: {}", p + 1, e.getMessage());
        } finally {
            if (pagina != null) { pagina.flush(); pagina = null; }
            if (tabla  != null) { tabla.flush();  tabla  = null; }
        }
    }

    // ── Recorte de área de tabla ─────────────────────────────────────────────

    /**
     * Crea una copia independiente (no una subimage view) del área de la tabla,
     * eliminando el encabezado y el pie de página. Al ser una copia independiente,
     * la página original puede ser liberada antes de ejecutar el OCR.
     */
    private BufferedImage recortarAreaTabla(BufferedImage pagina) {
        int alto  = pagina.getHeight();
        int ancho = pagina.getWidth();

        int yInicio = (int)(alto * CROP_TOP);
        int yFin    = (int)(alto * (1.0 - CROP_BOTTOM));
        int altoCrop = yFin - yInicio;

        // BufferedImage.TYPE_BYTE_GRAY para mantener escala de grises sin conversión.
        BufferedImage copia = new BufferedImage(ancho, altoCrop, BufferedImage.TYPE_BYTE_GRAY);
        Graphics2D g = copia.createGraphics();
        try {
            g.drawImage(pagina, 0, -yInicio, null);
        } finally {
            g.dispose();
        }
        return copia;
    }

    // ── Parseo de texto OCR ──────────────────────────────────────────────────

    /**
     * Divide el texto OCR por líneas y aplica los mismos patrones de extracción
     * que el parser original. No lanza excepción si una línea no coincide.
     */
    private void parsearTextoOCR(String textoCompleto, List<EstudiantePIADDto> resultado) {
        if (textoCompleto == null || textoCompleto.isBlank()) return;

        String[] lineas = textoCompleto.split("[\\r\\n]+");
        for (String lineaRaw : lineas) {
            String linea = normalizarLineaOCR(lineaRaw);
            if (linea.isEmpty()) continue;

            Matcher cedulaMatcher = CEDULA.matcher(linea);
            if (!cedulaMatcher.find()) continue;

            EstudiantePIADDto est = parsearLinea(linea, cedulaMatcher);
            if (est != null) {
                resultado.add(est);
                log.info("✓ Fila {} extraída", est.getNumero());
            }
        }
    }

    // ── Configuración Tesseract ──────────────────────────────────────────────

    private static final String OCR_LANG = "spa";

    private Tesseract crearTesseract() {
        Tesseract t = new Tesseract();
        t.setDatapath(resolverRutaTessdata());
        t.setLanguage(OCR_LANG);
        // PSM 4: columna de texto de tamaño variable — adecuado para tabla PIAD.
        t.setPageSegMode(4);
        t.setOcrEngineMode(1);
        // Evitar warnings de DPI en logs de Tesseract.
        t.setTessVariable("user_defined_dpi", String.valueOf(RENDER_DPI));
        return t;
    }

    private String resolverRutaTessdata() {
        List<String> candidatos = new ArrayList<>();
        if (tessdataDir != null && !tessdataDir.isBlank()) {
            candidatos.add(tessdataDir);
            candidatos.add(new File(tessdataDir).getAbsolutePath());
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
            File dir    = new File(path);
            File modelo = new File(dir, OCR_LANG + ".traineddata");
            if (dir.isDirectory() && modelo.isFile()) {
                log.info("Tessdata: {} (spa.traineddata encontrado)", dir.getAbsolutePath());
                return dir.getAbsolutePath();
            }
        }
        String msg = "No se encontró spa.traineddata. Rutas revisadas: " + candidatos;
        log.error(msg);
        throw new IllegalStateException(msg);
    }

    // ── Parseo de línea individual ───────────────────────────────────────────

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
                log.debug("Fila {}: tipo adecuación no encontrado", numero);
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
                log.debug("Fila {}: tokens insuficientes ({})", numero, tokens.size());
                return null;
            }

            String primerApellido  = tokens.get(0);
            String segundoApellido = tokens.get(1);
            String nombre = String.join(" ", tokens.subList(2, tokens.size()));

            Matcher nivelMatcher = NIVEL.matcher(despuesDelTipo);
            if (!nivelMatcher.find()) {
                log.warn("Fila {}: nivel no encontrado", numero);
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
            log.warn("Error parseando línea PIAD: {}", e.getMessage());
            return null;
        }
    }

    // ── Utilidades ────────────────────────────────────────────────────────────

    private static String mem() {
        long heap    = MEM.getHeapMemoryUsage().getUsed()    / (1024 * 1024);
        long nonHeap = MEM.getNonHeapMemoryUsage().getUsed() / (1024 * 1024);
        return "heap=" + heap + "MB nonHeap=" + nonHeap + "MB";
    }

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
