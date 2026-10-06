@echo off
setlocal
set "JAVA_HOME=C:\Program Files\Java\jdk-22"
set "PATH=%JAVA_HOME%\bin;%PATH%"
cd /d C:\Users\tukue\grocery-microservices\microservices\ledger-service
"%JAVA_HOME%\bin\java.exe" -jar target\ledger-service-1.0-SNAPSHOT-exec.jar ^
  --spring.profiles.active=docker ^
  --spring.datasource.url=jdbc:postgresql://localhost:55432/grocery ^
  --spring.datasource.username=test ^
  --spring.datasource.password=test ^
  --spring.flyway.locations=classpath:db/migration/ledger ^
  --app.kafka.admin.fail-fast=false ^
  --spring.kafka.listener.auto-startup=false ^
  --security.jwt.demo-enabled=true ^
  --app.cors.allowed-origins=http://localhost:3000 ^
  --server.port=18099 > run-validate.log 2>&1
