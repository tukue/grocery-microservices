# Recommended MVP AWS Stack

## Goal

Deploy the existing Spring Boot microservices and a React/TypeScript storefront with low operational overhead. This stack prioritizes a working customer journey over platform complexity.

## Recommended Services

| Need | AWS service | MVP responsibility |
| --- | --- | --- |
| React/TypeScript frontend | Amazon S3 + CloudFront + ACM | Private static asset hosting, CDN delivery, and HTTPS. |
| Domain and DNS | Amazon Route 53 | Customer-facing application domain and DNS records. |
| Spring Boot services | Amazon ECS on AWS Fargate | Runs the existing `product`, `cart`, `order`, and `summary` containers without operating servers. |
| Container registry | Amazon ECR | Stores versioned service images built by CI. |
| API entry point | Application Load Balancer | Terminates TLS and routes `/api/*` requests to ECS services. |
| Internal discovery | AWS Cloud Map | Resolves private service names such as `product-service` and `cart-service`. |
| Customer identity | Amazon Cognito User Pools | Managed sign-up/sign-in and OIDC JWTs for React and Spring services. |
| Relational data | Amazon RDS for PostgreSQL | Managed persistence, with an isolated database per service. |
| Secrets | AWS Secrets Manager | Database credentials and sensitive runtime configuration. |
| Logs and alarms | Amazon CloudWatch | Centralized logs, health signals, and basic customer-impact alarms. |
| Infrastructure | Terraform | Repeatable environments and reviewed infrastructure changes. |
| CI/CD | GitHub Actions | Runs tests, publishes images to ECR, and updates ECS services. |

## Request Flow

```text
Browser
  -> Route 53
  -> CloudFront + S3 (React application)
  -> ALB /api/*
  -> ECS Fargate (Spring Boot services)
  -> RDS PostgreSQL

Cognito -> JWT -> React -> ALB -> Spring services
```

## Network Boundaries

- Place the ALB in public subnets.
- Place ECS tasks and RDS instances in private subnets.
- Allow the ALB security group to reach service ports only.
- Allow each service security group to reach only its own database and required downstream services.
- Keep RDS inaccessible from the public internet.
- Use Cloud Map DNS names for service-to-service calls; keep URLs externalized through environment variables.

## Deployment Sequence

1. Provision VPC, subnets, security groups, Route 53, ACM, ECR, and CloudWatch resources with Terraform.
2. Provision Cognito and configure React callback/logout URLs.
3. Provision RDS databases and put credentials in Secrets Manager.
4. Build and test the React application; deploy assets to S3 and invalidate CloudFront.
5. Build, test, scan, and push each Spring Boot container image to ECR.
6. Deploy ECS services and configure ALB health checks using Spring Actuator.
7. Run a smoke test: catalog browse, authenticated cart change, checkout, and order retrieval.

## Environment Configuration

- Store non-secret values such as service DNS names, allowed origins, and profile names in ECS task environment variables or Parameter Store.
- Store database passwords, Cognito client secrets, and other sensitive values in Secrets Manager.
- Use `PRODUCT_SERVICE_BASE_URL` and `CART_SERVICE_BASE_URL` with Cloud Map hostnames in ECS; do not depend on localhost URLs.

## Explicitly Deferred

- EKS/Kubernetes and service mesh.
- Kafka, distributed sagas, and event-driven workflows.
- Redis caching unless catalog traffic proves a need.
- Multi-region deployment and advanced autoscaling.
- A dedicated BFF/API gateway unless React requires orchestration beyond stable service APIs.

## MVP Definition of Done

- A customer can access the React app over HTTPS through a custom domain.
- A customer can authenticate with Cognito, browse products, manage an owned cart, and complete checkout.
- Services run in private ECS Fargate tasks and use private RDS databases.
- CI deploys versioned frontend assets and backend images.
- CloudWatch logs and health alarms make a broken customer flow diagnosable.
