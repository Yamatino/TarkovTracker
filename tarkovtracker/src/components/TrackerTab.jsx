import React, { useEffect, useState } from 'react';
import { runQuery } from '../api';

// Accept itemProgress (object) instead of collectedIds (array)
export default function TrackerTab({ itemProgress, setItemProgress, hideoutLevels }) {
  const [items, setItems] = useState({ questMap: {}, hideoutReqs: [] });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [excludeCollector, setExcludeCollector] = useState(true);

  useEffect(() => {
    // Query remains the same
    const query = `
    {
      tasks {
        name
        objectives {
          type
          ... on TaskObjectiveItem { item { id name } count }
        }
      }
      hideoutStations {
        name
        levels {
          level
          itemRequirements { item { id name } count }
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

    data.tasks.forEach(task => {
      const isCollector = task.name === "Collector";
      const taskItems = {}; 

      task.objectives.forEach(obj => {
        if (obj.item) {
          const id = obj.item.id;
          const count = obj.count || 1;
          if (!taskItems[id]) taskItems[id] = { give: 0, find: 0, plant: 0, name: obj.item.name };
          
          if (obj.type === 'giveItem') taskItems[id].give += count;
          if (obj.type === 'findItem') taskItems[id].find += count;
          if (obj.type === 'plantItem') taskItems[id].plant += count;
        }
      });

      Object.keys(taskItems).forEach(id => {
        const t = taskItems[id];
        const needed = Math.max(t.give, t.find) + t.plant;
        
        if (needed > 0) {
          if (!questMap[id]) questMap[id] = { count: 0, collectorOnly: true, name: t.name };
          if (!isCollector) questMap[id].collectorOnly = false;
          if (questMap[id].collectorOnly) questMap[id].count += needed;
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

  // --- Logic to Update Count ---
  const updateCount = (id, delta) => {
    const current = itemProgress[id] || 0;
    const newVal = Math.max(0, current + delta);
    
    // Create new object reference to trigger React update
    setItemProgress(prev => ({
        ...prev,
        [id]: newVal
    }));
  };

  // --- RENDER LOGIC ---
  if (loading) return <div>Loading Tracker Database...</div>;

  const displayList = [];
  
  const getEntry = (id, name) => {
    let entry = displayList.find(x => x.id === id);
    if (!entry) {
      entry = { id, name, quest: 0, hideout: 0 };
      displayList.push(entry);
    }
    return entry;
  };

  Object.keys(items.questMap).forEach(id => {
    const q = items.questMap[id];
    if (excludeCollector && q.collectorOnly) return;
    getEntry(id, q.name).quest += q.count;
  });

  items.hideoutReqs.forEach(req => {
    const currentLvl = hideoutLevels[req.station] || 0;
    if (currentLvl < req.level) {
      getEntry(req.id, req.name).hideout += req.count;
    }
  });

  const finalView = displayList
    .filter(x => (x.quest + x.hideout) > 0)
    .filter(x => x.name.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="tab-content">
      <div className="filters">
        <input 
          placeholder="Filter items..." 
          value={filter} 
          onChange={e => setFilter(e.target.value)} 
        />
        <label>
          <input 
            type="checkbox" 
            checked={excludeCollector} 
            onChange={e => setExcludeCollector(e.target.checked)} 
          />
          Hide Collector Items
        </label>
      </div>

      <div className="item-list">
        {finalView.map(item => {
          const totalNeeded = item.quest + item.hideout;
          const userHas = itemProgress[item.id] || 0;
          
          let statusClass = "needed";
          let statusText = "NEEDED";

          if (userHas >= totalNeeded) {
            statusClass = "collected";
            statusText = "DONE";
          } else if (userHas > 0) {
            statusClass = "partial"; // You might need to add .partial color in CSS
            statusText = `${userHas} / ${totalNeeded}`;
          }

          return (
            <div key={item.id} className={`item-row ${statusClass}`}>
              <div className="col-name">{item.name}</div>
              
              <div className="col-breakdown">
                Quest: {item.quest} | Hideout: {item.hideout === 0 ? "DONE" : item.hideout}
              </div>

              {/* NEW CONTROL SECTION */}
              <div className="col-controls">
                <button className="btn-mini" onClick={() => updateCount(item.id, -1)}>-</button>
                <span className="count-display">{userHas} / {totalNeeded}</span>
                <button className="btn-mini" onClick={() => updateCount(item.id, 1)}>+</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}