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
    
    // 0. NORMALIZE MAP ID
    // API uses 'factory4_day', tasks often just say 'factory'
    const currentMapId = selectedMap;
    const mapSearchId = selectedMap === 'factory4_day' ? 'factory' : selectedMap;

    // 1. GENERATE BRIEFING & FIND ACTIVE QUESTS
    const newBriefing = [];
    const activeQuestIdsOnMap = new Set(); // Track IDs for key filtering later

    const processUser = (name, quests) => {
        const userTasks = [];
        
        globalData.tasks.forEach(task => {
            // Check if task is on this map
            const tMap = task.map?.id?.toLowerCase();
            if (tMap === mapSearchId || tMap === currentMapId) {
                // Check if completed
                if (!quests.includes(task.id)) {
                    userTasks.push(task.name);
                    activeQuestIdsOnMap.add(task.id);
                }
            }
        });

        if (userTasks.length > 0) {
            newBriefing.push({ name, tasks: userTasks });
        }
    };

    processUser("You", completedQuests);
    squadMembers.forEach(m => {
        const d = squadData[m.uid] || {};
        processUser(m.name, d.quests || []);
    });

    setBriefing(newBriefing);

    // 2. GENERATE KEY CHECKLIST
    // Logic: Show key if it is related to the Map OR an Active Quest on the map
    
    const relevantKeys = globalData.keys.filter(k => {
        // A. Name Match (Fallback)
        const mapNameSimple = selectedMap.replace("4_day","").replace("groundzero", "ground zero");
        if (k.name.toLowerCase().includes(mapNameSimple)) return true;

        // B. Quest Linkage (Smart Check)
        // Does this key belong to ANY quest that is on this map?
        // We use the 'questDetails' array we built in the Global Loader
        if (k.questDetails) {
            return k.questDetails.some(q => {
                // Check if the quest itself is on this map
                // We use the pre-stored mapId from the loader or look up the task
                if (q.mapId === mapSearchId || q.mapId === currentMapId) return true;
                
                // Fallback: Look up the global task object if mapId wasn't stored directly
                const taskRef = globalData.tasks.find(t => t.id === q.id);
                const taskMap = taskRef?.map?.id?.toLowerCase();
                return taskMap === mapSearchId || taskMap === currentMapId;
            });
        }
        return false;
    });

    const keyStatus = relevantKeys.map(k => {
        const owners = [];
        if (ownedKeys[k.id]) owners.push("You");
        
        squadMembers.forEach(m => {
            if (squadData[m.uid]?.keys?.[k.id]) owners.push(m.name);
        });

        // Check if it's needed for a SPECIFIC active quest (for highlighting)
        const neededFor = k.questDetails?.find(q => activeQuestIdsOnMap.has(q.id));

        // Display Rules:
        // 1. If it's needed for an active quest -> SHOW IT (Priority)
        // 2. If someone owns it -> SHOW IT (Inventory check)
        if (neededFor || owners.length > 0) {
            return { 
                id: k.id,
                name: k.name, 
                shortName: k.shortName, 
                owners, 
                neededFor: neededFor ? neededFor.name : null 
            };
        }
        return null;
    }).filter(Boolean);

    // Sort: Active Quest Keys first, then Owned Keys
    keyStatus.sort((a, b) => (b.neededFor ? 1 : 0) - (a.neededFor ? 1 : 0));

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

      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px'}}>
          
          {/* BRIEFING */}
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

          {/* KEY CHECK */}
          <div className="result-card">
              <h3 style={{borderBottom:'1px solid #444', paddingBottom:'10px', marginTop:0}}>🔑 Key Check</h3>
              {keyCheck.length === 0 ? (
                  <div style={{padding:'20px', color:'#666', fontStyle:'italic'}}>No important keys found for this map.</div>
              ) : (
                  <div style={{maxHeight:'500px', overflowY:'auto'}}>
                      {keyCheck.map((k, i) => (
                          <div key={i} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px', borderBottom:'1px solid #333'}}>
                              <div style={{flex:1}}>
                                  <div style={{fontWeight:'bold', fontSize:'0.9rem', color: k.neededFor ? '#ffcc80' : '#eee'}}>
                                      {k.name}
                                  </div>
                                  {k.neededFor && (
                                      <div style={{fontSize:'0.8rem', color:'#ef5350'}}>
                                          [!] Needed for: {k.neededFor}
                                      </div>
                                  )}
                              </div>
                              
                              <div style={{textAlign:'right', minWidth:'100px'}}>
                                  {k.owners.length > 0 ? (
                                      <span style={{
                                          background: '#1b5e20', color: '#a5d6a7', 
                                          padding: '2px 8px', borderRadius: '10px', fontSize: '0.8rem'
                                      }}>
                                          {k.owners.join(", ")}
                                      </span>
                                  ) : (
                                      <span style={{color:'#666', fontSize:'0.8rem', fontStyle:'italic'}}>
                                          Missing
                                      </span>
                                  )}
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