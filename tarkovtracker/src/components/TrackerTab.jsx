import React, { useState } from 'react';

export default function TrackerTab({ globalData, itemProgress, setItemProgress, hideoutLevels, completedQuests }) {
  const [filter, setFilter] = useState("");
  const [excludeCollector, setExcludeCollector] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);

  // USE GLOBAL DATA
  const displayList = [];
  const getEntry = (id, name, icon, type) => {
    let entry = displayList.find(x => x.id === id);
    if (!entry) { entry = { id, name, icon, type, quest: 0, hideout: 0, fir: false }; displayList.push(entry); }
    return entry;
  };

  // Calculate from Global Data
  globalData.items.forEach(item => {
      // Quests
      item.questDetails.forEach(q => {
          if (excludeCollector && item.name === "Collector") return; // simplified check
          // Note: "Collector" logic needs more complex tag check usually, but for now:
          if (!completedQuests.includes(q.id)) {
             const entry = getEntry(item.id, item.name, item.iconLink, item.types?.[0] || 'item');
             entry.quest += q.count;
             if(q.fir) entry.fir = true;
          }
      });
      // Hideout
      item.hideoutDetails.forEach(h => {
          if ((hideoutLevels[h.station] || 0) < h.level) {
             const entry = getEntry(item.id, item.name, item.iconLink, item.types?.[0] || 'item');
             entry.hideout += h.count;
          }
      });
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

  const updateCount = (id, val) => setItemProgress(prev => ({ ...prev, [id]: Math.max(0, parseInt(val)||0) }));

  return (
    <div className="tab-content">
      <div className="filters">
        <input placeholder="Search items..." value={filter} onChange={e => setFilter(e.target.value)} style={{width: '100%', maxWidth: '300px'}} />
        <div style={{marginLeft: 'auto', display: 'flex', gap: '15px'}}>
            <label style={{display:'flex', gap:'5px', cursor:'pointer'}}><input type="checkbox" checked={showCompleted} onChange={e => setShowCompleted(e.target.checked)} /> Show Completed</label>
            <label style={{display:'flex', gap:'5px', cursor:'pointer'}}><input type="checkbox" checked={excludeCollector} onChange={e => setExcludeCollector(e.target.checked)} /> Hide Collector</label>
        </div>
      </div>

      <div className="item-list">
        {finalView.length > 0 ? finalView.map(item => {
            const total = item.quest + item.hideout;
            const has = itemProgress[item.id] || 0;
            let status = "needed";
            if (has >= total) status = "collected"; else if (has > 0) status = "partial";
            
            return (
              <div key={item.id} className={`item-row ${status}`}>
                <div className="col-img">{item.icon && <img src={item.icon} className="item-icon" />}</div>
                <div className="col-name">{item.name} {item.fir && <span style={{color:'#ffd700', fontWeight:'bold', fontSize:'0.8em'}}>(FIR)</span>}</div>
                <div className="col-breakdown">Quest: {item.quest} | Hideout: {item.hideout}</div>
                <div className="col-controls">
                  <button className="btn-mini" onClick={() => updateCount(item.id, has-1)}>-</button>
                  <input className="count-input" value={has} onChange={(e) => updateCount(item.id, e.target.value)} onClick={(e)=>e.target.select()} />
                  <span className="count-total"> / {total}</span>
                  <button className="btn-mini" onClick={() => updateCount(item.id, has+1)}>+</button>
                </div>
              </div>
            );
        }) : <div style={{textAlign:'center', padding:'40px', color:'#666'}}>No items.</div>}
      </div>
    </div>
  );
}