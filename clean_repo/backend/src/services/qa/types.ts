// services/qa/types.ts
// Core QA System Types

export interface QASystemConfig {
  confidenceThreshold: number; // 0.99 for 99%
  hallucinationDetection: boolean;
  multiSourceVerification: boolean;
  realTimeValidation: boolean;
  automatedReasoning: boolean;
  crossReferenceEnabled: boolean;
  cacheEnabled: boolean;
  maxCacheSize: number;
  cacheTimeout: number; // milliseconds
}

export interface VerificationInput {
  content: string;
  context?: any;
  domainKnowledge?: string;
  verificationLevel?: 'basic' | 'standard' | 'strict' | 'critical';
  sources?: string[];
  userId?: string;
  requestId?: string;
}

export interface VerificationResult {
  isValid: boolean;
  confidenceScore: number; // 0.0 - 1.0
  hallucinationProbability: number; // 0.0 - 1.0
  verificationTime: number; // milliseconds
  requestId: string;
  steps: VerificationStep[];
  qualityGate: QualityGateResult;
  issues: string[];
  recommendations: string[];
  sources: VerificationSource[];
  metadata?: VerificationMetadata;
}

export interface VerificationStep {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  result: any;
  timestamp: Date;
  duration?: number;
  agentId?: string;
}

export interface QualityGateResult {
  passed: boolean;
  issues: string[];
  recommendations: string[];
  confidenceScore: number;
  gateResults: GateResult[];
}

export interface GateResult {
  gate: string;
  passed: boolean;
  value: any;
  threshold: any;
  message: string;
}

export interface VerificationSource {
  id: string;
  type: 'internet' | 'database' | 'document' | 'api' | 'knowledge-graph' | 'reasoning';
  url?: string;
  title?: string;
  confidence: number;
  status: 'verified' | 'unverified' | 'disputed' | 'failed';
  metadata: {
    lastChecked?: Date;
    credibility?: number;
    relevance?: number;
    freshness?: number;
  };
  excerpt?: string;
}

export interface VerificationMetadata {
  version: string;
  createdAt: Date;
  modelVersions: {
    [agentType: string]: string;
  };
  processingStats: {
    totalSources: number;
    successfulSources: number;
    failedSources: number;
    averageResponseTime: number;
  };
  qualityScore: {
    overall: number;
    accuracy: number;
    completeness: number;
    freshness: number;
    credibility: number;
  };
}

// Agent Types
export interface QAAgent {
  id: string;
  name: string;
  type: AgentType;
  status: AgentStatus;
  capabilities: string[];
  config: AgentConfig;
  
  // Core methods
  initialize(): Promise<void>;
  verify(input: VerificationInput): Promise<AgentResult>;
  checkHealth(): Promise<HealthCheckResult>;
  configure(config: Partial<AgentConfig>): Promise<void>;
  shutdown(): Promise<void>;
}

export type AgentType = 
  | 'information-verifier'
  | 'fact-checker'
  | 'cross-reference'
  | 'internet-verifier'
  | 'document-verifier'
  | 'hallucination-detector'
  | 'truthfulness-validator'
  | 'quality-gate'
  | 'reasoning-engine';

export interface AgentStatus {
  id: string;
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'offline';
  uptime: number; // seconds
  lastHealthCheck: Date;
  performance: {
    successRate: number;
    averageResponseTime: number;
    errorRate: number;
    throughput: number; // requests per minute
  };
  config: AgentConfig;
  metrics: AgentMetrics;
}

export interface AgentConfig {
  enabled: boolean;
  timeout: number; // milliseconds
  maxRetries: number;
  parallelExecution: boolean;
  confidenceThreshold: number;
  customSettings: Record<string, any>;
}

export interface AgentResult {
  success: boolean;
  confidence: number;
  data: any;
  sources: VerificationSource[];
  issues: string[];
  metadata: AgentResultMetadata;
  processingTime: number;
}

export interface AgentResultMetadata {
  agentId: string;
  agentVersion: string;
  executionId: string;
  timestamp: Date;
  modelUsed?: string;
  parameters?: Record<string, any>;
}

export interface HealthCheckResult {
  healthy: boolean;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  checks: HealthCheck[];
  lastCheck: Date;
}

export interface HealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message?: string;
  responseTime?: number;
  details?: any;
}

export interface AgentMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageConfidence: number;
  hallucinationDetections: number;
  falsePositives: number;
  falseNegatives: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
}

// Monitoring and Alerting Types
export interface QAMetrics {
  system: SystemMetrics;
  performance: PerformanceMetrics;
  quality: QualityMetrics;
  agents: AgentMetrics[];
  trends: TrendMetrics;
  alerts: AlertMetrics;
}

export interface SystemMetrics {
  uptime: number;
  totalVerifications: number;
  successRate: number;
  averageResponseTime: number;
  throughput: number; // verifications per minute
  cacheHitRate: number;
  errorRate: number;
}

export interface PerformanceMetrics {
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  throughputPeak: number;
  throughputAverage: number;
  resourceUtilization: {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
  };
}

export interface QualityMetrics {
  overallAccuracy: number;
  hallucinationRate: number;
  falsePositiveRate: number;
  falseNegativeRate: number;
  sourceCredibilityScore: number;
  consensusAgreement: number;
  verificationCompleteness: number;
}

export interface TrendMetrics {
  accuracyTrend: TrendData[];
  performanceTrend: TrendData[];
  qualityTrend: TrendData[];
  volumeTrend: TrendData[];
}

export interface TrendData {
  timestamp: Date;
  value: number;
  change: number; // percentage change
  trend: 'up' | 'down' | 'stable';
}

export interface AlertMetrics {
  totalAlerts: number;
  criticalAlerts: number;
  resolvedAlerts: number;
  responseTime: number;
  escalationRate: number;
}

// WebSocket and Real-time Types
export interface QAWebSocketMessage {
  type: 'verification-request' | 'verification-result' | 'agent-status' | 'alert' | 'metric-update';
  payload: any;
  timestamp: Date;
  requestId?: string;
}

export interface VerificationWebSocketRequest extends QAWebSocketMessage {
  type: 'verification-request';
  payload: {
    content: string;
    context?: any;
    verificationLevel: string;
    clientId: string;
  };
}

export interface VerificationWebSocketResult extends QAWebSocketMessage {
  type: 'verification-result';
  payload: {
    requestId: string;
    result: VerificationResult;
    clientId: string;
  };
}

// Configuration Types
export interface QAConfig {
  system: QASystemConfig;
  agents: Record<string, AgentConfig>;
  monitoring: MonitoringConfig;
  alerting: AlertingConfig;
  caching: CachingConfig;
  security: SecurityConfig;
}

export interface MonitoringConfig {
  enabled: boolean;
  collectionInterval: number; // milliseconds
  retention: {
    metrics: number; // days
    logs: number; // days
    traces: number; // days
  };
  exporters: {
    prometheus?: PrometheusConfig;
    grafana?: GrafanaConfig;
    elasticsearch?: ElasticsearchConfig;
  };
}

export interface PrometheusConfig {
  enabled: boolean;
  port: number;
  path: string;
}

export interface GrafanaConfig {
  enabled: boolean;
  url: string;
  apiKey?: string;
}

export interface ElasticsearchConfig {
  enabled: boolean;
  url: string;
  index: string;
}

export interface AlertingConfig {
  enabled: boolean;
  channels: AlertChannel[];
  rules: AlertRule[];
  escalation: EscalationConfig;
}

export interface AlertChannel {
  id: string;
  type: 'email' | 'slack' | 'teams' | 'webhook' | 'pagerduty';
  config: Record<string, any>;
  enabled: boolean;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: string;
  threshold: any;
  severity: 'critical' | 'high' | 'medium' | 'low';
  enabled: boolean;
  channels: string[];
  cooldown: number; // seconds
}

export interface EscalationConfig {
  enabled: boolean;
  levels: EscalationLevel[];
}

export interface EscalationLevel {
  level: number;
  delay: number; // minutes
  channels: string[];
  condition: string;
}

export interface CachingConfig {
  enabled: boolean;
  strategy: 'memory' | 'redis' | 'database' | 'hybrid';
  ttl: number; // seconds
  maxSize: number; // entries
  compression: boolean;
  encryption: boolean;
}

export interface SecurityConfig {
  enabled: boolean;
  authentication: {
    required: boolean;
    methods: string[];
  };
  authorization: {
    enabled: boolean;
    roles: string[];
  };
  encryption: {
    dataAtRest: boolean;
    dataInTransit: boolean;
    algorithm: string;
  };
  audit: {
    enabled: boolean;
    level: 'basic' | 'detailed' | 'comprehensive';
  };
}

// Error Types
export interface QAError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  requestId?: string;
  agentId?: string;
  stack?: string;
}

export class QAValidationError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'QAValidationError';
  }
}

export class QAAgentError extends Error {
  constructor(
    message: string,
    public agentId: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'QAAgentError';
  }
}

// Export all types
export * from './engines/types';
export * from './agents/types';