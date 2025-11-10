'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Brain, 
  Globe, 
  X, 
  CheckCircle, 
  AlertTriangle,
  Zap,
  Clock
} from 'lucide-react';
import { useQA } from '@/hooks/useQA';
import { useQAStore } from '@/stores/qaStore';
import { useAutoQA } from '@/hooks/useQA';

interface QAFloatingButtonProps {
  content?: string;
  context?: any;
  workflowId?: string;
  className?: string;
}

export const QAFloatingButton: React.FC<QAFloatingButtonProps> = ({
  content = '',
  context,
  workflowId,
  className
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  
  const { verifyInformation, detectHallucination, verifySources } = useQA();
  const { 
    getVerificationCount, 
    getSuccessRate, 
    getAverageConfidence,
    addNotification 
  } = useQAStore();
  
  // Auto-verification for real-time feedback
  const { isAutoVerifying } = useAutoQA(content, context);

  const handleQuickAction = async (action: string) => {
    setSelectedAction(action);
    
    try {
      let result = null;
      
      switch (action) {
        case 'verify':
          if (!content.trim()) {
            addNotification({
              type: 'warning',
              title: 'No Content',
              message: 'Please provide content to verify'
            });
            return;
          }
          result = await verifyInformation({
            content,
            context,
            userId: 'quick-action',
            options: { cacheResults: true, strictMode: false }
          });
          break;
          
        case 'detect':
          if (!content.trim()) {
            addNotification({
              type: 'warning',
              title: 'No Content',
              message: 'Please provide content to analyze'
            });
            return;
          }
          result = await detectHallucination({
            content,
            context,
            userId: 'quick-action',
            options: { sensitivity: 0.5, enableModels: ['nlpSemantic', 'patternMatching'] }
          });
          break;
          
        case 'sources':
          result = await verifySources({
            sources: ['https://openai.com', 'https://wikipedia.org'], // Default sources
            content,
            userId: 'quick-action',
            options: { checkDomainReputation: true, requireMultipleSources: false }
          });
          break;
      }
      
      if (result) {
        addNotification({
          type: result.verification?.isVerified || 
                result.detection?.isHallucination === false ||
                result.overallAssessment?.recommendation === 'trust' ? 'success' : 'warning',
          title: 'Quick QA Complete',
          message: `${action.charAt(0).toUpperCase() + action.slice(1)} completed successfully`
        });
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Quick QA Failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setSelectedAction(null);
    }
  };

  const quickActions = [
    {
      id: 'verify',
      label: 'Verify Information',
      icon: Shield,
      color: 'bg-blue-500 hover:bg-blue-600',
      description: 'Check if information is accurate and well-sourced'
    },
    {
      id: 'detect',
      label: 'Detect Hallucinations',
      icon: Brain,
      color: 'bg-purple-500 hover:bg-purple-600',
      description: 'Identify potential AI-generated false information'
    },
    {
      id: 'sources',
      label: 'Verify Sources',
      icon: Globe,
      color: 'bg-green-500 hover:bg-green-600',
      description: 'Assess credibility of information sources'
    }
  ];

  return (
    <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
      {/* Expanded Panel */}
      {isExpanded && (
        <Card className="w-80 mb-4 shadow-lg border-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-4 w-4" />
                Quick QA Actions
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <div className="font-bold text-blue-600">{getVerificationCount()}</div>
                <div className="text-muted-foreground">Active</div>
              </div>
              <div>
                <div className="font-bold text-green-600">{(getSuccessRate() * 100).toFixed(0)}%</div>
                <div className="text-muted-foreground">Success</div>
              </div>
              <div>
                <div className="font-bold text-purple-600">{(getAverageConfidence() * 100).toFixed(0)}%</div>
                <div className="text-muted-foreground">Confidence</div>
              </div>
            </div>

            {/* Auto Verification Status */}
            {isAutoVerifying && (
              <div className="flex items-center gap-2 p-2 bg-blue-50 rounded text-sm">
                <Clock className="h-3 w-3 text-blue-500 animate-spin" />
                <span className="text-blue-700">Auto-verifying content...</span>
              </div>
            )}

            {/* Quick Actions */}
            <div className="space-y-2">
              {quickActions.map((action) => {
                const Icon = action.icon;
                const isLoading = selectedAction === action.id;
                
                return (
                  <Button
                    key={action.id}
                    variant="outline"
                    className="w-full justify-start h-auto p-3"
                    onClick={() => handleQuickAction(action.id)}
                    disabled={isLoading || !content.trim() && action.id !== 'sources'}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className={`p-1.5 rounded ${action.color.split(' ')[0]} text-white`}>
                        {isLoading ? (
                          <Clock className="h-3 w-3 animate-spin" />
                        ) : (
                          <Icon className="h-3 w-3" />
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-medium text-sm">{action.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {action.description}
                        </div>
                      </div>
                    </div>
                  </Button>
                );
              })}
            </div>

            {/* Content Status */}
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Content:</span>
                <Badge variant={content.trim() ? 'default' : 'secondary'}>
                  {content.trim() ? `${content.length} chars` : 'No content'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Floating Button */}
      <div className="relative">
        <Button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`h-14 w-14 rounded-full shadow-lg transition-all duration-200 ${
            getVerificationCount() > 0 
              ? 'bg-blue-500 hover:bg-blue-600' 
              : 'bg-gray-500 hover:bg-gray-600'
          } ${isExpanded ? 'rotate-45' : ''}`}
        >
          {isExpanded ? (
            <X className="h-6 w-6" />
          ) : (
            <Shield className="h-6 w-6" />
          )}
        </Button>
        
        {/* Status Indicator */}
        {getVerificationCount() > 0 && (
          <div className="absolute -top-1 -right-1">
            <div className="h-5 w-5 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">
                {getVerificationCount()}
              </span>
            </div>
          </div>
        )}
        
        {/* Auto Verification Indicator */}
        {isAutoVerifying && (
          <div className="absolute -top-1 -left-1">
            <div className="h-5 w-5 bg-blue-500 rounded-full flex items-center justify-center animate-pulse">
              <Zap className="h-2 w-2 text-white" />
            </div>
          </div>
        )}
      </div>

      {/* Status Messages */}
      {isExpanded && (
        <div className="absolute bottom-16 right-0 w-64">
          {/* Success/Error Messages will be handled by the notification system */}
        </div>
      )}
    </div>
  );
};