package com.atara.deb.ataraapi.config;

import com.atara.deb.ataraapi.model.AnioLectivo;
import com.atara.deb.ataraapi.service.AnioLectivoService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Garantiza que el año lectivo correspondiente al año natural en curso exista
 * con sus 3 trimestres, manteniéndolo al día sin intervención manual.
 *
 * <p>La verificación se dispara por tres vías complementarias:
 * <ul>
 *   <li><b>Al arrancar</b> ({@link CommandLineRunner}): tras Flyway, al iniciar la app.</li>
 *   <li><b>Programada</b> ({@link Scheduled}): periódicamente (por defecto, todos los
 *       días a las 00:05), de modo que el cambio de año se refleje aunque el
 *       servidor lleve meses encendido y nadie haya iniciado sesión.</li>
 *   <li><b>Bajo demanda</b>: {@code POST /api/anios-lectivos/asegurar-actual} (ADMIN).</li>
 * </ul>
 *
 * <p>La operación subyacente es idempotente, por lo que ejecutarla muchas veces
 * no tiene efecto si el año en curso ya existe. Cualquier fallo se registra como
 * advertencia y nunca interrumpe el arranque ni la ejecución de la aplicación.
 *
 * <p>La expresión cron es configurable con la propiedad
 * {@code atara.anio-lectivo.verificacion-cron} (formato cron de Spring, 6 campos).
 */
@Component
public class AnioLectivoInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(AnioLectivoInitializer.class);

    private final AnioLectivoService anioLectivoService;

    public AnioLectivoInitializer(AnioLectivoService anioLectivoService) {
        this.anioLectivoService = anioLectivoService;
    }

    /** Verificación al arrancar la aplicación (después de Flyway). */
    @Override
    public void run(String... args) {
        asegurar("arranque");
    }

    /**
     * Verificación periódica. Por defecto, todos los días a las 00:05. Como el
     * año natural solo cambia una vez al año, una comprobación diaria basta para
     * crear el nuevo año lectivo en cuanto entra en vigor, sin depender de
     * reinicios ni de que un ADMIN inicie sesión.
     */
    @Scheduled(cron = "${atara.anio-lectivo.verificacion-cron:0 5 0 * * *}",
               zone = "America/Costa_Rica")
    public void verificarProgramado() {
        asegurar("verificación programada");
    }

    private void asegurar(String origen) {
        try {
            AnioLectivo anio = anioLectivoService.asegurarAnioActual();
            log.info("Año lectivo en curso asegurado ({}): {}", origen, anio.getAnio());
        } catch (Exception e) {
            // Se registra el stacktrace completo (no solo getMessage()) para no ocultar
            // la causa real de un fallo en el arranque/tarea programada. La operación es
            // best-effort: nunca interrumpe el arranque ni la ejecución de la app.
            log.warn("No se pudo asegurar el año lectivo en curso ({})", origen, e);
        }
    }
}
