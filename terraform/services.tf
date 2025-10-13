# ECR Repositories for each service
resource "aws_ecr_repository" "services" {
  for_each = var.services
  name     = "${local.name_prefix}-${each.key}"

  image_tag_mutability = "MUTABLE"
  
  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = merge(local.common_tags, {
    Name    = "${local.name_prefix}-${each.key}-ecr"
    Service = each.key
    Type    = "container-registry"
  })
}

# ECR Lifecycle Policy
resource "aws_ecr_lifecycle_policy" "services" {
  for_each   = var.services
  repository = aws_ecr_repository.services[each.key].name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["v"]
          countType     = "imageCountMoreThan"
          countNumber   = 10
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Delete untagged images older than 1 day"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 1
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

# ECS Services using the improved module
module "ecs_service" {
  for_each = var.services

  source = "./modules/ecs"

  # Service configuration
  service_name   = each.key
  image_uri      = "${aws_ecr_repository.services[each.key].repository_url}:latest"
  container_port = each.value.port
  
  # Resource allocation
  task_cpu          = each.value.cpu
  task_memory       = each.value.memory
  desired_count     = each.value.desired_count
  health_check_path = each.value.health_check_path

  # Infrastructure references
  aws_region         = var.aws_region
  environment        = var.environment
  project_name       = var.project_name
  ecs_cluster_id     = aws_ecs_cluster.main.id
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids

  # Load balancer configuration
  alb_security_group_id      = module.alb.security_group_id
  alb_listener_arn           = module.alb.listener_arn
  alb_listener_rule_priority = (index(keys(var.services), each.key) + 1) * 10

  # Database configuration
  db_endpoint = module.rds.db_endpoint
  db_port     = module.rds.db_port
  db_name     = module.rds.db_name
  db_secret_arn = aws_secretsmanager_secret.db_password.arn

  # Monitoring
  enable_monitoring = var.enable_monitoring

  # Tags
  common_tags = local.common_tags

  depends_on = [
    module.rds,
    aws_secretsmanager_secret_version.db_password_version
  ]
}
