output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "alb_dns_name" {
  description = "Application Load Balancer DNS name"
  value       = module.alb.alb_dns_name
}

output "alb_url" {
  description = "Application Load Balancer URL"
  value       = "http://${module.alb.alb_dns_name}"
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = module.ecs.cluster_name
}

output "ecr_repositories" {
  description = "ECR repository URLs"
  value = {
    for service, repo in aws_ecr_repository.services : service => repo.repository_url
  }
}

output "database_endpoints" {
  description = "RDS database endpoints"
  value = {
    for service, db in module.rds.db_instances : service => db.endpoint
  }
  sensitive = true
}

output "service_urls" {
  description = "Service URLs through ALB"
  value = {
    for service in var.services : service => "http://${module.alb.alb_dns_name}/${service}/"
  }
}