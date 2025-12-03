import React, { useEffect, useState } from 'react';
import { runQuery } from '../api';

const STATION_ORDER = [
  "Vents", "Security", "Lavatory", "Stash", "Generator", "Heating",
  "Rest Space", "Workbench", "Medstation", "Nutrition Unit", "Water Collector",
  "Shooting Range", "Library", "Scav Case", "Illumination", "Booze Generator",
  "Bitcoin Farm", "Solar Power", "Air Filtering Unit"
];

export default function HideoutTab({ levels, setLevels }) {
  const [maxLevels, setMaxLevels] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    runQuery(`{ hideoutStations { name levels { level } } }`).then(data => {
      if (data) {
        const maxes = {};
        data.hideoutStations.forEach(s => {
          maxes[s.name] = s.levels.length;
        });
        setMaxLevels(maxes);
        setLoading(false);
      }
    });
  }, []);

  const changeLevel = (name, delta) => {
    const current = levels[name] || 0;
    const max = maxLevels[name] || 0;
    const newVal = Math.min(Math.max(current + delta, 0), max);
    
    setLevels(prev => ({ ...prev, [name]: newVal }));
  };

  if (loading) return <div>Loading Stations...</div>;

  return (
    <div className="tab-content">
      <div className="station-grid">
        {STATION_ORDER.map(name => (
          <div key={name} className="station-card">
            <span className="station-name">{name}</span>
            <div className="controls">
              <button onClick={() => changeLevel(name, -1)}>-</button>
              <span className="level-badge">Lvl {levels[name] || 0}</span>
              <button onClick={() => changeLevel(name, 1)}>+</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}