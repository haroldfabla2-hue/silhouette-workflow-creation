# Silhouette Workflow Platform - AWS Infrastructure as Code
# Terraform configuration for production-grade AWS infrastructure

terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.20"
    }
    
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.10"
    }
  }
  
  backend "s3" {
    bucket = "silhouette-terraform-state"
    key    = "production/terraform.tfstate"
    region = "us-east-1"
    
    dynamodb_table = "silhouette-terraform-locks"
    encrypt        = true
  }
}

# Provider configuration
provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Environment = var.environment
      Project     = "silhouette-workflow"
      ManagedBy   = "terraform"
      Owner       = "devops@company.com"
      Platform    = "kubernetes"
      Compliance  = "SOC2"
      Backup      = "automated"
    }
  }
}

provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  token                  = data.aws_eks_cluster_auth.cluster.token
  cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
}

provider "helm" {
  kubernetes {
    host                   = module.eks.cluster_endpoint
    token                  = data.aws_eks_cluster_auth.cluster.token
    cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
  }
}

# Data sources
data "aws_eks_cluster_auth" "cluster" {
  name = module.eks.cluster_name
}

data "aws_availability_zones" "available" {
  state = "available"
  
  filter {
    name   = "opt-in-status"
    values = ["opt-in-not-required"]
  }
}

# Variables
variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "cluster_version" {
  description = "EKS cluster version"
  type        = string
  default     = "1.28"
}

variable "node_groups" {
  description = "EKS node group configurations"
  type = map(object({
    instance_types = list(string)
    capacity_type  = string
    scaling_config = object({
      desired_size = number
      max_size     = number
      min_size     = number
    })
  }))
  default = {
    backend = {
      instance_types = ["m5.xlarge", "m5.2xlarge"]
      capacity_type  = "ON_DEMAND"
      scaling_config = {
        desired_size = 3
        max_size     = 20
        min_size     = 3
      }
    }
    frontend = {
      instance_types = ["m5.large", "m5.xlarge"]
      capacity_type  = "ON_DEMAND"
      scaling_config = {
        desired_size = 2
        max_size     = 10
        min_size     = 2
      }
    }
    database = {
      instance_types = ["r5.xlarge", "r5.2xlarge"]
      capacity_type  = "ON_DEMAND"
      scaling_config = {
        desired_size = 1
        max_size     = 1
        min_size     = 1
      }
    }
  }
}

variable "database_config" {
  description = "RDS database configuration"
  type = object({
    engine               = string
    engine_version       = string
    instance_class       = string
    allocated_storage    = number
    max_allocated_storage = number
    backup_retention_period = number
    backup_window        = string
    maintenance_window   = string
    multi_az             = bool
    storage_encrypted    = bool
    deletion_protection  = bool
  })
  default = {
    engine               = "postgres"
    engine_version       = "14.9"
    instance_class       = "db.r5.xlarge"
    allocated_storage    = 100
    max_allocated_storage = 1000
    backup_retention_period = 30
    backup_window        = "02:00-04:00"
    maintenance_window   = "Sun:04:00-Sun:05:00"
    multi_az             = true
    storage_encrypted    = true
    deletion_protection  = true
  }
}

variable "redis_config" {
  description = "ElastiCache Redis configuration"
  type = object({
    node_type           = string
    num_cache_nodes     = number
    parameter_group_name = string
    port                = number
    engine_version      = string
    snapshot_retention_limit = number
    snapshot_window     = string
    multi_az_enabled    = bool
    at_rest_encryption_enabled = bool
    transit_encryption_enabled = bool
    auth_token          = string
  })
  default = {
    node_type           = "cache.r5.xlarge"
    num_cache_nodes     = 1
    parameter_group_name = "default.redis7"
    port                = 6379
    engine_version      = "7.0"
    snapshot_retention_limit = 30
    snapshot_window     = "02:00-04:00"
    multi_az_enabled    = true
    at_rest_encryption_enabled = true
    transit_encryption_enabled = true
    auth_token          = "haaspass"
  }
}

variable "rabbitmq_config" {
  description = "RabbitMQ configuration"
  type = object({
    engine              = string
    engine_version      = string
    instance_type       = string
    allocation_storage  = number
    max_allocated_storage = number
    backup_retention_period = number
    maintenance_window  = string
    multi_az            = bool
    storage_encrypted   = bool
    deletion_protection = bool
  })
  default = {
    engine              = " rabbitmq"
    engine_version      = "3.11.20"
    instance_type       = "mq.t3.medium"
    allocation_storage  = 20
    max_allocated_storage = 200
    backup_retention_period = 30
    maintenance_window  = "Sun:02:00-Sun:03:00"
    multi_az            = true
    storage_encrypted   = true
    deletion_protection = true
  }
}

variable "s3_config" {
  description = "S3 bucket configurations"
  type = object({
    versioning_enabled      = bool
    lifecycle_enabled       = bool
    replication_enabled     = bool
    cors_enabled            = bool
    encryption_at_rest      = bool
    block_public_access     = bool
    default_retention_days  = number
  })
  default = {
    versioning_enabled      = true
    lifecycle_enabled       = true
    replication_enabled     = true
    cors_enabled            = true
    encryption_at_rest      = true
    block_public_access     = true
    default_retention_days  = 2555  # 7 years
  }
}

variable "certificates" {
  description = "SSL certificate configuration"
  type = object({
    domain_name              = string
    subject_alternative_names = list(string)
  })
  default = {
    domain_name              = "silhouette.com"
    subject_alternative_names = ["*.silhouette.com"]
  }
}

variable "monitoring_config" {
  description = "Monitoring and logging configuration"
  type = object({
    log_retention_days     = number
    metrics_retention_days = number
    enable_vpc_flow_logs   = bool
    enable_cloudtrail      = bool
    enable_guardduty       = bool
    enable_config          = bool
  })
  default = {
    log_retention_days     = 2555  # 7 years
    metrics_retention_days = 2555
    enable_vpc_flow_logs   = true
    enable_cloudtrail      = true
    enable_guardduty       = true
    enable_config          = true
  }
}

# Local values
locals {
  cluster_name = "${var.environment}-silhouette"
  cluster_id   = "${var.environment}-${module.eks.cluster_name}"
  
  common_tags = {
    Environment = var.environment
    Project     = "silhouette-workflow"
    ManagedBy   = "terraform"
    Owner       = "devops@company.com"
    Platform    = "kubernetes"
    Compliance  = "SOC2"
    Backup      = "automated"
  }
}

# VPC and Networking
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.0.0"
  
  name = "${var.environment}-vpc"
  cidr = var.vpc_cidr
  
  azs  = var.availability_zones
  private_subnets = [for k, v in var.availability_zones : cidrsubnet(var.vpc_cidr, 8, k + 10)]
  public_subnets  = [for k, v in var.availability_zones : cidrsubnet(var.vpc_cidr, 8, k + 1)]
  intra_subnets   = [for k, v in var.availability_zones : cidrsubnet(var.vpc_cidr, 8, k + 200)]
  
  enable_nat_gateway   = true
  single_nat_gateway   = false
  enable_dns_hostnames = true
  enable_dns_support   = true
  
  # VPC Flow Logs
  enable_flow_log                      = true
  create_flow_log_cloudwatch_iam_role  = true
  create_flow_log_cloudwatch_log_group = true
  
  # Public and private subnet tags
  public_subnet_tags = {
    "kubernetes.io/role/elb" = "1"
    "kubernetes.io/cluster/${var.environment}-silhouette" = "shared"
  }
  
  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = "1"
    "kubernetes.io/cluster/${var.environment}-silhouette" = "shared"
  }
  
  intra_subnet_tags = {
    "kubernetes.io/role/internal-elb" = "1"
    "kubernetes.io/cluster/${var.environment}-silhouette" = "shared"
  }
  
  tags = local.common_tags
}

# EKS Cluster
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "19.15.0"
  
  cluster_name    = local.cluster_name
  cluster_version = var.cluster_version
  
  vpc_id                         = module.vpc.vpc_id
  subnet_ids                     = module.vpc.private_subnets
  cluster_endpoint_public_access = true
  cluster_endpoint_private_access = true
  
  # Cluster security group
  cluster_security_group_additional_rules = {
    ingress_nodes_ephemeral_ports_tcp = {
      description                   = "Nodes on ephemeral ports"
      protocol                      = "tcp"
      from_port                     = 1025
      to_port                       = 65535
      type                          = "ingress"
      source_cluster_security_group = true
    }
  }
  
  # EKS managed node groups
  eks_managed_node_groups = {
    for name, config in var.node_groups : name => {
      name = "${var.environment}-${name}"
      
      instance_types = config.instance_types
      capacity_type  = config.capacity_type
      
      min_size     = config.scaling_config.min_size
      max_size     = config.scaling_config.max_size
      desired_size = config.scaling_config.desired_size
      
      labels = {
        Environment = var.environment
        NodeType    = name
        Workload    = name
      }
      
      taints = {
        for key, value in {
          backend  = { key = "backend-workload", value = "true", effect = "NO_SCHEDULE" }
          frontend = { key = "frontend-workload", value = "true", effect = "NO_SCHEDULE" }
          database = { key = "database-workload", value = "true", effect = "NO_SCHEDULE" }
          cache    = { key = "cache-workload", value = "true", effect = "NO_SCHEDULE" }
          messaging = { key = "messaging-workload", value = "true", effect = "NO_SCHEDULE" }
        } : key => {
          key    = value.key
          value  = value.value
          effect = value.effect
        } if name == key
      }
      
      update_config = {
        max_unavailable_percentage = 25
      }
      
      tags = local.common_tags
    }
  }
  
  # Cluster add-ons
  cluster_addons = {
    aws-ebs-csi-driver     = { most_recent = true }
    aws-efs-csi-driver     = { most_recent = true }
    aws-load-balancer-controller = { most_recent = true }
    coredns                = { most_recent = true }
    kube-proxy             = { most_recent = true }
    vpc-cni                = { most_recent = true }
  }
  
  # Access entry for EKS API
  enable_cluster_creator_admin_permissions = true
  
  # Cluster logging
  cluster_enabled_log_types = ["api", "audit", "authenticator", "controllerManager", "scheduler"]
  
  tags = local.common_tags
}

# EKS Blueprints Addons
module "eks_blueprints_addons" {
  source  = "aws-ia/eks-blueprints-addons/aws"
  version = "1.14.0"
  
  cluster_name      = module.eks.cluster_name
  cluster_endpoint  = module.eks.cluster_endpoint
  cluster_version   = var.cluster_version
  
  # Add-ons
  enable_aws_load_balancer_controller = true
  enable_aws_ebs_csi_driver          = true
  enable_aws_efs_csi_driver          = true
  enable_aws_cloudwatch_metrics      = true
  enable_aws_eks_aws_ebs_csi_driver  = true
  enable_aws_eks_aws_efs_csi_driver  = true
  enable_aws_kube_proxy              = true
  enable_aws_vpc_cni                 = true
  enable_cert_manager                = true
  enable_cluster_autoscaler          = true
  enable_external_dns                = true
  enable_external_secrets            = true
  enable_ingress_nginx               = true
  enable_karpenter                   = false
  enable_metrics_server              = true
  enable_prometheus                  = true
  enable_velero                      = true
  
  # Enable AWS Distro for OpenTelemetry
  enable_aws_adot                   = true
  enable_aws_cloudwatch_agent       = true
  enable_aws_fluentbit              = true
  enable_aws_for_fluentbit          = true
  
  # Tags
  tags = local.common_tags
}

# AWS Load Balancer Controller IAM
resource "aws_iam_role" "aws_load_balancer_controller" {
  name = "${var.environment}-aws-load-balancer-controller"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRoleWithWebIdentity"
        Effect = "Allow"
        Principal = {
          Federated = module.eks.oidc_provider_arn
        }
        Condition = {
          StringEquals = {
            "${module.eks.oidc_provider}:sub" = "system:serviceaccount:kube-system:aws-load-balancer-controller"
          }
        }
      }
    ]
  })
  
  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "aws_load_balancer_controller" {
  role       = aws_iam_role.aws_load_balancer_controller.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEKSLoadBalancerControllerPolicy"
  
  tags = local.common_tags
}

# EKS Cluster Autoscaler IAM
resource "aws_iam_role" "cluster_autoscaler" {
  name = "${var.environment}-cluster-autoscaler"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRoleWithWebIdentity"
        Effect = "Allow"
        Principal = {
          Federated = module.eks.oidc_provider_arn
        }
        Condition = {
          StringEquals = {
            "${module.eks.oidc_provider}:sub" = "system:serviceaccount:kube-system:cluster-autoscaler"
          }
        }
      }
    ]
  })
  
  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "cluster_autoscaler" {
  role       = aws_iam_role.cluster_autoscaler.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEKSClusterAutoscalerPolicy"
  
  tags = local.common_tags
}

# RDS PostgreSQL
module "rds_postgres" {
  source  = "terraform-aws-modules/rds/aws"
  version = "6.5.7"
  
  identifier = "${var.environment}-silhouette-postgres"
  
  engine     = var.database_config.engine
  engine_version = var.database_config.engine_version
  instance_class = var.database_config.instance_class
  
  allocated_storage     = var.database_config.allocated_storage
  max_allocated_storage = var.database_config.max_allocated_storage
  storage_encrypted     = var.database_config.storage_encrypted
  
  db_name  = "haasdb"
  username = "haas"
  password = "haaspass"  # In production, use AWS Secrets Manager
  port     = 5432
  
  multi_az               = var.database_config.multi_az
  publicly_accessible    = false
  vpc_security_group_ids = [module.vpc.default_security_group_id]
  db_subnet_group_name   = module.rds_postgres.db_subnet_group
  
  backup_retention_period = var.database_config.backup_retention_period
  backup_window          = var.database_config.backup_window
  maintenance_window     = var.database_config.maintenance_window
  
  deletion_protection = var.database_config.deletion_protection
  
  # Enhanced monitoring
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_enhanced_monitoring.arn
  
  # Performance Insights
  performance_insights_enabled = true
  performance_insights_kms_key_id = aws_kms_key.rds.arn
  
  # Log exports
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  cloudwatch_log_group_retention  = var.monitoring_config.log_retention_days
  
  skip_final_snapshot = false
  final_snapshot_identifier = "${var.environment}-silhouette-postgres-final-snapshot"
  
  tags = local.common_tags
}

# RDS IAM role for enhanced monitoring
resource "aws_iam_role" "rds_enhanced_monitoring" {
  name = "${var.environment}-rds-monitoring-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })
  
  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "rds_enhanced_monitoring" {
  role       = aws_iam_role.rds_enhanced_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
  
  tags = local.common_tags
}

# ElastiCache Redis
module "elasticache_redis" {
  source  = "terraform-aws-modules/elasticache/aws"
  version = "6.6.0"
  
  replication_group_id        = "${var.environment}-silhouette-redis"
  description                 = "Redis cluster for Silhouette Workflow Platform"
  
  node_type                   = var.redis_config.node_type
  num_cache_nodes            = var.redis_config.num_cache_nodes
  parameter_group_name       = var.redis_config.parameter_group_name
  port                       = var.redis_config.port
  engine_version            = var.redis_config.engine_version
  
  maintenance_window         = "sun:04:00-sun:05:00"
  notification_topic_arn     = aws_sns_topic.redis_notifications.arn
  
  # Security
  auth_token                 = var.redis_config.auth_token
  at_rest_encryption_enabled = var.redis_config.at_rest_encryption_enabled
  transit_encryption_enabled = var.redis_config.transit_encryption_enabled
  kms_key_id                 = aws_kms_key.elasticache.arn
  
  # High availability
  multi_az_enabled          = var.redis_config.multi_az_enabled
  
  # Subnet group
  subnet_group_name = module.vpc.intra_subnets[0] != null ? aws_elasticache_subnet_group.redis.name : null
  subnet_ids        = module.vpc.intra_subnets
  
  # Security group
  vpc_security_group_ids = [module.vpc.default_security_group_id]
  
  # Logging
  log_delivery_configuration = [
    {
      destination      = aws_cloudwatch_log_group.redis.name
      destination_type = "cloudwatch-logs"
      log_format       = "text"
      log_type         = "slow-log"
    }
  ]
  
  tags = local.common_tags
}

# ElastiCache Subnet Group
resource "aws_elasticache_subnet_group" "redis" {
  name       = "${var.environment}-silhouette-redis-subnet"
  subnet_ids = module.vpc.intra_subnets
  
  tags = local.common_tags
}

# AmazonMQ RabbitMQ
resource "aws_mq_broker" "rabbitmq" {
  broker_name = "${var.environment}-silhouette-rabbitmq"
  
  engine_type        = "RabbitMQ"
  engine_version     = var.rabbitmq_config.engine_version
  host_instance_type = var.rabbitmq_config.instance_type
  publicly_accessible = false
  security_groups    = [module.vpc.default_security_group_id]
  subnet_ids         = module.vpc.private_subnets
  
  user {
    username = "haas"
    password = "haaspass"  # In production, use AWS Secrets Manager
  }
  
  configuration {
    id   = aws_mq_configuration.rabbitmq.id
    revision = aws_mq_configuration.rabbitmq.latest_revision
  }
  
  maintenance_window_start_time {
    day_of_week = "SUNDAY"
    time_of_day = "02:00"
    time_zone   = "UTC"
  }
  
  tags = local.common_tags
}

# RabbitMQ Configuration
resource "aws_mq_configuration" "rabbitmq" {
  name           = "${var.environment}-silhouette-rabbitmq"
  engine_type    = "RabbitMQ"
  engine_version = var.rabbitmq_config.engine_version
  
  data = jsonencode({
    access_log = {
      level = "info"
    }
    
    "RabbitMQ.Plugins": {
      "rabbitmq_management": {
        enable = true
      }
    }
    
    "RabbitMQ.AuthMechanisms": {
      "EXTERNAL": true
    }
    
    "RabbitMQ.EnterpriseFeatures": {
      "classic_mirrored_queues": {
        enabled = true
      }
    }
  })
  
  latest_revision = true
  
  tags = local.common_tags
}

# S3 Buckets
module "s3_buckets" {
  source  = "terraform-aws-modules/s3-bucket/aws"
  version = "3.15.0"
  
  for_each = {
    workflows   = "Silhouette workflows storage"
    backups     = "Silhouette automated backups"
    logs        = "Silhouette application logs"
    models      = "Silhouette ML/AI models"
    assets      = "Silhouette static assets"
  }
  
  bucket = "${var.environment}-silhouette-${each.key}"
  
  control_bucket_object_ownership = "ObjectWriter"
  bucket_versioning               = var.s3_config.versioning_enabled
  bucket_object_lock_mode         = var.s3_config.versioning_enabled ? "COMPLIANCE" : null
  bucket_object_lock_enabled      = var.s3_config.versioning_enabled
  bucket_object_lock_retain_until_date = var.s3_config.versioning_enabled ? 
    timeadd(timecreate(), "2555d") : null
  
  block_public_acls       = var.s3_config.block_public_access
  block_public_policy     = var.s3_config.block_public_access
  ignore_public_acls      = var.s3_config.block_public_access
  restrict_public_buckets = var.s3_config.block_public_access
  
  cors_rule = var.s3_config.cors_enabled ? [{
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "HEAD"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }] : []
  
  # Server-side encryption
  server_side_encryption_configuration = {
    rule = {
      apply_server_side_encryption_by_default = {
        sse_algorithm     = "aws:kms"
        kms_master_key_id = aws_kms_key.s3.arn
      }
    }
  }
  
  # Lifecycle rules
  lifecycle_rule = var.s3_config.lifecycle_enabled ? [
    {
      id     = "delete-objects"
      status = "Enabled"
      
      noncurrent_version_expiration = {
        days = var.s3_config.default_retention_days
      }
      
      expiration = {
        days = var.s3_config.default_retention_days
      }
    }
  ] : []
  
  tags = merge(local.common_tags, {
    Purpose = each.value
  })
}

# KMS Keys for encryption
resource "aws_kms_key" "rds" {
  description             = "KMS key for RDS encryption"
  deletion_window_in_days = 30
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      }
    ]
  })
  
  tags = local.common_tags
}

resource "aws_kms_key" "elasticache" {
  description             = "KMS key for ElastiCache encryption"
  deletion_window_in_days = 30
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      }
    ]
  })
  
  tags = local.common_tags
}

resource "aws_kms_key" "s3" {
  description             = "KMS key for S3 encryption"
  deletion_window_in_days = 30
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      }
    ]
  })
  
  tags = local.common_tags
}

# SNS for notifications
resource "aws_sns_topic" "redis_notifications" {
  name = "${var.environment}-silhouette-redis-notifications"
  
  tags = local.common_tags
}

resource "aws_sns_topic" "rds_notifications" {
  name = "${var.environment}-silhouette-rds-notifications"
  
  tags = local.common_tags
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "redis" {
  name              = "/aws/elasticache/${module.elasticache_redis.replication_group_id}"
  retention_in_days = var.monitoring_config.log_retention_days
  
  tags = local.common_tags
}

resource "aws_cloudwatch_log_group" "application" {
  name              = "/aws/eks/${var.environment}-silhouette/application"
  retention_in_days = var.monitoring_config.log_retention_days
  
  tags = local.common_tags
}

resource "aws_cloudwatch_log_group" "audit" {
  name              = "/aws/eks/${var.environment}-silhouette/audit"
  retention_in_days = var.monitoring_config.log_retention_days
  
  tags = local.common_tags
}

# ACM Certificate
resource "aws_acm_certificate" "silhouette" {
  domain_name       = var.certificates.domain_name
  subject_alternative_names = var.certificates.subject_alternative_names
  
  validation_method = "DNS"
  
  lifecycle {
    create_before_destroy = true
  }
  
  tags = local.common_tags
}

# Outputs
output "cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = module.eks.cluster_endpoint
}

output "cluster_security_group_id" {
  description = "EKS cluster security group ID"
  value       = module.eks.cluster_security_group_id
}

output "cluster_oidc_issuer_url" {
  description = "EKS cluster OIDC issuer URL"
  value       = module.eks.cluster_oidc_issuer_url
}

output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = module.rds_postgres.db_instance_endpoint
  sensitive   = true
}

output "redis_endpoint" {
  description = "Redis endpoint"
  value       = module.elasticache_redis.configuration_endpoint_address
  sensitive   = true
}

output "rabbitmq_endpoint" {
  description = "RabbitMQ broker endpoint"
  value       = aws_mq_broker.rabbitmq.primary_endpoint
  sensitive   = true
}

output "acm_certificate_arn" {
  description = "ACM certificate ARN"
  value       = aws_acm_certificate.silhouette.arn
}

output "s3_bucket_names" {
  description = "S3 bucket names"
  value = {
    for name, module in module.s3_buckets : name => module.bucket
  }
}

output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "vpc_cidr_block" {
  description = "VPC CIDR block"
  value       = module.vpc.vpc_cidr_block
}

output "subnet_ids" {
  description = "Subnet IDs"
  value = {
    public  = module.vpc.public_subnets
    private = module.vpc.private_subnets
    intra   = module.vpc.intra_subnets
  }
}

# Data sources
data "aws_caller_identity" "current" {}