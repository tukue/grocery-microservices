terraform {
  backend "s3" {
    bucket         = "grocellery-terraform-state-staging"
    key            = "terraform.tfstate"
    region         = "eu-west-1"
    dynamodb_table = "grocellery-terraform-locks-staging"
    encrypt        = true
  }
}