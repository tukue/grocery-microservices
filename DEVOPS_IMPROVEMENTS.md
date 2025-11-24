# DevOps Improvements Roadmap

This repository is a showcase for production-ready microservice CI/CD. The list below captures next-step improvements in a dedicated place so the README can stay focused on getting started.

## Pipeline hardening
- Add per-service unit and integration test stages with profile-specific configs and publish JUnit/Surefire reports as build artifacts.
- Generate SBOMs (e.g., Syft) and run image vulnerability scans (e.g., Trivy) before pushing to registries.
- Sign container images and gate promotions on signature verification and scan results.

## Secrets and configuration
- Replace example database credentials and JWT secrets with parameters from AWS Secrets Manager or SSM Parameter Store, injected through ECS task definitions and Terraform variables per environment.
- Use distinct secrets per environment and rotate them automatically; enforce sealed secret handling in CI (no plaintext in logs or artifacts).

## Promotion flow and environments
- Split CodeBuild/CodePipeline stages by environment (dev → staging → prod) with manual approvals and drift detection.
- Add automated smoke tests or canary checks after deploys and fail forward if target group health does not recover.
- Maintain separate Terraform workspaces/state files per environment for clean isolation and reproducible rollbacks.

## Observability
- Standardize structured JSON logging and propagate trace headers across services for distributed tracing.
- Ship logs, metrics, and traces to a central sink (CloudWatch + OpenTelemetry collector feeding Prometheus/Grafana).
- Define SLOs with alerting rules (error rate, latency, saturation) and dashboards aligned to user journeys.

## Runtime resilience
- Configure ALB health checks and container readiness/liveness probes; block traffic until containers are ready.
- Apply timeouts, retries, and circuit breakers on inter-service calls to prevent cascading failures.
- Enable ECS autoscaling based on CPU/memory plus custom latency/error-rate metrics; validate with chaos drills.
