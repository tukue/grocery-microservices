#!/bin/bash

# Deployment script for different environments
# Usage: ./deploy.sh <environment> [action]
# Example: ./deploy.sh dev plan
# Example: ./deploy.sh prod apply

set -e

ENVIRONMENT=${1:-dev}
ACTION=${2:-plan}

if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    echo "Error: Environment must be one of: dev, staging, prod"
    exit 1
fi

if [[ ! "$ACTION" =~ ^(plan|apply|destroy)$ ]]; then
    echo "Error: Action must be one of: plan, apply, destroy"
    exit 1
fi

echo "🚀 Deploying to $ENVIRONMENT environment..."
echo "📋 Action: $ACTION"

# Set environment-specific variables
export TF_VAR_FILE="environments/$ENVIRONMENT/terraform.tfvars"

# Check if tfvars file exists
if [[ ! -f "$TF_VAR_FILE" ]]; then
    echo "Error: Configuration file $TF_VAR_FILE not found"
    exit 1
fi

# Initialize Terraform if needed
if [[ ! -d ".terraform" ]]; then
    echo "🔧 Initializing Terraform..."
    terraform init
fi

# Set database password from environment variable
if [[ -z "$TF_VAR_initial_db_password" ]]; then
    echo "⚠️  Warning: TF_VAR_initial_db_password not set"
    echo "Please set it with: export TF_VAR_initial_db_password='your-secure-password'"
    exit 1
fi

# Run Terraform command
echo "🏗️  Running terraform $ACTION for $ENVIRONMENT..."
terraform $ACTION -var-file="$TF_VAR_FILE"

if [[ "$ACTION" == "apply" ]]; then
    echo "✅ Deployment to $ENVIRONMENT completed successfully!"
    echo "📊 Getting outputs..."
    terraform output
elif [[ "$ACTION" == "plan" ]]; then
    echo "📋 Plan completed for $ENVIRONMENT environment"
elif [[ "$ACTION" == "destroy" ]]; then
    echo "🗑️  Resources destroyed in $ENVIRONMENT environment"
fi