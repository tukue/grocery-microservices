# Grocellery App - Terraform Infrastructure

This directory contains the Terraform configuration for deploying the Grocellery microservices application to AWS.

## Architecture Overview

The infrastructure provisions:

- **VPC** with public and private subnets across multiple AZs
- **Application Load Balancer** for traffic distribution
- **ECS Fargate** cluster for container orchestration
- **RDS PostgreSQL** database with encryption and backups
- **ECR** repositories for container images
- **CloudWatch** monitoring and logging
- **Secrets Manager** for secure credential storage
- **CI/CD Pipeline** with CodePipeline and CodeBuild

## Prerequisites

- AWS CLI configured with appropriate credentials
- Terraform >= 1.5
- Docker (for local testing)

## Quick Start

### Option 1: Using Environment-Specific Configurations (Recommended)

1. **Navigate to terraform directory**:
   ```bash
   cd terraform
   ```

2. **Set database password**:
   ```bash
   export TF_VAR_initial_db_password="your-secure-password"
   ```

3. **Deploy to specific environment**:
   ```bash
   # For development
   ./deploy.sh dev plan
   ./deploy.sh dev apply
   
   # For staging
   ./deploy.sh staging plan
   ./deploy.sh staging apply
   
   # For production
   ./deploy.sh prod plan
   ./deploy.sh prod apply
   ```

   On Windows:
   ```cmd
   deploy.bat dev plan
   deploy.bat dev apply
   ```

### Option 2: Manual Configuration

1. **Copy and configure variables**:
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```

2. **Initialize and deploy**:
   ```bash
   terraform init
   terraform plan -var-file="terraform.tfvars"
   terraform apply -var-file="terraform.tfvars"
   ```

## Configuration

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `aws_region` | AWS region for deployment | `us-east-1` |
| `initial_db_password` | Database password (set via env var) | `SecurePass123!` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `project_name` | Project name for resource naming | `grocellery-app` |
| `environment` | Environment (dev/staging/prod) | `dev` |
| `enable_monitoring` | Enable CloudWatch monitoring | `true` |
| `enable_backup` | Enable RDS backups | `true` |
| `backup_retention_period` | Backup retention in days | `7` |

### Service Configuration

Each microservice can be configured individually:

```hcl
services = {
  cart = {
    port              = 8081
    cpu               = 256
    memory            = 512
    desired_count     = 1
    health_check_path = "/actuator/health"
  }
  # ... other services
}
```

## Security Features

- **Encryption at rest** for RDS and Secrets Manager using KMS
- **Network isolation** with private subnets for application and database
- **Security groups** with least privilege access
- **IAM roles** with minimal required permissions
- **Secrets management** via AWS Secrets Manager
- **Container security** with read-only root filesystem where possible

## Monitoring

When `enable_monitoring = true`, the following are created:

- CloudWatch Dashboard with key metrics
- CloudWatch Alarms for CPU, memory, and error rates
- Log aggregation and retention policies
- SNS topic for alert notifications
- CloudWatch Log Insights queries for troubleshooting

## Backup and Recovery

- **RDS automated backups** with configurable retention
- **Point-in-time recovery** enabled
- **Final snapshots** for production environments
- **Cross-region backup replication** (can be enabled)

## Cost Optimization

- **Fargate Spot** capacity providers for non-critical workloads
- **GP3 storage** for RDS with optimized IOPS
- **Log retention policies** to manage CloudWatch costs
- **ECR lifecycle policies** to clean up old images

## Environments

The configuration supports multiple environments with different AWS regions and resource configurations:

### Development (`environments/dev/`)
- **Region**: us-east-1
- **Resources**: Minimal (t3.micro RDS, 256 CPU, 512 MB memory)
- **Instances**: 1 per service
- **Backup retention**: 3 days

### Staging (`environments/staging/`)
- **Region**: us-west-2
- **Resources**: Medium (t3.small RDS, 512 CPU, 1024 MB memory)
- **Instances**: 2 per service
- **Backup retention**: 7 days

### Production (`environments/prod/`)
- **Region**: us-east-1
- **Resources**: Large (r5.large RDS, 1024 CPU, 2048 MB memory)
- **Instances**: 3 per service across 3 AZs
- **Backup retention**: 30 days
- **Enhanced monitoring and deletion protection enabled**

### Switching Regions

To deploy to a different region, modify the `aws_region` in the respective environment's `terraform.tfvars` file:

```hcl
# In environments/dev/terraform.tfvars
aws_region = "eu-west-1"  # Change to desired region
```

## CI/CD Integration

The Terraform configuration includes:

- **CodePipeline** for automated deployments
- **CodeBuild** projects for building and testing
- **ECR integration** for container image management
- **Terraform state management** in the pipeline

## Outputs

After deployment, Terraform outputs important information:

```bash
terraform output
```

Key outputs include:
- ALB DNS name for accessing services
- RDS endpoint for database connections
- ECR repository URLs for pushing images
- Service URLs for each microservice

## Troubleshooting

### Common Issues

1. **Permission Errors**: Ensure your AWS credentials have sufficient permissions
2. **Resource Limits**: Check AWS service limits in your region
3. **Network Issues**: Verify VPC and subnet configurations
4. **Database Connection**: Check security groups and network ACLs

### Useful Commands

```bash
# View current state
terraform show

# Import existing resources
terraform import aws_instance.example i-1234567890abcdef0

# Refresh state
terraform refresh

# Validate configuration
terraform validate

# Format code
terraform fmt -recursive
```

## Cleanup

To destroy all resources:

```bash
terraform destroy
```

**Warning**: This will delete all resources including databases. Ensure you have backups if needed.

## Module Structure

```
terraform/
├── main.tf                 # Main configuration and VPC
├── variables.tf            # Variable definitions
├── outputs.tf             # Output definitions
├── services.tf            # ECS services and ECR
├── ecs-cluster.tf         # ECS cluster configuration
├── alb.tf                 # Application Load Balancer
├── rds.tf                 # Database configuration
├── secrets.tf             # Secrets Manager
├── security-groups.tf     # Security group rules
├── monitoring.tf          # CloudWatch monitoring
├── cicd.tf               # CI/CD pipeline
├── modules/
│   └── ecs/              # ECS service module
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
└── environments/         # Environment-specific configs
    └── dev/
        └── terraform.tfvars
```

## Best Practices

1. **State Management**: Use remote state with S3 and DynamoDB locking
2. **Variable Validation**: All variables include validation rules
3. **Resource Tagging**: Consistent tagging strategy for cost allocation
4. **Security**: Least privilege IAM policies and encrypted storage
5. **Monitoring**: Comprehensive observability with alerts
6. **Documentation**: All resources include descriptions and tags

## Contributing

1. Follow Terraform best practices
2. Update documentation for any changes
3. Test in development environment first
4. Use consistent naming conventions
5. Add appropriate tags to all resources

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review AWS CloudWatch logs
3. Consult Terraform documentation
4. Contact the DevOps team