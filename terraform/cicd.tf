resource "aws_codepipeline" "grocellery_pipeline" {
  name     = "grocellery-pipeline"
  role_arn = aws_iam_role.codepipeline_role.arn

  artifact_store {
    location = aws_s3_bucket.codepipeline_artifacts.bucket
    type     = "S3"
  }

  stage {
    name = "Source"

    action {
      name             = "Source"
      category         = "Source"
      owner            = "AWS"
      provider         = "CodeCommit"
      version          = "1"
      output_artifacts = ["source_output"]

      configuration = {
        RepositoryName = "grocellery-app"
        BranchName     = "main"
      }
    }
  }

  stage {
    name = "Build"

    action {
      name             = "Build"
      category         = "Build"
      owner            = "AWS"
      provider         = "CodeBuild"
      version          = "1"
      input_artifacts  = ["source_output"]
      output_artifacts = ["build_output"]

      configuration = {
        ProjectName = aws_codebuild_project.grocellery_build.name
      }
    }
  }

  stage {
    name = "Terraform-Plan"

    action {
      name             = "Terraform-Plan"
      category         = "Build"
      owner            = "AWS"
      provider         = "CodeBuild"
      version          = "1"
      input_artifacts  = ["source_output"]
      output_artifacts = ["plan_output"]

      configuration = {
        ProjectName = aws_codebuild_project.grocellery_terraform.name
        # Override the buildspec for this stage
        EnvironmentVariables = jsonencode([{
          name  = "BUILDSPEC_OVERRIDE"
          value = "terraform/buildspec-tf.yml"
          type  = "PLAINTEXT"
        }])
      }
    }
  }

  stage {
    name = "Approve-Plan"

    action {
      name     = "Manual-Approval"
      category = "Approval"
      owner    = "AWS"
      provider = "Manual"
      version  = "1"
    }
  }

  stage {
    name = "Terraform-Apply"

    action {
      name            = "Terraform-Apply"
      category        = "Build"
      owner           = "AWS"
      provider        = "CodeBuild"
      version         = "1"
      input_artifacts = ["plan_output"]

      configuration = {
        ProjectName = aws_codebuild_project.grocellery_terraform.name
        # Override the buildspec for this stage
        EnvironmentVariables = jsonencode([{
          name  = "BUILDSPEC_OVERRIDE"
          value = "terraform/buildspec-tf-apply.yml"
          type  = "PLAINTEXT"
        }])
      }
    }
  }
}

resource "aws_s3_bucket" "codepipeline_artifacts" {
  bucket = "grocellery-codepipeline-artifacts"
}

resource "aws_codebuild_project" "grocellery_build" {
  name          = "grocellery-build"
  description   = "Build project for the Grocellery microservices"
  build_timeout = "30"
  service_role  = aws_iam_role.codebuild_app_build_role.arn

  artifacts {
    type = "CODEPIPELINE"
  }

  environment {
    compute_type                = "BUILD_GENERAL1_SMALL"
    image                       = "aws/codebuild/standard:7.0"
    type                        = "LINUX_CONTAINER"
    privileged_mode             = true
    image_pull_credentials_type = "SERVICE_ROLE"

    environment_variable {
      name  = "AWS_ACCOUNT_ID"
      value = data.aws_caller_identity.current.account_id
    }
    environment_variable {
      name  = "IMAGE_TAG"
      value = "latest"
    }
    environment_variable {
      name  = "PROJECT_NAME"
      value = var.project_name
    }
  }

  source {
    type      = "CODEPIPELINE"
    buildspec = "buildspec.yml"
  }
}

resource "aws_codebuild_project" "grocellery_terraform" {
  name          = "grocellery-terraform"
  description   = "Terraform plan and apply for the Grocellery microservices"
  build_timeout = "30"
  service_role  = aws_iam_role.codebuild_terraform_role.arn

  artifacts {
    type = "CODEPIPELINE"
  }

  environment {
    compute_type = "BUILD_GENERAL1_SMALL"
    image        = "aws/codebuild/standard:7.0"
    type         = "LINUX_CONTAINER"

    environment_variable {
      name  = "TF_VAR_db_password"
      value = "PLEASE_SET_IN_AWS_CONSOLE"
      type  = "PLAINTEXT"
    }
  }

  source {
    type      = "CODEPIPELINE"
    buildspec = "terraform/buildspec-tf.yml"
  }
}

# IAM Roles and Policies

resource "aws_iam_role" "codepipeline_role" {
  name = "grocellery-codepipeline-role"

  assume_role_policy = jsonencode({
    Version   = "2012-10-17",
    Statement = [
      {
        Action    = "sts:AssumeRole",
        Effect    = "Allow",
        Principal = {
          Service = "codepipeline.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role" "codebuild_app_build_role" {
  name = "grocellery-codebuild-app-build-role"

  assume_role_policy = jsonencode({
    Version   = "2012-10-17",
    Statement = [
      {
        Action    = "sts:AssumeRole",
        Effect    = "Allow",
        Principal = {
          Service = "codebuild.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role" "codebuild_terraform_role" {
  name = "grocellery-codebuild-terraform-role"

  assume_role_policy = jsonencode({
    Version   = "2012-10-17",
    Statement = [
      {
        Action    = "sts:AssumeRole",
        Effect    = "Allow",
        Principal = {
          Service = "codebuild.amazonaws.com"
        }
      }
    ]
  })
}

# --- IAM POLICIES ---

resource "aws_iam_policy" "codepipeline_policy" {
  name        = "grocellery-codepipeline-policy"
  description = "Policy for the Grocellery CodePipeline role"

  policy = jsonencode({
    Version   = "2012-10-17",
    Statement = [
      {
        Effect   = "Allow",
        Action   = [
          "s3:GetObject",
          "s3:GetObjectVersion",
          "s3:GetBucketVersioning",
          "s3:PutObject"
        ],
        Resource = [
          aws_s3_bucket.codepipeline_artifacts.arn,
          "${aws_s3_bucket.codepipeline_artifacts.arn}/*"
        ]
      },
      {
        Effect   = "Allow",
        Action   = ["codebuild:StartBuild", "codebuild:BatchGetBuilds"],
        Resource = "*"
      },
      {
        Effect   = "Allow",
        Action   = ["codecommit:GetBranch", "codecommit:GetCommit", "codecommit:UploadArchive", "codecommit:GetUploadArchiveStatus", "codecommit:CancelUploadArchive"],
        Resource = "arn:aws:codecommit:${var.aws_region}:${data.aws_caller_identity.current.account_id}:grocellery-app"
      }
    ]
  })
}

resource "aws_iam_policy" "codebuild_app_build_policy" {
  name        = "grocellery-codebuild-app-build-policy"
  description = "Policy for the Grocellery application build project"

  policy = jsonencode({
    Version   = "2012-10-17",
    Statement = [
      {
        Effect   = "Allow",
        Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"],
        Resource = "*"
      },
      {
        Effect   = "Allow",
        Action   = "ecr:GetAuthorizationToken",
        Resource = "*"
      },
      {
        Effect   = "Allow",
        Action   = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:PutImage"
        ],
        Resource = "arn:aws:ecr:${var.aws_region}:${data.aws_caller_identity.current.account_id}:repository/${var.project_name}-*"
      }
    ]
  })
}

# --- POLICY ATTACHMENTS ---

resource "aws_iam_role_policy_attachment" "codepipeline_attachment" {
  role       = aws_iam_role.codepipeline_role.name
  policy_arn = aws_iam_policy.codepipeline_policy.arn
}

resource "aws_iam_role_policy_attachment" "codebuild_app_build_attachment" {
  role       = aws_iam_role.codebuild_app_build_role.name
  policy_arn = aws_iam_policy.codebuild_app_build_policy.arn
}

# Attach AWS managed policies for Terraform access
resource "aws_iam_role_policy_attachment" "terraform_ecs" {
  role       = aws_iam_role.codebuild_terraform_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonECS_FullAccess"
}

resource "aws_iam_role_policy_attachment" "terraform_ec2" {
  role       = aws_iam_role.codebuild_terraform_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2FullAccess" # For VPC, Security Groups, etc.
}

resource "aws_iam_role_policy_attachment" "terraform_rds" {
  role       = aws_iam_role.codebuild_terraform_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonRDSFullAccess"
}

resource "aws_iam_role_policy_attachment" "terraform_elb" {
  role       = aws_iam_role.codebuild_terraform_role.name
  policy_arn = "arn:aws:iam::aws:policy/ElasticLoadBalancingFullAccess"
}

resource "aws_iam_role_policy_attachment" "terraform_ecr" {
  role       = aws_iam_role.codebuild_terraform_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryFullAccess"
}

resource "aws_iam_role_policy_attachment" "terraform_s3" {
  role       = aws_iam_role.codebuild_terraform_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonS3FullAccess"
}

resource "aws_iam_role_policy_attachment" "terraform_iam" {
  role       = aws_iam_role.codebuild_terraform_role.name
  policy_arn = "arn:aws:iam::aws:policy/IAMFullAccess" # WARNING: Still very permissive.
}

resource "aws_iam_role_policy_attachment" "terraform_logs" {
  role       = aws_iam_role.codebuild_terraform_role.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchLogsFullAccess"
}

data "aws_caller_identity" "current" {}
