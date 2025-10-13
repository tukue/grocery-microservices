@echo off
REM Deployment script for different environments (Windows)
REM Usage: deploy.bat <environment> [action]
REM Example: deploy.bat dev plan
REM Example: deploy.bat prod apply

setlocal enabledelayedexpansion

set ENVIRONMENT=%1
set ACTION=%2

if "%ENVIRONMENT%"=="" set ENVIRONMENT=dev
if "%ACTION%"=="" set ACTION=plan

if not "%ENVIRONMENT%"=="dev" if not "%ENVIRONMENT%"=="staging" if not "%ENVIRONMENT%"=="prod" (
    echo Error: Environment must be one of: dev, staging, prod
    exit /b 1
)

if not "%ACTION%"=="plan" if not "%ACTION%"=="apply" if not "%ACTION%"=="destroy" (
    echo Error: Action must be one of: plan, apply, destroy
    exit /b 1
)

echo 🚀 Deploying to %ENVIRONMENT% environment...
echo 📋 Action: %ACTION%

REM Set environment-specific variables
set TF_VAR_FILE=environments\%ENVIRONMENT%\terraform.tfvars

REM Check if tfvars file exists
if not exist "%TF_VAR_FILE%" (
    echo Error: Configuration file %TF_VAR_FILE% not found
    exit /b 1
)

REM Initialize Terraform if needed
if not exist ".terraform" (
    echo 🔧 Initializing Terraform...
    terraform init
)

REM Check for database password
if "%TF_VAR_initial_db_password%"=="" (
    echo ⚠️  Warning: TF_VAR_initial_db_password not set
    echo Please set it with: set TF_VAR_initial_db_password=your-secure-password
    exit /b 1
)

REM Run Terraform command
echo 🏗️  Running terraform %ACTION% for %ENVIRONMENT%...
terraform %ACTION% -var-file="%TF_VAR_FILE%"

if "%ACTION%"=="apply" (
    echo ✅ Deployment to %ENVIRONMENT% completed successfully!
    echo 📊 Getting outputs...
    terraform output
) else if "%ACTION%"=="plan" (
    echo 📋 Plan completed for %ENVIRONMENT% environment
) else if "%ACTION%"=="destroy" (
    echo 🗑️  Resources destroyed in %ENVIRONMENT% environment
)

endlocal