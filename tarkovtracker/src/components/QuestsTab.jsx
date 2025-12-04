import React, { useEffect, useState, useCallback } from 'react';
import ReactFlow, { 
  useNodesState, 
  useEdgesState, 
  Background, 
  Controls,
  Handle, 
  Position 
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';

const TRADERS = ["Prapor", "Therapist", "Skier", "Peacekeeper", "Mechanic", "Ragman", "Jaeger", "Fence"];

// --- CUSTOM NODE COMPONENT ---
const QuestNode = ({ data }) => {
  const isExternal = data.isExternal;
  
  // Handle Right Click -> Open Wiki
  const onRightClick = (e) => {
      e.preventDefault();
      if (data.wikiLink) {
          window.open(data.wikiLink, '_blank');
      }
  };

  return (
    <div 
        className={`quest-node ${data.isCompleted ? 'completed' : ''} ${isExternal ? 'external' : ''}`}
        onContextMenu={onRightClick} // Right click handler
        title="Right-click for Wiki"
    >
      <Handle type="target" position={Position.Top} style={{ background: '#555', visibility: 'hidden' }} />
      
      {/* KAPPA BADGE */}
      {data.kappaRequired && (
          <div style={{
              position: 'absolute',
              top: '-8px',
              right: '-8px',
              width: '20px',
              height: '20px',
              background: '#9c27b0', // Purple
              color: 'white',
              borderRadius: '50%',
              fontSize: '12px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #121212',
              zIndex: 10
          }}>
              K
          </div>
      )}

      <div className="quest-title">{data.label}</div>
      {isExternal && <div className="quest-trader">({data.trader})</div>}
      {data.reqText && <div className="quest-req">{data.reqText}</div>}
      
      {!isExternal && (
        <div className="quest-status">
            {data.isCompleted ? "DONE" : "ACTIVE"}
        </div>
      )}
      
      <Handle type="source" position={Position.Bottom} style={{ background: '#555', visibility: 'hidden' }} />
    </div>
  );
};

const nodeTypes = { quest: QuestNode };

// Layout Algorithm (Same as before)
const getLayoutedElements = (nodes, edges) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: 'TB', ranksep: 100, nodesep: 60 });

  nodes.forEach((node) => {
    const h = node.data.isExternal ? 70 : 100;
    dagreGraph.setNode(node.id, { width: 180, height: h });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - 90,
        y: nodeWithPosition.y - 50,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

export default function QuestsTab({ globalData, completedQuests, setCompletedQuests }) {
  const [selectedTrader, setSelectedTrader] = useState("Prapor");
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Build Graph from Global Data
  useEffect(() => {
    if (!globalData || !globalData.tasks) return;
    
    const rawTasks = globalData.tasks;
    const taskMap = new Map(rawTasks.map(t => [t.id, t]));
    const primaryTasks = rawTasks.filter(t => t.trader.name === selectedTrader);
    
    const nodesToRender = new Map();
    primaryTasks.forEach(t => nodesToRender.set(t.id, { task: t, isPrimary: true }));

    // Find parents
    primaryTasks.forEach(task => {
        if(task.taskRequirements) {
            task.taskRequirements.forEach(req => {
                const parentId = req.task.id;
                if (!nodesToRender.has(parentId) && taskMap.has(parentId)) {
                    nodesToRender.set(parentId, { task: taskMap.get(parentId), isPrimary: false });
                }
            });
        }
    });

    const newNodes = [];
    const newEdges = [];

    nodesToRender.forEach(({ task, isPrimary }, id) => {
        let reqText = "";
        if (task.minPlayerLevel > 1) reqText = `Req: Lvl ${task.minPlayerLevel}`;

        newNodes.push({
            id: task.id,
            type: 'quest',
            data: { 
                label: task.name, 
                trader: task.trader.name,
                reqText: reqText,
                isCompleted: completedQuests.includes(task.id),
                isExternal: !isPrimary,
                // PASS NEW PROPS
                kappaRequired: task.kappaRequired, 
                wikiLink: task.wikiLink
            },
            position: { x: 0, y: 0 }
        });
    });

    nodesToRender.forEach(({ task, isPrimary }, id) => {
        if(task.taskRequirements) {
            task.taskRequirements.forEach(req => {
                const parentId = req.task.id;
                if (nodesToRender.has(parentId)) {
                     newEdges.push({
                        id: `e${parentId}-${task.id}`,
                        source: parentId,
                        target: task.id,
                        type: 'smoothstep',
                        style: { stroke: isPrimary ? '#888' : '#555', strokeWidth: 2 }
                    });
                }
            });
        }
    });

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(newNodes, newEdges);
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);

  }, [globalData, selectedTrader, completedQuests, setNodes, setEdges]);

  const onNodeClick = useCallback((event, node) => {
    if (node.data.isExternal) {
        alert(`This is a ${node.data.trader} quest. Switch to their tab to manage it.`);
        return;
    }

    const isDone = completedQuests.includes(node.id);
    let newCompleted;
    if (isDone) {
        newCompleted = completedQuests.filter(id => id !== node.id);
    } else {
        newCompleted = [...completedQuests, node.id];
    }
    setCompletedQuests(newCompleted);
  }, [completedQuests, setCompletedQuests]);

  return (
    <div className="tab-content" style={{height: '80vh'}}>
      <div className="filters">
        <span style={{marginRight: '10px'}}>Select Trader:</span>
        <select value={selectedTrader} onChange={e => setSelectedTrader(e.target.value)}>
            {TRADERS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <span style={{marginLeft: 'auto', fontSize: '0.8em', color: '#888'}}>
            Right-click a quest to open Wiki.
        </span>
      </div>

      <div style={{ width: '100%', height: '100%', border: '1px solid #333', borderRadius: '8px', background: '#1a1a1a' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.1}
        >
          <Background color="#222" gap={20} />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}