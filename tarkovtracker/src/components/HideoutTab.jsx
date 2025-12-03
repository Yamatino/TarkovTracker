import React, { useEffect, useState } from 'react';
import { runQuery } from '../api';

// We keep this list ONLY for sorting purposes (to keep Vents/Security at the top)
// Any station NOT in this list will still appear, just at the bottom.
const PREFERRED_ORDER = [
  "Vents", "Security", "Lavatory", "Stash", "Generator", "Heating",
  "Rest Space", "Workbench", "Medstation", "Nutrition Unit", "Water Collector",
  "Shooting Range", "Library", "Scav Case", "Intelligence Center", 
  "Illumination", "Booze Generator", "Bitcoin Farm", "Solar Power", 
  "Air Filtering Unit", "Defective Wall", "Gym"
];

export default function HideoutTab({ levels, setLevels }) {
  const [stations, setStations] = useState([]); // Store the full station objects
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const query = `
    { 
      hideoutStations { 
        name 
        imageLink 
        levels { level } 
      } 
    }`;

    runQuery(query).then(data => {
      if (data) {
        let fetchedStations = data.hideoutStations;
        
        // Sort the stations: Preferred ones first, others alphabetically at the end
        fetchedStations.sort((a, b) => {
            const indexA = PREFERRED_ORDER.indexOf(a.name);
            const indexB = PREFERRED_ORDER.indexOf(b.name);
            
            // If both are in our list, sort by list order
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            
            // If only A is in list, A comes first
            if (indexA !== -1) return -1;
            
            // If only B is in list, B comes first
            if (indexB !== -1) return 1;
            
            // If neither is in list, sort alphabetically
            return a.name.localeCompare(b.name);
        });

        setStations(fetchedStations);
        setLoading(false);
      }
    });
  }, []);

  const changeLevel = (name, delta, max) => {
    const current = levels[name] || 0;
    const newVal = Math.min(Math.max(current + delta, 0), max);
    setLevels(prev => ({ ...prev, [name]: newVal }));
  };

  if (loading) return <div style={{padding:'20px'}}>Loading Stations...</div>;

  return (
    <div className="tab-content">
      <h3 className="section-title">Hideout Management</h3>
      <div className="station-grid">
        {stations.map(station => {
            const name = station.name;
            const currentLvl = levels[name] || 0;
            const maxLvl = station.levels.length; // Calculate max dynamically from API data
            
            return (
              <div key={name} className="station-card">
                <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                    {station.imageLink ? (
                        <img 
                            src={station.imageLink} 
                            alt={name} 
                            style={{width: '50px', height: '50px', objectFit: 'contain'}} 
                        />
                    ) : (
                        // Fallback gray box if image is missing
                        <div style={{width:'50px', height:'50px', background:'#333', borderRadius:'4px'}}></div>
                    )}
                    <span className="station-name" style={{fontWeight: 'bold'}}>{name}</span>
                </div>
                
                <div className="controls" style={{display: 'flex', alignItems: 'center'}}>
                  <button 
                    className="btn-mini" 
                    onClick={() => changeLevel(name, -1, maxLvl)}
                    disabled={currentLvl === 0}
                  >-</button>
                  
                  <span className="level-badge" style={{margin: '0 10px', minWidth: '60px', textAlign:'center'}}>
                    Lvl {currentLvl} <span style={{color: '#555', fontSize: '0.8em'}}>/ {maxLvl}</span>
                  </span>
                  
                  <button 
                    className="btn-mini" 
                    onClick={() => changeLevel(name, 1, maxLvl)}
                    disabled={currentLvl >= maxLvl}
                  >+</button>
                </div>
              </div>
            );
        })}
      </div>
    </div>
  );
}