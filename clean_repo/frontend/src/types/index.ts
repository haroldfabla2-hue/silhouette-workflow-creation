// ==================================================
// SILHOUETTE WORKFLOW CREATION - TYPESCRIPT TYPES
// ==================================================

// Organization and User Types
export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'starter' | 'professional' | 'enterprise';
  settings: Record<string, any>;
  limits: Record<string, any>;
  billing_info?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  org_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  role: 'admin' | 'owner' | 'manager' | 'member' | 'viewer';
  status: 'active' | 'inactive' | 'suspended';
  preferences: Record<string, any>;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

// Workflow Types
export interface Workflow {
  id: string;
  org_id: string;
  name: string;
  description?: string;
  type: 'manual' | 'scheduled' | 'triggered' | 'api';
  status: 'draft' | 'active' | 'paused' | 'archived' | 'error';
  canvas_data: CanvasData;
  triggers: WorkflowTrigger[];
  actions: WorkflowAction[];
  schedule_config?: ScheduleConfig;
  variables: Record<string, any>;
  tags: string[];
  version: number;
  is_public: boolean;
  created_by: string;
  last_modified_by: string;
  created_at: string;
  updated_at: string;
}

export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  org_id: string;
  trigger_type: 'manual' | 'scheduled' | 'api' | 'webhook';
  trigger_data?: Record<string, any>;
  status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled';
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  input_data?: Record<string, any>;
  output_data?: Record<string, any>;
  error_message?: string;
  execution_log: ExecutionLogEntry[];
  created_by: string;
}

// React Flow Canvas Types
export interface CanvasData {
  nodes: FlowNode[];
  edges: FlowEdge[];
  viewport?: {
    x: number;
    y: number;
    zoom: number;
  };
}

export interface FlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: NodeData;
  width?: number;
  height?: number;
  selected?: boolean;
  dragging?: boolean;
  zIndex?: number;
}

export interface FlowEdge {
  id: string;
  type?: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
  animated?: boolean;
  style?: Record<string, any>;
  markerEnd?: EdgeMarker;
}

export interface NodeData {
  label: string;
  description?: string;
  icon?: string;
  status?: 'idle' | 'running' | 'success' | 'error' | 'warning';
  config?: Record<string, any>;
  inputs?: NodePort[];
  outputs?: NodePort[];
  credentials?: string[];
  team_assignments?: TeamAssignment[];
  [key: string]: any;
}

export interface NodePort {
  id: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'any';
  required: boolean;
  description?: string;
  default_value?: any;
}

export interface EdgeMarker {
  type: 'arrow' | 'arrow-closed';
  width: number;
  height: number;
  color?: string;
}

// Workflow Configuration Types
export interface WorkflowTrigger {
  id: string;
  type: 'manual' | 'schedule' | 'webhook' | 'event' | 'file' | 'email';
  config: Record<string, any>;
  enabled: boolean;
  conditions?: TriggerCondition[];
}

export interface TriggerCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than';
  value: any;
}

export interface WorkflowAction {
  id: string;
  type: string;
  config: Record<string, any>;
  order: number;
  conditions?: ActionCondition[];
  retry_config?: RetryConfig;
}

export interface ActionCondition {
  field: string;
  operator: string;
  value: any;
  action: 'skip' | 'use_default' | 'fail';
  default_value?: any;
}

export interface RetryConfig {
  max_attempts: number;
  backoff_strategy: 'linear' | 'exponential' | 'fixed';
  base_delay: number;
  max_delay: number;
  retry_on: string[];
}

export interface ScheduleConfig {
  cron_expression?: string;
  timezone?: string;
  start_date?: string;
  end_date?: string;
  description?: string;
}

// Execution and Logging Types
export interface ExecutionLogEntry {
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  message: string;
  data?: Record<string, any>;
  node_id?: string;
  team_id?: string;
}

// Credential and Security Types
export interface Credential {
  id: string;
  org_id: string;
  name: string;
  description?: string;
  type: 'api_key' | 'oauth2' | 'basic_auth' | 'bearer_token' | 'database' | 'cloud_service' | 'custom';
  encrypted_data: Record<string, any>;
  metadata: Record<string, any>;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface SessionData {
  user_id: string;
  org_id: string;
  email: string;
  role: string;
  permissions: string[];
  preferences: Record<string, any>;
  expires_at: string;
}

// Silhouette Framework Types
export interface SilhouetteTeam {
  id: string;
  framework_team_id: string;
  name: string;
  category: 'technology' | 'security' | 'analytics' | 'marketing' | 'sales' | 'product' | 'operations' | 'hr' | 'finance' | 'legal' | 'customer_service' | 'quality' | 'communication' | 'csr' | 'executive';
  description?: string;
  capabilities: string[];
  skills: TeamSkill[];
  sla_info?: SLAMetrics;
  status: 'active' | 'inactive' | 'maintenance' | 'overloaded';
  max_concurrent_tasks: number;
  avg_response_time_ms: number;
  created_at: string;
  updated_at: string;
}

export interface TeamSkill {
  name: string;
  level: 'basic' | 'intermediate' | 'advanced' | 'expert';
  category: string;
}

export interface TeamAssignment {
  id: string;
  workflow_id: string;
  task_id: string;
  team_id: string;
  org_id: string;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'failed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assigned_at: string;
  started_at?: string;
  completed_at?: string;
  estimated_duration_ms?: number;
  actual_duration_ms?: number;
  input_data?: Record<string, any>;
  output_data?: Record<string, any>;
  error_details?: Record<string, any>;
  created_by: string;
  created_at: string;
}

export interface SLAMetrics {
  response_time: {
    target: number;
    current: number;
  };
  availability: {
    target: number;
    current: number;
  };
  quality: {
    target: number;
    current: number;
  };
  throughput: {
    target: number;
    current: number;
  };
}

// UI State Management Types
export interface UIState {
  theme: 'light' | 'dark' | 'system';
  sidebar: {
    collapsed: boolean;
    width: number;
  };
  canvas: {
    zoom: number;
    pan: { x: number; y: number };
    selected_nodes: string[];
    selected_edges: string[];
  };
  modals: {
    workflow_settings: boolean;
    node_config: boolean;
    credential_manager: boolean;
    team_browser: boolean;
    execution_history: boolean;
  };
  notifications: Notification[];
}

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  created_at: string;
}

// Collaboration Types
export interface CollaborationSession {
  id: string;
  workflow_id: string;
  user_id: string;
  session_token: string;
  is_active: boolean;
  cursor_position?: { x: number; y: number };
  selection_data?: Record<string, any>;
  last_activity_at: string;
  created_at: string;
}

export interface CollaboratorPresence {
  user_id: string;
  user_name: string;
  user_avatar?: string;
  cursor_position?: { x: number; y: number };
  selection_data?: Record<string, any>;
  last_seen: string;
  is_active: boolean;
}

// API Response Types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    has_more?: boolean;
  };
}

// Form Types
export interface WorkflowFormData {
  name: string;
  description?: string;
  type: Workflow['type'];
  status: Workflow['status'];
  tags: string[];
  triggers: Omit<WorkflowTrigger, 'id'>[];
  actions: Omit<WorkflowAction, 'id'>[];
  variables: Record<string, any>;
  schedule_config?: Omit<ScheduleConfig, 'description'>;
}

export interface UserFormData {
  email: string;
  first_name?: string;
  last_name?: string;
  role: User['role'];
  status: User['status'];
  preferences: Record<string, any>;
}

// Error Types
export interface SilhouetteError extends Error {
  code: string;
  status?: number;
  details?: Record<string, any>;
  timestamp: string;
  request_id?: string;
}

// Analytics and Metrics Types
export interface WorkflowMetrics {
  workflow_id: string;
  total_executions: number;
  successful_executions: number;
  failed_executions: number;
  success_rate: number;
  avg_duration_ms: number;
  last_execution?: string;
  execution_frequency: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  error_patterns: {
    node_errors: Record<string, number>;
    common_errors: Array<{ message: string; count: number }>;
  };
}

// Search and Filter Types
export interface SearchFilters {
  query?: string;
  status?: Workflow['status'][];
  type?: Workflow['type'][];
  tags?: string[];
  date_range?: {
    start: string;
    end: string;
  };
  created_by?: string[];
  sort_by?: 'name' | 'created_at' | 'updated_at' | 'status';
  sort_order?: 'asc' | 'desc';
}

// Theme and Customization Types
export interface ThemeConfig {
  primary_color: string;
  secondary_color: string;
  background_color: string;
  text_color: string;
  border_radius: 'none' | 'small' | 'medium' | 'large';
  font_size: 'small' | 'medium' | 'large';
  font_family: 'inter' | 'system' | 'mono';
  animations: boolean;
  compact_mode: boolean;
}

export interface UserPreferences {
  theme: ThemeConfig;
  notifications: {
    email: boolean;
    browser: boolean;
    workflow_completion: boolean;
    team_assignments: boolean;
    system_updates: boolean;
  };
  workflow: {
    auto_save_interval: number;
    show_minimap: boolean;
    show_controls: boolean;
    snap_to_grid: boolean;
    grid_size: number;
  };
  collaboration: {
    show_cursors: boolean;
    show_selections: boolean;
    enable_animations: boolean;
  };
}

// ==================================================
// QA SYSTEM TYPES (Quality Assurance System)
// ==================================================

// QA Verification Types
export interface QAVerificationRequest {
  content: string;
  context?: any;
  sources?: string[];
  userId: string;
  options?: {
    requireConsensus?: boolean;
    strictMode?: boolean;
    timeout?: number;
    cacheResults?: boolean;
  };
}

export interface QAVerificationResult {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  confidence: number;
  verification: {
    isVerified: boolean;
    sources: Array<{
      url: string;
      credibility: number;
      status: 'verified' | 'unverified' | 'disputed';
      lastChecked: string;
    }>;
    consensus: {
      agreement: number;
      required: number;
      achieved: boolean;
    };
    details: {
      semanticSimilarity: number;
      factualAccuracy: number;
      sourceReliability: number;
      overallScore: number;
    };
  };
  processingTime: number;
  timestamp: string;
  agentIds: string[];
  metadata: {
    modelVersions: Record<string, string>;
    processingDetails: any;
    userFeedback?: {
      rating?: number;
      helpful?: boolean;
      comments?: string;
    };
  };
}

// Hallucination Detection Types
export interface HallucinationDetectionRequest {
  content: string;
  context?: any;
  userId: string;
  options?: {
    sensitivity?: number;
    timeout?: number;
    enableModels?: string[];
  };
}

export interface HallucinationResult {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  confidence: number;
  detection: {
    isHallucination: boolean;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    models: Array<{
      name: string;
      result: boolean;
      confidence: number;
      reasoning: string;
    }>;
    details: {
      factualAccuracy: number;
      logicalConsistency: number;
      sourceAttribution: number;
      temporalAccuracy: number;
      overallReliability: number;
    };
    warnings: string[];
    suggestions: string[];
  };
  processingTime: number;
  timestamp: string;
  agentIds: string[];
}

// Source Verification Types
export interface SourceVerificationRequest {
  sources: string[];
  content?: string;
  userId: string;
  options?: {
    checkDomainReputation?: boolean;
    requireMultipleSources?: boolean;
    timeout?: number;
    cacheResults?: boolean;
  };
}

export interface SourceVerificationResult {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  sources: Array<{
    url: string;
    domain: string;
    credibility: number;
    status: 'verified' | 'unverified' | 'disputed' | 'invalid';
    reputation: {
      score: number;
      factors: Record<string, number>;
      lastUpdated: string;
    };
    accessibility: {
      status: 'accessible' | 'inaccessible' | 'restricted';
      responseTime?: number;
      statusCode?: number;
    };
    content: {
      length: number;
      language: string;
      type: string;
      quality: number;
    };
  }>;
  overallAssessment: {
    averageCredibility: number;
    consensusLevel: number;
    reliabilityScore: number;
    recommendation: 'trust' | 'caution' | 'avoid' | 'insufficient';
  };
  processingTime: number;
  timestamp: string;
  agentIds: string[];
}

// Batch Verification Types
export interface BatchVerificationRequest {
  items: Array<{
    id: string;
    content: string;
    type: 'information' | 'hallucination' | 'sources';
    context?: any;
  }>;
  userId: string;
  options?: {
    timeout?: number;
    enableCache?: boolean;
    parallel?: boolean;
    maxConcurrency?: number;
  };
}

export interface BatchVerificationResult {
  batchId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  results: Array<{
    itemId: string;
    status: 'success' | 'failed' | 'skipped';
    result: QAVerificationResult | HallucinationResult | SourceVerificationResult;
    error?: string;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
    skipped: number;
    averageProcessingTime: number;
  };
  processingTime: number;
  timestamp: string;
}

// QA System Health and Metrics
export interface QASystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  agents: Record<string, {
    status: 'active' | 'inactive' | 'error';
    lastHealthCheck: string;
    responseTime: number;
    successRate: number;
    errorCount: number;
  }>;
  metrics: {
    totalVerifications: number;
    successfulVerifications: number;
    averageProcessingTime: number;
    systemLoad: number;
    memoryUsage: number;
  };
  recommendations: string[];
}

export interface QASystemMetrics {
  period: string;
  performance: {
    totalRequests: number;
    successRate: number;
    averageResponseTime: number;
    throughput: number;
    errorRate: number;
  };
  accuracy: {
    precision: number;
    recall: number;
    f1Score: number;
    userSatisfaction: number;
  };
  resourceUtilization: {
    cpuUsage: number;
    memoryUsage: number;
    networkUsage: number;
    diskUsage: number;
  };
  agentMetrics: Record<string, {
    totalRequests: number;
    successRate: number;
    averageTime: number;
    errorRate: number;
  }>;
}

// QA UI State Types
export interface QAUIPreferences {
  autoVerify: boolean;
  showConfidence: boolean;
  showSources: boolean;
  strictMode: boolean;
  sensitivity: number;
  enableRealTime: boolean;
  notifications: {
    verificationComplete: boolean;
    hallucinationDetected: boolean;
    sourceWarning: boolean;
  };
}

export interface QANotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  verificationId?: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
}

// QA Store State
export interface QAState {
  preferences: QAUIPreferences;
  activeVerifications: Map<string, QAVerificationResult>;
  recentResults: Array<QAVerificationResult | HallucinationResult | SourceVerificationResult>;
  systemHealth: QASystemHealth | null;
  isInitialized: boolean;
  notifications: QANotification[];
}

// QA API Response Types
export interface QAAPIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    has_more?: boolean;
  };
}

// QA Event Types for WebSocket
export interface QAWebSocketEvents {
  // Client to Server
  'qa-verify-information': (data: { content: string; context?: any; requestId: string }) => void;
  'qa-detect-hallucination': (data: { content: string; requestId: string }) => void;
  'qa-verify-sources': (data: { sources: string[]; content?: string; requestId: string }) => void;
  
  // Server to Client
  'qa-verification-status': (data: { requestId: string; status: string; progress?: number }) => void;
  'qa-verification-complete': (data: { requestId: string; result: QAVerificationResult }) => void;
  'qa-hallucination-detected': (data: { content: string; riskLevel: string; suggestions: string[] }) => void;
  'qa-source-warning': (data: { source: string; reason: string; credibility: number }) => void;
  'qa-system-alert': (data: { level: 'info' | 'warning' | 'error'; message: string }) => void;
}