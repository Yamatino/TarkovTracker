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
    
    const currentMapId = selectedMap;
    const mapSearchId = selectedMap === 'factory4_day' ? 'factory' : selectedMap;

    const newBriefing = [];
    const mapActiveQuestIds = new Set(); 

    const processUser = (name, quests) => {
        const userTasks = [];
        globalData.tasks.forEach(task => {
            const mapId = task.map?.id?.toLowerCase();
            if (mapId === mapSearchId || mapId === currentMapId) {
                if (!quests.includes(task.id)) {
                    // PUSH OBJECT WITH OBJECTIVES
                    userTasks.push({
                        name: task.name,
                        objectives: task.objectives || []
                    });
                    mapActiveQuestIds.add(task.id);
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

    const relevantKeys = globalData.keys.filter(k => {
        const mapNameSimple = selectedMap.replace("4_day","").replace("groundzero", "ground zero");
        const isMapKey = k.name.toLowerCase().includes(mapNameSimple);
        const isQuestKey = k.questDetails?.some(q => mapActiveQuestIds.has(q.id));
        return isMapKey || isQuestKey;
    });

    const keyStatus = relevantKeys.map(k => {
        const owners = [];
        if (ownedKeys[k.id]) owners.push("You");
        squadMembers.forEach(m => {
            if (squadData[m.uid]?.keys?.[k.id]) owners.push(m.name);
        });

        const neededFor = k.questDetails?.find(q => mapActiveQuestIds.has(q.id));

        if (owners.length > 0 || neededFor) {
            return { 
                id: k.id, name: k.name, shortName: k.shortName, 
                owners, neededFor: neededFor ? neededFor.name : null 
            };
        }
        return null;
    }).filter(Boolean);

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
                              {/* RENDER OBJECTIVES */}
                              <ul style={{margin:0, paddingLeft:'20px', color:'#ddd'}}>
                                  {b.tasks.map((task, j) => (
                                      <li key={j} style={{marginBottom: '8px'}}>
                                          <div style={{fontWeight: 'bold'}}>{task.name}</div>
                                          {task.objectives.length > 0 && (
                                              <ul style={{fontSize: '0.9em', color: '#aaa', marginTop: '2px', paddingLeft: '15px'}}>
                                                  {task.objectives.map((obj, k) => (
                                                      <li key={k}>{obj.description}</li>
                                                  ))}
                                              </ul>
                                          )}
                                      </li>
                                  ))}
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