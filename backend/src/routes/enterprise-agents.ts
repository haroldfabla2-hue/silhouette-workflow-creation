import { Router, Request, Response } from 'express';
import EnterpriseOrchestrator from '../enterprise-agents/EnterpriseOrchestrator';

const router = Router();

// Initialize orchestrator (single instance)
let orchestrator: EnterpriseOrchestrator | null = null;

const getOrchestrator = () => {
    if (!orchestrator) {
        orchestrator = new EnterpriseOrchestrator(8030);
    }
    return orchestrator;
};

// =====================================================
// ENTERPRISE TEAMS MANAGEMENT
// =====================================================

// Get all enterprise teams
router.get('/teams', async (req: Request, res: Response) => {
    try {
        const orchestrator = getOrchestrator();
        const teams = await orchestrator.getTeams();
        res.json({
            success: true,
            teams,
            total: teams.length
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get specific team details
router.get('/team/:teamName', async (req: Request, res: Response) => {
    try {
        const { teamName } = req.params;
        const orchestrator = getOrchestrator();
        const team = await orchestrator.getTeam(teamName);
        
        res.json({
            success: true,
            team
        });
    } catch (error: any) {
        res.status(404).json({
            success: false,
            error: error.message
        });
    }
});

// Start enterprise team
router.post('/team/:teamName/start', async (req: Request, res: Response) => {
    try {
        const { teamName } = req.params;
        const orchestrator = getOrchestrator();
        const result = await orchestrator.startTeam(teamName);
        
        res.json({
            success: true,
            message: `Team ${teamName} started successfully`,
            result
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Stop enterprise team
router.post('/team/:teamName/stop', async (req: Request, res: Response) => {
    try {
        const { teamName } = req.params;
        const orchestrator = getOrchestrator();
        const result = await orchestrator.stopTeam(teamName);
        
        res.json({
            success: true,
            message: `Team ${teamName} stopped successfully`,
            result
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =====================================================
// TASK EXECUTION
// =====================================================

// Execute task on enterprise team
router.post('/execute', async (req: Request, res: Response) => {
    try {
        const { teamType, taskType, parameters, priority = 'P2' } = req.body;
        const orchestrator = getOrchestrator();
        
        const task = {
            id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: taskType,
            teamType,
            parameters,
            priority,
            timeout: 300000 // 5 minutes
        };
        
        const result = await orchestrator.executeTask(task);
        
        res.json({
            success: true,
            taskId: result.taskId,
            result: result.result,
            executionTime: result.executionTime,
            team: result.team
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get task status
router.get('/task/:taskId', async (req: Request, res: Response) => {
    try {
        const { taskId } = req.params;
        const orchestrator = getOrchestrator();
        const task = await orchestrator.getTaskStatus(taskId);
        
        res.json({
            success: true,
            task
        });
    } catch (error: any) {
        res.status(404).json({
            success: false,
            error: error.message
        });
    }
});

// =====================================================
// AUDIOVISUAL PRODUCTION
// =====================================================

// Start audiovisual production
router.post('/audiovisual/produce', async (req: Request, res: Response) => {
    try {
        const { type, parameters } = req.body;
        const orchestrator = getOrchestrator();
        
        const task = {
            id: `av_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'audiovisual_production',
            teamType: 'audiovisual',
            parameters: { productionType: type, ...parameters },
            priority: 'P1',
            timeout: 300000 // 5 minutes
        };
        
        const result = await orchestrator.executeTask(task);
        
        res.json({
            success: true,
            production: {
                video_url: result.result?.video_url,
                quality_score: result.result?.quality_score,
                platforms: result.result?.platform_optimized,
                engagement_prediction: result.result?.engagement_prediction
            },
            taskId: result.taskId,
            executionTime: result.executionTime
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Search and download images
router.post('/audiovisual/images/search', async (req: Request, res: Response) => {
    try {
        const { query, count = 10, quality = 'high' } = req.body;
        const orchestrator = getOrchestrator();
        
        const task = {
            id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'image_search',
            teamType: 'audiovisual',
            parameters: { query, count, quality },
            priority: 'P2',
            timeout: 60000 // 1 minute
        };
        
        const result = await orchestrator.executeTask(task);
        
        res.json({
            success: true,
            images: result.result?.images || [],
            taskId: result.taskId
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Generate professional script
router.post('/audiovisual/script/generate', async (req: Request, res: Response) => {
    try {
        const { topic, platform, duration, audience, tone = 'professional' } = req.body;
        const orchestrator = getOrchestrator();
        
        const task = {
            id: `script_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'script_generation',
            teamType: 'audiovisual',
            parameters: { topic, platform, duration, audience, tone },
            priority: 'P1',
            timeout: 120000 // 2 minutes
        };
        
        const result = await orchestrator.executeTask(task);
        
        res.json({
            success: true,
            script: result.result?.script,
            duration: result.result?.duration,
            platforms: result.result?.optimized_for,
            taskId: result.taskId
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =====================================================
// MARKETING AUTOMATION
// =====================================================

// Create marketing campaign
router.post('/marketing/campaign', async (req: Request, res: Response) => {
    try {
        const { campaignType, target, budget, duration, platforms } = req.body;
        const orchestrator = getOrchestrator();
        
        const task = {
            id: `camp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'marketing_campaign',
            teamType: 'main',
            parameters: { campaignType, target, budget, duration, platforms },
            priority: 'P0',
            timeout: 180000 // 3 minutes
        };
        
        const result = await orchestrator.executeTask(task);
        
        res.json({
            success: true,
            campaign: {
                id: result.result?.campaign_id,
                strategy: result.result?.strategy,
                content: result.result?.content,
                timeline: result.result?.timeline,
                budget_allocation: result.result?.budget_allocation
            },
            taskId: result.taskId
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Social media automation
router.post('/marketing/social', async (req: Request, res: Response) => {
    try {
        const { platform, content, schedule, engagement } = req.body;
        const orchestrator = getOrchestrator();
        
        const task = {
            id: `social_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'social_media_automation',
            teamType: 'main',
            parameters: { platform, content, schedule, engagement },
            priority: 'P1',
            timeout: 120000 // 2 minutes
        };
        
        const result = await orchestrator.executeTask(task);
        
        res.json({
            success: true,
            automation: {
                scheduled_posts: result.result?.scheduled_posts,
                engagement_strategy: result.result?.engagement_strategy,
                performance_prediction: result.result?.performance_prediction
            },
            taskId: result.taskId
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =====================================================
// BUSINESS INTELLIGENCE
// =====================================================

// Financial analysis
router.post('/business/finance/analyze', async (req: Request, res: Response) => {
    try {
        const { type, data, period } = req.body;
        const orchestrator = getOrchestrator();
        
        const task = {
            id: `fin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'financial_analysis',
            teamType: 'main',
            parameters: { analysisType: type, data, period },
            priority: 'P0',
            timeout: 180000 // 3 minutes
        };
        
        const result = await orchestrator.executeTask(task);
        
        res.json({
            success: true,
            analysis: {
                metrics: result.result?.metrics,
                insights: result.result?.insights,
                recommendations: result.result?.recommendations,
                risk_assessment: result.result?.risk_assessment
            },
            taskId: result.taskId
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Market research
router.post('/business/research/market', async (req: Request, res: Response) => {
    try {
        const { industry, region, competitors, metrics } = req.body;
        const orchestrator = getOrchestrator();
        
        const task = {
            id: `research_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'market_research',
            teamType: 'main',
            parameters: { industry, region, competitors, metrics },
            priority: 'P1',
            timeout: 240000 // 4 minutes
        };
        
        const result = await orchestrator.executeTask(task);
        
        res.json({
            success: true,
            research: {
                market_size: result.result?.market_size,
                trends: result.result?.trends,
                opportunities: result.result?.opportunities,
                competitive_analysis: result.result?.competitive_analysis
            },
            taskId: result.taskId
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =====================================================
// COMPLIANCE & SECURITY
// =====================================================

// Compliance audit
router.post('/compliance/audit', async (req: Request, res: Response) => {
    try {
        const { standard, scope, frequency } = req.body;
        const orchestrator = getOrchestrator();
        
        const task = {
            id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'compliance_audit',
            teamType: 'dynamic',
            parameters: { standard, scope, frequency },
            priority: 'P0',
            timeout: 300000 // 5 minutes
        };
        
        const result = await orchestrator.executeTask(task);
        
        res.json({
            success: true,
            audit: {
                compliance_score: result.result?.compliance_score,
                findings: result.result?.findings,
                recommendations: result.result?.recommendations,
                next_review: result.result?.next_review
            },
            taskId: result.taskId
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Cybersecurity assessment
router.post('/security/assess', async (req: Request, res: Response) => {
    try {
        const { scope, threats, infrastructure } = req.body;
        const orchestrator = getOrchestrator();
        
        const task = {
            id: `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'security_assessment',
            teamType: 'dynamic',
            parameters: { scope, threats, infrastructure },
            priority: 'P0',
            timeout: 240000 // 4 minutes
        };
        
        const result = await orchestrator.executeTask(task);
        
        res.json({
            success: true,
            assessment: {
                security_score: result.result?.security_score,
                vulnerabilities: result.result?.vulnerabilities,
                recommendations: result.result?.recommendations,
                action_plan: result.result?.action_plan
            },
            taskId: result.taskId
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =====================================================
// ENTERPRISE WORKFLOWS
// =====================================================

// Execute multi-team workflow
router.post('/workflow/execute', async (req: Request, res: Response) => {
    try {
        const { workflowType, teams, parameters, priority = 'P1' } = req.body;
        const orchestrator = getOrchestrator();
        
        const task = {
            id: `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'enterprise_workflow',
            teamType: 'multi_team',
            parameters: { workflowType, teams, parameters },
            priority,
            timeout: 600000 // 10 minutes
        };
        
        const result = await orchestrator.executeTask(task);
        
        res.json({
            success: true,
            workflow: {
                workflow_id: result.result?.workflow_id,
                teams_involved: result.result?.teams_involved,
                status: result.result?.status,
                metrics: result.result?.metrics,
                outputs: result.result?.outputs
            },
            taskId: result.taskId,
            executionTime: result.executionTime
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =====================================================
// SYSTEM STATUS
// =====================================================

// Get orchestrator status
router.get('/status', async (req: Request, res: Response) => {
    try {
        const orchestrator = getOrchestrator();
        const status = await orchestrator.getStatus();
        
        res.json({
            success: true,
            status: {
                orchestrator: 'Enterprise Silhouette V4.0',
                teams: status.teams,
                activeTasks: status.activeTasks,
                uptime: status.uptime,
                performance: status.performance
            }
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

export default router;