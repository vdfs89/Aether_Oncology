variable "aws_region" {
  description = "AWS Region for deployment"
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  default     = "prod"
}

variable "db_password" {
  description = "Master password for RDS Cluster"
  type        = string
  sensitive   = true
}
