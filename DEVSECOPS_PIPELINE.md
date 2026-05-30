# DevSecOps Pipeline for AWS Microservices

This repository demonstrates a consulting-style DevSecOps delivery model for four Spring Boot microservices deployed to AWS ECS Fargate with Terraform and CodePipeline.

## Pipeline Flow

1. Source changes enter AWS CodePipeline from the main branch.
2. CodeBuild runs secret detection, service tests, Dockerfile linting, image builds, SBOM generation, and image vulnerability scans.
3. Images are tagged with an immutable source tag such as `sha-abc123def456` and pushed to environment-specific ECR repositories.
4. Terraform plan runs per environment with formatting, validation, TFLint, tfsec, and Checkov gates.
5. Manual approvals separate dev, staging, and production promotions.
6. Terraform apply deploys the approved plan.
7. Post-deploy quick tests validate ECS service health and ALB target health.

## Security Gates

| Gate | Tooling | Fail Condition | Evidence |
| --- | --- | --- | --- |
| Secret detection | Gitleaks | Any detected secret | `gitleaks-report.sarif` |
| Unit and integration tests | Maven/Surefire | Any failing service test | `target/surefire-reports` |
| Dockerfile linting | Hadolint | Dockerfile policy violation | `hadolint-*.txt` |
| SBOM | Syft | Build failure | `sbom-*.cdx.json` |
| Image vulnerability scan | Trivy | Unfixed HIGH or CRITICAL CVE | `trivy-*.json` |
| Terraform validation | Terraform CLI | Invalid IaC | CodeBuild logs |
| Terraform formatting | Terraform CLI | Advisory formatting drift warning | CodeBuild logs |
| Terraform lint and security scan | TFLint, tfsec, Checkov | IaC lint or security failure | `tfsec-report.xml`, `checkov-report.xml` |
| Deployment approval | CodePipeline manual approval | Missing human approval | CodePipeline audit trail |
| Smoke and canary checks | Custom script + AWS APIs | Unhealthy ECS/ALB targets | `quick-test-results.json` |

## AWS Controls Demonstrated

- ECS Fargate runs each microservice in private subnets behind an Application Load Balancer.
- ECR repositories use encryption, scan-on-push, immutable image tags, and lifecycle cleanup for source-tagged images.
- CodePipeline and Terraform state artifacts are encrypted at rest, blocked from public access, versioned, and protected by TLS-only bucket policies.
- Runtime secrets are injected from AWS Secrets Manager and SSM Parameter Store instead of plaintext repository values.
- Terraform state is isolated per environment with an S3 backend and DynamoDB locking.
- Dev, staging, and production use separate promotion gates and Terraform workspaces.

## Bootstrap Note

The build stage expects the target ECR repositories to exist before it pushes images. Bootstrap the Terraform stack for each target environment, or narrow `TARGET_ENVIRONMENTS` to the environments already provisioned.

## Consulting Profile Talking Points

- **Traceability:** Every deployment maps to an immutable container tag derived from the source revision.
- **Shift-left security:** Secrets, Dockerfile policy, application dependencies, container images, and IaC are checked before deployment.
- **Auditable promotion:** Manual approvals and build artifacts provide a review trail for staging and production changes.
- **Rollback readiness:** ECS service health checks and post-deploy quick tests make failed deployments visible early.
- **Least surprise operations:** The same Terraform plan artifact that is reviewed is the artifact applied after approval.
