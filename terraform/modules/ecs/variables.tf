variable "service_name" {
  description = "The name of the microservice"
  type        = string
}

variable "image_uri" {
  description = "The ECR image URI for the service"
  type        = string
}

variable "container_port" {
  description = "The port the container listens on"
  type        = number
}

variable "task_cpu" {
  description = "The CPU units to allocate for the task"
  type        = number
  default     = 256
}

variable "task_memory" {
  description = "The memory to allocate for the task"
  type        = number
  default     = 512
}

variable "desired_count" {
  description = "The desired number of tasks to run"
  type        = number
  default     = 1
}

variable "health_check_path" {
  description = "The health check path for the service"
  type        = string
  default     = "/actuator/health"
}

variable "aws_region" {
  description = "The AWS region to deploy to"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "project_name" {
  description = "Project name"
  type        = string
}

variable "ecs_cluster_id" {
  description = "The ID of the ECS cluster"
  type        = string
}

variable "vpc_id" {
  description = "The ID of the VPC"
  type        = string
}

variable "private_subnet_ids" {
  description = "A list of private subnet IDs for the ECS service"
  type        = list(string)
}

variable "alb_security_group_id" {
  description = "The security group ID of the Application Load Balancer"
  type        = string
}

variable "alb_listener_arn" {
  description = "The ARN of the ALB listener"
  type        = string
}

variable "alb_listener_rule_priority" {
  description = "The priority for the ALB listener rule"
  type        = number
}

variable "db_endpoint" {
  description = "RDS database endpoint"
  type        = string
}

variable "db_port" {
  description = "RDS database port"
  type        = number
}

variable "db_name" {
  description = "RDS database name"
  type        = string
}

variable "db_secret_arn" {
  description = "ARN of the database secret in Secrets Manager"
  type        = string
}

variable "enable_monitoring" {
  description = "Enable CloudWatch monitoring"
  type        = bool
  default     = true
}

variable "common_tags" {
  description = "Common tags to apply to resources"
  type        = map(string)
  default     = {}
}
