// React Flow canvas (§7.1). The store is the single source of truth; nodes are
// fully controlled. Edges are allowed but decorative — they carry no math.
import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useEdgesState,
  type Node,
  type Connection,
  type NodeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useStore } from '../state/store';
import { nodeTypes } from './nodeTypes';
import { EmptyState } from '../components/EmptyState';

export function Canvas() {
  const projectNodes = useStore((s) => s.project.nodes);
  const selectedNodeId = useStore((s) => s.selectedNodeId);
  const updateNodePosition = useStore((s) => s.updateNodePosition);
  const removeNode = useStore((s) => s.removeNode);
  const selectNode = useStore((s) => s.selectNode);

  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const rfNodes: Node[] = useMemo(
    () =>
      projectNodes.map((n) => ({
        id: n.id,
        type: 'channel',
        position: n.position,
        data: {},
        selected: n.id === selectedNodeId,
      })),
    [projectNodes, selectedNodeId],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      for (const c of changes) {
        if (c.type === 'position' && c.position) updateNodePosition(c.id, c.position);
        else if (c.type === 'remove') removeNode(c.id);
      }
    },
    [updateNodePosition, removeNode],
  );

  const onConnect = useCallback(
    (conn: Connection) => setEdges((eds) => addEdge({ ...conn }, eds)),
    [setEdges],
  );

  return (
    <div className="relative h-full w-full">
      <ReactFlow
        nodes={rfNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, n) => selectNode(n.id)}
        onPaneClick={() => selectNode(null)}
        deleteKeyCode={['Backspace', 'Delete']}
        fitView
        fitViewOptions={{ padding: 0.3, maxZoom: 1 }}
        minZoom={0.3}
        maxZoom={1.5}
        nodesDraggable
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#cbd5e1" gap={22} size={1} />
        <Controls showInteractive={false} />
        <MiniMap
          pannable
          zoomable
          nodeColor="#cbd5e1"
          maskColor="rgba(248,250,252,0.7)"
          className="!bottom-4 !right-4"
        />
      </ReactFlow>
      {projectNodes.length === 0 && <EmptyState />}
    </div>
  );
}
