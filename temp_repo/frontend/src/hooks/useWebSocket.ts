import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/authStore';

export interface UseWebSocketOptions {
  autoConnect?: boolean;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
  timeout?: number;
}

export interface UseWebSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  error: string | null;
  connect: () => void;
  disconnect: () => void;
  emit: (event: string, data?: any) => void;
  on: (event: string, callback: (...args: any[]) => void) => void;
  off: (event: string, callback?: (...args: any[]) => void) => void;
}

export const useWebSocket = (
  workflowId?: string,
  options: UseWebSocketOptions = {}
): UseWebSocketReturn => {
  const {
    autoConnect = true,
    reconnection = true,
    reconnectionAttempts = 5,
    reconnectionDelay = 1000,
    timeout = 5000,
  } = options;

  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [error, setError] = useState<string | null>(null);
  
  const { user, token } = useAuthStore();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const connectionTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = () => {
    if (!token) {
      setError('No authentication token available');
      return;
    }

    setConnectionStatus('connecting');
    setError(null);

    const serverUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3002';
    
    const newSocket = io(serverUrl, {
      auth: {
        token,
        workflowId,
      },
      reconnection,
      reconnectionAttempts,
      reconnectionDelay,
      timeout,
    });

    // Connection timeout
    connectionTimeoutRef.current = setTimeout(() => {
      if (newSocket.connected === false) {
        newSocket.close();
        setConnectionStatus('error');
        setError('Connection timeout');
      }
    }, timeout);

    newSocket.on('connect', () => {
      console.log('🔌 WebSocket connected:', newSocket.id);
      clearTimeout(connectionTimeoutRef.current);
      setIsConnected(true);
      setConnectionStatus('connected');
      setError(null);
      
      // Join workflow room if workflowId is provided
      if (workflowId) {
        newSocket.emit('join-workflow', workflowId);
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.log('🔌 WebSocket disconnected:', reason);
      setIsConnected(false);
      setConnectionStatus('disconnected');
      
      // Clean up workflow room
      if (workflowId) {
        newSocket.emit('leave-workflow', workflowId);
      }
    });

    newSocket.on('connect_error', (err) => {
      console.error('❌ WebSocket connection error:', err);
      setIsConnected(false);
      setConnectionStatus('error');
      setError(err.message);
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log('🔄 WebSocket reconnected after', attemptNumber, 'attempts');
      setIsConnected(true);
      setConnectionStatus('connected');
      setError(null);
    });

    newSocket.on('reconnect_error', (err) => {
      console.error('❌ WebSocket reconnection error:', err);
      setConnectionStatus('error');
      setError(err.message);
    });

    newSocket.on('reconnect_failed', () => {
      console.error('❌ WebSocket reconnection failed');
      setConnectionStatus('error');
      setError('Reconnection failed');
    });

    // Listen for user presence updates
    newSocket.on('user-presence-update', (data) => {
      console.log('👤 User presence update:', data);
    });

    // Listen for real-time collaboration events
    newSocket.on('collaboration-event', (event) => {
      console.log('🤝 Collaboration event:', event);
    });

    setSocket(newSocket);
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
    }

    if (socket) {
      // Leave workflow room before disconnecting
      if (workflowId) {
        socket.emit('leave-workflow', workflowId);
      }
      
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
      setConnectionStatus('disconnected');
    }
  };

  const emit = (event: string, data?: any) => {
    if (socket && isConnected) {
      socket.emit(event, data);
    } else {
      console.warn('WebSocket not connected, cannot emit:', event);
    }
  };

  const on = (event: string, callback: (...args: any[]) => void) => {
    if (socket) {
      socket.on(event, callback);
    }
  };

  const off = (event: string, callback?: (...args: any[]) => void) => {
    if (socket) {
      if (callback) {
        socket.off(event, callback);
      } else {
        socket.off(event);
      }
    }
  };

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect && token) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, token]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return {
    socket,
    isConnected,
    connectionStatus,
    error,
    connect,
    disconnect,
    emit,
    on,
    off,
  };
};

// Hook for real-time workflow updates
export const useWorkflowCollaboration = (workflowId: string) => {
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [cursors, setCursors] = useState<Record<string, any>>({});
  
  const { socket, isConnected } = useWebSocket(workflowId);

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleUserJoin = (user: any) => {
      setCollaborators(prev => {
        const exists = prev.find(c => c.userId === user.userId);
        if (exists) return prev;
        return [...prev, user];
      });
    };

    const handleUserLeave = (user: any) => {
      setCollaborators(prev => prev.filter(c => c.userId !== user.userId));
      setCursors(prev => {
        const newCursors = { ...prev };
        delete newCursors[user.userId];
        return newCursors;
      });
    };

    const handleCursorMove = (data: { userId: string; position: any }) => {
      setCursors(prev => ({
        ...prev,
        [data.userId]: data.position,
      }));
    };

    const handleNodeSelection = (data: { userId: string; nodeIds: string[] }) => {
      setSelectedNodes(prev => {
        const filtered = prev.filter(id => id !== data.userId);
        return [...filtered, ...data.nodeIds.map(id => `${id}-${data.userId}`)];
      });
    };

    const handleUserPresence = (data: { userId: string; status: string }) => {
      setCollaborators(prev => 
        prev.map(c => 
          c.userId === data.userId 
            ? { ...c, status: data.status, lastActivity: Date.now() }
            : c
        )
      );
    };

    socket.on('user-joined', handleUserJoin);
    socket.on('user-left', handleUserLeave);
    socket.on('cursor-move', handleCursorMove);
    socket.on('node-select', handleNodeSelection);
    socket.on('user-presence', handleUserPresence);

    return () => {
      socket.off('user-joined', handleUserJoin);
      socket.off('user-left', handleUserLeave);
      socket.off('cursor-move', handleCursorMove);
      socket.off('node-select', handleNodeSelection);
      socket.off('user-presence', handleUserPresence);
    };
  }, [socket, isConnected]);

  const broadcastCursorMove = (position: any) => {
    if (isConnected) {
      socket?.emit('cursor-move', { workflowId, position });
    }
  };

  const broadcastNodeSelection = (nodeIds: string[]) => {
    if (isConnected) {
      socket?.emit('node-select', { workflowId, nodeIds });
    }
  };

  const broadcastUserPresence = (status: 'active' | 'away' | 'busy') => {
    if (isConnected) {
      socket?.emit('user-presence', { workflowId, status });
    }
  };

  return {
    collaborators,
    selectedNodes,
    cursors,
    isConnected,
    broadcastCursorMove,
    broadcastNodeSelection,
    broadcastUserPresence,
  };
};

// Hook for workflow execution updates
export const useWorkflowExecution = (workflowId: string) => {
  const [executions, setExecutions] = useState<any[]>([]);
  const [currentExecution, setCurrentExecution] = useState<any | null>(null);
  
  const { socket, isConnected } = useWebSocket(workflowId);

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleExecutionStart = (data: any) => {
      setCurrentExecution(data);
      setExecutions(prev => [data, ...prev]);
    };

    const handleExecutionUpdate = (data: any) => {
      setCurrentExecution(prev => prev ? { ...prev, ...data } : data);
    };

    const handleExecutionComplete = (data: any) => {
      setExecutions(prev => 
        prev.map(exec => 
          exec.id === data.id ? { ...exec, ...data } : exec
        )
      );
      setCurrentExecution(null);
    };

    socket.on('execution-start', handleExecutionStart);
    socket.on('execution-update', handleExecutionUpdate);
    socket.on('execution-complete', handleExecutionComplete);

    return () => {
      socket.off('execution-start', handleExecutionStart);
      socket.off('execution-update', handleExecutionUpdate);
      socket.off('execution-complete', handleExecutionComplete);
    };
  }, [socket, isConnected]);

  return {
    executions,
    currentExecution,
  };
};  return {
    executions,
    currentExecution,
  };
};

// Hook for QA real-time updates
export const useQAWebSocket = (workflowId?: string) => {
  const [qaEvents, setQaEvents] = useState<any[]>([]);
  const [isQaConnected, setIsQaConnected] = useState(false);
  
  const { socket, isConnected } = useWebSocket(workflowId);

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleQaVerificationStatus = (data: any) => {
      setQaEvents(prev => [...prev, { type: 'verification-status', data, timestamp: Date.now() }]);
    };

    const handleQaVerificationComplete = (data: any) => {
      setQaEvents(prev => [...prev, { type: 'verification-complete', data, timestamp: Date.now() }]);
    };

    const handleQaHallucinationDetected = (data: any) => {
      setQaEvents(prev => [...prev, { type: 'hallucination-detected', data, timestamp: Date.now() }]);
    };

    const handleQaSourceWarning = (data: any) => {
      setQaEvents(prev => [...prev, { type: 'source-warning', data, timestamp: Date.now() }]);
    };

    const handleQaSystemAlert = (data: any) => {
      setQaEvents(prev => [...prev, { type: 'system-alert', data, timestamp: Date.now() }]);
    };

    // Register QA event listeners
    socket.on('qa-verification-status', handleQaVerificationStatus);
    socket.on('qa-verification-complete', handleQaVerificationComplete);
    socket.on('qa-hallucination-detected', handleQaHallucinationDetected);
    socket.on('qa-source-warning', handleQaSourceWarning);
    socket.on('qa-system-alert', handleQaSystemAlert);

    setIsQaConnected(true);

    return () => {
      socket.off('qa-verification-status', handleQaVerificationStatus);
      socket.off('qa-verification-complete', handleQaVerificationComplete);
      socket.off('qa-hallucination-detected', handleQaHallucinationDetected);
      socket.off('qa-source-warning', handleQaSourceWarning);
      socket.off('qa-system-alert', handleQaSystemAlert);
      setIsQaConnected(false);
    };
  }, [socket, isConnected]);

  const sendQaRequest = (event: string, data: any) => {
    if (socket && isConnected) {
      socket.emit(event, data);
      return true;
    }
    return false;
  };

  const clearQaEvents = () => {
    setQaEvents([]);
  };

  return {
    qaEvents,
    isQaConnected: isQaConnected && isConnected,
    sendQaRequest,
    clearQaEvents,
  };
};