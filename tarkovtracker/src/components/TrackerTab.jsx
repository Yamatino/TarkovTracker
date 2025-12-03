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
          ... on TaskObjectiveItem { 
            item { id name iconLink } 
            count 
            foundInRaid 
          }
        }
      }
      hideoutStations {
        name
        levels {
          level
          itemRequirements { item { id name iconLink } count }
        }
      }
    }`;

    runQuery(query).then(data => {
      if (!data) return;
      processData(data);
    });
  }, [completedQuests]);

  const processData = (data) => {
    const questMap = {}; 
    const hideoutReqs = []; 

    data.tasks.forEach(task => {
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
                fir: false
            };
          }
          
          if (obj.type === 'giveItem') taskItems[id].give += count;
          if (obj.type === 'findItem') taskItems[id].find += count;
          if (obj.type === 'plantItem') taskItems[id].plant += count;
          
          if (obj.foundInRaid) taskItems[id].fir = true;
        }
      });

      Object.keys(taskItems).forEach(id => {
        const t = taskItems[id];
        const needed = Math.max(t.give, t.find) + t.plant;
        
        if (needed > 0) {
          if (!questMap[id]) {
            questMap[id] = { 
                active: 0, 
                doneViaQuest: 0, 
                collectorOnly: true, 
                name: t.name, 
                icon: t.icon,
                fir: false
            };
          }
          
          if (!isCollector) questMap[id].collectorOnly = false;
          if (t.fir) questMap[id].fir = true;

          questMap[id].active += needed;
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

  if (loading) return <div>Loading Tracker...</div>;

  const displayList = [];
  
  const getEntry = (id, name, icon) => {
    let entry = displayList.find(x => x.id === id);
    if (!entry) {
      entry = { id, name, icon, quest: 0, hideout: 0, fir: false };
      displayList.push(entry);
    }
    return entry;
  };

  Object.keys(items.questMap).forEach(id => {
    const q = items.questMap[id];
    if (excludeCollector && q.collectorOnly) return;
    const entry = getEntry(id, q.name, q.icon);
    entry.quest += q.active;
    if (q.fir) entry.fir = true;
  });

  items.hideoutReqs.forEach(req => {
    const currentLvl = hideoutLevels[req.station] || 0;
    if (currentLvl < req.level) {
      getEntry(req.id, req.name, req.icon).hideout += req.count;
    }
  });

  const finalView = displayList
    .filter(x => {
        if (!x.name.toLowerCase().includes(filter.toLowerCase())) return false;
        const total = x.quest + x.hideout;
        const userHas = itemProgress[x.id] || 0;
        const isComplete = (userHas >= total) && (total > 0);
        
        if (showCompleted) return total > 0;
        return !isComplete && total > 0;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

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
            <input type="checkbox" checked={showCompleted} onChange={e => setShowCompleted(e.target.checked)} />
            Show Completed
            </label>

            <label style={{display: 'flex', alignItems: 'center', gap: '8px', cursor:'pointer'}}>
            <input type="checkbox" checked={excludeCollector} onChange={e => setExcludeCollector(e.target.checked)} />
            Hide Collector
            </label>
        </div>
      </div>

      <div className="item-list">
        {finalView.length > 0 ? finalView.map(item => {
            const totalNeeded = item.quest + item.hideout;
            const userHas = itemProgress[item.id] || 0;
            
            let statusClass = "needed";
            if (userHas >= totalNeeded) statusClass = "collected";
            else if (userHas > 0) statusClass = "partial";

            // Generate Breakdown Text
            const parts = [];
            if (item.quest > 0) parts.push(`Quest: ${item.quest}`);
            if (item.hideout > 0) parts.push(`Hideout: ${item.hideout}`);
            const breakdown = parts.join(" | ");

            return (
              <div key={item.id} className={`item-row ${statusClass}`}>
                <div className="col-img">
                    {item.icon && <img src={item.icon} alt="" className="item-icon" />}
                </div>
                <div className="col-name">
                  <div style={{display:'flex', alignItems:'center'}}>
                    {item.name}
                    {item.fir && (
                        <span style={{color:'#ffd700', marginLeft:'8px', fontSize:'0.8em', fontWeight:'bold'}}>(FIR)</span>
                    )}
                  </div>
                </div>
                
                <div className="col-breakdown">
                    {breakdown}
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
        }) : (
            <div style={{textAlign: 'center', padding: '40px', color: '#666'}}>
                {showCompleted ? "No items found." : "No active items needed."}
            </div>
        )}
      </div>
    </div>
  );
}