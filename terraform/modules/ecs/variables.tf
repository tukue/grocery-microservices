variable "service_name" {
  description = "The name of the microservice."
  type        = string
}

variable "image_uri" {
  description = "The ECR image URI for the service."
  type        = string
}

variable "container_port" {
  description = "The port the container listens on."
  type        = number
}

variable "task_cpu" {
  description = "The CPU units to allocate for the task."
  type        = string
  default     = "256"
}

variable "task_memory" {
  description = "The memory to allocate for the task."
  type        = string
  default     = "512"
}

variable "desired_count" {
  description = "The desired number of tasks to run."
  type        = number
  default     = 1
}

variable "aws_region" {
  description = "The AWS region to deploy to."
  type        = string
}

variable "ecs_cluster_id" {
  description = "The ID of the ECS cluster."
  type        = string
}

variable "vpc_id" {
  description = "The ID of the VPC."
  type        = string
}

variable "private_subnet_ids" {
  description = "A list of private subnet IDs for the ECS service."
  type        = list(string)
}

variable "alb_security_group_id" {
  description = "The security group ID of the Application Load Balancer."
  type        = string
}

variable "alb_listener_arn" {
  description = "The ARN of the ALB listener."
  type        = string
}

variable "alb_listener_rule_priority" {
  description = "The priority for the ALB listener rule."
  type        = number
}
