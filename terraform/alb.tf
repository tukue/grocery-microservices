# Application Load Balancer
resource "aws_lb" "main" {
  name               = "${var.environment}-grocellery-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  enable_deletion_protection = var.environment == "prod"

  tags = var.tags
}

# Target Groups
resource "aws_lb_target_group" "app" {
  for_each = toset(["cart-service", "order-service", "product-service", "summary-service"])

  name        = "${var.environment}-${each.key}-tg"
  port        = var.app_port
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = 5
    interval            = 30
    path                = var.health_check_path
    matcher             = "200"
    port                = "traffic-port"
    protocol            = "HTTP"
  }

  tags = merge(var.tags, {
    Name = "${var.environment}-${each.key}-tg"
  })
}

# ALB Listener
resource "aws_lb_listener" "app" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "fixed-response"
    fixed_response {
      content_type = "text/plain"
      message_body = "Grocellery App - ${var.environment}"
      status_code  = "200"
    }
  }
}

# Listener Rules for path-based routing
resource "aws_lb_listener_rule" "cart_service" {
  listener_arn = aws_lb_listener.app.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app["cart-service"].arn
  }

  condition {
    path_pattern {
      values = ["/cart/*", "/cart"]
    }
  }
}

resource "aws_lb_listener_rule" "order_service" {
  listener_arn = aws_lb_listener.app.arn
  priority     = 200

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app["order-service"].arn
  }

  condition {
    path_pattern {
      values = ["/order/*", "/orders/*"]
    }
  }
}

resource "aws_lb_listener_rule" "product_service" {
  listener_arn = aws_lb_listener.app.arn
  priority     = 300

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app["product-service"].arn
  }

  condition {
    path_pattern {
      values = ["/product/*", "/products/*"]
    }
  }
}

resource "aws_lb_listener_rule" "summary_service" {
  listener_arn = aws_lb_listener.app.arn
  priority     = 400

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app["summary-service"].arn
  }

  condition {
    path_pattern {
      values = ["/summary/*", "/summaries/*"]
    }
  }
}