# Variable definitions for Silhouette Infrastructure
# All variables have sensible production defaults

# Environment Configuration
variable "environment" {
  description = "Environment name (production, staging, development)"
  type        = string
  default     = "production"
  
  validation {
    condition     = contains(["production", "staging", "development"], var.environment)
    error_message = "Environment must be one of: production, staging, development."
  }
}

# AWS Configuration
variable "aws_region" {
  description = "AWS region for infrastructure deployment"
  type        = string
  default     = "us-east-1"
  
  validation {
    condition     = contains([
      "us-east-1", "us-east-2", "us-west-1", "us-west-2",
      "eu-west-1", "eu-west-2", "eu-central-1", "eu-central-2",
      "ap-southeast-1", "ap-southeast-2", "ap-northeast-1", "ap-northeast-2"
    ], var.aws_region)
    error_message = "AWS region must be a valid AWS region."
  }
}

# Network Configuration
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
  
  validation {
    condition     = cidrhost(var.vpc_cidr, 0) == "10.0.0.0" && cidrnetmask(var.vpc_cidr) <= 16
    error_message = "VPC CIDR must be a valid private CIDR block (RFC 1918) with a netmask of /16 or smaller."
  }
}

variable "availability_zones" {
  description = "List of availability zones to use for infrastructure"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
  
  validation {
    condition     = length(var.availability_zones) >= 2
    error_message = "At least 2 availability zones are required for high availability."
  }
}

# EKS Cluster Configuration
variable "cluster_version" {
  description = "Kubernetes version for EKS cluster"
  type        = string
  default     = "1.28"
  
  validation {
    condition     = contains([
      "1.24", "1.25", "1.26", "1.27", "1.28", "1.29"
    ], var.cluster_version)
    error_message = "EKS cluster version must be one of the supported versions: 1.24, 1.25, 1.26, 1.27, 1.28, 1.29."
  }
}

variable "node_groups" {
  description = "Configuration for EKS node groups"
  type = map(object({
    instance_types = list(string)
    capacity_type  = string
    scaling_config = object({
      desired_size = number
      max_size     = number
      min_size     = number
    })
    instance_market_options = optional(object({
      market_type = string
    }))
    update_config = optional(object({
      max_unavailable_percentage = number
      max_unavailable = number
    }))
    tags = optional(map(string))
  }))
  
  default = {
    backend = {
      instance_types = ["m5.xlarge", "m5.2xlarge", "m5.4xlarge"]
      capacity_type  = "ON_DEMAND"
      scaling_config = {
        desired_size = 3
        max_size     = 20
        min_size     = 3
      }
      tags = {
        WorkloadType = "backend"
        CostCenter   = "engineering"
      }
    }
    frontend = {
      instance_types = ["m5.large", "m5.xlarge", "m5.2xlarge"]
      capacity_type  = "ON_DEMAND"
      scaling_config = {
        desired_size = 2
        max_size     = 10
        min_size     = 2
      }
      tags = {
        WorkloadType = "frontend"
        CostCenter   = "engineering"
      }
    }
    database = {
      instance_types = ["r5.xlarge", "r5.2xlarge"]
      capacity_type  = "ON_DEMAND"
      scaling_config = {
        desired_size = 1
        max_size     = 3
        min_size     = 1
      }
      tags = {
        WorkloadType = "database"
        CostCenter   = "infrastructure"
      }
    }
    cache = {
      instance_types = ["r5.large", "r5.xlarge"]
      capacity_type  = "ON_DEMAND"
      scaling_config = {
        desired_size = 1
        max_size     = 3
        min_size     = 1
      }
      tags = {
        WorkloadType = "cache"
        CostCenter   = "infrastructure"
      }
    }
    messaging = {
      instance_types = ["m5.large", "m5.xlarge"]
      capacity_type  = "ON_DEMAND"
      scaling_config = {
        desired_size = 1
        max_size     = 3
        min_size     = 1
      }
      tags = {
        WorkloadType = "messaging"
        CostCenter   = "infrastructure"
      }
    }
  }
  
  validation {
    condition = alltrue([
      for name, config in var.node_groups : (
        length(config.instance_types) > 0 &&
        contains(["ON_DEMAND", "SPOT"], config.capacity_type) &&
        config.scaling_config.max_size >= config.scaling_config.min_size &&
        config.scaling_config.desired_size >= config.scaling_config.min_size &&
        config.scaling_config.desired_size <= config.scaling_config.max_size
      )
    ])
    error_message = "All node groups must have valid instance types, capacity type, and scaling configuration."
  }
}

# Database Configuration
variable "database_config" {
  description = "RDS PostgreSQL configuration"
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
    performance_insights = bool
    monitoring_interval  = number
    ca_cert_identifier   = string
    publicly_accessible  = bool
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
    performance_insights = true
    monitoring_interval  = 60
    ca_cert_identifier   = "rds-ca-rsa2048-g1"
    publicly_accessible  = false
  }
  
  validation {
    condition = alltrue([
      var.database_config.allocated_storage >= 20,
      var.database_config.allocated_storage <= 65536,
      var.database_config.max_allocated_storage >= var.database_config.allocated_storage,
      var.database_config.backup_retention_period >= 1,
      var.database_config.backup_retention_period <= 35,
      contains(["db.t3.micro", "db.t3.small", "db.t3.medium", "db.t3.large", "db.t3.xlarge", "db.t3.2xlarge", "db.r5.large", "db.r5.xlarge", "db.r5.2xlarge", "db.r5.4xlarge", "db.r5.8xlarge", "db.r5.12xlarge", "db.r5.16xlarge", "db.r5.24xlarge"], var.database_config.instance_class)
    ])
    error_message = "Database configuration validation failed. Check instance class, storage, and backup settings."
  }
}

# Redis Configuration
variable "redis_config" {
  description = "ElastiCache Redis configuration"
  type = object({
    node_type                 = string
    num_cache_nodes           = number
    parameter_group_name      = string
    port                      = number
    engine_version            = string
    snapshot_retention_limit  = number
    snapshot_window           = string
    multi_az_enabled          = bool
    at_rest_encryption_enabled = bool
    transit_encryption_enabled = bool
    auth_token                = string
    kms_key_id                = string
    log_delivery_configuration = optional(list(object({
      destination      = string
      destination_type = string
      log_format       = string
      log_type         = string
    })))
  })
  
  default = {
    node_type                 = "cache.r5.xlarge"
    num_cache_nodes           = 1
    parameter_group_name      = "default.redis7"
    port                      = 6379
    engine_version            = "7.0"
    snapshot_retention_limit  = 30
    snapshot_window           = "02:00-04:00"
    multi_az_enabled          = true
    at_rest_encryption_enabled = true
    transit_encryption_enabled = true
    auth_token                = "haaspass"
    kms_key_id                = null
  }
  
  validation {
    condition = alltrue([
      var.redis_config.num_cache_nodes >= 1,
      var.redis_config.port >= 1024 && var.redis_config.port <= 65535,
      var.redis_config.snapshot_retention_limit >= 0,
      var.redis_config.snapshot_retention_limit <= 35,
      contains(["cache.t3.micro", "cache.t3.small", "cache.t3.medium", "cache.t3.large", "cache.t3.xlarge", "cache.t3.2xlarge", "cache.r5.large", "cache.r5.xlarge", "cache.r5.2xlarge", "cache.r5.4xlarge", "cache.r5.8xlarge", "cache.r5.12xlarge", "cache.r5.16xlarge", "cache.r5.24xlarge"], var.redis_config.node_type)
    ])
    error_message = "Redis configuration validation failed. Check node type, ports, and snapshot settings."
  }
}

# RabbitMQ Configuration
variable "rabbitmq_config" {
  description = "AmazonMQ RabbitMQ configuration"
  type = object({
    engine_type        = string
    engine_version     = string
    instance_type      = string
    allocation_storage = number
    max_allocated_storage = number
    backup_retention_period = number
    maintenance_window = string
    multi_az           = bool
    storage_encrypted  = bool
    deletion_protection = bool
    publicly_accessible = bool
    cache_security_group_ids = list(string)
  })
  
  default = {
    engine_type        = "RabbitMQ"
    engine_version     = "3.11.20"
    instance_type      = "mq.t3.medium"
    allocation_storage = 20
    max_allocated_storage = 200
    backup_retention_period = 30
    maintenance_window = "Sun:02:00-Sun:03:00"
    multi_az           = true
    storage_encrypted  = true
    deletion_protection = true
    publicly_accessible = false
    cache_security_group_ids = []
  }
  
  validation {
    condition = alltrue([
      var.rabbitmq_config.allocation_storage >= 10,
      var.rabbitmq_config.allocation_storage <= 1000,
      var.rabbitmq_config.max_allocated_storage >= var.rabbitmq_config.allocation_storage,
      var.rabbitmq_config.backup_retention_period >= 1,
      var.rabbitmq_config.backup_retention_period <= 35,
      contains(["mq.t3.micro", "mq.t3.small", "mq.t3.medium", "mq.t3.large", "mq.t3.xlarge", "mq.m5.large", "mq.m5.xlarge", "mq.m5.2xlarge"], var.rabbitmq_config.instance_type)
    ])
    error_message = "RabbitMQ configuration validation failed. Check instance type, storage, and backup settings."
  }
}

# S3 Configuration
variable "s3_config" {
  description = "S3 bucket configuration"
  type = object({
    versioning_enabled      = bool
    lifecycle_enabled       = bool
    replication_enabled     = bool
    cors_enabled            = bool
    encryption_at_rest      = bool
    block_public_access     = bool
    default_retention_days  = number
    intelligent_tiering     = bool
    analytics_enabled       = bool
    metrics_enabled         = bool
  })
  
  default = {
    versioning_enabled      = true
    lifecycle_enabled       = true
    replication_enabled     = true
    cors_enabled            = true
    encryption_at_rest      = true
    block_public_access     = true
    default_retention_days  = 2555  # 7 years
    intelligent_tiering     = true
    analytics_enabled       = true
    metrics_enabled         = true
  }
  
  validation {
    condition = alltrue([
      var.s3_config.default_retention_days >= 1,
      var.s3_config.default_retention_days <= 36500,  # 100 years
      var.s3_config.default_retention_days >= 30 if var.s3_config.versioning_enabled
    ])
    error_message = "S3 configuration validation failed. Check retention days and versioning settings."
  }
}

# SSL Certificate Configuration
variable "certificates" {
  description = "SSL certificate configuration"
  type = object({
    domain_name              = string
    subject_alternative_names = list(string)
    validation_method        = string
    renewal_threshold_days   = number
  })
  
  default = {
    domain_name              = "silhouette.com"
    subject_alternative_names = ["*.silhouette.com", "app.silhouette.com", "api.silhouette.com", "admin.silhouette.com"]
    validation_method        = "DNS"
    renewal_threshold_days   = 30
  }
  
  validation {
    condition = alltrue([
      length(var.certificates.domain_name) > 0,
      length(var.certificates.subject_alternative_names) <= 10,
      contains(["DNS", "EMAIL"], var.certificates.validation_method),
      var.certificates.renewal_threshold_days >= 7 && var.certificates.renewal_threshold_days <= 90
    ])
    error_message = "Certificate configuration validation failed. Check domain names and validation method."
  }
}

# Monitoring and Logging Configuration
variable "monitoring_config" {
  description = "Monitoring and logging configuration"
  type = object({
    log_retention_days      = number
    metrics_retention_days  = number
    enable_vpc_flow_logs    = bool
    enable_cloudtrail       = bool
    enable_guardduty        = bool
    enable_config           = bool
    enable_security_hub     = bool
    enable_inspector        = bool
    enable_macie            = bool
    custom_metric_namespace = string
    alarm_sns_topic_arn     = string
  })
  
  default = {
    log_retention_days      = 2555  # 7 years
    metrics_retention_days  = 2555
    enable_vpc_flow_logs    = true
    enable_cloudtrail       = true
    enable_guardduty        = true
    enable_config           = true
    enable_security_hub     = true
    enable_inspector        = true
    enable_macie            = true
    custom_metric_namespace = "Silhouette/Workflow"
    alarm_sns_topic_arn     = null
  }
  
  validation {
    condition = alltrue([
      var.monitoring_config.log_retention_days >= 1,
      var.monitoring_config.log_retention_days <= 2555,  # 7 years
      var.monitoring_config.metrics_retention_days >= 1,
      var.monitoring_config.metrics_retention_days <= 2555,
      var.monitoring_config.renewal_threshold_days >= 7
    ])
    error_message = "Monitoring configuration validation failed. Check retention days and threshold values."
  }
}

# Security Configuration
variable "security_config" {
  description = "Security and compliance configuration"
  type = object({
    enable_waf             = bool
    enable_shield          = bool
    enable_kms_key_rotation = bool
    enable_s3_block_public_access = bool
    enable_rds_storage_encryption = bool
    enable_elasticache_encryption = bool
    enable_vpc_flow_logs   = bool
    enable_cloudtrail_log_file_validation = bool
    enable_config_rules    = bool
    compliance_framework   = list(string)
    audit_log_retention_days = number
  })
  
  default = {
    enable_waf             = true
    enable_shield          = true
    enable_kms_key_rotation = true
    enable_s3_block_public_access = true
    enable_rds_storage_encryption = true
    enable_elasticache_encryption = true
    enable_vpc_flow_logs   = true
    enable_cloudtrail_log_file_validation = true
    enable_config_rules    = true
    compliance_framework   = ["SOC2", "GDPR", "HIPAA"]
    audit_log_retention_days = 2555
  }
  
  validation {
    condition = alltrue([
      var.security_config.audit_log_retention_days >= 365,
      var.security_config.audit_log_retention_days <= 2555,
      length(var.security_config.compliance_framework) >= 1
    ])
    error_message = "Security configuration validation failed. Check compliance framework and retention days."
  }
}

# Backup and Disaster Recovery Configuration
variable "backup_config" {
  description = "Backup and disaster recovery configuration"
  type = object({
    enable_automatic_backups = bool
    backup_retention_period  = number
    cross_region_backup      = bool
    backup_window            = string
    recovery_point_objective = number  # in hours
    recovery_time_objective  = number  # in hours
    backup_encryption_key_arn = string
    backup_schedule_cron     = string
  })
  
  default = {
    enable_automatic_backups = true
    backup_retention_period  = 30
    cross_region_backup      = true
    backup_window            = "02:00-04:00"
    recovery_point_objective = 1      # 1 hour
    recovery_time_objective  = 4      # 4 hours
    backup_encryption_key_arn = null
    backup_schedule_cron     = "0 2 * * *"
  }
  
  validation {
    condition = alltrue([
      var.backup_config.backup_retention_period >= 1,
      var.backup_config.backup_retention_period <= 365,
      var.backup_config.recovery_point_objective >= 1,
      var.backup_config.recovery_point_objective <= 24,
      var.backup_config.recovery_time_objective >= 1,
      var.backup_config.recovery_time_objective <= 24,
      var.backup_config.recovery_point_objective <= var.backup_config.recovery_time_objective
    ])
    error_message = "Backup configuration validation failed. Check RPO/RTO and retention period values."
  }
}

# Cost Optimization Configuration
variable "cost_config" {
  description = "Cost optimization configuration"
  type = object({
    enable_spot_instances    = bool
    enable_savings_plans     = bool
    enable_reserved_instances = bool
    enable_cost_allocation_tags = bool
    budget_threshold         = number
    budget_currency          = string
    budget_time_unit         = string
    enable_detailed_monitoring = bool
  })
  
  default = {
    enable_spot_instances    = false  # Disabled for production
    enable_savings_plans     = true
    enable_reserved_instances = true
    enable_cost_allocation_tags = true
    budget_threshold         = 10000
    budget_currency          = "USD"
    budget_time_unit         = "MONTHLY"
    enable_detailed_monitoring = true
  }
  
  validation {
    condition = alltrue([
      var.cost_config.budget_threshold > 0,
      contains(["USD", "EUR", "GBP", "JPY", "CAD", "AUD"], var.cost_config.budget_currency),
      contains(["MONTHLY", "QUARTERLY", "YEARLY"], var.cost_config.budget_time_unit)
    ])
    error_message = "Cost configuration validation failed. Check budget threshold and currency settings."
  }
}

# Tags Configuration
variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}

variable "required_tags" {
  description = "Required tags for compliance"
  type        = map(string)
  default = {
    "Environment" = "production"
    "Project"     = "silhouette-workflow"
    "ManagedBy"   = "terraform"
    "Owner"       = "devops@company.com"
    "Platform"    = "kubernetes"
    "Compliance"  = "SOC2"
    "Backup"      = "automated"
  }
}

# Feature Flags
variable "feature_flags" {
  description = "Feature flags for different capabilities"
  type = object({
    enable_multi_tenant     = bool
    enable_ai_ml_features   = bool
    enable_advanced_monitoring = bool
    enable_compliance_mode  = bool
    enable_disaster_recovery = bool
    enable_cost_optimization = bool
    enable_security_hardening = bool
  })
  
  default = {
    enable_multi_tenant     = true
    enable_ai_ml_features   = true
    enable_advanced_monitoring = true
    enable_compliance_mode  = true
    enable_disaster_recovery = true
    enable_cost_optimization = true
    enable_security_hardening = true
  }
}