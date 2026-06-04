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

# -Xmx380m  : heap máximo — deja margen para Tesseract nativo (~140 MB) + metaspace
# -Xms128m  : heap inicial — evita que el JVM reserve demasiado al arrancar
# UseG1GC   : GC más agresivo liberando memoria rápido entre requests
ENTRYPOINT ["java", \
  "-Xmx380m", "-Xms128m", \
  "-XX:MaxMetaspaceSize=120m", \
  "-XX:+UseG1GC", \
  "-XX:MaxGCPauseMillis=200", \
  "-jar", "app.jar"]
