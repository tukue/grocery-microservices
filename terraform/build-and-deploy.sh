#!/bin/bash

# Build and Deploy Microservices Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-dev}
AWS_REGION=${2:-${AWS_REGION:-${AWS_DEFAULT_REGION:-}}}
PROJECT_NAME="grocellery-app"
SERVICES=("cart" "order" "product" "summary")

if [ -z "${AWS_REGION}" ]; then
    echo -e "${RED}AWS region must be provided as arg #2 or via AWS_REGION/AWS_DEFAULT_REGION${NC}"
    exit 1
fi

echo -e "${BLUE}🐳 Building and Deploying Microservices${NC}"
echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}Region: ${AWS_REGION}${NC}"
echo ""

# Get AWS Account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REGISTRY="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

echo -e "${BLUE}📋 AWS Account ID: ${ACCOUNT_ID}${NC}"
echo -e "${BLUE}📋 ECR Registry: ${ECR_REGISTRY}${NC}"
echo ""

# Navigate to project root
cd "$(dirname "$0")/.."

# Login to ECR
echo -e "${YELLOW}🔐 Logging in to ECR...${NC}"
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}

# Build and push each service
for SERVICE in "${SERVICES[@]}"; do
    echo ""
    echo -e "${YELLOW}🔨 Building ${SERVICE}-service...${NC}"
    
    # Build the service using Maven
    echo -e "${BLUE}📦 Building JAR file...${NC}"
    mvn clean package -pl microservices/${SERVICE}-service -DskipTests
    
    # Create Dockerfile if it doesn't exist
    DOCKERFILE_PATH="microservices/${SERVICE}-service/Dockerfile"
    if [ ! -f "$DOCKERFILE_PATH" ]; then
        echo -e "${YELLOW}📝 Creating Dockerfile for ${SERVICE}-service...${NC}"
        cat > "$DOCKERFILE_PATH" << EOF
FROM openjdk:21-jre-slim

# Install curl for health checks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy the JAR file
COPY target/*.jar app.jar

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \\
  CMD curl -f http://localhost:8080/actuator/health || exit 1

# Run the application
ENTRYPOINT ["java", "-jar", "app.jar"]
EOF
    fi
    
    # Build Docker image
    echo -e "${BLUE}🐳 Building Docker image...${NC}"
    docker build -t ${SERVICE}-service microservices/${SERVICE}-service/
    
    # Tag for ECR
    ECR_REPO="${ECR_REGISTRY}/${PROJECT_NAME}-${ENVIRONMENT}-${SERVICE}"
    docker tag ${SERVICE}-service:latest ${ECR_REPO}:latest
    
    # Push to ECR
    echo -e "${BLUE}📤 Pushing to ECR...${NC}"
    docker push ${ECR_REPO}:latest
    
    echo -e "${GREEN}✅ ${SERVICE}-service deployed successfully${NC}"
done

# Update ECS services
echo ""
echo -e "${YELLOW}🔄 Updating ECS services...${NC}"

CLUSTER_NAME="${PROJECT_NAME}-${ENVIRONMENT}-cluster"

for SERVICE in "${SERVICES[@]}"; do
    SERVICE_NAME="${PROJECT_NAME}-${ENVIRONMENT}-${SERVICE}-service"
    
    echo -e "${BLUE}🔄 Updating ${SERVICE_NAME}...${NC}"
    
    # Force new deployment
    aws ecs update-service \
        --cluster ${CLUSTER_NAME} \
        --service ${SERVICE_NAME} \
        --force-new-deployment \
        --region ${AWS_REGION} > /dev/null
    
    echo -e "${GREEN}✅ ${SERVICE_NAME} update initiated${NC}"
done

# Wait for services to stabilize
echo ""
echo -e "${YELLOW}⏳ Waiting for services to stabilize...${NC}"

for SERVICE in "${SERVICES[@]}"; do
    SERVICE_NAME="${PROJECT_NAME}-${ENVIRONMENT}-${SERVICE}-service"
    
    echo -e "${BLUE}⏳ Waiting for ${SERVICE_NAME}...${NC}"
    
    aws ecs wait services-stable \
        --cluster ${CLUSTER_NAME} \
        --services ${SERVICE_NAME} \
        --region ${AWS_REGION}
    
    echo -e "${GREEN}✅ ${SERVICE_NAME} is stable${NC}"
done

# Get ALB DNS name
echo ""
echo -e "${YELLOW}🌐 Getting service URLs...${NC}"

cd terraform/environments/${ENVIRONMENT}
ALB_DNS=$(terraform output -raw alb_dns_name 2>/dev/null || echo "Not available")

echo ""
echo -e "${GREEN}🎉 All services deployed successfully!${NC}"
echo ""

echo -e "${BLUE}🌐 Service URLs:${NC}"
for SERVICE in "${SERVICES[@]}"; do
    echo "• ${SERVICE^} Service: http://${ALB_DNS}/${SERVICE}/"
done

echo ""
echo -e "${BLUE}📊 Health Check URLs:${NC}"
for SERVICE in "${SERVICES[@]}"; do
    echo "• ${SERVICE^} Health: http://${ALB_DNS}/${SERVICE}/actuator/health"
done

echo ""
echo -e "${BLUE}📚 API Documentation:${NC}"
for SERVICE in "${SERVICES[@]}"; do
    echo "• ${SERVICE^} Swagger: http://${ALB_DNS}/${SERVICE}/swagger-ui.html"
done

echo ""
echo -e "${YELLOW}💡 Tip: It may take a few minutes for the load balancer health checks to pass${NC}"
echo -e "${YELLOW}💡 Monitor deployment status in the ECS console${NC}"