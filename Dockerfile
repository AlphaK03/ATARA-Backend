# ─── Etapa 1: compilación ────────────────────────────────────────────────────
FROM eclipse-temurin:17-jdk-jammy AS build
WORKDIR /build

# Descargar dependencias primero (cacheado si pom.xml no cambia)
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw dependency:go-offline -q

COPY src/ src/
RUN ./mvnw package -DskipTests -q

# ─── Etapa 2: runtime ────────────────────────────────────────────────────────
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app

# Tesseract OCR — requerido por el extractor PIAD
RUN apt-get update && \
    apt-get install -y --no-install-recommends tesseract-ocr && \
    rm -rf /var/lib/apt/lists/*

# Modelo de español — copiado desde el repo al path estándar del sistema
COPY scripts/extractor-piad/tessdata/spa.traineddata /usr/share/tessdata/

COPY --from=build /build/target/atara-api-0.0.1-SNAPSHOT.jar app.jar

EXPOSE 8081

# JAVA_TOOL_OPTIONS se aplica automáticamente a cualquier proceso Java.
# Railway puede sobrescribir esta variable desde su panel de entorno.
# -Xmx350m            : heap máximo — deja ~600 MB libres para Tesseract nativo y SO
# -XX:MaxRAMPercentage : fallback por si Railway cambia el límite del contenedor
# -XX:MaxMetaspaceSize : limita metaspace de clases Spring
# -XX:+UseG1GC         : GC que libera memoria al SO entre requests
ENV JAVA_TOOL_OPTIONS="-Xmx350m -XX:MaxRAMPercentage=60.0 -XX:MaxMetaspaceSize=120m -XX:+UseG1GC -XX:MaxGCPauseMillis=200"

ENTRYPOINT ["java", "-jar", "app.jar"]
