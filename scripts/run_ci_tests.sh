#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVICES=(cart-service order-service product-service summary-service)

prepare_test_properties() {
  for service in "${SERVICES[@]}"; do
    example_file="${ROOT_DIR}/microservices/${service}/src/test/resources/application-test.properties.example"
    target_file="${ROOT_DIR}/microservices/${service}/src/test/resources/application-test.properties"

    if [[ -f "${example_file}" ]]; then
      cp "${example_file}" "${target_file}"
    fi
  done
}

run_monolith_tests() {
  (cd "${ROOT_DIR}" && mvn -B test --file monolith/pom.xml)
}

run_microservice_tests() {
  prepare_test_properties
  for service in "${SERVICES[@]}"; do
    (cd "${ROOT_DIR}/microservices/${service}" && mvn -B test -Dspring.profiles.active=test)
  done
}

run_smoke_tests() {
  pushd "${ROOT_DIR}/microservices" >/dev/null
  docker compose up -d cart-db order-db product-db summary-db cart-service order-service product-service summary-service

  for target in "cart-service:8081" "order-service:8082" "product-service:8083" "summary-service:8084"; do
    service="${target%%:*}"
    port="${target##*:}"
    echo "Waiting for ${service} on port ${port}..."
    timeout 120s bash -c "until curl -fsS http://localhost:${port}/actuator/health; do sleep 5; done"
  done

  docker compose logs --no-color > ../microservice-smoke.log
  docker compose down --volumes
  popd >/dev/null
}

usage() {
  cat <<USAGE
Usage: $(basename "$0") [--smoke]

Runs the same test steps used in CI:
  1. Monolith Maven tests
  2. Microservice Maven tests (with the test profile)
  3. Optional smoke tests that start the docker-compose stack and wait for health endpoints

Options:
  --smoke    Run the docker-compose smoke tests after unit/integration tests
  -h|--help  Show this help message
USAGE
}

main() {
  local run_smoke=false

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --smoke)
        run_smoke=true
        shift
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        echo "Unknown option: $1" >&2
        usage
        exit 1
        ;;
    esac
  done

  run_monolith_tests
  run_microservice_tests

  if [[ "${run_smoke}" == true ]]; then
    run_smoke_tests
  fi
}

main "$@"
