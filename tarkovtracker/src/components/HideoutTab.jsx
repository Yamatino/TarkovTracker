import React, { useState, useEffect } from 'react';

const PREFERRED_ORDER = ["Vents", "Security", "Lavatory", "Stash", "Generator", "Heating", "Rest Space", "Workbench", "Medstation", "Nutrition Unit", "Water Collector", "Shooting Range", "Library", "Scav Case", "Intelligence Center", "Illumination", "Booze Generator", "Bitcoin Farm", "Solar Power", "Air Filtering Unit", "Defective Wall", "Gym"];

export default function HideoutTab({ globalData, levels, setLevels }) {
  const [stations, setStations] = useState([]);

  useEffect(() => {
    // Sort using global data
    const sorted = [...globalData.hideoutStations].sort((a, b) => {
        const indexA = PREFERRED_ORDER.indexOf(a.name);
        const indexB = PREFERRED_ORDER.indexOf(b.name);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.name.localeCompare(b.name);
    });
    setStations(sorted);
  }, [globalData]);

  const changeLevel = (name, delta, max) => {
    const current = levels[name] || 0;
    const newVal = Math.min(Math.max(current + delta, 0), max);
    setLevels(prev => ({ ...prev, [name]: newVal }));
  };

  return (
    <div className="tab-content">
      <h3 className="section-title">Hideout Management</h3>
      <div className="station-grid">
        {stations.map(s => {
            const cur = levels[s.name] || 0;
            const max = s.levels.length;
            return (
              <div key={s.name} className="station-card">
                <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
                    {s.imageLink && <img src={s.imageLink} style={{width:50, height:50, objectFit:'contain'}} />}
                    <span className="station-name" style={{fontWeight:'bold'}}>{s.name}</span>
                </div>
                <div className="controls" style={{display:'flex', alignItems:'center'}}>
                  <button className="btn-mini" onClick={()=>changeLevel(s.name, -1, max)} disabled={cur===0}>-</button>
                  <span className="level-badge" style={{margin:'0 10px', minWidth:'60px', textAlign:'center'}}>Lvl {cur} <span style={{color:'#555', fontSize:'0.8em'}}>/ {max}</span></span>
                  <button className="btn-mini" onClick={()=>changeLevel(s.name, 1, max)} disabled={cur>=max}>+</button>
                </div>
              </div>
            );
        })}
      </div>
    </div>
  );
}