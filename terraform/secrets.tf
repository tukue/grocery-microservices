resource "aws_secretsmanager_secret" "db_password" {
  name = "${var.project_name}/db_password"
  description = "Database password for the Grocellery application"
}

resource "aws_secretsmanager_secret_version" "db_password_version" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = jsonencode({
    password = var.initial_db_password
  })
}
