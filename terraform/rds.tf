# DB Subnet Group
resource "aws_db_subnet_group" "main" {
  name       = "${var.environment}-grocellery-db-subnet-group"
  subnet_ids = aws_subnet.private[*].id

  tags = merge(var.tags, {
    Name = "${var.environment}-grocellery-db-subnet-group"
  })
}

# DB Parameter Group
resource "aws_db_parameter_group" "main" {
  family = "postgres15"
  name   = "${var.environment}-grocellery-db-params"

  parameter {
    name  = "log_statement"
    value = var.environment == "prod" ? "none" : "all"
  }

  tags = var.tags
}

# RDS Instance
resource "aws_db_instance" "main" {
  identifier = "${var.environment}-grocellery-db"

  engine         = "postgres"
  engine_version = "15.4"
  instance_class = var.db_instance_class

  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = var.db_allocated_storage * 2
  storage_type          = "gp2"
  storage_encrypted     = true

  db_name  = var.db_name
  username = var.db_username
  password = random_password.db_password.result

  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name
  parameter_group_name   = aws_db_parameter_group.main.name

  multi_az               = var.multi_az
  publicly_accessible    = false
  backup_retention_period = var.environment == "prod" ? 30 : 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"

  skip_final_snapshot       = var.environment != "prod"
  final_snapshot_identifier = var.environment == "prod" ? "${var.environment}-grocellery-db-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}" : null

  copy_tags_to_snapshot = true
  deletion_protection   = var.environment == "prod"

  tags = merge(var.tags, {
    Name = "${var.environment}-grocellery-db"
  })
}

# Random password for database
resource "random_password" "db_password" {
  length  = 16
  special = true
}

# Store DB password in SSM Parameter Store
resource "aws_ssm_parameter" "db_password" {
  name  = "/grocellery/${var.environment}/database/password"
  type  = "SecureString"
  value = random_password.db_password.result

  tags = var.tags
}

# JWT Secrets for each service
resource "random_password" "jwt_secret" {
  for_each = toset(["cart-service", "order-service", "product-service", "summary-service"])

  length  = 32
  special = false
}

resource "aws_ssm_parameter" "jwt_secret" {
  for_each = toset(["cart-service", "order-service", "product-service", "summary-service"])

  name  = "/grocellery/${var.environment}/${each.key}/jwt/secret"
  type  = "SecureString"
  value = random_password.jwt_secret[each.key].result

  tags = var.tags
}