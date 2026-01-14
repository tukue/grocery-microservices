#!/bin/bash

set -e

# Multi-Environment Deployment Script
# Usage: ./deploy.sh <environment> <action>
# Example: ./deploy.sh dev plan
# Example: ./deploy.sh staging apply

ENVIRONMENT=${1:-dev}
ACTION=${2:-plan}
REGION=${3:-eu-west-1}

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    echo "Error: Environment must be dev, staging, or prod"
    exit 1
fi

# Validate action
if [[ ! "$ACTION" =~ ^(plan|apply|destroy|init)$ ]]; then
    echo "Error: Action must be plan, apply, destroy, or init"
    exit 1
fi

echo "🚀 Deploying to $ENVIRONMENT environment..."
echo "📍 Region: $REGION"
echo "🎯 Action: $ACTION"

# Set working directory
TERRAFORM_DIR="terraform"
ENV_DIR="$TERRAFORM_DIR/environments/$ENVIRONMENT"

# Check if environment directory exists
if [ ! -d "$ENV_DIR" ]; then
    echo "Error: Environment directory $ENV_DIR does not exist"
    exit 1
fi

# Copy main terraform files to environment directory
echo "📋 Copying Terraform configuration files..."
cp $TERRAFORM_DIR/*.tf $ENV_DIR/

# Change to environment directory
cd $ENV_DIR

# Initialize Terraform if needed or if explicitly requested
if [ "$ACTION" = "init" ] || [ ! -d ".terraform" ]; then
    echo "🔧 Initializing Terraform..."
    terraform init
fi

# Execute the requested action
case $ACTION in
    "plan")
        echo "📊 Planning infrastructure changes..."
        terraform plan -var-file="terraform.tfvars" -out="tfplan"
        ;;
    "apply")
        echo "🚀 Applying infrastructure changes..."
        if [ -f "tfplan" ]; then
            terraform apply "tfplan"
        else
            terraform apply -var-file="terraform.tfvars" -auto-approve
        fi
        ;;
    "destroy")
        echo "💥 Destroying infrastructure..."
        if [ "$ENVIRONMENT" = "prod" ]; then
            echo "⚠️  WARNING: You are about to destroy PRODUCTION infrastructure!"
            read -p "Type 'yes' to confirm: " confirm
            if [ "$confirm" != "yes" ]; then
                echo "Aborted."
                exit 1
            fi
        fi
        terraform destroy -var-file="terraform.tfvars" -auto-approve
        ;;
esac

# Show outputs if apply was successful
if [ "$ACTION" = "apply" ]; then
    echo "📋 Infrastructure outputs:"
    terraform output
fi

echo "✅ Deployment completed successfully!"

# Clean up copied files
echo "🧹 Cleaning up..."
rm -f *.tf

echo "🎉 Done!"