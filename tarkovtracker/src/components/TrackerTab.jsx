import React, { useEffect, useState } from 'react';
import { runQuery } from '../api';

export default function TrackerTab({ itemProgress, setItemProgress, hideoutLevels, completedQuests }) {
  const [items, setItems] = useState({ questMap: {}, hideoutReqs: [] });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [excludeCollector, setExcludeCollector] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);

  useEffect(() => {
    const query = `
    {
      tasks {
        id
        name
        objectives {
          type
          ... on TaskObjectiveItem { item { id name iconLink types } count }
        }
      }
      hideoutStations {
        name
        levels {
          level
          itemRequirements { item { id name iconLink types } count }
        }
      }
    }`;

    runQuery(query).then(data => {
      if (!data) return;
      processData(data);
    });
  }, [completedQuests]); // Re-calculate when completedQuests changes

  const processData = (data) => {
    const questMap = {}; 
    const hideoutReqs = []; 

    const getType = (item) => {
        if (!item.types) return "item";
        if (item.types.includes("ammo")) return "ammo";
        if (item.types.includes("weapon")) return "weapon";
        if (item.types.includes("key")) return "key";
        if (item.types.includes("barter")) return "barter";
        if (item.types.includes("container")) return "container";
        if (item.name.includes("Rouble") || item.name.includes("Dollar") || item.name.includes("Euro")) return "currency";
        return "item";
    };

    data.tasks.forEach(task => {
      const isCollector = task.name === "Collector";
      const isQuestDone = completedQuests.includes(task.id); // Check if done via Graph
      const taskItems = {}; 

      task.objectives.forEach(obj => {
        if (obj.item) {
          const id = obj.item.id;
          const count = obj.count || 1;
          
          if (!taskItems[id]) {
            taskItems[id] = { 
                give: 0, find: 0, plant: 0, 
                name: obj.item.name, 
                icon: obj.item.iconLink,
                type: getType(obj.item)
            };
          }
          
          if (obj.type === 'giveItem') taskItems[id].give += count;
          if (obj.type === 'findItem') taskItems[id].find += count;
          if (obj.type === 'plantItem') taskItems[id].plant += count;
        }
      });

      Object.keys(taskItems).forEach(id => {
        const t = taskItems[id];
        const needed = Math.max(t.give, t.find) + t.plant;
        
        if (needed > 0) {
          if (!questMap[id]) {
            questMap[id] = { 
                active: 0, // Still needed
                doneViaQuest: 0, // Finished via Graph
                collectorOnly: true, 
                name: t.name, 
                icon: t.icon, 
                type: t.type 
            };
          }
          
          if (!isCollector) questMap[id].collectorOnly = false;
          
          // SPLIT LOGIC:
          if (isQuestDone) {
              questMap[id].doneViaQuest += needed;
          } else {
              questMap[id].active += needed;
          }
        }
      });
    });

    data.hideoutStations.forEach(station => {
      station.levels.forEach(lvl => {
        lvl.itemRequirements.forEach(req => {
          if (req.item) {
            hideoutReqs.push({
              id: req.item.id,
              name: req.item.name,
              icon: req.item.iconLink,
              type: getType(req.item),
              station: station.name,
              level: lvl.level,
              count: req.count
            });
          }
        });
      });
    });

    setItems({ questMap, hideoutReqs });
    setLoading(false);
  };

  const updateCount = (id, newVal) => {
    const val = Math.max(0, parseInt(newVal) || 0);
    setItemProgress(prev => ({ ...prev, [id]: val }));
  };

  const adjustCount = (id, delta) => {
      const current = itemProgress[id] || 0;
      updateCount(id, current + delta);
  }

  // --- RENDER LOGIC ---
  if (loading) return <div>Loading Tracker...</div>;

  const displayList = [];
  
  const getEntry = (id, name, icon, type) => {
    let entry = displayList.find(x => x.id === id);
    if (!entry) {
      entry = { 
          id, name, icon, type, 
          questActive: 0, 
          questDone: 0,
          hideoutActive: 0 
      };
      displayList.push(entry);
    }
    return entry;
  };

  Object.keys(items.questMap).forEach(id => {
    const q = items.questMap[id];
    if (excludeCollector && q.collectorOnly) return;
    const entry = getEntry(id, q.name, q.icon, q.type);
    entry.questActive += q.active;
    entry.questDone += q.doneViaQuest;
  });

  items.hideoutReqs.forEach(req => {
    const currentLvl = hideoutLevels[req.station] || 0;
    // If we have built the station, it's done. If not, it's active.
    // We don't track "done" hideout items explicitly for history, 
    // but we could. For now, we just track active needs.
    if (currentLvl < req.level) {
      getEntry(req.id, req.name, req.icon, req.type).hideoutActive += req.count;
    }
  });

  // Filter Search & Completion
  const allItems = displayList
    .filter(x => {
        // Must match search
        if (!x.name.toLowerCase().includes(filter.toLowerCase())) return false;

        const totalActiveNeeded = x.questActive + x.hideoutActive;
        const totalHistory = totalActiveNeeded + x.questDone; // Total including finished quests
        const userHas = itemProgress[x.id] || 0;
        
        const isFullyComplete = (userHas >= totalActiveNeeded) && (totalActiveNeeded > 0);
        const isDoneViaGraph = (totalActiveNeeded === 0 && x.questDone > 0);
        
        // If "Show Completed" is ON: Show everything that has EVER been needed
        if (showCompleted) {
            return totalHistory > 0;
        }

        // If "Show Completed" is OFF:
        // Hide if fully collected manually OR if finished via graph
        if (isFullyComplete) return false;
        if (isDoneViaGraph) return false;
        
        return totalActiveNeeded > 0;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  // Split Lists
  const hideoutItems = allItems.filter(i => i.hideoutActive > 0);
  // Quest items: Show if active > 0 OR if we are showing completed history
  const questItems = allItems.filter(i => i.questActive > 0 || (showCompleted && i.questDone > 0));

  const renderRow = (item, typeNeeded) => {
    const activeNeeded = (typeNeeded === 'hideout') ? item.hideoutActive : item.questActive;
    const doneViaGraph = (typeNeeded === 'quest') ? item.questDone : 0;
    
    // If active need is 0, but we are rendering because "Show Completed" is on:
    const isGraphDone = activeNeeded === 0 && doneViaGraph > 0;
    const userHas = itemProgress[item.id] || 0;
    
    let statusClass = "needed";
    if (isGraphDone) statusClass = "collected"; // Green because quest is done
    else if (userHas >= activeNeeded) statusClass = "collected"; // Green because we collected enough
    else if (userHas > 0) statusClass = "partial";

    // Text for the breakdown
    let breakdown = "";
    if (typeNeeded === 'hideout') {
        breakdown = `Hideout: ${item.hideoutActive}`;
    } else {
        if (isGraphDone) breakdown = `Quest: DONE (${doneViaGraph} items)`;
        else breakdown = `Quest: ${item.questActive}`;
    }

    return (
      <div key={item.id} className={`item-row ${statusClass}`}>
        <div className="col-img">
            {item.icon && <img src={item.icon} alt="" className="item-icon" />}
        </div>
        <div className="col-name">
           <span className={`type-badge badge-${item.type}`}>
                {item.type.toUpperCase()}
           </span>
          {item.name}
        </div>
        
        <div className="col-breakdown">
            {breakdown}
        </div>

        <div className="col-controls">
          {/* If it's done via graph, disable inputs to avoid confusion, or keep them? Keeping them is fine. */}
          <button className="btn-mini" onClick={() => adjustCount(item.id, -1)}>-</button>
          <input 
              type="number" 
              className="count-input"
              value={userHas.toString()}
              onChange={(e) => updateCount(item.id, e.target.value)}
              onClick={(e) => e.target.select()} 
          />
          {/* If active needed is 0 (done via graph), show 0 as goal or checkmark? */}
          <span className="count-total"> / {activeNeeded > 0 ? activeNeeded : "-"}</span>
          <button className="btn-mini" onClick={() => adjustCount(item.id, 1)}>+</button>
        </div>
      </div>
    );
  };

  return (
    <div className="tab-content">
      <div className="filters">
        <input 
          placeholder="Search items..." 
          value={filter} 
          onChange={e => setFilter(e.target.value)} 
          style={{width: '100%', maxWidth: '300px'}}
        />
        
        <div style={{marginLeft: 'auto', display: 'flex', gap: '15px'}}>
            <label style={{display: 'flex', alignItems: 'center', gap: '8px', cursor:'pointer'}}>
            <input 
                type="checkbox" 
                checked={showCompleted} 
                onChange={e => setShowCompleted(e.target.checked)} 
            />
            Show Completed
            </label>

            <label style={{display: 'flex', alignItems: 'center', gap: '8px', cursor:'pointer'}}>
            <input 
                type="checkbox" 
                checked={excludeCollector} 
                onChange={e => setExcludeCollector(e.target.checked)} 
            />
            Hide Collector
            </label>
        </div>
      </div>

      {hideoutItems.length > 0 && (
          <>
            <h3 className="section-title">Hideout Requirements</h3>
            <div className="item-list">
                {hideoutItems.map(item => renderRow(item, 'hideout'))}
            </div>
          </>
      )}

      {questItems.length > 0 && (
          <>
            <h3 className="section-title">Quest Requirements</h3>
            <div className="item-list">
                {questItems.map(item => renderRow(item, 'quest'))}
            </div>
          </>
      )}
      
      {hideoutItems.length === 0 && questItems.length === 0 && (
          <div style={{textAlign: 'center', padding: '40px', color: '#666'}}>
              {showCompleted ? "No items found." : "No active items needed. Check 'Show Completed' to see finished items."}
          </div>
      )}
    </div>
  );
}