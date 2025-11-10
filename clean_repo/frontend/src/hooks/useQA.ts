import { useState, useEffect, useCallback } from 'react';
import { useQAStore } from '@/stores/qaStore';
import { useWebSocket } from './useWebSocket';
import { 
  QAVerificationRequest, 
  QAVerificationResult, 
  HallucinationDetectionRequest, 
  HallucinationResult,
  SourceVerificationRequest,
  SourceVerificationResult,
  BatchVerificationRequest,
  BatchVerificationResult,
  QAAPIResponse
} from '@/types';

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

/**
 * Hook principal para interactuar con el sistema QA
 */
export const useQA = () => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  
  const {
    preferences,
    addVerification,
    updateVerification,
    addRecentResult,
    addNotification,
    setLoading,
    setError
  } = useQAStore();

  /**
   * Realiza una verificación de información
   */
  const verifyInformation = useCallback(async (request: QAVerificationRequest): Promise<QAVerificationResult | null> => {
    setIsVerifying(true);
    setVerificationError(null);
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/qa/verify-information`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(request)
      });

      const result: QAAPIResponse<QAVerificationResult> = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Verification failed');
      }

      const verificationResult = result.data!;
      
      // Store the result
      addVerification(verificationResult.id, verificationResult);
      addRecentResult(verificationResult);

      // Add notification
      addNotification({
        type: verificationResult.verification.isVerified ? 'success' : 'warning',
        title: 'Information Verification Complete',
        message: `Verification completed with ${(verificationResult.confidence * 100).toFixed(1)}% confidence`,
        verificationId: verificationResult.id,
        riskLevel: verificationResult.verification.isVerified ? 'low' : 'medium'
      });

      return verificationResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setVerificationError(errorMessage);
      
      addNotification({
        type: 'error',
        title: 'Verification Failed',
        message: errorMessage
      });

      return null;
    } finally {
      setIsVerifying(false);
      setLoading(false);
    }
  }, [addVerification, addRecentResult, addNotification, setLoading]);

  /**
   * Detecta alucinaciones en contenido
   */
  const detectHallucination = useCallback(async (request: HallucinationDetectionRequest): Promise<HallucinationResult | null> => {
    setIsVerifying(true);
    setVerificationError(null);
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/qa/detect-hallucination`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(request)
      });

      const result: QAAPIResponse<HallucinationResult> = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Hallucination detection failed');
      }

      const hallucinationResult = result.data!;
      addRecentResult(hallucinationResult);

      // Add notification if hallucination detected
      if (hallucinationResult.detection.isHallucination) {
        addNotification({
          type: 'warning',
          title: 'Hallucination Detected',
          message: `Potential hallucination detected with ${hallucinationResult.detection.riskLevel} risk level`,
          riskLevel: hallucinationResult.detection.riskLevel
        });
      } else {
        addNotification({
          type: 'success',
          title: 'No Hallucinations Detected',
          message: 'Content appears to be reliable and accurate'
        });
      }

      return hallucinationResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setVerificationError(errorMessage);
      
      addNotification({
        type: 'error',
        title: 'Hallucination Detection Failed',
        message: errorMessage
      });

      return null;
    } finally {
      setIsVerifying(false);
      setLoading(false);
    }
  }, [addRecentResult, addNotification, setLoading]);

  /**
   * Verifica fuentes de información
   */
  const verifySources = useCallback(async (request: SourceVerificationRequest): Promise<SourceVerificationResult | null> => {
    setIsVerifying(true);
    setVerificationError(null);
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/qa/verify-sources`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(request)
      });

      const result: QAAPIResponse<SourceVerificationResult> = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Source verification failed');
      }

      const sourceResult = result.data!;
      addRecentResult(sourceResult);

      // Add notification based on recommendation
      const { recommendation } = sourceResult.overallAssessment;
      const notificationType = recommendation === 'trust' ? 'success' : 
                              recommendation === 'caution' ? 'warning' : 'error';

      addNotification({
        type: notificationType as any,
        title: 'Source Verification Complete',
        message: `Sources assessed with ${recommendation} recommendation`,
        verificationId: sourceResult.id
      });

      return sourceResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setVerificationError(errorMessage);
      
      addNotification({
        type: 'error',
        title: 'Source Verification Failed',
        message: errorMessage
      });

      return null;
    } finally {
      setIsVerifying(false);
      setLoading(false);
    }
  }, [addRecentResult, addNotification, setLoading]);

  /**
   * Verificación por lotes
   */
  const batchVerify = useCallback(async (request: BatchVerificationRequest): Promise<BatchVerificationResult | null> => {
    setIsVerifying(true);
    setVerificationError(null);
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/qa/batch-verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(request)
      });

      const result: QAAPIResponse<BatchVerificationResult> = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Batch verification failed');
      }

      const batchResult = result.data!;
      
      // Store individual results
      batchResult.results.forEach(itemResult => {
        if (itemResult.status === 'success' && itemResult.result) {
          addRecentResult(itemResult.result);
        }
      });

      // Add notification
      const { successful, failed, total } = batchResult.summary;
      addNotification({
        type: failed === 0 ? 'success' : 'warning',
        title: 'Batch Verification Complete',
        message: `Processed ${total} items: ${successful} successful, ${failed} failed`
      });

      return batchResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setVerificationError(errorMessage);
      
      addNotification({
        type: 'error',
        title: 'Batch Verification Failed',
        message: errorMessage
      });

      return null;
    } finally {
      setIsVerifying(false);
      setLoading(false);
    }
  }, [addRecentResult, addNotification, setLoading]);

  /**
   * Obtiene el estado de una verificación específica
   */
  const getVerificationStatus = useCallback(async (verificationId: string): Promise<any> => {
    try {
      const response = await fetch(`${API_BASE_URL}/qa/verification/${verificationId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const result: QAAPIResponse<any> = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to get verification status');
      }

      return result.data;
    } catch (error) {
      console.error('Failed to get verification status:', error);
      return null;
    }
  }, []);

  /**
   * Obtiene métricas del sistema QA
   */
  const getSystemMetrics = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/qa/metrics`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const result: QAAPIResponse<any> = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to get system metrics');
      }

      return result.data;
    } catch (error) {
      console.error('Failed to get system metrics:', error);
      return null;
    }
  }, []);

  /**
   * Obtiene el estado de salud del sistema QA
   */
  const getSystemHealth = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/qa/health`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const result: QAAPIResponse<any> = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to get system health');
      }

      return result.data;
    } catch (error) {
      console.error('Failed to get system health:', error);
      return null;
    }
  }, []);

  return {
    // State
    isVerifying,
    verificationError,
    
    // Actions
    verifyInformation,
    detectHallucination,
    verifySources,
    batchVerify,
    getVerificationStatus,
    getSystemMetrics,
    getSystemHealth
  };
};

/**
 * Hook para verificaciones automáticas en tiempo real
 */
export const useQARealTime = (workflowId?: string) => {
  const { socket, isConnected } = useWebSocket(workflowId);
  const {
    addVerification,
    updateVerification,
    addNotification,
    setError
  } = useQAStore();

  useEffect(() => {
    if (!socket || !isConnected) return;

    // Listen for QA events
    socket.on('qa-verification-status', (data) => {
      updateVerification(data.requestId, { status: data.status as any });
    });

    socket.on('qa-verification-complete', (data) => {
      addVerification(data.requestId, data.result);
    });

    socket.on('qa-hallucination-detected', (data) => {
      addNotification({
        type: 'warning',
        title: 'Hallucination Detected',
        message: data.content,
        riskLevel: data.riskLevel as any
      });
    });

    socket.on('qa-source-warning', (data) => {
      addNotification({
        type: 'warning',
        title: 'Source Warning',
        message: `${data.source}: ${data.reason}`,
        riskLevel: 'medium'
      });
    });

    socket.on('qa-system-alert', (data) => {
      const notificationType = data.level === 'error' ? 'error' : 
                              data.level === 'warning' ? 'warning' : 'info';
      
      addNotification({
        type: notificationType as any,
        title: 'QA System Alert',
        message: data.message
      });
    });

    return () => {
      socket.off('qa-verification-status');
      socket.off('qa-verification-complete');
      socket.off('qa-hallucination-detected');
      socket.off('qa-source-warning');
      socket.off('qa-system-alert');
    };
  }, [socket, isConnected, addVerification, updateVerification, addNotification, setError]);

  /**
   * Envía una solicitud de verificación en tiempo real
   */
  const sendVerificationRequest = useCallback((type: 'verify-information' | 'detect-hallucination' | 'verify-sources', data: any) => {
    if (!socket || !isConnected) {
      setError('WebSocket not connected');
      return false;
    }

    const requestId = `qa-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    socket.emit(type, { ...data, requestId });
    return requestId;
  }, [socket, isConnected, setError]);

  return {
    isConnected,
    sendVerificationRequest
  };
};

/**
 * Hook para auto-verificación de contenido
 */
export const useAutoQA = (content: string, context?: any) => {
  const { verifyInformation, detectHallucination, preferences } = useQA();
  const [isAutoVerifying, setIsAutoVerifying] = useState(false);

  useEffect(() => {
    if (!preferences.autoVerify || !content || content.trim().length < 10) {
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsAutoVerifying(true);
      
      try {
        // Run both verification and hallucination detection
        await Promise.allSettled([
          verifyInformation({
            content,
            context,
            userId: 'auto-verify',
            options: {
              cacheResults: true,
              strictMode: preferences.strictMode
            }
          }),
          detectHallucination({
            content,
            context,
            userId: 'auto-verify',
            options: {
              sensitivity: preferences.sensitivity,
              enableModels: ['nlpSemantic', 'patternMatching', 'contradictionAnalysis']
            }
          })
        ]);
      } catch (error) {
        console.error('Auto-verification failed:', error);
      } finally {
        setIsAutoVerifying(false);
      }
    }, 2000); // Wait 2 seconds after last content change

    return () => clearTimeout(timeoutId);
  }, [content, context, preferences.autoVerify, preferences.strictMode, preferences.sensitivity, verifyInformation, detectHallucination]);

  return { isAutoVerifying };
};