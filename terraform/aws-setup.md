# AWS Setup Guide

## Prerequisites

Before running Terraform, you need to configure AWS credentials.

## Option 1: AWS CLI Configuration (Recommended)

1. **Configure AWS CLI**:
   ```bash
   aws configure
   ```

2. **Enter your credentials when prompted**:
   - AWS Access Key ID: `[Your Access Key]`
   - AWS Secret Access Key: `[Your Secret Key]`
   - Default region name: `us-east-1`
   - Default output format: `json`

## Option 2: Environment Variables

Set these environment variables:

```bash
# Windows Command Prompt
set AWS_ACCESS_KEY_ID=your-access-key-id
set AWS_SECRET_ACCESS_KEY=your-secret-access-key
set AWS_DEFAULT_REGION=us-east-1

# Windows PowerShell
$env:AWS_ACCESS_KEY_ID="your-access-key-id"
$env:AWS_SECRET_ACCESS_KEY="your-secret-access-key"
$env:AWS_DEFAULT_REGION="us-east-1"
```

## Option 3: AWS Credentials File

Create/edit `C:\Users\%USERNAME%\.aws\credentials`:

```ini
[default]
aws_access_key_id = your-access-key-id
aws_secret_access_key = your-secret-access-key
```

Create/edit `C:\Users\%USERNAME%\.aws\config`:

```ini
[default]
region = us-east-1
output = json
```

## Getting AWS Credentials

If you don't have AWS credentials:

1. **Sign in to AWS Console**
2. **Go to IAM** → Users → Your User
3. **Security credentials** tab
4. **Create access key** → Command Line Interface (CLI)
5. **Download** the credentials

## Required IAM Permissions

Your AWS user needs these permissions:
- EC2 (VPC, Subnets, Security Groups)
- RDS (Database instances)
- ECS (Clusters, Services, Tasks)
- ELB (Load Balancers)
- ECR (Container Registry)
- IAM (Roles, Policies)
- CloudWatch (Logs, Metrics)

## Verify Setup

Test your credentials:

```bash
aws sts get-caller-identity
```

Should return your AWS account information.

## Next Steps

After configuring credentials:

1. Run `terraform plan` again
2. Review the planned resources
3. Run `terraform apply` to create infrastructure