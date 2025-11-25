# Stage 1: Build with Maven
FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /workspace

# Copy parent and service sources preserving relative paths so Maven can resolve the module hierarchy
COPY pom.xml /workspace/pom.xml
COPY microservices/order-service/pom.xml /workspace/microservices/order-service/pom.xml
COPY microservices/order-service/src /workspace/microservices/order-service/src

WORKDIR /workspace/microservices/order-service
RUN mvn clean install -DskipTests

# Stage 2: Create the image
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
COPY --from=build /workspace/microservices/order-service/target/*.jar /app/app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
