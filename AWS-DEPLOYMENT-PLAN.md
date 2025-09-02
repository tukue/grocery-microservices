# AWS Deployment Plan - Clean Code Grocellery Microservices

## Overview
This plan outlines the deployment of the Clean Code Grocellery microservices application to AWS using containerized architecture with ECS, RDS, and supporting AWS services.

## Current Architecture Analysis
- **4 Spring Boot Microservices**: cart-service, order-service, product-service, summary-service
- **Technology Stack**: Java 21, Spring Boot 3.2.5, PostgreSQL, JWT Authentication
- **Current Ports**: 8081-8084
- **Monitoring**: Prometheus, Grafana, Spring Actuator
- **Database**: PostgreSQL per service (microservice pattern)

## AWS Target Architecture

### 1. Container Orchestration
**Amazon ECS with Fargate**
- Serverless container management
- Auto-scaling capabilities
- No EC2 instance management
- Cost-effective for microservices

### 2. Database Layer
**Amazon RDS PostgreSQL**
- Multi-AZ deployment for high availability
- Separate RDS instance per microservice
- Automated backups and maintenance
- Enhanced security with VPC isolation

### 3. Load Balancing & Networking
**Application Load Balancer (ALB)**
- Path-based routing to microservices
- Health checks integration
- SSL/TLS termination
- Integration with AWS Certificate Manager

### 4. Service Discovery
**AWS Cloud Map**
- Service registration and discovery
- DNS-based service resolution
- Health checking integration

## Deployment Strategy

### Phase 1: Infrastructure Setup (Week 1)

#### 1.1 VPC and Networking
```
- Create VPC with public/private subnets across 2 AZs
- Internet Gateway for public subnets
- NAT Gateway for private subnet internet access
- Security Groups for each service tier
```

#### 1.2 Database Setup
```
- 4 RDS PostgreSQL instances (one per microservice)
- db.t3.micro for development/testing
- Multi-AZ for production
- Automated backups enabled
- Parameter groups for optimization
```

#### 1.3 Container Registry
```
- Amazon ECR repositories for each microservice
- Lifecycle policies for image management
- Vulnerability scanning enabled
```

### Phase 2: Application Containerization (Week 2)

#### 2.1 Dockerfile Creation
Create optimized Dockerfiles for each microservice:
```dockerfile
FROM openjdk:21-jre-slim
COPY target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app.jar"]
```

#### 2.2 Build Pipeline
```
- GitHub Actions workflow for CI/CD
- Multi-stage builds for optimization
- Security scanning integration
- Automated ECR push
```

### Phase 3: ECS Deployment (Week 3)

#### 3.1 ECS Cluster Setup
```
- ECS Cluster with Fargate capacity providers
- Task definitions for each microservice
- Service definitions with auto-scaling
- Load balancer target group integration
```

#### 3.2 Service Configuration
```
- Environment variables for database connections
- AWS Secrets Manager for JWT secrets
- CloudWatch logging configuration
- Health check endpoints configuration
```

### Phase 4: Monitoring & Security (Week 4)

#### 4.1 Monitoring Stack
```
- CloudWatch for metrics and logs
- AWS X-Ray for distributed tracing
- CloudWatch Dashboards
- SNS alerts for critical metrics
```

#### 4.2 Security Implementation
```
- IAM roles and policies
- VPC security groups
- AWS Secrets Manager integration
- SSL/TLS certificates via ACM
```

## Detailed Implementation

### 1. Infrastructure as Code (Terraform)

#### 1.1 VPC Configuration
```hcl
# VPC with public/private subnets
# Internet Gateway and NAT Gateway
# Route tables and security groups
```

#### 1.2 RDS Configuration
```hcl
# 4 PostgreSQL RDS instances
# Subnet groups and parameter groups
# Security groups for database access
```

#### 1.3 ECS Configuration
```hcl
# ECS cluster and capacity providers
# Task definitions and services
# Load balancer and target groups
```

### 2. Application Configuration

#### 2.1 Environment-Specific Properties
```properties
# Production application.properties
spring.datasource.url=${DB_URL}
spring.datasource.username=${DB_USERNAME}
spring.datasource.password=${DB_PASSWORD}
server.port=8080
management.endpoints.web.exposure.include=health,info,metrics
```

#### 2.2 Docker Compose for Local Development
```yaml
# Updated docker-compose.yml for AWS compatibility
# Environment variable mapping
# Health check configurations
```

### 3. CI/CD Pipeline

#### 3.1 GitHub Actions Workflow
```yaml
# Build and test pipeline
# Docker image creation and push to ECR
# ECS service deployment
# Rollback capabilities
```

#### 3.2 Deployment Scripts
```bash
# Automated deployment scripts
# Database migration scripts
# Health check validation
```

## Service Mapping

### Current → AWS Mapping
| Current Service | AWS ECS Service | Port | Database |
|----------------|----------------|------|----------|
| cart-service | cart-service-ecs | 8080 | cart-rds |
| order-service | order-service-ecs | 8080 | order-rds |
| product-service | product-service-ecs | 8080 | product-rds |
| summary-service | summary-service-ecs | 8080 | summary-rds |

### Load Balancer Routing
```
ALB Listener Rules:
- /cart/* → cart-service-ecs
- /order/* → order-service-ecs  
- /product/* → product-service-ecs
- /summary/* → summary-service-ecs
```

## Cost Estimation

### Development Environment
- **ECS Fargate**: ~$50/month (0.25 vCPU, 0.5GB per service)
- **RDS**: ~$60/month (4 × db.t3.micro)
- **ALB**: ~$20/month
- **Data Transfer**: ~$10/month
- **Total**: ~$140/month

### Production Environment
- **ECS Fargate**: ~$200/month (1 vCPU, 2GB per service)
- **RDS**: ~$300/month (4 × db.t3.small with Multi-AZ)
- **ALB**: ~$20/month
- **CloudWatch**: ~$30/month
- **Data Transfer**: ~$50/month
- **Total**: ~$600/month

## Security Considerations

### 1. Network Security
- VPC with private subnets for applications
- Security groups with least privilege access
- NACLs for additional network layer security

### 2. Application Security
- JWT secrets stored in AWS Secrets Manager
- Database credentials rotation
- Container image vulnerability scanning

### 3. Data Security
- RDS encryption at rest and in transit
- CloudWatch logs encryption
- S3 bucket encryption for artifacts

## Monitoring & Observability

### 1. Application Metrics
- Spring Boot Actuator metrics
- Custom business metrics
- Performance monitoring

### 2. Infrastructure Metrics
- ECS service metrics
- RDS performance metrics
- ALB metrics and access logs

### 3. Alerting
- CloudWatch alarms for critical metrics
- SNS notifications
- PagerDuty integration for production

## Rollback Strategy

### 1. Blue-Green Deployment
- ECS service update with rolling deployment
- Health check validation before traffic switch
- Automatic rollback on failure

### 2. Database Rollback
- RDS automated backups
- Point-in-time recovery
- Database migration versioning

## Next Steps

### Immediate Actions (Week 1)
1. Set up AWS account and IAM users
2. Create Terraform infrastructure code
3. Set up ECR repositories
4. Configure GitHub Actions secrets

### Development Phase (Week 2-3)
1. Create Dockerfiles for each microservice
2. Update application properties for AWS
3. Implement CI/CD pipeline
4. Test deployment in development environment

### Production Deployment (Week 4)
1. Deploy to production environment
2. Configure monitoring and alerting
3. Perform load testing
4. Document operational procedures

## Success Criteria

### Technical
- All 4 microservices deployed and accessible
- Database connectivity established
- Health checks passing
- Monitoring dashboards operational

### Performance
- Response time < 500ms for 95% of requests
- 99.9% uptime SLA
- Auto-scaling working correctly
- Zero-downtime deployments

### Security
- All security scans passing
- Secrets properly managed
- Network isolation implemented
- SSL/TLS encryption enabled

## Risk Mitigation

### 1. Deployment Risks
- Staged deployment approach
- Comprehensive testing in staging
- Rollback procedures documented

### 2. Performance Risks
- Load testing before production
- Auto-scaling configuration
- Performance monitoring

### 3. Security Risks
- Security scanning in CI/CD
- Regular security audits
- Incident response procedures

## Conclusion

This deployment plan provides a comprehensive approach to migrating the Clean Code Grocellery microservices to AWS. The plan emphasizes:

- **Scalability**: ECS Fargate auto-scaling
- **Reliability**: Multi-AZ deployment and health checks
- **Security**: VPC isolation and secrets management
- **Observability**: Comprehensive monitoring and alerting
- **Cost Optimization**: Right-sized resources with scaling

The phased approach ensures minimal risk while providing a robust, production-ready deployment on AWS.