import React, { useEffect, useState } from 'react';
import { runQuery } from '../api';

export default function TrackerTab({ itemProgress, setItemProgress, hideoutLevels }) {
  const [items, setItems] = useState({ questMap: {}, hideoutReqs: [] });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("All"); // New Filter
  const [excludeCollector, setExcludeCollector] = useState(true);

  // New: List of types we found for the dropdown
  const [availableTypes, setAvailableTypes] = useState(new Set(["All"]));

  useEffect(() => {
    // UPDATED QUERY: Added 'types' to the item fetch
    const query = `
    {
      tasks {
        name
        objectives {
          type
          ... on TaskObjectiveItem { item { id name types } count }
        }
      }
      hideoutStations {
        name
        levels {
          level
          itemRequirements { item { id name types } count }
        }
      }
    }`;

    runQuery(query).then(data => {
      if (!data) return;
      processData(data);
    });
  }, []);

  const processData = (data) => {
    const questMap = {}; 
    const hideoutReqs = []; 
    const typesFound = new Set(["All"]);

    // Helper to extract clean type
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
      const taskItems = {}; 

      task.objectives.forEach(obj => {
        if (obj.item) {
          const id = obj.item.id;
          const count = obj.count || 1;
          const itemType = getType(obj.item);
          typesFound.add(itemType);

          if (!taskItems[id]) taskItems[id] = { give: 0, find: 0, plant: 0, name: obj.item.name, type: itemType };
          
          if (obj.type === 'giveItem') taskItems[id].give += count;
          if (obj.type === 'findItem') taskItems[id].find += count;
          if (obj.type === 'plantItem') taskItems[id].plant += count;
        }
      });

      Object.keys(taskItems).forEach(id => {
        const t = taskItems[id];
        const needed = Math.max(t.give, t.find) + t.plant;
        
        if (needed > 0) {
          if (!questMap[id]) questMap[id] = { count: 0, collectorOnly: true, name: t.name, type: t.type };
          if (!isCollector) questMap[id].collectorOnly = false;
          if (questMap[id].collectorOnly) questMap[id].count += needed;
        }
      });
    });

    data.hideoutStations.forEach(station => {
      station.levels.forEach(lvl => {
        lvl.itemRequirements.forEach(req => {
          if (req.item) {
            const t = getType(req.item);
            typesFound.add(t);
            hideoutReqs.push({
              id: req.item.id,
              name: req.item.name,
              type: t,
              station: station.name,
              level: lvl.level,
              count: req.count
            });
          }
        });
      });
    });

    setItems({ questMap, hideoutReqs });
    setAvailableTypes(typesFound);
    setLoading(false);
  };

  // --- Logic to Update Count ---
  const updateCount = (id, newVal) => {
    // Ensure positive integer
    const val = Math.max(0, parseInt(newVal) || 0);
    setItemProgress(prev => ({ ...prev, [id]: val }));
  };

  const adjustCount = (id, delta) => {
      const current = itemProgress[id] || 0;
      updateCount(id, current + delta);
  }

  // --- RENDER LOGIC ---
  if (loading) return <div>Loading Tracker Database...</div>;

  const displayList = [];
  
  const getEntry = (id, name, type) => {
    let entry = displayList.find(x => x.id === id);
    if (!entry) {
      entry = { id, name, type, quest: 0, hideout: 0 };
      displayList.push(entry);
    }
    return entry;
  };

  Object.keys(items.questMap).forEach(id => {
    const q = items.questMap[id];
    if (excludeCollector && q.collectorOnly) return;
    getEntry(id, q.name, q.type).quest += q.count;
  });

  items.hideoutReqs.forEach(req => {
    const currentLvl = hideoutLevels[req.station] || 0;
    if (currentLvl < req.level) {
      getEntry(req.id, req.name, req.type).hideout += req.count;
    }
  });

  const finalView = displayList
    .filter(x => (x.quest + x.hideout) > 0)
    .filter(x => x.name.toLowerCase().includes(filter.toLowerCase()))
    .filter(x => typeFilter === "All" || x.type === typeFilter)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="tab-content">
      <div className="filters">
        <input 
          placeholder="Search items..." 
          value={filter} 
          onChange={e => setFilter(e.target.value)} 
          style={{width: '150px'}}
        />
        
        {/* NEW: Type Dropdown */}
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            {[...availableTypes].sort().map(t => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
        </select>

        <label style={{marginLeft: 'auto'}}>
          <input 
            type="checkbox" 
            checked={excludeCollector} 
            onChange={e => setExcludeCollector(e.target.checked)} 
          />
          Hide Collector
        </label>
      </div>

      <div className="item-list">
        {finalView.map(item => {
          const totalNeeded = item.quest + item.hideout;
          const userHas = itemProgress[item.id] || 0;
          
          let statusClass = "needed";
          if (userHas >= totalNeeded) statusClass = "collected";
          else if (userHas > 0) statusClass = "partial";

          // CLEAN BREAKDOWN LOGIC
          const parts = [];
          if (item.quest > 0) parts.push(`Quest: ${item.quest}`);
          if (item.hideout > 0) parts.push(`Hideout: ${item.hideout}`);
          const breakdownText = parts.join(" | ");

          return (
            <div key={item.id} className={`item-row ${statusClass}`}>
              <div className="col-name">
                {/* BADGE */}
                <span className={`type-badge badge-${item.type}`}>
                    {item.type.toUpperCase()}
                </span>
                {item.name}
              </div>
              
              <div className="col-breakdown">
                {breakdownText}
              </div>

              {/* INPUT CONTROLS */}
              <div className="col-controls">
                <button className="btn-mini" onClick={() => adjustCount(item.id, -1)}>-</button>
                
                <input 
                    type="number" 
                    className="count-input"
                    value={userHas.toString()} // String to prevent leading zeros issues
                    onChange={(e) => updateCount(item.id, e.target.value)}
                    onClick={(e) => e.target.select()} // Auto-select text on click
                />
                
                <span className="count-total"> / {totalNeeded}</span>
                <button className="btn-mini" onClick={() => adjustCount(item.id, 1)}>+</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}