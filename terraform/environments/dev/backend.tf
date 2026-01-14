terraform {
  backend "s3" {
    bucket         = "grocellery-terraform-state-dev"
    key            = "terraform.tfstate"
    region         = "us-west-2"
    dynamodb_table = "grocellery-terraform-locks-dev"
    encrypt        = true
  }
}