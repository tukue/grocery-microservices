# Stage 1: Build with Maven
FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /workspace/microservices/summary-service

# Copy service sources and parent POM so Maven can resolve the module hierarchy
COPY microservices/summary-service/pom.xml ./pom.xml
COPY microservices/summary-service/src ./src
COPY pom.xml /workspace/pom.xml

RUN mvn -f pom.xml clean install -DskipTests

# Stage 2: Create the image
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
COPY --from=build /workspace/microservices/summary-service/target/*.jar /app/app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
