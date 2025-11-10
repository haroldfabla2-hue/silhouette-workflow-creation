{{/*
Expand the name of the chart.
*/}}
{{- define "silhouette-workflow.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "silhouette-workflow.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "silhouette-workflow.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "silhouette-workflow.labels" -}}
helm.sh/chart: {{ include "silhouette-workflow.chart" . }}
{{ include "silhouette-workflow.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "silhouette-workflow.selectorLabels" -}}
app.kubernetes.io/name: {{ include "silhouette-workflow.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "silhouette-workflow.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "silhouette-workflow.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Validate required values
*/}}
{{- define "silhouette-workflow.validateValues" -}}
{{- if not .Values.global.domain }}
{{- fail "global.domain is required" }}
{{- end }}
{{- if not .Values.backend.image.repository }}
{{- fail "backend.image.repository is required" }}
{{- end }}
{{- if not .Values.frontend.image.repository }}
{{- fail "frontend.image.repository is required" }}
{{- end }}
{{- end }}

{{/*
Create backend labels
*/}}
{{- define "silhouette-workflow.backend.labels" -}}
{{ include "silhouette-workflow.labels" . }}
app.kubernetes.io/component: backend
app.kubernetes.io/part-of: {{ include "silhouette-workflow.name" . }}
{{- end }}

{{/*
Create frontend labels
*/}}
{{- define "silhouette-workflow.frontend.labels" -}}
{{ include "silhouette-workflow.labels" . }}
app.kubernetes.io/component: frontend
app.kubernetes.io/part-of: {{ include "silhouette-workflow.name" . }}
{{- end }}

{{/*
Create postgresql labels
*/}}
{{- define "silhouette-workflow.postgresql.labels" -}}
{{ include "silhouette-workflow.labels" . }}
app.kubernetes.io/component: postgresql
app.kubernetes.io/part-of: {{ include "silhouette-workflow.name" . }}
{{- end }}

{{/*
Create redis labels
*/}}
{{- define "silhouette-workflow.redis.labels" -}}
{{ include "silhouette-workflow.labels" . }}
app.kubernetes.io/component: redis
app.kubernetes.io/part-of: {{ include "silhouette-workflow.name" . }}
{{- end }}

{{/*
Create rabbitmq labels
*/}}
{{- define "silhouette-workflow.rabbitmq.labels" -}}
{{ include "silhouette-workflow.labels" . }}
app.kubernetes.io/component: rabbitmq
app.kubernetes.io/part-of: {{ include "silhouette-workflow.name" . }}
{{- end }}

{{/*
Create neo4j labels
*/}}
{{- define "silhouette-workflow.neo4j.labels" -}}
{{ include "silhouette-workflow.labels" . }}
app.kubernetes.io/component: neo4j
app.kubernetes.io/part-of: {{ include "silhouette-workflow.name" . }}
{{- end }}

{{/*
Create monitoring labels
*/}}
{{- define "silhouette-workflow.monitoring.labels" -}}
{{ include "silhouette-workflow.labels" . }}
app.kubernetes.io/component: monitoring
app.kubernetes.io/part-of: {{ include "silhouette-workflow.name" . }}
{{- end }}

{{/*
Common template functions
*/}}
{{- define "silhouette-workflow.image" -}}
{{- $registry := .Values.global.imageRegistry -}}
{{- $image := .image -}}
{{- if $registry }}
{{- printf "%s/%s" $registry $image.repository }}
{{- else }}
{{- printf "%s" $image.repository }}
{{- end -}}
{{- end }}

{{/*
Image tag
*/}}
{{- define "silhouette-workflow.imageTag" -}}
{{- .image.tag | default .Chart.AppVersion -}}
{{- end }}

{{/*
Image full reference
*/}}
{{- define "silhouette-workflow.imageFull" -}}
{{- include "silhouette-workflow.image" . }}:{{ include "silhouette-workflow.imageTag" . }}
{{- end }}

{{/*
Generate a secret for external services
*/}}
{{- define "silhouette-workflow.externalSecrets" -}}
apiVersion: v1
kind: Secret
metadata:
  name: {{ include "silhouette-workflow.fullname" . }}-external
  namespace: {{ .Release.Namespace | quote }}
  labels:
    {{- include "silhouette-workflow.labels" . | nindent 4 }}
type: Opaque
stringData:
  OPENAI_API_KEY: "{{ .Values.externalSecrets.openaiApiKey }}"
  GITHUB_TOKEN: "{{ .Values.externalSecrets.githubToken }}"
  AWS_ACCESS_KEY_ID: "{{ .Values.externalSecrets.awsAccessKeyId }}"
  AWS_SECRET_ACCESS_KEY: "{{ .Values.externalSecrets.awsSecretAccessKey }}"
  AWS_REGION: "{{ .Values.global.aws.region }}"
  AWS_S3_BUCKET: "{{ .Values.global.aws.s3Bucket }}"
  SENDGRID_API_KEY: "{{ .Values.externalSecrets.sendgridApiKey }}"
  SENDGRID_FROM_EMAIL: "{{ .Values.global.email.from }}"
  SENTRY_DSN: "{{ .Values.externalSecrets.sentryDsn }}"
  SENTRY_ORG: "{{ .Values.externalSecrets.sentryOrg }}"
  SENTRY_PROJECT: "{{ .Values.externalSecrets.sentryProject }}"
  SLACK_BOT_TOKEN: "{{ .Values.externalSecrets.slackBotToken }}"
  SLACK_SIGNING_SECRET: "{{ .Values.externalSecrets.slackSigningSecret }}"
  SLACK_WEBHOOK_URL: "{{ .Values.externalSecrets.slackWebhookUrl }}"
  PAGERDUTY_API_KEY: "{{ .Values.externalSecrets.pagerdutyApiKey }}"
  PAGERDUTY_SERVICE_KEY: "{{ .Values.externalSecrets.pagerdutyServiceKey }}"
  DATADOG_API_KEY: "{{ .Values.externalSecrets.datadogApiKey }}"
  DATADOG_APP_KEY: "{{ .Values.externalSecrets.datadogAppKey }}"
{{- end }}

{{/*
Generate database configuration
*/}}
{{- define "silhouette-workflow.dbConfig" -}}
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ include "silhouette-workflow.fullname" . }}-config
  namespace: {{ .Release.Namespace | quote }}
  labels:
    {{- include "silhouette-workflow.labels" . | nindent 4 }}
data:
  DATABASE_HOST: "{{ .Values.postgresql.primary.fullname }}"
  DATABASE_PORT: "5432"
  DATABASE_NAME: "{{ .Values.postgresql.auth.database }}"
  DATABASE_USER: "{{ .Values.postgresql.auth.username }}"
  DATABASE_SSL: "true"
  DATABASE_CONNECTION_POOL: "20"
  DATABASE_TIMEOUT: "30000"
  DATABASE_IDLE_TIMEOUT: "600000"
  DATABASE_LOGGING: "false"
  
  REDIS_HOST: "{{ .Values.redis.master.fullname }}"
  REDIS_PORT: "6379"
  REDIS_DB: "0"
  REDIS_MAX_RETRIES: "3"
  REDIS_RETRY_DELAY: "1000"
  REDIS_KEY_PREFIX: "silhouette:"
  REDIS_TTL_DEFAULT: "3600"
  
  RABBITMQ_HOST: "{{ .Values.rabbitmq.fullname }}"
  RABBITMQ_PORT: "5672"
  RABBITMQ_VHOST: "/"
  RABBITMQ_PREFETCH_COUNT: "10"
  RABBITMQ_RETRY_DELAY: "5000"
  
  NEO4J_HOST: "{{ .Values.neo4j.fullname }}"
  NEO4J_PORT: "7687"
  NEO4J_DATABASE: "{{ .Values.neo4j.auth.database }}"
  NEO4J_BOLT_TIMEOUT: "30000"
  NEO4J_MAX_CONNECTION_POOL_SIZE: "100"
  
  METRICS_ENABLED: "true"
  METRICS_PORT: "9090"
  TRACING_ENABLED: "true"
  TRACING_SAMPLER_TYPE: "const"
  TRACING_SAMPLER_PARAM: "1"
  
  ML_MODEL_PATH: "/app/models"
  ML_PREDICTION_TIMEOUT: "30000"
  ML_BATCH_SIZE: "100"
  ML_MAX_CONCURRENT_PREDICTIONS: "50"
  
  PM2_INSTANCES: "max"
  PM2_MAX_MEMORY: "1G"
  LOG_LEVEL: "{{ .Values.global.logging.level }}"
  LOG_FORMAT: "{{ .Values.global.logging.format }}"
  LOG_STRUCTURED: "{{ .Values.global.logging.structured }}"
  
  NEXT_PUBLIC_API_URL: "https://{{ .Values.global.domain }}/api"
  NEXT_PUBLIC_WS_URL: "wss://{{ .Values.global.domain }}/ws"
  NEXT_PUBLIC_ENABLE_ANALYTICS: "true"
  NEXT_PUBLIC_ENABLE_COLLABORATION: "true"
  NEXT_PUBLIC_ENABLE_AI: "true"
  NEXT_PUBLIC_ENABLE_COMPLIANCE: "{{ .Values.compliance.enabled }}"
  NEXT_PUBLIC_SENTRY_DSN: "{{ .Values.externalSecrets.sentryDsn }}"
  NEXT_PUBLIC_SENTRY_ENVIRONMENT: "{{ .Values.global.environment }}"
  NEXT_PUBLIC_SENTRY_RELEASE: "{{ .Chart.AppVersion }}"
{{- end }}

{{/*
Generate security configuration
*/}}
{{- define "silhouette-workflow.securityConfig" -}}
apiVersion: v1
kind: Secret
metadata:
  name: {{ include "silhouette-workflow.fullname" . }}-security
  namespace: {{ .Release.Namespace | quote }}
  labels:
    {{- include "silhouette-workflow.labels" . | nindent 4 }}
type: Opaque
stringData:
  JWT_SECRET_KEY: "{{ .Values.security.jwt.secretKey }}"
  JWT_ACCESS_TOKEN_EXPIRY: "900"
  JWT_REFRESH_TOKEN_EXPIRY: "604800"
  JWT_ISSUER: "silhouette-platform"
  JWT_AUDIENCE: "silhouette-users"
  
  ENCRYPTION_KEY: "{{ .Values.security.encryptionKey }}"
  BCRYPT_ROUNDS: "12"
  
  CORS_ORIGINS: "https://{{ .Values.global.domain }}"
  RATE_LIMIT_WINDOW: "900000"
  RATE_LIMIT_MAX: "100"
  
  UPLOAD_MAX_SIZE: "10485760"
  UPLOAD_ALLOWED_TYPES: "json,yaml,xml,csv"
  STORAGE_PROVIDER: "s3"
  S3_BUCKET: "{{ .Values.global.aws.s3Bucket }}"
  S3_REGION: "{{ .Values.global.aws.region }}"
  
  GDPR_RETENTION_DAYS: "{{ .Values.compliance.gdpr.retentionDays }}"
  AUDIT_LOG_RETENTION_DAYS: "{{ .Values.compliance.audit.retentionDays }}"
  COMPLIANCE_MODE: "{{ if .Values.compliance.enabled }}strict{{ else }}basic{{ end }}"
  DATA_ENCRYPTION_AT_REST: "{{ .Values.compliance.encryption.atRest }}"
  
  OPEN_TELEMETRY_ENABLED: "true"
  JAEGER_ENDPOINT: "http://{{ .Values.monitoring.jaeger.fullname }}:14268/api/traces"
{{- end }}