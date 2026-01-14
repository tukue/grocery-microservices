terraform {
  backend "s3" {
    bucket         = "grocellery-terraform-state-prod"
    key            = "terraform.tfstate"
    region         = "us-west-2"
    dynamodb_table = "grocellery-terraform-locks-prod"
    encrypt        = true
  }
}