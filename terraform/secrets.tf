# JWT Secrets for each microservice
resource "aws_secretsmanager_secret" "jwt_secrets" {
  for_each = var.services
  
  name        = "${local.name_prefix}/${each.key}/jwt-secret"
  description = "JWT secret for ${each.key} service"
  
  kms_key_id = aws_kms_key.secrets.arn
  
  replica {
    region = var.aws_region
  }

  tags = merge(local.common_tags, {
    Name    = "${local.name_prefix}-${each.key}-jwt-secret"
    Service = each.key
    Type    = "secret"
  })
}

resource "aws_secretsmanager_secret_version" "jwt_secrets" {
  for_each = var.services
  
  secret_id = aws_secretsmanager_secret.jwt_secrets[each.key].id
  secret_string = jsonencode({
    jwt_secret = random_password.jwt_secrets[each.key].result
  })
}

# Generate random JWT secrets
resource "random_password" "jwt_secrets" {
  for_each = var.services
  
  length  = 64
  special = true
}

# Database password secret (legacy - keeping for backward compatibility)
resource "aws_secretsmanager_secret" "db_password" {
  name        = "${local.name_prefix}/db-password"
  description = "Database password for the Grocellery application"
  
  kms_key_id = aws_kms_key.secrets.arn
  
  replica {
    region = var.aws_region
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-db-password"
    Type = "secret"
  })
}

resource "aws_secretsmanager_secret_version" "db_password_version" {
  secret_id = aws_secretsmanager_secret.db_password.id
  secret_string = jsonencode({
    password = var.initial_db_password
  })
}

# Environment-scoped configuration hints to be consumed by workloads or deployments
resource "aws_ssm_parameter" "service_config" {
  for_each = var.services

  name  = "/${var.project_name}/${var.environment}/${each.key}/config"
  type  = "SecureString"
  key_id = aws_kms_key.secrets.arn
  value = jsonencode({
    environment      = var.environment
    service          = each.key
    db_secret_arn    = aws_secretsmanager_secret.db_password.arn
    jwt_secret_arn   = aws_secretsmanager_secret.jwt_secrets[each.key].arn
    config_version   = "v1"
  })

  tags = merge(local.common_tags, {
    Name    = "${local.name_prefix}-${each.key}-config"
    Service = each.key
    Type    = "ssm-parameter"
  })
}

# KMS Key for Secrets Manager
resource "aws_kms_key" "secrets" {
  description             = "KMS key for Secrets Manager encryption"
  deletion_window_in_days = var.environment == "prod" ? 30 : 7
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow Secrets Manager to use the key"
        Effect = "Allow"
        Principal = {
          Service = "secretsmanager.amazonaws.com"
        }
        Action = [
          "kms:Decrypt",
          "kms:DescribeKey",
          "kms:Encrypt",
          "kms:GenerateDataKey*",
          "kms:ReEncrypt*"
        ]
        Resource = "*"
      }
    ]
  })

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-secrets-kms"
    Type = "encryption"
  })
}

resource "aws_kms_alias" "secrets" {
  name          = "alias/${local.name_prefix}-secrets"
  target_key_id = aws_kms_key.secrets.key_id
}
