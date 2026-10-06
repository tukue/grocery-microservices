# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: Build
# Copies only the files Maven needs for this module so layer cache is
# invalidated only when pom.xml or src/ changes, not when sibling services
# change.
# ─────────────────────────────────────────────────────────────────────────────
FROM maven:3.9-eclipse-temurin-25 AS build
WORKDIR /workspace

# Parent POM first — changing it invalidates the dependency-resolution cache
COPY pom.xml /workspace/pom.xml
COPY microservices/gateway-service/pom.xml /workspace/microservices/gateway-service/pom.xml
COPY microservices/gateway-service/src     /workspace/microservices/gateway-service/src

WORKDIR /workspace/microservices/gateway-service
RUN mvn clean package -DskipTests

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: Runtime
# Minimal JRE image, non-root user, read-only filesystem.
# Matches the hardening posture of every other service in this repo.
# ─────────────────────────────────────────────────────────────────────────────
FROM eclipse-temurin:25-jre-noble
WORKDIR /app

# Create a dedicated system user; never run as root in production containers
RUN addgroup --system app && adduser --system --ingroup app app

COPY --from=build --chown=app:app \
    /workspace/microservices/gateway-service/target/*.jar /app/app.jar

USER app

# 8080 is the internal container port (host port 8085 is mapped in compose)
EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
