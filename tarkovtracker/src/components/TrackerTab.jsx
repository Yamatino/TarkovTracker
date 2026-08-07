import React, { useState } from 'react';
import { Search, Minus, Plus, CheckCircle2, CircleDot, Circle, PackageOpen } from 'lucide-react';

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
          if (excludeCollector && q.name === "Collector") return;
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
        <div className="input-with-icon">
          <Search size={16} />
          <input placeholder="Search items..." value={filter} onChange={e => setFilter(e.target.value)} />
        </div>
        <div className="filters-right">
            <label className="checkbox-label"><input type="checkbox" checked={showCompleted} onChange={e => setShowCompleted(e.target.checked)} /> Show Completed</label>
            <label className="checkbox-label"><input type="checkbox" checked={excludeCollector} onChange={e => setExcludeCollector(e.target.checked)} /> Hide Collector</label>
        </div>
      </div>

      <div className="item-list">
        {finalView.length > 0 ? finalView.map(item => {
            const total = item.quest + item.hideout;
            const has = itemProgress[item.id] || 0;
            let status = "needed";
            if (has >= total) status = "collected"; else if (has > 0) status = "partial";
            const StatusIcon = status === "collected" ? CheckCircle2 : status === "partial" ? CircleDot : Circle;

            return (
              <div key={item.id} className={`card tracker-card ${status}`}>
                <div className="tracker-card-header">
                  <div className="tracker-card-media">{item.icon && <img src={item.icon} alt="" />}</div>
                  <div className="tracker-card-name">{item.name}</div>
                  <StatusIcon size={18} className="tracker-card-status-icon" />
                </div>
                <div className="tracker-card-badges">
                  {item.quest > 0 && <span className="badge">Quest: {item.quest}</span>}
                  {item.hideout > 0 && <span className="badge">Hideout: {item.hideout}</span>}
                  {item.fir && <span className="badge badge-fir">FIR</span>}
                </div>
                <div className="tracker-card-footer">
                  <div className="stepper">
                    <button className="btn-mini" onClick={() => updateCount(item.id, has-1)} aria-label={`Decrease ${item.name} count`}><Minus size={14} /></button>
                    <input className="count-input" value={has} onChange={(e) => updateCount(item.id, e.target.value)} onClick={(e)=>e.target.select()} />
                    <button className="btn-mini" onClick={() => updateCount(item.id, has+1)} aria-label={`Increase ${item.name} count`}><Plus size={14} /></button>
                  </div>
                  <span className="count-total">/ {total}</span>
                </div>
              </div>
            );
        }) : <div className="empty-state"><PackageOpen size={32} /> No items.</div>}
      </div>
    </div>
  );
}