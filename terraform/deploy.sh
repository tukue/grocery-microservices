#!/bin/bash

# Grocellery App AWS Infrastructure Deployment Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-dev}
AWS_REGION=${2:-us-east-1}
PROJECT_NAME="grocellery-app"

echo -e "${BLUE}🚀 Deploying Grocellery App Infrastructure${NC}"
echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}Region: ${AWS_REGION}${NC}"
echo ""

# Check prerequisites
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

if ! command -v terraform &> /dev/null; then
    echo -e "${RED}❌ Terraform is not installed${NC}"
    exit 1
fi

if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed${NC}"
    exit 1
fi

if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ AWS credentials not configured${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"
echo ""

# Navigate to environment directory
ENV_DIR="environments/${ENVIRONMENT}"
if [ ! -d "$ENV_DIR" ]; then
    echo -e "${RED}❌ Environment directory ${ENV_DIR} does not exist${NC}"
    exit 1
fi

cd "$ENV_DIR"

# Check if terraform.tfvars exists
if [ ! -f "terraform.tfvars" ]; then
    echo -e "${YELLOW}⚠️  terraform.tfvars not found. Creating from example...${NC}"
    if [ -f "terraform.tfvars.example" ]; then
        cp terraform.tfvars.example terraform.tfvars
        echo -e "${YELLOW}📝 Please edit terraform.tfvars with your specific values${NC}"
        echo -e "${YELLOW}   Especially set a secure db_password${NC}"
        read -p "Press Enter to continue after editing terraform.tfvars..."
    else
        echo -e "${RED}❌ terraform.tfvars.example not found${NC}"
        exit 1
    fi
fi

# Initialize Terraform
echo -e "${YELLOW}🔧 Initializing Terraform...${NC}"
terraform init

# Validate configuration
echo -e "${YELLOW}✅ Validating Terraform configuration...${NC}"
terraform validate

# Plan deployment
echo -e "${YELLOW}📋 Creating deployment plan...${NC}"
terraform plan -out=tfplan

# Confirm deployment
echo ""
echo -e "${YELLOW}🤔 Ready to deploy infrastructure. This will create AWS resources that may incur costs.${NC}"
read -p "Do you want to proceed? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}❌ Deployment cancelled${NC}"
    exit 0
fi

# Apply configuration
echo -e "${GREEN}🚀 Deploying infrastructure...${NC}"
terraform apply tfplan

# Get outputs
echo ""
echo -e "${GREEN}📊 Deployment completed! Here are the important outputs:${NC}"
echo ""

ALB_DNS=$(terraform output -raw alb_dns_name 2>/dev/null || echo "Not available")
CLUSTER_NAME=$(terraform output -raw ecs_cluster_name 2>/dev/null || echo "Not available")

echo -e "${BLUE}🌐 Application Load Balancer DNS: ${ALB_DNS}${NC}"
echo -e "${BLUE}🐳 ECS Cluster Name: ${CLUSTER_NAME}${NC}"
echo ""

echo -e "${GREEN}🎉 Infrastructure deployment completed successfully!${NC}"
echo ""

echo -e "${YELLOW}📝 Next Steps:${NC}"
echo "1. Build and push Docker images to ECR repositories"
echo "2. Update ECS services to deploy your applications"
echo "3. Access services through the ALB DNS name"
echo ""

echo -e "${BLUE}Service URLs (after deploying applications):${NC}"
echo "• Cart Service: http://${ALB_DNS}/cart/"
echo "• Order Service: http://${ALB_DNS}/order/"
echo "• Product Service: http://${ALB_DNS}/product/"
echo "• Summary Service: http://${ALB_DNS}/summary/"
echo ""

echo -e "${YELLOW}💡 To build and deploy applications, run:${NC}"
echo "   ./build-and-deploy.sh ${ENVIRONMENT}"

# Clean up
rm -f tfplan