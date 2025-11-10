'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Info, 
  Clock, 
  ExternalLink,
  Shield,
  Eye,
  AlertCircle
} from 'lucide-react';
import { QAVerificationResult, HallucinationResult, SourceVerificationResult } from '@/types';

interface QAStatusDisplayProps {
  result: QAVerificationResult | HallucinationResult | SourceVerificationResult;
  showActions?: boolean;
  onDismiss?: () => void;
  onDetails?: () => void;
}

export const QAStatusDisplay: React.FC<QAStatusDisplayProps> = ({
  result,
  showActions = true,
  onDismiss,
  onDetails
}) => {
  const getStatusIcon = () => {
    if ('verification' in result) {
      // Information verification
      return result.verification.isVerified ? (
        <CheckCircle className="h-5 w-5 text-green-500" />
      ) : (
        <XCircle className="h-5 w-5 text-red-500" />
      );
    } else if ('detection' in result) {
      // Hallucination detection
      return result.detection.isHallucination ? (
        <AlertTriangle className="h-5 w-5 text-yellow-500" />
      ) : (
        <CheckCircle className="h-5 w-5 text-green-500" />
      );
    } else {
      // Source verification
      const recommendation = result.overallAssessment.recommendation;
      if (recommendation === 'trust') {
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      } else if (recommendation === 'caution') {
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      } else {
        return <XCircle className="h-5 w-5 text-red-500" />;
      }
    }
  };

  const getStatusColor = () => {
    if ('verification' in result) {
      return result.verification.isVerified ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';
    } else if ('detection' in result) {
      if (result.detection.isHallucination) {
        switch (result.detection.riskLevel) {
          case 'critical': return 'bg-red-50 border-red-200';
          case 'high': return 'bg-orange-50 border-orange-200';
          case 'medium': return 'bg-yellow-50 border-yellow-200';
          default: return 'bg-blue-50 border-blue-200';
        }
      } else {
        return 'bg-green-50 border-green-200';
      }
    } else {
      const recommendation = result.overallAssessment.recommendation;
      if (recommendation === 'trust') {
        return 'bg-green-50 border-green-200';
      } else if (recommendation === 'caution') {
        return 'bg-yellow-50 border-yellow-200';
      } else {
        return 'bg-red-50 border-red-200';
      }
    }
  };

  const getStatusText = () => {
    if ('verification' in result) {
      return result.verification.isVerified ? 'Verified' : 'Unverified';
    } else if ('detection' in result) {
      if (result.detection.isHallucination) {
        return `Hallucination Detected (${result.detection.riskLevel})`;
      } else {
        return 'No Hallucinations';
      }
    } else {
      const recommendation = result.overallAssessment.recommendation;
      return `Sources: ${recommendation.charAt(0).toUpperCase() + recommendation.slice(1)}`;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600';
    if (confidence >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <Card className={`w-full ${getStatusColor()}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <CardTitle className="text-sm font-medium">
              {getStatusText()}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={getConfidenceColor(result.confidence)}>
              {(result.confidence * 100).toFixed(1)}%
            </Badge>
            <Badge variant="secondary" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {formatTime(result.timestamp)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Progress bar for confidence */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Confidence</span>
            <span>{(result.confidence * 100).toFixed(1)}%</span>
          </div>
          <Progress value={result.confidence * 100} className="h-2" />
        </div>

        {/* Verification Details */}
        {'verification' in result && (
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-muted-foreground">Sources:</span>
                <div className="font-medium">
                  {result.verification.sources.length} verified
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Consensus:</span>
                <div className="font-medium">
                  {(result.verification.consensus.agreement * 100).toFixed(0)}%
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Semantic</span>
                <div className="font-medium">
                  {(result.verification.details.semanticSimilarity * 100).toFixed(0)}%
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Factual</span>
                <div className="font-medium">
                  {(result.verification.details.factualAccuracy * 100).toFixed(0)}%
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Reliability</span>
                <div className="font-medium">
                  {(result.verification.details.sourceReliability * 100).toFixed(0)}%
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Hallucination Detection Details */}
        {'detection' in result && (
          <div className="space-y-2 text-sm">
            {result.detection.isHallucination && (
              <div className="flex items-center gap-2 p-2 bg-yellow-100 rounded">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <span className="text-yellow-800">
                  Risk Level: {result.detection.riskLevel.toUpperCase()}
                </span>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground">Factual Accuracy</span>
                <div className="font-medium">
                  {(result.detection.details.factualAccuracy * 100).toFixed(0)}%
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Logical Consistency</span>
                <div className="font-medium">
                  {(result.detection.details.logicalConsistency * 100).toFixed(0)}%
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Source Attribution</span>
                <div className="font-medium">
                  {(result.detection.details.sourceAttribution * 100).toFixed(0)}%
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Temporal Accuracy</span>
                <div className="font-medium">
                  {(result.detection.details.temporalAccuracy * 100).toFixed(0)}%
                </div>
              </div>
            </div>

            {result.detection.suggestions.length > 0 && (
              <div className="mt-2">
                <span className="text-muted-foreground text-xs">Suggestions:</span>
                <ul className="text-xs text-blue-600 mt-1">
                  {result.detection.suggestions.slice(0, 2).map((suggestion, index) => (
                    <li key={index} className="flex items-start gap-1">
                      <span className="text-blue-400">•</span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Source Verification Details */}
        {'overallAssessment' in result && (
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-muted-foreground">Average Credibility:</span>
                <div className="font-medium">
                  {(result.overallAssessment.averageCredibility * 100).toFixed(0)}%
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Consensus Level:</span>
                <div className="font-medium">
                  {(result.overallAssessment.consensusLevel * 100).toFixed(0)}%
                </div>
              </div>
            </div>
            
            <div className="text-xs">
              <span className="text-muted-foreground">Sources Assessed:</span>
              <div className="font-medium">
                {result.sources.length} sources
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex items-center justify-between mt-4 pt-3 border-t">
            <div className="text-xs text-muted-foreground">
              Processing time: {result.processingTime}ms
            </div>
            <div className="flex gap-2">
              {onDetails && (
                <Button variant="ghost" size="sm" onClick={onDetails}>
                  <Eye className="h-3 w-3 mr-1" />
                  Details
                </Button>
              )}
              {onDismiss && (
                <Button variant="ghost" size="sm" onClick={onDismiss}>
                  Dismiss
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};