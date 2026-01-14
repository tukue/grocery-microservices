#!/bin/bash

set -e

# Environment Setup Script
# Creates S3 buckets and DynamoDB tables for Terraform state management
# Usage: ./setup-environment.sh <environment> <region>

ENVIRONMENT=${1:-dev}
REGION=${2:-us-west-2}

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    echo "Error: Environment must be dev, staging, or prod"
    exit 1
fi

echo "🔧 Setting up $ENVIRONMENT environment in $REGION"

# S3 bucket for Terraform state
BUCKET_NAME="grocellery-terraform-state-$ENVIRONMENT"
DYNAMODB_TABLE="grocellery-terraform-locks-$ENVIRONMENT"

echo "📦 Creating S3 bucket: $BUCKET_NAME"

# Create S3 bucket
aws s3api create-bucket \
    --bucket $BUCKET_NAME \
    --region $REGION \
    --create-bucket-configuration LocationConstraint=$REGION \
    --no-cli-pager

# Enable versioning
aws s3api put-bucket-versioning \
    --bucket $BUCKET_NAME \
    --versioning-configuration Status=Enabled \
    --no-cli-pager

# Enable server-side encryption
aws s3api put-bucket-encryption \
    --bucket $BUCKET_NAME \
    --server-side-encryption-configuration '{
        "Rules": [
            {
                "ApplyServerSideEncryptionByDefault": {
                    "SSEAlgorithm": "AES256"
                }
            }
        ]
    }' \
    --no-cli-pager

# Block public access
aws s3api put-public-access-block \
    --bucket $BUCKET_NAME \
    --public-access-block-configuration \
        BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true \
    --no-cli-pager

echo "🗄️  Creating DynamoDB table: $DYNAMODB_TABLE"

# Create DynamoDB table for state locking
aws dynamodb create-table \
    --table-name $DYNAMODB_TABLE \
    --attribute-definitions AttributeName=LockID,AttributeType=S \
    --key-schema AttributeName=LockID,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region $REGION \
    --no-cli-pager

# Wait for table to be active
echo "⏳ Waiting for DynamoDB table to be active..."
aws dynamodb wait table-exists \
    --table-name $DYNAMODB_TABLE \
    --region $REGION \
    --no-cli-pager

echo "✅ Environment $ENVIRONMENT setup complete!"
echo "📋 Resources created:"
echo "   - S3 Bucket: $BUCKET_NAME"
echo "   - DynamoDB Table: $DYNAMODB_TABLE"
echo ""
echo "🚀 You can now run: ./scripts/deploy.sh $ENVIRONMENT init"