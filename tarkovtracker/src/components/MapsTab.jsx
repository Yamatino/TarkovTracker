import React, { useState, useEffect } from 'react';
import { runQuery } from '../api';

const TARKOV_DATA_BASE = "https://raw.githubusercontent.com/TarkovTracker/tarkovdata/master";

// MAPPING: API ID -> Image Filename Part
const MAP_IMAGE_OVERRIDES = {
    "customs": "customs",
    "factory4_day": "factory", // Fixes the broken factory image
    "interchange": "interchange",
    "woods": "woods",
    "lighthouse": "lighthouse",
    "shoreline": "shoreline",
    "reserve": "reserve",
    "streets": "streets",
    "groundzero": "groundzero",
    "laboratory": "laboratory"
};

export default function MapsTab({ completedQuests }) {
  const [maps, setMaps] = useState([]);
  const [selectedMapId, setSelectedMapId] = useState("customs");
  const [questLocations, setQuestLocations] = useState({}); 
  const [activeQuests, setActiveQuests] = useState([]); 
  const [visibleQuests, setVisibleQuests] = useState({}); 
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("Loading Map Data...");

  useEffect(() => {
    const init = async () => {
      try {
        setStatus("Fetching Map & Quest Data...");
        
        // 1. Fetch API Data
        const apiQuery = `
        {
          maps { id name }
          tasks { id name map { id } }
        }`;
        const apiData = await runQuery(apiQuery);
        
        // 2. Fetch Community Quest Coordinates
        const questsResp = await fetch(`${TARKOV_DATA_BASE}/quests.json`);
        const comQuests = await questsResp.json();

        // 3. Process Quest Markers
        const locations = {};
        comQuests.forEach(cTask => {
            if (cTask.objectives) {
                cTask.objectives.forEach(obj => {
                    if (obj.maps) {
                        obj.maps.forEach(loc => {
                            let mapId = loc.id.toLowerCase();
                            if (mapId === 'factory') mapId = 'factory4_day'; 
                            
                            if (!locations[mapId]) locations[mapId] = [];
                            
                            locations[mapId].push({
                                questId: String(cTask.id),
                                title: cTask.title,
                                x: loc.x, 
                                y: loc.y,
                                note: obj.tool || "Objective"
                            });
                        });
                    }
                });
            }
        });

        // Filter to only show maps we have images for
        const validMaps = apiData.maps.filter(m => MAP_IMAGE_OVERRIDES[m.id]);

        setMaps(validMaps);
        setQuestLocations(locations);
        setStatus("");
        setLoading(false);

      } catch (e) {
        console.error(e);
        setStatus("Error loading maps.");
      }
    };

    init();
  }, []);

  // Update Active Markers
  useEffect(() => {
    if (!maps.length) return;

    // Handle map ID aliases for data lookup
    let lookupId = selectedMapId;
    if (selectedMapId === 'factory4_day') lookupId = 'factory';

    const markers = questLocations[lookupId] || [];
    const relevant = markers.filter(m => !completedQuests.includes(m.questId));
    
    const unique = [...new Map(relevant.map(m => [m.questId, m])).values()];
    
    setActiveQuests(unique);

    const vis = {};
    unique.forEach(q => vis[q.questId] = true);
    setVisibleQuests(vis);

  }, [selectedMapId, completedQuests, questLocations]);

  const toggleQuest = (id) => {
    setVisibleQuests(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // --- ROBUST IMAGE URL ---
  const imageName = MAP_IMAGE_OVERRIDES[selectedMapId] || selectedMapId;
  const mapImageUrl = `https://assets.tarkov.dev/maps/${imageName}-2d.png`;

  return (
    <div className="tab-content" style={{display: 'flex', height: '80vh', gap: '20px'}}>
      
      {/* SIDEBAR */}
      <div style={{width: '280px', display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto'}}>
        <div className="result-card">
            <h3>Select Map</h3>
            <select 
                value={selectedMapId} 
                onChange={(e) => setSelectedMapId(e.target.value)}
                style={{width: '100%', padding:'8px', background:'#222', color:'#fff', border:'1px solid #444'}}
            >
                {maps.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                ))}
            </select>
        </div>

        <div className="result-card" style={{flex: 1}}>
            <h3>Active Quests ({activeQuests.length})</h3>
            <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
                {activeQuests.length === 0 && <div style={{color:'#888', fontStyle:'italic'}}>No active quests with markers.</div>}
                
                {activeQuests.map(q => (
                    <label key={q.questId} style={{display:'flex', alignItems:'center', gap:'10px', cursor:'pointer', padding:'5px', borderRadius:'4px', background: visibleQuests[q.questId] ? 'rgba(255,255,255,0.05)' : 'transparent'}}>
                        <input 
                            type="checkbox" 
                            checked={!!visibleQuests[q.questId]} 
                            onChange={() => toggleQuest(q.questId)}
                        />
                        <span style={{fontSize:'0.9rem'}}>{q.title}</span>
                    </label>
                ))}
            </div>
        </div>
      </div>

      {/* MAP VIEWER */}
      <div style={{flex: 1, background: '#151515', borderRadius: '8px', overflow: 'hidden', border: '1px solid #333', position: 'relative'}}>
        {loading ? (
            <div style={{padding:'40px', textAlign:'center'}}>{status}</div>
        ) : (
            <div style={{width: '100%', height: '100%', overflow: 'auto', position: 'relative'}}>
                <div style={{position: 'relative', width: 'fit-content'}}>
                    <img 
                        src={mapImageUrl} 
                        alt="Map" 
                        style={{display: 'block'}} 
                        onError={(e) => {
                             e.target.style.display='none'; 
                             // Fallback message if even the official image fails
                             e.target.parentNode.innerHTML += '<div style="padding:20px;color:#aaa">Map image load failed.</div>';
                        }}
                    />

                    {(questLocations[selectedMapId === 'factory4_day' ? 'factory' : selectedMapId] || []).map((m, i) => {
                        if (completedQuests.includes(m.questId)) return null;
                        if (!visibleQuests[m.questId]) return null;

                        return (
                            <div 
                                key={i}
                                className="map-marker quest"
                                style={{
                                    left: `${m.x}px`, 
                                    top: `${m.y}px`
                                }}
                            >
                                <div className="marker-dot quest-dot"></div>
                                <div className="marker-label">
                                    <strong>{m.title}</strong>
                                    <br/>
                                    <span style={{fontSize:'0.8em', color:'#ccc'}}>{m.note}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        )}
      </div>
    </div>
  );
}