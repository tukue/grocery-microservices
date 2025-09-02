output "db_instances" {
  description = "RDS database instances"
  value = {
    for service, db in aws_db_instance.microservice_db : service => {
      endpoint = db.endpoint
      port     = db.port
      name     = db.db_name
    }
  }
}

output "db_security_group_id" {
  description = "RDS security group ID"
  value       = aws_security_group.rds.id
}