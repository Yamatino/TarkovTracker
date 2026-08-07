import React, { useEffect, useMemo, useState, useCallback } from 'react';
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
import { Search, List, GitBranch, CheckCircle2, Circle, ExternalLink, Award, Lightbulb, Shield } from 'lucide-react';
import StatChip from './ui/StatChip';

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
      {data.kappaRequired && <div className="badge-kappa">K</div>}

      <div className="quest-title">{data.label}</div>
      {isExternal && <div className="quest-trader">({data.trader})</div>}
      {data.reqText && <div className="quest-req">{data.reqText}</div>}

      {!isExternal && (
        <div className="quest-status">
            {data.isCompleted ? <><CheckCircle2 size={11} /> DONE</> : <><Circle size={11} /> ACTIVE</>}
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

export default function QuestsTab({ globalData, completedQuests, setCompletedQuests, faction }) {
  const [selectedTrader, setSelectedTrader] = useState("Prapor");
  const [filter, setFilter] = useState("");
  const [hideCompleted, setHideCompleted] = useState(false);
  const [viewMode, setViewMode] = useState("list");

  // Questline milestones: Tarkov has no branching "story ending" the API models,
  // but kappaRequired/lightkeeperRequired/factionName are real, trackable chains.
  const milestoneStats = useMemo(() => {
    if (!globalData?.tasks) return null;
    const completedSet = new Set(completedQuests);
    const countGroup = (predicate) => {
      const matching = globalData.tasks.filter(predicate);
      return { done: matching.filter(t => completedSet.has(t.id)).length, total: matching.length };
    };
    return {
      kappa: countGroup(t => t.kappaRequired),
      lightkeeper: countGroup(t => t.lightkeeperRequired),
      // Strictly faction-exclusive quests only (not + "Any"), otherwise this stat
      // would track ~the same number as total quest count and add no signal.
      faction: faction ? countGroup(t => t.factionName === faction) : null,
    };
  }, [globalData, completedQuests, faction]);

  // TRADERS order drives the picker row; imageLink is resolved from globalData.traders by name.
  const traderList = useMemo(() => {
    const byName = new Map((globalData?.traders || []).map(t => [t.name, t]));
    return TRADERS.map(name => ({ name, imageLink: byName.get(name)?.imageLink }));
  }, [globalData]);

  const toggleQuest = useCallback((id) => {
    const isDone = completedQuests.includes(id);
    const newCompleted = isDone ? completedQuests.filter(x => x !== id) : [...completedQuests, id];
    setCompletedQuests(newCompleted);
  }, [completedQuests, setCompletedQuests]);

  // Longest-prerequisite-chain depth for every task, independent of trader -
  // used to sort/indent the list view so it still reads as a "flow" top to bottom.
  const taskDepths = useMemo(() => {
    const depths = new Map();
    if (!globalData?.tasks) return depths;
    const taskMap = new Map(globalData.tasks.map(t => [t.id, t]));
    const compute = (id, visiting) => {
      if (depths.has(id)) return depths.get(id);
      if (visiting.has(id)) return 0; // defensive: shouldn't happen, avoids infinite recursion on bad data
      const task = taskMap.get(id);
      if (!task || !task.taskRequirements || task.taskRequirements.length === 0) {
        depths.set(id, 0);
        return 0;
      }
      visiting.add(id);
      const d = 1 + Math.max(...task.taskRequirements.map(r => compute(r.task.id, visiting)));
      visiting.delete(id);
      depths.set(id, d);
      return d;
    };
    globalData.tasks.forEach(t => compute(t.id, new Set()));
    return depths;
  }, [globalData]);

  const listItems = useMemo(() => {
    if (!globalData?.tasks) return [];
    const taskMap = new Map(globalData.tasks.map(t => [t.id, t]));
    let tasks = globalData.tasks.filter(t => t.trader.name === selectedTrader);
    if (filter.trim()) {
      const f = filter.trim().toLowerCase();
      tasks = tasks.filter(t => t.name.toLowerCase().includes(f));
    }
    if (hideCompleted) {
      tasks = tasks.filter(t => !completedQuests.includes(t.id));
    }
    return tasks
      .map(task => ({
        task,
        depth: taskDepths.get(task.id) || 0,
        prereqNames: (task.taskRequirements || [])
          .map(r => taskMap.get(r.task.id)?.name)
          .filter(Boolean),
      }))
      .sort((a, b) =>
        a.depth - b.depth ||
        (a.task.minPlayerLevel || 0) - (b.task.minPlayerLevel || 0) ||
        a.task.name.localeCompare(b.task.name)
      );
  }, [globalData, selectedTrader, filter, hideCompleted, completedQuests, taskDepths]);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Build Graph from Global Data
  useEffect(() => {
    if (!globalData || !globalData.tasks) return;

    const rawTasks = globalData.tasks;
    const taskMap = new Map(rawTasks.map(t => [t.id, t]));
    let primaryTasks = rawTasks.filter(t => t.trader.name === selectedTrader);
    if (filter.trim()) {
      const f = filter.trim().toLowerCase();
      primaryTasks = primaryTasks.filter(t => t.name.toLowerCase().includes(f));
    }
    if (hideCompleted) {
      primaryTasks = primaryTasks.filter(t => !completedQuests.includes(t.id));
    }

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

    nodesToRender.forEach(({ task, isPrimary }) => {
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

    nodesToRender.forEach(({ task, isPrimary }) => {
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

  }, [globalData, selectedTrader, completedQuests, filter, hideCompleted, setNodes, setEdges]);

  const onNodeClick = useCallback((event, node) => {
    if (node.data.isExternal) {
        alert(`This is a ${node.data.trader} quest. Switch to their tab to manage it.`);
        return;
    }
    toggleQuest(node.id);
  }, [toggleQuest]);

  return (
    <div className="tab-content" style={{height: 'clamp(400px, 70vh, 900px)'}}>
      {milestoneStats && (
        <div className="milestone-bar">
          <StatChip icon={Award} label="Kappa" done={milestoneStats.kappa.done} total={milestoneStats.kappa.total} />
          <StatChip icon={Lightbulb} label="Lightkeeper" done={milestoneStats.lightkeeper.done} total={milestoneStats.lightkeeper.total} />
          {milestoneStats.faction && (
            <StatChip icon={Shield} label={`Faction (${faction})`} done={milestoneStats.faction.done} total={milestoneStats.faction.total} />
          )}
        </div>
      )}
      <div className="trader-row">
        {traderList.map(({ name, imageLink }) => (
          <button
            key={name}
            type="button"
            className={`trader-avatar ${selectedTrader === name ? 'active' : ''}`}
            onClick={() => setSelectedTrader(name)}
            title={name}
          >
            {imageLink ? <img src={imageLink} alt={name} /> : <span>{name[0]}</span>}
            <span className="trader-name">{name}</span>
          </button>
        ))}
      </div>
      <div className="filters">
        <div className="input-with-icon">
          <Search size={16} />
          <input placeholder="Search quests..." value={filter} onChange={e => setFilter(e.target.value)} />
        </div>
        <label className="checkbox-label"><input type="checkbox" checked={hideCompleted} onChange={e => setHideCompleted(e.target.checked)} /> Hide Completed</label>
        {viewMode === 'graph' && (
          <span style={{fontSize: '0.8em', color: 'var(--text-secondary)'}}>Right-click a quest to open Wiki.</span>
        )}
        <div className="filters-right" style={{gap: '4px'}}>
          <button type="button" className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}><List size={14} /> List</button>
          <button type="button" className={`toggle-btn ${viewMode === 'graph' ? 'active' : ''}`} onClick={() => setViewMode('graph')}><GitBranch size={14} /> Graph</button>
        </div>
      </div>

      {viewMode === 'list' ? (
        <div className="quest-list-container">
          {listItems.length === 0 && <div className="empty-state">No quests match.</div>}
          {listItems.map(({ task, depth, prereqNames }) => {
            const isCompleted = completedQuests.includes(task.id);
            return (
              <div
                key={task.id}
                className={`quest-list-row ${isCompleted ? 'completed' : ''}`}
                style={{ '--depth': Math.min(depth, 10) }}
                onClick={() => toggleQuest(task.id)}
              >
                <span className="quest-list-check">{isCompleted ? <CheckCircle2 size={18} /> : <Circle size={18} />}</span>
                <span className="quest-list-name">{task.name}</span>
                {task.kappaRequired && <span className="badge-kappa" title="Kappa required">K</span>}
                {task.minPlayerLevel > 1 && <span className="quest-list-level">Lvl {task.minPlayerLevel}</span>}
                {task.wikiLink && (
                  <a
                    href={task.wikiLink}
                    target="_blank"
                    rel="noreferrer"
                    className="quest-list-wiki"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink size={12} /> Wiki
                  </a>
                )}
                {prereqNames.length > 0 && (
                  <span className="quest-list-req">requires: {prereqNames.join(', ')}</span>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="quest-graph-container">
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
      )}
    </div>
  );
}