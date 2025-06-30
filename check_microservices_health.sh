#!/bin/bash

# Start each microservice in the background on different ports
# (Assumes each service can be started with -Dserver.port=PORT)

SERVICES=(cart-service order-service product-service summary-service)
PORTS=(8081 8082 8083 8084)

for i in ${!SERVICES[@]}; do
  SERVICE=${SERVICES[$i]}
  PORT=${PORTS[$i]}
  echo "Starting $SERVICE on port $PORT..."
  mvn spring-boot:run -pl microservices/$SERVICE -Dspring-boot.run.arguments="--server.port=$PORT" &
  PIDS[$i]=$!
done

# Wait a bit for services to start
sleep 30

echo "\nChecking health endpoints:"
for i in ${!SERVICES[@]}; do
  PORT=${PORTS[$i]}
  SERVICE=${SERVICES[$i]}
  echo -n "$SERVICE (port $PORT): "
  curl -s http://localhost:$PORT/actuator/health || echo "No response"
done
