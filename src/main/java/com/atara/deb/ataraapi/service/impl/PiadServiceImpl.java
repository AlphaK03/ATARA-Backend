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
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.awt.image.RescaleOp;
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
     * 200 DPI: ~1654×2338 px en GRAY para A4 = ~3.9 MB por página.
     * Equilibrio óptimo calidad/memoria: 4× más detalle que 100 DPI sin superar
     * los límites de Railway. Permite leer cédulas pequeñas y nombres con tilde
     * que se perdían a DPI bajos.
     */
    private static final int RENDER_DPI = 200;

    /**
     * Factor de escala adicional aplicado sobre la imagen renderizada antes del OCR.
     * 1.5× sobre 200 DPI da ~300 DPI efectivos para Tesseract, lo que mejora
     * notablemente el reconocimiento de texto pequeño sin triplicar el costo
     * de renderizado PDF (que es la operación cara).
     */
    private static final float SCALE_FACTOR = 1.5f;

    /** Porcentaje superior a ignorar (encabezado: logos, título, datos del centro). */
    private static final double CROP_TOP    = 0.14;

    /** Porcentaje inferior a ignorar (pie de página: firmas, leyendas). */
    private static final double CROP_BOTTOM = 0.05;

    private static final int MAX_PAGINAS_PIAD = 20;

    // ── Patrones de extracción ───────────────────────────────────────────────

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

        try (PDDocument doc = Loader.loadPDF(pdfFile)) {
            int totalPaginas = doc.getNumberOfPages();
            if (totalPaginas > MAX_PAGINAS_PIAD) {
                throw new IllegalArgumentException(
                    "El PDF tiene " + totalPaginas + " páginas; el máximo permitido es "
                    + MAX_PAGINAS_PIAD + ".");
            }
            log.info("PDF cargado: {} página(s) — {}", totalPaginas, mem());

            PDFRenderer renderer = new PDFRenderer(doc);
            Tesseract tesseract  = crearTesseract();

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
        BufferedImage pagina  = null;
        BufferedImage tabla   = null;
        BufferedImage escalada = null;

        try {
            // 1. Renderizar en escala de grises a RENDER_DPI.
            pagina = renderer.renderImageWithDPI(p, RENDER_DPI, ImageType.GRAY);
            log.info("Página {}/{} renderizada ({}×{} px, {}DPI) — {}",
                    p + 1, total, pagina.getWidth(), pagina.getHeight(), RENDER_DPI, mem());

            // 2. Recortar encabezado y pie de página.
            tabla = recortarAreaTabla(pagina);
            pagina.flush(); pagina = null;

            // 3. Mejorar contraste del área de tabla.
            tabla = mejorarContraste(tabla);

            // 4. Escalar a SCALE_FACTOR para dar más resolución efectiva a Tesseract.
            escalada = escalarImagen(tabla, SCALE_FACTOR);
            tabla.flush(); tabla = null;
            log.info("Imagen lista para OCR: {}×{} px (~{} DPI efectivos) — {}",
                    escalada.getWidth(), escalada.getHeight(),
                    Math.round(RENDER_DPI * SCALE_FACTOR), mem());

            // 5. OCR con PSM 6 (bloque uniforme — mejor para filas de tabla).
            String textoCompleto = tesseract.doOCR(escalada);
            log.info("OCR completado — {} chars — {}", textoCompleto.length(), mem());

            // 6. Parsear línea por línea con ensamblado de filas fragmentadas.
            int antes = resultado.size();
            parsearTextoOCR(textoCompleto, resultado);
            log.info("Página {}: {} estudiante(s) extraídos (total acumulado: {})",
                    p + 1, resultado.size() - antes, resultado.size());

        } catch (TesseractException e) {
            log.warn("OCR falló en página {}: {}", p + 1, e.getMessage());
        } finally {
            if (pagina  != null) { pagina.flush();   }
            if (tabla   != null) { tabla.flush();    }
            if (escalada != null) { escalada.flush(); }
        }
    }

    // ── Procesamiento de imagen ──────────────────────────────────────────────

    /**
     * Recorta el encabezado y pie de página. Devuelve una copia independiente
     * para que la página original pueda liberarse antes del OCR.
     */
    private BufferedImage recortarAreaTabla(BufferedImage pagina) {
        int alto  = pagina.getHeight();
        int ancho = pagina.getWidth();

        int yInicio  = (int)(alto * CROP_TOP);
        int yFin     = (int)(alto * (1.0 - CROP_BOTTOM));
        int altoCrop = yFin - yInicio;

        BufferedImage copia = new BufferedImage(ancho, altoCrop, BufferedImage.TYPE_BYTE_GRAY);
        Graphics2D g = copia.createGraphics();
        try {
            g.drawImage(pagina, 0, -yInicio, null);
        } finally {
            g.dispose();
        }
        return copia;
    }

    /**
     * Aumenta el contraste de la imagen para que el texto impreso (oscuro sobre
     * fondo claro) resulte más nítido ante Tesseract. La operación amplifica la
     * diferencia entre píxeles oscuros (texto) y claros (fondo), sin invertir.
     *
     * factor=1.6, offset=-40: fondo gris claro (~200) → casi blanco (~280→255);
     * texto oscuro (~60) → más oscuro (~56); umbrales seguros para texto impreso.
     */
    private BufferedImage mejorarContraste(BufferedImage img) {
        RescaleOp op = new RescaleOp(1.6f, -40f, null);
        return op.filter(img, null);
    }

    /**
     * Escala la imagen bilinealmente al factor indicado. Este paso es barato
     * comparado con el renderizado PDF y permite darle a Tesseract una imagen
     * con más resolución efectiva sin triplicar el costo de renderizado.
     */
    private BufferedImage escalarImagen(BufferedImage src, float factor) {
        int nuevoAncho = Math.round(src.getWidth()  * factor);
        int nuevoAlto  = Math.round(src.getHeight() * factor);

        BufferedImage scaled = new BufferedImage(nuevoAncho, nuevoAlto, BufferedImage.TYPE_BYTE_GRAY);
        Graphics2D g = scaled.createGraphics();
        try {
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION,
                               RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            g.setRenderingHint(RenderingHints.KEY_RENDERING,
                               RenderingHints.VALUE_RENDER_QUALITY);
            g.drawImage(src, 0, 0, nuevoAncho, nuevoAlto, null);
        } finally {
            g.dispose();
        }
        return scaled;
    }

    // ── Configuración Tesseract ──────────────────────────────────────────────

    private static final String OCR_LANG = "spa";

    private Tesseract crearTesseract() {
        Tesseract t = new Tesseract();
        t.setDatapath(resolverRutaTessdata());
        t.setLanguage(OCR_LANG);

        // PSM 6 — bloque uniforme de texto: lee las filas de la tabla de izquierda
        // a derecha sin intentar detectar columnas, preservando el orden natural de
        // los campos de cada estudiante en una sola línea de salida.
        t.setPageSegMode(6);

        // OEM 1 — motor LSTM (red neuronal): mejor reconocimiento de caracteres
        // impresos con diacríticos (tildes, ñ) que el modo legacy.
        t.setOcrEngineMode(1);

        // Evitar warnings de DPI en los logs de Tesseract.
        t.setTessVariable("user_defined_dpi", String.valueOf(Math.round(RENDER_DPI * SCALE_FACTOR)));

        // Preservar los espacios entre palabras: crucial para mantener la separación
        // visual entre columnas de la tabla PIAD (cédula, apellidos, nombre, tipo…).
        t.setTessVariable("preserve_interword_spaces", "1");

        // No intentar invertir la imagen (texto oscuro sobre fondo claro ya es correcto).
        t.setTessVariable("tessedit_do_invert", "0");

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

    // ── Parseo de texto OCR ──────────────────────────────────────────────────

    /**
     * Divide el texto OCR por líneas y ensambla filas de estudiantes.
     *
     * <p>Estrategia tolerante: si una línea contiene cédula se intenta extraer
     * el registro completo. Si falta algún campo opcional (tipo de adecuación,
     * nivel, grupo, fecha) el registro se incluye igualmente con esos campos
     * en null, para que el docente pueda corregirlos manualmente en la UI.
     * Solo se descarta una fila si no hay número de fila o si no hay al menos
     * un nombre/apellido identificable.
     */
    private void parsearTextoOCR(String texto, List<EstudiantePIADDto> resultado) {
        if (texto == null || texto.isBlank()) return;

        String[] lineas = texto.split("[\\r\\n]+");
        String lineaPendiente = "";  // acumula fragmentos de fila dividida por OCR

        for (String lineaRaw : lineas) {
            String linea = normalizarLineaOCR(lineaRaw);
            if (linea.isEmpty()) {
                lineaPendiente = "";
                continue;
            }

            // Intentar con la línea actual y también con la concatenación de
            // la línea pendiente (por si OCR partió una fila en dos líneas).
            String candidato = lineaPendiente.isEmpty() ? linea
                                                        : lineaPendiente + " " + linea;

            if (CEDULA.matcher(candidato).find()) {
                EstudiantePIADDto est = parsearLinea(candidato);
                if (est != null) {
                    resultado.add(est);
                    log.info("✓ Fila {} extraída: {} {}", est.getNumero(),
                             est.getPrimerApellido(), est.getNombre());
                    lineaPendiente = "";
                } else {
                    // La cédula existe pero el parseo falló: guardar como pendiente
                    // por si la siguiente línea contiene el resto de los campos.
                    lineaPendiente = candidato;
                }
            } else if (!lineaPendiente.isEmpty()) {
                // Acumular fragmento adicional (sin cédula) junto al anterior.
                lineaPendiente = candidato;
            }
        }
    }

    // ── Parseo de línea individual ───────────────────────────────────────────

    private EstudiantePIADDto parsearLinea(String linea) {
        try {
            Matcher cedulaMatcher = CEDULA.matcher(linea);
            if (!cedulaMatcher.find()) return null;

            String cedula      = normalizarCedula(cedulaMatcher.group(1));
            int    cedulaStart = cedulaMatcher.start();
            int    cedulaEnd   = cedulaMatcher.end();

            String prefijo = linea.substring(0, cedulaStart).trim();
            int    numero  = extraerNumeroFila(prefijo);
            if (numero <= 0) return null;

            String codigoEstado = extraerCodigoEstado(prefijo);
            String sufijo       = linea.substring(cedulaEnd).trim();

            // ── Tipo de adecuación (opcional) ───────────────────────────────
            String tipoAdecuacion = null;
            String antesDelTipo   = sufijo;
            String despuesDelTipo = "";

            Matcher tipoMatcher = TIPO_ADECUACION.matcher(sufijo);
            if (tipoMatcher.find()) {
                antesDelTipo   = sufijo.substring(0, tipoMatcher.start()).trim();
                tipoAdecuacion = normalizar(tipoMatcher.group(1));
                despuesDelTipo = sufijo.substring(tipoMatcher.end()).trim();
            }

            // ── Nombre y apellidos (mínimo 1 token) ─────────────────────────
            List<String> tokens = new ArrayList<>();
            for (String t : antesDelTipo.split("\\s+")) {
                String limpio = limpiarToken(t);
                if (!limpio.isEmpty()) tokens.add(limpio);
            }
            // Se requiere al menos el primer apellido.
            if (tokens.isEmpty()) {
                log.debug("Fila {}: sin tokens de nombre — línea: {}", numero, linea);
                return null;
            }

            String primerApellido  = tokens.get(0);
            String segundoApellido = tokens.size() > 1 ? tokens.get(1) : null;
            String nombre = tokens.size() > 2
                ? String.join(" ", tokens.subList(2, tokens.size()))
                : null;

            // ── Nivel (opcional) ─────────────────────────────────────────────
            String nivel           = null;
            String despuesDelNivel = despuesDelTipo;

            Matcher nivelMatcher = NIVEL.matcher(despuesDelTipo);
            if (nivelMatcher.find()) {
                nivel           = nivelMatcher.group(1);
                despuesDelNivel = despuesDelTipo.substring(nivelMatcher.end()).trim();
            }

            // ── Grupo (opcional) ─────────────────────────────────────────────
            Integer grupo = null;
            String[] restoTokens = despuesDelNivel.split("\\s+", 3);
            if (restoTokens.length >= 1) {
                try { grupo = Integer.parseInt(restoTokens[0]); }
                catch (NumberFormatException ignored) { /* campo ausente o malformado */ }
            }

            // ── Fecha de matrícula (opcional) ────────────────────────────────
            String fechaMatricula = null;
            Matcher fechaMatcher  = FECHA.matcher(despuesDelNivel);
            if (fechaMatcher.find()) fechaMatricula = fechaMatcher.group(1);

            return EstudiantePIADDto.builder()
                .numero(numero)
                .cedula(cedula)
                .primerApellido(primerApellido)
                .segundoApellido(segundoApellido)
                .nombre(nombre != null ? nombre : "")
                .tipoAdecuacion(tipoAdecuacion)
                .nivel(nivel)
                .grupo(grupo != null ? grupo : 0)
                .fechaMatricula(fechaMatricula)
                .codigoEstado(codigoEstado)
                .build();

        } catch (Exception e) {
            log.warn("Error parseando línea PIAD: {} | línea: {}", e.getMessage(), linea);
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
        return s
            // Normalizar separadores de línea a espacio
            .replaceAll("[\\r\\n]+", " ")
            // Reemplazar errores OCR comunes en el contexto de la tabla PIAD
            .replace("—", "-").replace("–", "-")
            .replace(" ", " ")   // non-breaking space
            .replaceAll("\\s{2,}", " ")
            .trim();
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
        // Correcciones OCR frecuentes en cédulas: U→0, |→1, I→1, O→0, Z→2
        String clean = raw
            .replace("U", "0").replace("|", "1").replace("I", "1")
            .replace("O", "0").replace("Z", "2").replace("l", "1");
        Matcher m = Pattern.compile("^(\\d)-(\\d{5,})-(\\d{3,5})$").matcher(clean);
        if (m.matches()) {
            String medio = m.group(2);
            medio = medio.substring(medio.length() - 4);
            clean = m.group(1) + "-" + medio + "-" + m.group(3);
        }
        return clean;
    }
}
