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

wait_for_service() {
  local service=$1
  local port=$2
  local retries=40
  local delay=3

  echo "Waiting for $service on port $port..."
  for ((attempt=1; attempt<=retries; attempt++)); do
    if curl -fsS "http://localhost:${port}/actuator/health" > /dev/null; then
      echo "$service is healthy."
      return 0
    fi
    sleep "$delay"
  done

  echo "Timed out waiting for $service on port $port." >&2
  return 1
}

for i in ${!SERVICES[@]}; do
  wait_for_service "${SERVICES[$i]}" "${PORTS[$i]}" || true
done

echo ""
echo "Checking health endpoints:"
for i in ${!SERVICES[@]}; do
  PORT=${PORTS[$i]}
  SERVICE=${SERVICES[$i]}
  echo -n "$SERVICE (port $PORT): "
  curl -fsS http://localhost:$PORT/actuator/health || echo "No response"
done
