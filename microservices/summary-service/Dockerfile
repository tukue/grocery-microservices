# Stage 1: Build with Maven
FROM maven:3.9-eclipse-temurin-25 AS build
WORKDIR /workspace

# Copy parent and service sources preserving relative paths so Maven can resolve the module hierarchy
COPY pom.xml /workspace/pom.xml
COPY microservices/summary-service/pom.xml /workspace/microservices/summary-service/pom.xml
COPY microservices/summary-service/src /workspace/microservices/summary-service/src

WORKDIR /workspace/microservices/summary-service
RUN mvn clean install -DskipTests

# Stage 2: Create the image
FROM eclipse-temurin:25-jre-noble
WORKDIR /app
RUN addgroup --system app && adduser --system --ingroup app app
COPY --from=build --chown=app:app /workspace/microservices/summary-service/target/*-exec.jar /app/app.jar
USER app
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
