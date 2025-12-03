import React, { useEffect, useState } from 'react';
import { runQuery } from '../api';

export default function TrackerTab({ collectedIds, setCollectedIds, hideoutLevels }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [excludeCollector, setExcludeCollector] = useState(true);

  useEffect(() => {
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
    const questMap = {}; // { itemId: { count: 0, collectorOnly: bool, name: "" } }
    const hideoutReqs = []; // Array of raw reqs

    // 1. Process Quests
    data.tasks.forEach(task => {
      const isCollector = task.name === "Collector";
      const taskItems = {}; // Prevent double counting find/give in same task

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
          
          // Only add to count if it's NOT collector (or if we track collector separately)
          // For now, add everything, we filter later
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

  // --- RENDER LOGIC ---
  if (loading) return <div>Loading Tracker Database...</div>;

  // Calculate totals based on CURRENT settings
  const displayList = [];
  const processedIds = new Set();

  // Helper to get or create entry
  const getEntry = (id, name) => {
    let entry = displayList.find(x => x.id === id);
    if (!entry) {
      entry = { id, name, quest: 0, hideout: 0 };
      displayList.push(entry);
    }
    return entry;
  };

  // Add Quests
  Object.keys(items.questMap).forEach(id => {
    const q = items.questMap[id];
    if (excludeCollector && q.collectorOnly) return;
    getEntry(id, q.name).quest += q.count;
  });

  // Add Hideout (Dynamic)
  items.hideoutReqs.forEach(req => {
    const currentLvl = hideoutLevels[req.station] || 0;
    if (currentLvl < req.level) {
      getEntry(req.id, req.name).hideout += req.count;
    }
  });

  // Filter and Sort
  const finalView = displayList
    .filter(x => (x.quest + x.hideout) > 0)
    .filter(x => x.name.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  const toggleItem = (id) => {
    const newSet = new Set(collectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setCollectedIds([...newSet]);
  };

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
          const isCollected = collectedIds.includes(item.id);
          const hideoutStatus = item.hideout === 0 ? "DONE" : item.hideout;
          
          return (
            <div 
              key={item.id} 
              className={`item-row ${isCollected ? 'collected' : ''}`}
              onDoubleClick={() => toggleItem(item.id)}
            >
              <div className="col-name">{item.name}</div>
              <div className="col-total">{item.quest + item.hideout}</div>
              <div className="col-breakdown">
                Q: {item.quest} | H: {hideoutStatus}
              </div>
              <div className="col-status">
                {isCollected ? "COLLECTED" : "NEEDED"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}