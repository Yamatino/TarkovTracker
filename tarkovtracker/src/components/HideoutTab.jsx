import React, { useMemo } from 'react';
import { Minus, Plus, Home } from 'lucide-react';

const PREFERRED_ORDER = ["Vents", "Security", "Lavatory", "Stash", "Generator", "Heating", "Rest Space", "Workbench", "Medstation", "Nutrition Unit", "Water Collector", "Shooting Range", "Library", "Scav Case", "Intelligence Center", "Illumination", "Booze Generator", "Bitcoin Farm", "Solar Power", "Air Filtering Unit", "Defective Wall", "Gym"];

export default function HideoutTab({ globalData, levels, setLevels }) {
  const stations = useMemo(() => {
    return [...globalData.hideoutStations].sort((a, b) => {
        const indexA = PREFERRED_ORDER.indexOf(a.name);
        const indexB = PREFERRED_ORDER.indexOf(b.name);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.name.localeCompare(b.name);
    });
  }, [globalData]);

  const changeLevel = (name, delta, max) => {
    const current = levels[name] || 0;
    const newVal = Math.min(Math.max(current + delta, 0), max);
    setLevels(prev => ({ ...prev, [name]: newVal }));
  };

  return (
    <div className="tab-content">
      <h3 className="section-title"><Home size={20} /> Hideout Management</h3>
      <div className="station-grid">
        {stations.map(s => {
            const cur = levels[s.name] || 0;
            const max = s.levels.length;
            return (
              <div key={s.name} className="card station-card">
                <div className="station-card-header">
                    {s.imageLink && <img src={s.imageLink} alt="" />}
                    <span className="station-name">{s.name}</span>
                </div>
                <div className="controls">
                  <button className="btn-mini" onClick={()=>changeLevel(s.name, -1, max)} disabled={cur===0} aria-label={`Decrease ${s.name} level`}><Minus size={14} /></button>
                  <span className="level-badge">Lvl {cur} <span className="level-max">/ {max}</span></span>
                  <button className="btn-mini" onClick={()=>changeLevel(s.name, 1, max)} disabled={cur>=max} aria-label={`Increase ${s.name} level`}><Plus size={14} /></button>
                </div>
              </div>
            );
        })}
      </div>
    </div>
  );
}