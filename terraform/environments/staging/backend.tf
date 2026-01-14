terraform {
  backend "s3" {
    bucket         = "grocellery-terraform-state-staging"
    key            = "terraform.tfstate"
    region         = "us-west-2"
    dynamodb_table = "grocellery-terraform-locks-staging"
    encrypt        = true
  }
}