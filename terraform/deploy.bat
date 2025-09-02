@echo off
setlocal enabledelayedexpansion

REM Grocellery App AWS Infrastructure Deployment Script
set ENVIRONMENT=%1
set AWS_REGION=%2
set PROJECT_NAME=grocellery-app

if "%ENVIRONMENT%"=="" set ENVIRONMENT=dev
if "%AWS_REGION%"=="" set AWS_REGION=us-east-1

echo 🚀 Deploying Grocellery App Infrastructure
echo Environment: %ENVIRONMENT%
echo Region: %AWS_REGION%
echo.

REM Check prerequisites
echo 📋 Checking prerequisites...

where terraform >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Terraform is not installed
    exit /b 1
)

where aws >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ AWS CLI is not installed
    exit /b 1
)

aws sts get-caller-identity >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ AWS credentials not configured
    exit /b 1
)

echo ✅ Prerequisites check passed
echo.

REM Navigate to environment directory
set ENV_DIR=environments\%ENVIRONMENT%
if not exist "%ENV_DIR%" (
    echo ❌ Environment directory %ENV_DIR% does not exist
    exit /b 1
)

cd "%ENV_DIR%"

REM Check if terraform.tfvars exists
if not exist "terraform.tfvars" (
    echo ⚠️  terraform.tfvars not found. Creating from example...
    if exist "terraform.tfvars.example" (
        copy terraform.tfvars.example terraform.tfvars
        echo 📝 Please edit terraform.tfvars with your specific values
        echo    Especially set a secure db_password
        pause
    ) else (
        echo ❌ terraform.tfvars.example not found
        exit /b 1
    )
)

REM Initialize Terraform
echo 🔧 Initializing Terraform...
terraform init

REM Validate configuration
echo ✅ Validating Terraform configuration...
terraform validate

REM Plan deployment
echo 📋 Creating deployment plan...
terraform plan -out=tfplan

REM Confirm deployment
echo.
echo 🤔 Ready to deploy infrastructure. This will create AWS resources that may incur costs.
set /p REPLY="Do you want to proceed? (y/N): "

if /i not "%REPLY%"=="y" (
    echo ❌ Deployment cancelled
    exit /b 0
)

REM Apply configuration
echo 🚀 Deploying infrastructure...
terraform apply tfplan

REM Get outputs
echo.
echo 📊 Deployment completed! Here are the important outputs:
echo.

for /f "tokens=*" %%i in ('terraform output -raw alb_dns_name 2^>nul') do set ALB_DNS=%%i
for /f "tokens=*" %%i in ('terraform output -raw ecs_cluster_name 2^>nul') do set CLUSTER_NAME=%%i

if "%ALB_DNS%"=="" set ALB_DNS=Not available
if "%CLUSTER_NAME%"=="" set CLUSTER_NAME=Not available

echo 🌐 Application Load Balancer DNS: %ALB_DNS%
echo 🐳 ECS Cluster Name: %CLUSTER_NAME%
echo.

echo 🎉 Infrastructure deployment completed successfully!
echo.

echo 📝 Next Steps:
echo 1. Build and push Docker images to ECR repositories
echo 2. Update ECS services to deploy your applications
echo 3. Access services through the ALB DNS name
echo.

echo 🌐 Service URLs (after deploying applications):
echo • Cart Service: http://%ALB_DNS%/cart/
echo • Order Service: http://%ALB_DNS%/order/
echo • Product Service: http://%ALB_DNS%/product/
echo • Summary Service: http://%ALB_DNS%/summary/
echo.

echo 💡 To build and deploy applications, run:
echo    build-and-deploy.bat %ENVIRONMENT%

REM Clean up
if exist tfplan del tfplan