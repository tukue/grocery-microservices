locals {
  services = {
    for idx, service in var.services : service => {
      priority = idx + 1
    }
  }
}

resource "aws_ecr_repository" "services" {
  for_each = toset(var.services)
  name     = "${var.project_name}-${each.key}"
}

module "ecs_service" {
  for_each = local.services

  source = "./modules/ecs"

  service_name = each.key
  image_uri    = aws_ecr_repository.services[each.key].repository_url
  container_port = 8080 # Assuming all services run on port 8080

  aws_region     = var.aws_region
  ecs_cluster_id = aws_ecs_cluster.main.id
  vpc_id         = aws_vpc.main.id
  private_subnet_ids = aws_subnet.private[*].id

  alb_security_group_id    = aws_security_group.alb.id
  alb_listener_arn         = aws_lb_listener.http.arn
  alb_listener_rule_priority = each.value.priority
}
