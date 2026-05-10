# Aether Oncology: Cloud Infrastructure (Terraform)
# Provider Configuration
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# VPC for Clinical Isolation
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.0.0"

  name = "aether-clinical-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["${var.aws_region}a", "${var.aws_region}b", "${var.aws_region}c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = false
  
  tags = {
    Environment = var.environment
    Project     = "AetherOncology"
    Compliance  = "HIPAA-SOC2"
  }
}

# EKS Cluster for Inference Workloads
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "19.15.3"

  cluster_name    = "aether-oncology-prod"
  cluster_version = "1.27"

  vpc_id                         = module.vpc.vpc_id
  subnet_ids                     = module.vpc.private_subnets
  cluster_endpoint_public_access = false

  eks_managed_node_groups = {
    inference_nodes = {
      min_size     = 3
      max_size     = 10
      desired_size = 3

      instance_types = ["t3.large"]
      capacity_type  = "ON_DEMAND"
      
      labels = {
        role = "inference"
      }
    }
  }
}

# Aurora Global Database (Postgres)
resource "aws_rds_cluster" "clinical_db" {
  cluster_identifier      = "aether-clinical-db"
  engine                  = "aurora-postgresql"
  engine_version          = "15.3"
  database_name           = "aether_oncology"
  master_username         = "admin"
  master_password         = var.db_password
  backup_retention_period = 30
  preferred_backup_window = "07:00-09:00"
  storage_encrypted       = true
  kms_key_id              = aws_kms_key.db_key.arn
  
  enabled_cloudwatch_logs_exports = ["postgresql"]
}

resource "aws_kms_key" "db_key" {
  description = "KMS key for clinical DB encryption"
  enable_key_rotation = true
}
