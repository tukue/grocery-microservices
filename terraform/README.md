# Multi-Environment Terraform Strategy Implementation

This directory contains the practical implementation of the multi-environment strategy described in the DevOps Practices Improvement Plan.

## Directory Structure

```
terraform/
├── environments/
│   ├── dev/
│   │   ├── backend.tf          # Dev environment backend config
│   │   └── terraform.tfvars    # Dev environment variables
│   ├── staging/
│   │   ├── backend.tf          # Staging environment backend config
│   │   └── terraform.tfvars    # Staging environment variables
│   └── prod/
│       ├── backend.tf          # Production environment backend config
│       └── terraform.tfvars    # Production environment variables
├── variables.tf                # Variable definitions
├── vpc.tf                     # VPC and networking resources
├── ecs.tf                     # ECS cluster and services
├── rds.tf                     # RDS database configuration
├── security_groups.tf         # Security group definitions
├── alb.tf                     # Application Load Balancer
├── iam.tf                     # IAM roles and policies
└── outputs.tf                 # Output definitions

scripts/
├── setup-environment.sh       # Environment setup script
└── deploy.sh                  # Multi-environment deployment script

.github/workflows/
└── multi-environment-cicd.yml # GitHub Actions CI/CD pipeline
```

## Environment Configuration

### Development Environment
- **Purpose**: Feature development and testing
- **Resources**: Minimal (t3.micro instances, single AZ)
- **Auto-deploy**: From feature branches and develop branch
- **Cost**: ~$50-100/month

### Staging Environment
- **Purpose**: Pre-production testing and validation
- **Resources**: Medium (t3.small instances, multi-AZ)
- **Auto-deploy**: From develop branch after dev deployment
- **Cost**: ~$150-250/month

### Production Environment
- **Purpose**: Live application serving users
- **Resources**: Optimized (t3.medium instances, multi-AZ, backups)
- **Auto-deploy**: From main branch with manual approval
- **Cost**: ~$300-500/month

## Quick Start

### 1. Setup AWS Infrastructure

```bash
# Setup development environment
./scripts/setup-environment.sh dev us-west-2

# Setup staging environment
./scripts/setup-environment.sh staging us-west-2

# Setup production environment
./scripts/setup-environment.sh prod us-west-2
```

### 2. Deploy to Development

```bash
# Initialize and deploy to dev
./scripts/deploy.sh dev init
./scripts/deploy.sh dev apply
```

### 3. Deploy to Staging

```bash
# Deploy to staging
./scripts/deploy.sh staging apply
```

### 4. Deploy to Production

```bash
# Plan production deployment
./scripts/deploy.sh prod plan

# Apply production deployment (after review)
./scripts/deploy.sh prod apply
```

## Environment-Specific Features

### Development
- Single AZ deployment for cost savings
- Smaller instance sizes
- 7-day log retention
- No deletion protection
- Simplified monitoring

### Staging
- Multi-AZ for testing high availability
- Medium instance sizes
- 14-day log retention
- Performance testing capabilities
- Full monitoring stack

### Production
- Multi-AZ with read replicas
- Larger instance sizes
- 30-day log retention
- Deletion protection enabled
- Comprehensive monitoring and alerting
- Automated backups with cross-region replication

## Security Configuration

### Secrets Management
All sensitive data is stored in AWS Systems Manager Parameter Store:

```
/grocellery/{environment}/database/password
/grocellery/{environment}/{service}/jwt/secret
```

### Network Security
- Private subnets for application and database
- Security groups with least privilege access
- NAT gateways for outbound internet access
- Application Load Balancer in public subnets

### IAM Roles
- Separate execution and task roles for ECS
- Minimal permissions for each service
- Parameter Store access for secrets

## Monitoring and Observability

### CloudWatch Integration
- Container insights enabled
- Custom log groups per service
- Environment-specific retention policies

### Health Checks
- Application Load Balancer health checks
- ECS service health monitoring
- Database connection monitoring

## Cost Optimization

### Development Environment
- Single AZ deployment
- Smaller instance classes
- Shorter log retention
- No Multi-AZ RDS

### Staging Environment
- Balanced resources for testing
- Medium instance classes
- Standard monitoring

### Production Environment
- Optimized for performance and reliability
- Auto-scaling enabled
- Comprehensive backup strategy

## CI/CD Integration

The GitHub Actions workflow automatically:

1. **Feature Branches**: Deploy to dev environment
2. **Develop Branch**: Deploy to dev → staging
3. **Main Branch**: Deploy through all environments with approvals

### Environment Protection Rules
- **Development**: No protection (auto-deploy)
- **Staging**: Require successful dev deployment
- **Production**: Require manual approval + successful staging deployment

## Troubleshooting

### Common Issues

1. **Backend Not Found**
   ```bash
   # Run setup script first
   ./scripts/setup-environment.sh <env> <region>
   ```

2. **Permission Denied**
   ```bash
   # Make scripts executable
   chmod +x scripts/*.sh
   ```

3. **Resource Already Exists**
   ```bash
   # Import existing resources or use different names
   terraform import aws_s3_bucket.state bucket-name
   ```

### Useful Commands

```bash
# Check environment status
./scripts/deploy.sh <env> plan

# View outputs
cd terraform/environments/<env>
terraform output

# Destroy environment (careful!)
./scripts/deploy.sh <env> destroy
```

## Best Practices

1. **Always run plan before apply**
2. **Use separate AWS accounts for production**
3. **Enable CloudTrail for audit logging**
4. **Regular backup testing**
5. **Monitor costs with AWS Cost Explorer**
6. **Use tags consistently across all resources**

## Next Steps

1. **Add monitoring dashboards** (Grafana/CloudWatch)
2. **Implement blue-green deployments**
3. **Add chaos engineering tests**
4. **Set up cross-region disaster recovery**
5. **Implement policy as code with OPA**