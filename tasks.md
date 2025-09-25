# Tasks for Improving and Deploying the Grocellery Microservice to AWS Cloud

## 1. Project Overview

*   ✅ The "clean-code-grocellery-app" is a Spring Boot microservice with a clear architectural separation into `controller`, `service`, `repository`, and `model` layers.
*   [ ] The application currently does not use external configuration files in `src/main/resources`.

## 2. Local Development Setup

The local development environment is managed using `docker-compose`. The `microservices/docker-compose.yml` file defines the backing services required to run the application, including:

*   **Databases**: A separate PostgreSQL database for each microservice (`cart-db`, `order-db`, `product-db`, `summary-db`).
*   **Monitoring**: A `Prometheus` instance for metrics collection and a `Grafana` instance for visualization.

To start the local development environment, run `docker-compose up` from the `microservices` directory. The Spring Boot applications can then be started from your IDE, and they will connect to the services running in Docker.

## 3. Improvements

*   [ ] **Code Quality & Best Practices**
*   [ ] **Performance Optimization**
*   ✅ **Security Enhancements**
*   [ ] **Configuration Management**

## 4. AWS Deployment with Terraform

*   ✅ **Terraform for Infrastructure Provisioning**
*   ✅ **Containerization (Docker)**
*   ✅ **CI/CD Pipeline Implementation**
*   ✅ **Monitoring Stack Implementation**

---

## 5. Deployment and Verification Steps (Manual)

These steps are to be performed by the developer to deploy and verify the infrastructure and CI/CD pipeline.

### 5.1 Configure Network Settings

**IMPORTANT**: Before deploying, you must provide your specific network configuration.

1.  Open the file: `terraform/modules/ecs/main.tf`
2.  Locate the `aws_ecs_service` resource.
3.  Replace the placeholder values for `subnets` and `security_groups` with your actual VPC subnet and security group IDs.

### 5.2 Deploy the Infrastructure & Pipeline

1.  Navigate to the `terraform` directory in your terminal.
2.  Run `terraform init` to initialize the Terraform working directory.
3.  Run `terraform apply` to create all AWS resources, including the ECS cluster, service, and the CodePipeline.

### 5.3 Verify the Pipeline

1.  After the `terraform apply` is complete, navigate to the AWS CodePipeline console to see your new `grocellery-pipeline`.
2.  Push a code change to the `main` branch of your CodeCommit repository.
3.  Verify that the pipeline is triggered and that each stage completes successfully.

---

## 6. Detailed Task Breakdown

### 6.1 Specific Improvement Tasks

*   **Task**: [ ] Conduct a code review.
*   **Task**: [ ] Implement comprehensive unit and integration tests.
*   **Task**: [ ] Enhance error handling and logging.
*   **Task**: [ ] Analyze and optimize database queries.
*   **Task**: [ ] Implement caching.
*   **Task**: ✅ Implement Spring Security.
*   **Task**: ✅ Validate all incoming request data.
*   **Task**: [ ] Externalize application configuration.

### 6.2 Specific AWS Deployment Tasks (Done)

*   ✅ **Containerization (Docker)**
*   ✅ **Database Setup (Terraform)**
*   ✅ **Application Deployment (Terraform for ECS with Fargate)**
    *   ✅ Defined ECS Cluster, Service, and Task Definition.
*   ✅ **Networking & Security (Terraform)**
*   ✅ **Monitoring & Logging (Terraform)**
*   ✅ **CI/CD Pipeline (Terraform)**
    *   ✅ **Buildspec**: Created `buildspec.yml`.
    *   ✅ **CodePipeline Infrastructure**: Defined in `terraform/cicd.tf`.
    *   ✅ **Terraform Integration**: Integrated `plan` and `apply` stages.
*   ✅ **Provision Monitoring Stack on AWS**
    *   ✅ Defined Amazon Managed Prometheus and Grafana resources in `terraform/monitoring.tf`.
