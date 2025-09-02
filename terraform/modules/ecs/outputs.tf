output "cluster_id" {
  description = "ECS cluster ID"
  value       = aws_ecs_cluster.main.id
}

output "cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.main.name
}

output "task_definitions" {
  description = "ECS task definition ARNs"
  value = {
    for service, task in aws_ecs_task_definition.services : service => task.arn
  }
}

output "services" {
  description = "ECS service names"
  value = {
    for service, svc in aws_ecs_service.services : service => svc.name
  }
}

output "ecs_security_group_id" {
  description = "ECS security group ID"
  value       = aws_security_group.ecs.id
}