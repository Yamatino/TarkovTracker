import React, { useEffect, useState } from 'react';
import { runQuery } from '../api';

export default function TrackerTab({ itemProgress, setItemProgress, hideoutLevels, completedQuests }) {
  const [items, setItems] = useState({ questMap: {}, hideoutReqs: [] });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [excludeCollector, setExcludeCollector] = useState(true);

  useEffect(() => {
    // Query fetches name, icon, types, and counts
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
  }, [completedQuests]); // Re-run if completedQuests changes

  const processData = (data) => {
    const questMap = {}; 
    const hideoutReqs = []; 

    // Helper to determine badge type
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

    // 1. Process Quests
    data.tasks.forEach(task => {
      // --- NEW LOGIC: Skip tasks marked as completed in the Graph ---
      if (completedQuests.includes(task.id)) return;

      const isCollector = task.name === "Collector";
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
            questMap[id] = { count: 0, collectorOnly: true, name: t.name, icon: t.icon, type: t.type };
          }
          
          if (!isCollector) questMap[id].collectorOnly = false;
          questMap[id].count += needed;
        }
      });
    });

    // 2. Process Hideout
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
      entry = { id, name, icon, type, quest: 0, hideout: 0 };
      displayList.push(entry);
    }
    return entry;
  };

  Object.keys(items.questMap).forEach(id => {
    const q = items.questMap[id];
    if (excludeCollector && q.collectorOnly) return;
    getEntry(id, q.name, q.icon, q.type).quest += q.count;
  });

  items.hideoutReqs.forEach(req => {
    const currentLvl = hideoutLevels[req.station] || 0;
    if (currentLvl < req.level) {
      getEntry(req.id, req.name, req.icon, req.type).hideout += req.count;
    }
  });

  // Filter Search
  const allNeededItems = displayList
    .filter(x => (x.quest + x.hideout) > 0)
    .filter(x => x.name.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Split Lists
  const hideoutItems = allNeededItems.filter(i => i.hideout > 0);
  const questItems = allNeededItems.filter(i => i.quest > 0);

  const renderRow = (item, typeNeeded) => {
    const totalNeeded = item.quest + item.hideout;
    const userHas = itemProgress[item.id] || 0;
    
    let statusClass = "needed";
    if (userHas >= totalNeeded) statusClass = "collected";
    else if (userHas > 0) statusClass = "partial";

    return (
      <div key={item.id} className={`item-row ${statusClass}`}>
        <div className="col-img">
            {item.icon && <img src={item.icon} alt="" className="item-icon" />}
        </div>
        <div className="col-name">
           {/* BADGE */}
           <span className={`type-badge badge-${item.type}`}>
                {item.type.toUpperCase()}
           </span>
          {item.name}
        </div>
        
        <div className="col-breakdown">
            {typeNeeded === 'hideout' && `Hideout: ${item.hideout}`}
            {typeNeeded === 'quest' && `Quest: ${item.quest}`}
        </div>

        <div className="col-controls">
          <button className="btn-mini" onClick={() => adjustCount(item.id, -1)}>-</button>
          <input 
              type="number" 
              className="count-input"
              value={userHas.toString()}
              onChange={(e) => updateCount(item.id, e.target.value)}
              onClick={(e) => e.target.select()} 
          />
          <span className="count-total"> / {totalNeeded}</span>
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
        <label style={{marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px'}}>
          <input 
            type="checkbox" 
            checked={excludeCollector} 
            onChange={e => setExcludeCollector(e.target.checked)} 
          />
          Hide Collector
        </label>
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
          <div style={{textAlign: 'center', padding: '20px', color: '#666'}}>
              No items needed (or all filtered out).
          </div>
      )}
    </div>
  );
}