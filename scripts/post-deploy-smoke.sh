#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT=${ENVIRONMENT:-dev}
PROJECT_NAME=${PROJECT_NAME:-grocellery-app}
AWS_REGION=${AWS_REGION:-us-east-1}
SERVICES=${SERVICES:-cart,order,product,summary}
MAX_WAIT=${SMOKE_MAX_WAIT:-300}
SLEEP_SECONDS=${SMOKE_SLEEP_SECONDS:-10}

CLUSTER_NAME="${PROJECT_NAME}-${ENVIRONMENT}-cluster"
IFS=',' read -ra SERVICE_LIST <<< "${SERVICES}"

wait_for_targets() {
  local target_group_arn=$1
  local waited=0

  while [ ${waited} -lt ${MAX_WAIT} ]; do
    states=$(aws elbv2 describe-target-health \
      --target-group-arn "${target_group_arn}" \
      --query 'TargetHealthDescriptions[*].TargetHealth.State' \
      --output text \
      --region "${AWS_REGION}" || true)

    if [ -n "${states}" ] && echo "${states}" | grep -q "healthy"; then
      if ! echo "${states}" | grep -vq "healthy"; then
        echo "Target group ${target_group_arn} healthy after ${waited}s"
        return 0
      fi
    fi

    echo "Waiting for targets in ${target_group_arn} to become healthy (states: ${states:-none})"
    sleep "${SLEEP_SECONDS}"
    waited=$((waited + SLEEP_SECONDS))
  done

  echo "Timeout waiting for target group ${target_group_arn} to become healthy"
  return 1
}

rollback_service() {
  local service_name=$1
  local current_td=$2

  previous_td=$(aws ecs describe-services \
    --cluster "${CLUSTER_NAME}" \
    --services "${service_name}" \
    --query 'services[0].deployments[?status!=`PRIMARY`].taskDefinition | [0]' \
    --output text \
    --region "${AWS_REGION}" || true)

  if [ -z "${previous_td}" ] || [ "${previous_td}" = "None" ]; then
    echo "No previous deployment found for ${service_name}; re-deploying current task definition ${current_td}"
    previous_td=${current_td}
  else
    echo "Rolling back ${service_name} to ${previous_td}"
  fi

  aws ecs update-service \
    --cluster "${CLUSTER_NAME}" \
    --service "${service_name}" \
    --task-definition "${previous_td}" \
    --force-new-deployment \
    --region "${AWS_REGION}"
}

failures=0
for service in "${SERVICE_LIST[@]}"; do
  service_name="${PROJECT_NAME}-${ENVIRONMENT}-${service}"
  target_group_name="${service_name}-tg"

  echo "Checking deployment health for ${service_name}"
  target_group_arn=$(aws elbv2 describe-target-groups \
    --names "${target_group_name}" \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text \
    --region "${AWS_REGION}" || true)

  if [ -z "${target_group_arn}" ] || [ "${target_group_arn}" = "None" ]; then
    echo "Unable to locate target group ${target_group_name}; marking as failure"
    failures=$((failures + 1))
    continue
  fi

  if ! wait_for_targets "${target_group_arn}"; then
    current_td=$(aws ecs describe-services \
      --cluster "${CLUSTER_NAME}" \
      --services "${service_name}" \
      --query 'services[0].taskDefinition' \
      --output text \
      --region "${AWS_REGION}" || true)

    rollback_service "${service_name}" "${current_td:-}" || true
    failures=$((failures + 1))
  fi

done

if [ ${failures} -gt 0 ]; then
  echo "Smoke tests failed for ${failures} service(s)."
  exit 1
fi

echo "All services healthy after deployment."
