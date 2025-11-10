'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { 
  ReactFlow, 
  MiniMap, 
  Controls, 
  Background, 
  useNodesState, 
  useEdgesState, 
  addEdge, 
  Connection,
  Edge,
  Node,
  ReactFlowProvider,
  ReactFlowInstance,
  NodeOrigin,
  NodeMouseHandler,
  NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Save, Settings, Users, GitBranch } from 'lucide-react';

import { WorkflowNode } from './WorkflowNode';
import { NodePanel } from './NodePanel';
import { CollaboratorPresence } from './CollaboratorPresence';
import { WorkflowExecutionPanel } from './WorkflowExecutionPanel';

import { useWorkflowStore } from '@/stores/workflowStore';
import { useCollaborationStore } from '@/stores/collaborationStore';
import { useUIStore } from '@/stores/uiStore';
import { useWebSocket } from '@/hooks/useWebSocket';

// Node types for React Flow
const nodeTypes = {
  workflowNode: WorkflowNode,
};

interface WorkflowCanvasProps {
  workflowId: string;
  onSave?: (data: any) => void;
  readOnly?: boolean;
}

export const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({
  workflowId,
  onSave,
  readOnly = false,
}) => {
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  
  // Store hooks
  const { 
    nodes, 
    edges, 
    setNodes, 
    setEdges, 
    workflow,
    updateWorkflow,
    saveWorkflow,
  } = useWorkflowStore();
  
  const { 
    collaborators, 
    addCollaborator, 
    removeCollaborator,
    updateCursor,
  } = useCollaborationStore();
  
  const { 
    showMinimap, 
    showControls, 
    snapToGrid,
    gridSize,
  } = useUIStore();
  
  // WebSocket connection
  const { socket, isConnected } = useWebSocket(workflowId);
  
  // Initialize canvas data
  useEffect(() => {
    if (workflow?.canvas_data) {
      setNodes(workflow.canvas_data.nodes || []);
      setEdges(workflow.canvas_data.edges || []);
    }
  }, [workflow?.canvas_data, setNodes, setEdges]);
  
  // WebSocket event handlers
  useEffect(() => {
    if (!socket) return;
    
    const handleUserJoin = (userData: any) => {
      addCollaborator(userData);
    };
    
    const handleUserLeave = (userData: any) => {
      removeCollaborator(userData.userId);
    };
    
    const handleCursorMove = (data: { userId: string; position: any }) => {
      updateCursor(data.userId, data.position);
    };
    
    const handleWorkflowUpdate = (data: { nodes?: Node[]; edges?: Edge[] }) => {
      if (data.nodes) setNodes(data.nodes);
      if (data.edges) setEdges(data.edges);
    };
    
    socket.on('user-joined', handleUserJoin);
    socket.on('user-left', handleUserLeave);
    socket.on('cursor-move', handleCursorMove);
    socket.on('workflow-update', handleWorkflowUpdate);
    
    return () => {
      socket.off('user-joined', handleUserJoin);
      socket.off('user-left', handleUserLeave);
      socket.off('cursor-move', handleCursorMove);
      socket.off('workflow-update', handleWorkflowUpdate);
    };
  }, [socket, addCollaborator, removeCollaborator, updateCursor, setNodes, setEdges]);
  
  // Node connection handler
  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge: Edge = {
        ...params,
        id: `edge-${params.source}-${params.target}-${Date.now()}`,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#0ea5e9', strokeWidth: 2 },
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );
  
  // Node drag handler
  const onNodeDrag = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (!socket || readOnly) return;
      
      socket.emit('cursor-move', {
        workflowId,
        position: node.position,
        nodeId: node.id,
      });
    },
    [socket, workflowId, readOnly]
  );
  
  // Node select handler
  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      setSelectedNode(node);
    },
    []
  );
  
  // Canvas drop handler for adding nodes
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      if (readOnly) return;
      
      event.preventDefault();
      
      const nodeType = event.dataTransfer.getData('application/reactflow');
      if (!nodeType) return;
      
      const reactFlowBounds = event.currentTarget.getBoundingClientRect();
      const position = reactFlowInstance?.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });
      
      if (!position || !reactFlowInstance) return;
      
      const newNode: Node = {
        id: `node-${Date.now()}`,
        type: 'workflowNode',
        position,
        data: {
          label: getDefaultNodeLabel(nodeType),
          type: nodeType,
          config: getDefaultNodeConfig(nodeType),
        },
      };
      
      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes, readOnly]
  );
  
  // Save workflow
  const handleSave = useCallback(async () => {
    if (!reactFlowInstance || !workflow) return;
    
    const flowData = {
      nodes: nodes,
      edges: edges,
      viewport: reactFlowInstance.getViewport(),
    };
    
    const updatedWorkflow = {
      ...workflow,
      canvas_data: flowData,
      updated_at: new Date().toISOString(),
    };
    
    try {
      await saveWorkflow(updatedWorkflow);
      onSave?.(updatedWorkflow);
    } catch (error) {
      console.error('Failed to save workflow:', error);
    }
  }, [reactFlowInstance, workflow, nodes, edges, saveWorkflow, onSave]);
  
  // Execute workflow
  const handleExecute = useCallback(async () => {
    if (!workflow || isExecuting) return;
    
    setIsExecuting(true);
    try {
      // This would trigger the actual workflow execution
      // Implementation depends on your backend API
      console.log('Executing workflow:', workflow.id);
    } catch (error) {
      console.error('Failed to execute workflow:', error);
    } finally {
      setIsExecuting(false);
    }
  }, [workflow, isExecuting]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 's':
            event.preventDefault();
            handleSave();
            break;
          case 'z':
            if (event.shiftKey) {
              // Redo
            } else {
              // Undo
            }
            break;
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);
  
  return (
    <div className="h-full w-full relative bg-background">
      {/* Header Controls */}
      <div className="absolute top-4 left-4 z-50 flex items-center gap-2">
        <Card className="px-3 py-2">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleExecute}
              disabled={isExecuting || readOnly}
              className="gap-2"
            >
              {isExecuting ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {isExecuting ? 'Executing...' : 'Execute'}
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={handleSave}
              disabled={readOnly}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              Save
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Button>
            
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              {isConnected ? 'Connected' : 'Disconnected'}
            </div>
          </div>
        </Card>
        
        {/* Collaborators */}
        {collaborators.length > 0 && (
          <Card className="px-3 py-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div className="flex -space-x-1">
                {collaborators.slice(0, 3).map((collaborator) => (
                  <div
                    key={collaborator.userId}
                    className="h-6 w-6 rounded-full bg-silhouette-500 flex items-center justify-center text-white text-xs font-medium border-2 border-background"
                    title={collaborator.userName}
                  >
                    {collaborator.userName.charAt(0).toUpperCase()}
                  </div>
                ))}
                {collaborators.length > 3 && (
                  <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium border-2 border-background">
                    +{collaborators.length - 3}
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}
      </div>
      
      {/* Execution Panel */}
      <div className="absolute top-4 right-4 z-50">
        <WorkflowExecutionPanel workflowId={workflowId} />
      </div>
      
      {/* Node Panel */}
      {!readOnly && (
        <div className="absolute left-4 top-20 z-40">
          <NodePanel />
        </div>
      )}
      
      {/* React Flow Canvas */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={!readOnly ? setNodes : undefined}
        onEdgesChange={!readOnly ? setEdges : undefined}
        onConnect={!readOnly ? onConnect : undefined}
        onInit={setReactFlowInstance}
        onDrop={onDrop}
        onDragOver={(event) => event.preventDefault()}
        onNodeClick={onNodeClick}
        onNodeDrag={onNodeDrag}
        nodeTypes={nodeTypes}
        nodeOrigin={[0.5, 0]}
        snapToGrid={snapToGrid}
        snapGrid={[gridSize, gridSize]}
        fitView
        attributionPosition="bottom-left"
        className="bg-background"
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        panOnDrag={!readOnly}
        zoomOnScroll={!readOnly}
        zoomOnPinch={!readOnly}
      >
        <Background 
          variant="dots" 
          gap={20} 
          size={1} 
          color="hsl(var(--border))"
        />
        
        {showMinimap && <MiniMap />}
        {showControls && <Controls />}
      </ReactFlow>
      
      {/* Collaborator Presence */}
      <CollaboratorPresence workflowId={workflowId} />
      
      {/* Selected Node Panel */}
      {selectedNode && (
        <div className="absolute bottom-4 right-4 z-50">
          <Card className="w-80">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Node Configuration</h3>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => setSelectedNode(null)}
                >
                  ×
                </Button>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Label</label>
                  <input
                    type="text"
                    value={selectedNode.data.label}
                    onChange={(e) => {
                      // Update node data
                    }}
                    className="w-full mt-1 px-2 py-1 border rounded"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <Badge variant="secondary" className="mt-1">
                    {selectedNode.data.type}
                  </Badge>
                </div>
                
                {/* Add more configuration options as needed */}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

// Helper functions
const getDefaultNodeLabel = (nodeType: string): string => {
  const labels: Record<string, string> = {
    'api-request': 'API Request',
    'data-transform': 'Data Transform',
    'condition': 'Condition',
    'delay': 'Delay',
    'webhook': 'Webhook',
    'email': 'Email',
    'database': 'Database',
    'file': 'File Operations',
  };
  return labels[nodeType] || 'Node';
};

const getDefaultNodeConfig = (nodeType: string): any => {
  const configs: Record<string, any> = {
    'api-request': {
      method: 'GET',
      url: '',
      headers: {},
    },
    'data-transform': {
      transformation: 'json_to_csv',
    },
    'condition': {
      condition: '',
    },
    'delay': {
      duration: 1000,
    },
  };
  return configs[nodeType] || {};
};

// Main component with React Flow Provider
export const WorkflowCanvasWrapper: React.FC<WorkflowCanvasProps> = (props) => {
  return (
    <ReactFlowProvider>
      <WorkflowCanvas {...props} />
    </ReactFlowProvider>
  );
};