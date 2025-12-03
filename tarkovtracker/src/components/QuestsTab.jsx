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
import { runQuery } from '../api';

const TRADERS = ["Prapor", "Therapist", "Skier", "Peacekeeper", "Mechanic", "Ragman", "Jaeger", "Fence"];

// --- CUSTOM NODE COMPONENT (The Box) ---
const QuestNode = ({ data }) => {
  return (
    <div className={`quest-node ${data.isCompleted ? 'completed' : ''}`}>
      <Handle type="target" position={Position.Top} style={{ background: '#555' }} />
      <div className="quest-title">{data.label}</div>
      {data.reqText && <div className="quest-req">{data.reqText}</div>}
      <div className="quest-status">
        {data.isCompleted ? "DONE" : "ACTIVE"}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: '#555' }} />
    </div>
  );
};
const nodeTypes = { quest: QuestNode };

// --- LAYOUT ALGORITHM (Dagre) ---
const getLayoutedElements = (nodes, edges) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({ rankdir: 'TB', ranksep: 80, nodesep: 50 }); // Top to Bottom

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 180, height: 80 }); // Box dimensions
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
        x: nodeWithPosition.x - 90, // center anchor
        y: nodeWithPosition.y - 40,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

export default function QuestsTab({ completedQuests, setCompletedQuests }) {
  const [selectedTrader, setSelectedTrader] = useState("Prapor");
  const [rawTasks, setRawTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // 1. Fetch Data
  useEffect(() => {
    const query = `
    {
      tasks {
        id
        name
        minPlayerLevel
        trader { name }
        taskRequirements {
          task { id }
        }
      }
    }`;
    runQuery(query).then(data => {
      if (data) {
        setRawTasks(data.tasks);
        setLoading(false);
      }
    });
  }, []);

  // 2. Build Graph when Trader or Tasks change
  useEffect(() => {
    if (rawTasks.length === 0) return;

    // Filter by Trader
    const traderTasks = rawTasks.filter(t => t.trader.name === selectedTrader);
    
    // Create Nodes
    const newNodes = [];
    const newEdges = [];
    const taskIdsInGraph = new Set(traderTasks.map(t => t.id));

    traderTasks.forEach(task => {
      let reqText = "";
      
      // Check for Parents (Previous Tasks)
      let hasParent = false;
      task.taskRequirements.forEach(req => {
        // Only draw line if the parent is also from this trader (keeps graph clean)
        // Note: Cross-trader dependencies exist, but complicate the view. 
        if (taskIdsInGraph.has(req.task.id)) {
            hasParent = true;
            newEdges.push({
                id: `e${req.task.id}-${task.id}`,
                source: req.task.id,
                target: task.id,
                type: 'smoothstep',
                animated: false,
                style: { stroke: '#777' }
            });
        }
      });

      // If no parent in this graph, show level req
      if (!hasParent && task.minPlayerLevel > 1) {
        reqText = `Requires Lvl ${task.minPlayerLevel}`;
      }

      newNodes.push({
        id: task.id,
        type: 'quest',
        data: { 
            label: task.name, 
            reqText: reqText,
            isCompleted: completedQuests.includes(task.id) 
        },
        position: { x: 0, y: 0 } // Dagre will fix this
      });
    });

    // Calculate Layout
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(newNodes, newEdges);
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);

  }, [rawTasks, selectedTrader, completedQuests, setNodes, setEdges]);

  // 3. Handle Click (Toggle Complete)
  const onNodeClick = useCallback((event, node) => {
    const isDone = completedQuests.includes(node.id);
    let newCompleted;
    
    if (isDone) {
        newCompleted = completedQuests.filter(id => id !== node.id);
    } else {
        newCompleted = [...completedQuests, node.id];
    }
    setCompletedQuests(newCompleted);
  }, [completedQuests, setCompletedQuests]);

  if (loading) return <div>Loading Quests...</div>;

  return (
    <div className="tab-content" style={{height: '80vh'}}>
      <div className="filters">
        <span style={{marginRight: '10px'}}>Select Trader:</span>
        <select value={selectedTrader} onChange={e => setSelectedTrader(e.target.value)}>
            {TRADERS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <span style={{marginLeft: 'auto', fontSize: '0.9em', color: '#888'}}>
            Click a box to toggle completion. Items will vanish from Tracker automatically.
        </span>
      </div>

      <div style={{ width: '100%', height: '100%', border: '1px solid #333', borderRadius: '8px' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.2}
        >
          <Background color="#333" gap={16} />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}