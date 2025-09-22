output "service_name" {
  description = "The name of the ECS service."
  value       = aws_ecs_service.service.name
}

output "target_group_arn" {
  description = "The ARN of the ALB target group."
  value       = aws_lb_target_group.service.arn
}
