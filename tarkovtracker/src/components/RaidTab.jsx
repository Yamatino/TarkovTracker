import React, { useState, useEffect } from 'react';

const MAP_IDS = [
    "customs", "factory4_day", "interchange", "woods", "lighthouse", 
    "shoreline", "reserve", "streets", "groundzero", "laboratory"
];

export default function RaidTab({ globalData, itemProgress, completedQuests, squadMembers, squadData, ownedKeys }) {
  const [selectedMap, setSelectedMap] = useState("customs");
  const [briefing, setBriefing] = useState([]);
  const [keyCheck, setKeyCheck] = useState([]);

  useEffect(() => {
    if (!globalData) return;
    
    // 1. GENERATE BRIEFING
    const newBriefing = [];

    // Helper to process a user (You or Squadmate)
    const processUser = (name, quests, hideout) => {
        const userTasks = [];

        // Filter Global Tasks for this Map & User's Active Status
        globalData.tasks.forEach(task => {
            // Is it on this map?
            const mapId = task.map?.id?.toLowerCase();
            const isMapMatch = mapId === selectedMap || (selectedMap === 'factory4_day' && mapId === 'factory');
            
            if (isMapMatch) {
                // Is it active? (Not completed)
                if (!quests.includes(task.id)) {
                    // Check prerequisites (Optional: simplistic check if parent is done)
                    // For now, we just list all incomplete quests on this map
                    userTasks.push(task.name);
                }
            }
        });

        if (userTasks.length > 0) {
            newBriefing.push({ name, tasks: userTasks });
        }
    };

    // Process ME
    processUser("You", completedQuests, null);

    // Process SQUAD
    squadMembers.forEach(m => {
        const d = squadData[m.uid] || {};
        processUser(m.name, d.quests || [], null);
    });

    setBriefing(newBriefing);

    // 2. GENERATE KEY CHECKLIST
    // Find all keys in database that belong to this map
    const mapKeys = globalData.keys.filter(k => {
        // Basic string matching for map name in key name is simpler/safer than deep metadata sometimes
        const name = k.name.toLowerCase();
        return name.includes(selectedMap.replace("4_day","").replace("groundzero", "ground zero"));
    });

    const keyStatus = mapKeys.map(k => {
        const owners = [];
        if (ownedKeys[k.id]) owners.push("You");
        
        squadMembers.forEach(m => {
            if (squadData[m.uid]?.keys?.[k.id]) owners.push(m.name);
        });

        if (owners.length > 0) {
            return { name: k.name, shortName: k.shortName, owners };
        }
        return null;
    }).filter(Boolean); // Remove nulls (keys nobody has)

    setKeyCheck(keyStatus);

  }, [selectedMap, globalData, completedQuests, squadMembers, squadData, ownedKeys]);

  return (
    <div className="tab-content">
      {/* MAP SELECTOR */}
      <div className="result-card" style={{textAlign: 'center', marginBottom: '20px'}}>
          <h3 style={{marginTop:0}}>Select Raid Location</h3>
          <div style={{display:'flex', flexWrap:'wrap', gap:'10px', justifyContent:'center'}}>
              {MAP_IDS.map(id => (
                  <button 
                    key={id}
                    onClick={() => setSelectedMap(id)}
                    className={selectedMap === id ? "active" : ""}
                    style={{
                        padding: '10px 20px',
                        border: selectedMap === id ? '2px solid var(--accent-color)' : '1px solid #444',
                        background: selectedMap === id ? 'rgba(187, 134, 252, 0.1)' : '#222',
                        color: '#fff', cursor: 'pointer', textTransform: 'capitalize'
                    }}
                  >
                      {id.replace("4_day", "").replace("groundzero", "Ground Zero")}
                  </button>
              ))}
          </div>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
          
          {/* LEFT: MISSION BRIEFING */}
          <div className="result-card">
              <h3 style={{borderBottom:'1px solid #444', paddingBottom:'10px', marginTop:0}}>🎯 Mission Briefing</h3>
              {briefing.length === 0 ? (
                  <div style={{padding:'20px', color:'#666', fontStyle:'italic'}}>No active quests detected for this map.</div>
              ) : (
                  <div style={{display:'flex', flexDirection:'column', gap:'15px'}}>
                      {briefing.map((b, i) => (
                          <div key={i} style={{background: '#1a1a1a', padding:'10px', borderRadius:'6px'}}>
                              <div style={{fontWeight:'bold', color: b.name === 'You' ? 'var(--accent-color)' : '#90caf9', marginBottom:'5px'}}>
                                  {b.name}
                              </div>
                              <ul style={{margin:0, paddingLeft:'20px', color:'#ddd'}}>
                                  {b.tasks.map((t, j) => <li key={j}>{t}</li>)}
                              </ul>
                          </div>
                      ))}
                  </div>
              )}
          </div>

          {/* RIGHT: LOGISTICS (Keys) */}
          <div className="result-card">
              <h3 style={{borderBottom:'1px solid #444', paddingBottom:'10px', marginTop:0}}>🔑 Key Check</h3>
              {keyCheck.length === 0 ? (
                  <div style={{padding:'20px', color:'#666', fontStyle:'italic'}}>No keys owned for this map.</div>
              ) : (
                  <div style={{maxHeight:'500px', overflowY:'auto'}}>
                      {keyCheck.map((k, i) => (
                          <div key={i} style={{display:'flex', justifyContent:'space-between', padding:'8px', borderBottom:'1px solid #333'}}>
                              <div>
                                  <div style={{fontWeight:'bold', fontSize:'0.9rem'}}>{k.name}</div>
                                  <div style={{fontSize:'0.8rem', color:'#888'}}>{k.shortName}</div>
                              </div>
                              <div style={{textAlign:'right'}}>
                                  <span style={{
                                      background: '#1b5e20', color: '#a5d6a7', 
                                      padding: '2px 8px', borderRadius: '10px', fontSize: '0.8rem'
                                  }}>
                                      {k.owners.join(", ")}
                                  </span>
                              </div>
                          </div>
                      ))}
                  </div>
              )}
          </div>

      </div>
    </div>
  );
}