terraform {
  backend "s3" {
    bucket         = "grocellery-terraform-state-prod"
    key            = "terraform.tfstate"
    region         = "eu-west-1"
    dynamodb_table = "grocellery-terraform-locks-prod"
    encrypt        = true
  }
}