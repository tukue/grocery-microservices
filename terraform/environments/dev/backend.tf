terraform {
  backend "s3" {
    bucket         = "grocellery-terraform-state-dev"
    key            = "terraform.tfstate"
    region         = "eu-west-1"
    dynamodb_table = "grocellery-terraform-locks-dev"
    encrypt        = true
  }
}