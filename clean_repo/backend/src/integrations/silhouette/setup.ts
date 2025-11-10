import axios, { AxiosInstance } from 'axios';
import dotenv from 'dotenv';
import { cache } from '../config/redis';

dotenv.config();

export interface SilhouetteConfig {
  frameworkApiUrl: string;
  teamsApiUrl: string;
  tasksApiUrl: string;
  frameworkManagerUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  autoScaling: boolean;
}

export const silhouetteConfig: SilhouetteConfig = {
  frameworkApiUrl: process.env.SILHOUETTE_API_URL || 'http://localhost:4001',
  teamsApiUrl: process.env.SILHOUETTE_TEAMS_API || 'http://localhost:4002',
  tasksApiUrl: process.env.SILHOUETTE_TASKS_API || 'http://localhost:4003',
  frameworkManagerUrl: process.env.SILHOUETTE_FRAMEWORK_MANAGER_URL || 'http://localhost:4001',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
  autoScaling: process.env.SILHOUETTE_AUTO_SCALING === 'true',
};

export class SilhouetteIntegration {
  private http: AxiosInstance;
  private isConnected: boolean = false;
  private teamsCache: Map<string, any> = new Map();
  private lastSyncTime: number = 0;
  private syncInterval: number = 60000; // 1 minute

  constructor() {
    this.http = axios.create({
      baseURL: silhouetteConfig.frameworkApiUrl,
      timeout: silhouetteConfig.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Silhouette-Workflow-Creation/1.0.0',
      },
    });

    // Request interceptor for logging and error handling
    this.http.interceptors.request.use(
      (config) => {
        console.log(`🔗 Silhouette API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('❌ Silhouette API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.http.interceptors.response.use(
      (response) => {
        console.log(`✅ Silhouette API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error('❌ Silhouette API Response Error:', {
          status: error.response?.status,
          message: error.response?.data?.message || error.message,
          url: error.config?.url,
        });
        return Promise.reject(error);
      }
    );
  }

  public async initialize(): Promise<void> {
    try {
      console.log('🔧 Initializing Silhouette Framework Integration...');
      
      // Test connection to framework
      await this.testConnection();
      
      // Sync teams from framework
      await this.syncTeams();
      
      // Start periodic team synchronization
      this.startPeriodicSync();
      
      this.isConnected = true;
      console.log('✅ Silhouette Framework Integration initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Silhouette Framework Integration:', error);
      this.isConnected = false;
      throw error;
    }
  }

  private async testConnection(): Promise<void> {
    try {
      const response = await this.http.get('/health');
      if (response.status !== 200) {
        throw new Error(`Framework health check failed: ${response.status}`);
      }
      console.log('📡 Silhouette Framework connection established');
    } catch (error) {
      console.error('❌ Silhouette Framework connection failed:', error);
      throw new Error('Failed to connect to Silhouette Framework');
    }
  }

  private async syncTeams(): Promise<void> {
    try {
      console.log('🔄 Syncing teams from Silhouette Framework...');
      
      const response = await this.http.get('/teams');
      const teams = response.data.teams || response.data;
      
      // Cache teams locally
      for (const team of teams) {
        this.teamsCache.set(team.id, team);
        // Also cache in Redis for persistence
        await cache.set(`silhouette:team:${team.id}`, team, 3600); // 1 hour TTL
      }
      
      this.lastSyncTime = Date.now();
      console.log(`📊 Synced ${teams.length} teams from framework`);
      
    } catch (error) {
      console.error('❌ Failed to sync teams from framework:', error);
      // Load teams from cache if sync fails
      await this.loadTeamsFromCache();
    }
  }

  private async loadTeamsFromCache(): Promise<void> {
    try {
      // This would load all cached teams from Redis
      // Implementation depends on your caching strategy
      console.log('📋 Loading teams from local cache...');
    } catch (error) {
      console.error('❌ Failed to load teams from cache:', error);
    }
  }

  private startPeriodicSync(): void {
    if (silhouetteConfig.autoScaling) {
      setInterval(async () => {
        try {
          await this.syncTeams();
        } catch (error) {
          console.error('❌ Periodic team sync failed:', error);
        }
      }, this.syncInterval);
    }
  }

  // ===========================================
  // TEAM MANAGEMENT
  // ===========================================

  public async getAllTeams(): Promise<any[]> {
    try {
      // Check if we need to refresh the cache
      if (Date.now() - this.lastSyncTime > this.syncInterval) {
        await this.syncTeams();
      }
      
      return Array.from(this.teamsCache.values());
    } catch (error) {
      console.error('❌ Failed to get teams:', error);
      return [];
    }
  }

  public async getTeamById(teamId: string): Promise<any | null> {
    try {
      // Check local cache first
      if (this.teamsCache.has(teamId)) {
        return this.teamsCache.get(teamId);
      }
      
      // Check Redis cache
      const cached = await cache.get(`silhouette:team:${teamId}`);
      if (cached) {
        this.teamsCache.set(teamId, cached);
        return cached;
      }
      
      // Fetch from framework
      const response = await this.http.get(`/teams/${teamId}`);
      const team = response.data;
      
      this.teamsCache.set(teamId, team);
      await cache.set(`silhouette:team:${teamId}`, team, 3600);
      
      return team;
    } catch (error) {
      console.error(`❌ Failed to get team ${teamId}:`, error);
      return null;
    }
  }

  public async getTeamsByCategory(category: string): Promise<any[]> {
    try {
      const allTeams = await this.getAllTeams();
      return allTeams.filter(team => 
        team.category?.toLowerCase() === category.toLowerCase() ||
        team.category?.includes(category)
      );
    } catch (error) {
      console.error(`❌ Failed to get teams by category ${category}:`, error);
      return [];
    }
  }

  public async searchTeams(query: string): Promise<any[]> {
    try {
      const allTeams = await this.getAllTeams();
      const searchTerm = query.toLowerCase();
      
      return allTeams.filter(team => 
        team.name.toLowerCase().includes(searchTerm) ||
        team.description?.toLowerCase().includes(searchTerm) ||
        team.capabilities?.some((cap: string) => cap.toLowerCase().includes(searchTerm)) ||
        team.skills?.some((skill: any) => skill.name.toLowerCase().includes(searchTerm))
      );
    } catch (error) {
      console.error(`❌ Failed to search teams with query "${query}":`, error);
      return [];
    }
  }

  // ===========================================
  // TASK MANAGEMENT
  // ===========================================

  public async createTask(taskData: {
    name: string;
    description: string;
    team_id: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    input_data: any;
    workflow_id: string;
    org_id: string;
    created_by: string;
  }): Promise<any | null> {
    try {
      const response = await this.http.post('/tasks', {
        ...taskData,
        created_at: new Date().toISOString(),
      });
      
      console.log(`✅ Task created: ${response.data.id} for team ${taskData.team_id}`);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to create task:', error);
      return null;
    }
  }

  public async getTaskStatus(taskId: string): Promise<any | null> {
    try {
      const response = await this.http.get(`/tasks/${taskId}`);
      return response.data;
    } catch (error) {
      console.error(`❌ Failed to get task status for ${taskId}:`, error);
      return null;
    }
  }

  public async cancelTask(taskId: string): Promise<boolean> {
    try {
      await this.http.delete(`/tasks/${taskId}`);
      console.log(`❌ Task cancelled: ${taskId}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to cancel task ${taskId}:`, error);
      return false;
    }
  }

  // ===========================================
  // FRAMEWORK METRICS
  // ===========================================

  public async getFrameworkMetrics(): Promise<any | null> {
    try {
      const response = await this.http.get('/metrics');
      return response.data;
    } catch (error) {
      console.error('❌ Failed to get framework metrics:', error);
      return null;
    }
  }

  public async getTeamMetrics(teamId: string): Promise<any | null> {
    try {
      const response = await this.http.get(`/teams/${teamId}/metrics`);
      return response.data;
    } catch (error) {
      console.error(`❌ Failed to get metrics for team ${teamId}:`, error);
      return null;
    }
  }

  // ===========================================
  // WORKFLOW INTEGRATION
  // ===========================================

  public async generateWorkflowFromPrompt(prompt: string, context: any): Promise<any | null> {
    try {
      const response = await this.http.post('/workflows/generate', {
        prompt,
        context,
        timestamp: new Date().toISOString(),
      });
      
      console.log('🤖 AI workflow generated successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Failed to generate workflow from prompt:', error);
      return null;
    }
  }

  public async optimizeWorkflow(workflowId: string, workflowData: any): Promise<any | null> {
    try {
      const response = await this.http.post(`/workflows/${workflowId}/optimize`, {
        workflow_data: workflowData,
      });
      
      console.log('🚀 Workflow optimization completed');
      return response.data;
    } catch (error) {
      console.error('❌ Failed to optimize workflow:', error);
      return null;
    }
  }

  public async validateWorkflow(workflowData: any): Promise<{
    valid: boolean;
    errors: string[];
    suggestions: string[];
  }> {
    try {
      const response = await this.http.post('/workflows/validate', {
        workflow_data: workflowData,
      });
      
      return {
        valid: response.data.valid,
        errors: response.data.errors || [],
        suggestions: response.data.suggestions || [],
      };
    } catch (error) {
      console.error('❌ Failed to validate workflow:', error);
      return {
        valid: false,
        errors: ['Validation service unavailable'],
        suggestions: [],
      };
    }
  }

  // ===========================================
  // AUTO-SCALING
  // ===========================================

  public async requestTeamScaling(teamId: string, additionalCapacity: number): Promise<boolean> {
    try {
      if (!silhouetteConfig.autoScaling) {
        console.log('⚠️ Auto-scaling is disabled');
        return false;
      }
      
      const response = await this.http.post('/scaling/request', {
        team_id: teamId,
        additional_capacity: additionalCapacity,
        reason: 'High workflow demand',
      });
      
      console.log(`📈 Scaling requested for team ${teamId}: +${additionalCapacity} capacity`);
      return response.status === 200;
    } catch (error) {
      console.error(`❌ Failed to request scaling for team ${teamId}:`, error);
      return false;
    }
  }

  // ===========================================
  // HEALTH CHECK
  // ===========================================

  public async checkHealth(): Promise<{
    healthy: boolean;
    responseTime: number;
    details: any;
  }> {
    const start = Date.now();
    
    try {
      const response = await this.http.get('/health');
      const responseTime = Date.now() - start;
      
      return {
        healthy: true,
        responseTime,
        details: {
          status: response.data.status,
          framework_version: response.data.version,
          teams_count: this.teamsCache.size,
          last_sync: new Date(this.lastSyncTime).toISOString(),
        },
      };
    } catch (error) {
      return {
        healthy: false,
        responseTime: Date.now() - start,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          teams_cached: this.teamsCache.size,
        },
      };
    }
  }

  // ===========================================
  // CLEANUP
  // ===========================================

  public async cleanup(): Promise<void> {
    this.teamsCache.clear();
    this.isConnected = false;
    console.log('🧹 Silhouette Framework integration cleaned up');
  }
}

// Export singleton instance
export const silhouetteIntegration = new SilhouetteIntegration();

// Setup function to be called from server
export const setupSilhouetteIntegration = async (): Promise<void> => {
  try {
    await silhouetteIntegration.initialize();
  } catch (error) {
    console.error('❌ Silhouette Framework setup failed:', error);
    // Don't throw - we can operate without the framework
    // throw error;
  }
};