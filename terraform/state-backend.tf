# Remote state infrastructure (optional bootstrap to enable S3 backend with locking).
#
# Note: Backend configuration in terraform { backend "s3" {} } must be pointed at
# an existing bucket/table. Apply this stack once locally, then re-run
# `terraform init` with -backend-config overrides to switch to remote state.

locals {
  state_bucket_name = "${local.name_prefix}-tfstate"
  state_lock_table  = "${local.name_prefix}-tfstate-locks"
}

resource "aws_kms_key" "tf_state" {
  description             = "KMS key for Terraform state encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-tfstate-kms"
    Type = "encryption"
  })
}

resource "aws_kms_alias" "tf_state" {
  name          = "alias/${local.name_prefix}-tfstate"
  target_key_id = aws_kms_key.tf_state.key_id
}

resource "aws_s3_bucket" "tf_state" {
  bucket = local.state_bucket_name

  tags = merge(local.common_tags, {
    Name = local.state_bucket_name
    Type = "terraform-state"
  })
}

resource "aws_s3_bucket_versioning" "tf_state" {
  bucket = aws_s3_bucket.tf_state.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "tf_state" {
  bucket = aws_s3_bucket.tf_state.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.tf_state.arn
      sse_algorithm     = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "tf_state" {
  bucket = aws_s3_bucket.tf_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_dynamodb_table" "tf_state_lock" {
  name         = local.state_lock_table
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = aws_kms_key.tf_state.arn
  }

  tags = merge(local.common_tags, {
    Name = local.state_lock_table
    Type = "terraform-state-lock"
  })
}
