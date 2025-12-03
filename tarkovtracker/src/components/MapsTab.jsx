import React, { useState, useEffect } from 'react';
import { runQuery } from '../api';

const TARKOV_DATA_BASE = "https://raw.githubusercontent.com/TarkovTracker/tarkovdata/master";

export default function MapsTab({ completedQuests }) {
  const [maps, setMaps] = useState([]);
  const [selectedMapId, setSelectedMapId] = useState("customs");
  const [questLocations, setQuestLocations] = useState({}); 
  const [mapImages, setMapImages] = useState({}); 
  const [activeQuests, setActiveQuests] = useState([]); 
  const [visibleQuests, setVisibleQuests] = useState({}); 
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("Loading Map Data...");

  useEffect(() => {
    const init = async () => {
      try {
        setStatus("Fetching Community Data...");
        
        // 1. Fetch API Data (For Map Names)
        const apiQuery = `
        {
          maps { id name }
          tasks { id name map { id } }
        }`;
        const apiData = await runQuery(apiQuery);
        
        // 2. Fetch Community Data (Maps Config & Quests)
        const [mapsResp, questsResp] = await Promise.all([
            fetch(`${TARKOV_DATA_BASE}/maps.json`),
            fetch(`${TARKOV_DATA_BASE}/quests.json`)
        ]);

        const comMaps = await mapsResp.json();
        const comQuests = await questsResp.json();

        // 3. Link API Maps to Community Images
        const images = {};
        const validMapIds = [];
        
        // Helper: tarkov.dev ID -> tarkovdata Key
        const normalize = (id) => {
            if (id === 'factory4_day') return 'factory';
            return id.toLowerCase();
        };

        apiData.maps.forEach(m => {
            const key = normalize(m.id);
            // Find the matching key in maps.json (case-insensitive)
            const comKey = Object.keys(comMaps).find(k => k.toLowerCase() === key);
            
            if (comKey && comMaps[comKey].svg) {
                // Construct the URL for the SVG file
                images[m.id] = `${TARKOV_DATA_BASE}/maps/${comMaps[comKey].svg.file}`;
                validMapIds.push(m);
            }
        });

        // 4. Process Quest Markers
        const locations = {};
        comQuests.forEach(cTask => {
            if (cTask.objectives) {
                cTask.objectives.forEach(obj => {
                    if (obj.maps) {
                        obj.maps.forEach(loc => {
                            const mapId = normalize(loc.id);
                            if (!locations[mapId]) locations[mapId] = [];
                            
                            // Store absolute coordinates
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

        setMaps(validMapIds);
        setMapImages(images);
        setQuestLocations(locations);
        setStatus("");
        setLoading(false);

      } catch (e) {
        console.error(e);
        setStatus("Error loading map data.");
      }
    };

    init();
  }, []);

  // Update Active Markers based on selection
  useEffect(() => {
    if (!maps.length) return;

    let lookupId = selectedMapId;
    if (selectedMapId === 'factory4_day') lookupId = 'factory';

    const markers = questLocations[lookupId] || [];
    
    // Filter out completed quests
    const relevant = markers.filter(m => !completedQuests.includes(m.questId));
    
    // Get unique quests for the sidebar list
    const unique = [...new Map(relevant.map(m => [m.questId, m])).values()];
    
    setActiveQuests(unique);

    // Reset visibility: all visible by default
    const vis = {};
    unique.forEach(q => vis[q.questId] = true);
    setVisibleQuests(vis);

  }, [selectedMapId, completedQuests, questLocations]);

  const toggleQuest = (id) => {
    setVisibleQuests(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="tab-content" style={{display: 'flex', height: '80vh', gap: '20px'}}>
      
      {/* LEFT SIDEBAR */}
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
                    <label key={q.questId} style={{
                        display:'flex', alignItems:'center', gap:'10px', cursor:'pointer', 
                        padding:'6px', borderRadius:'4px', 
                        background: visibleQuests[q.questId] ? 'rgba(255, 215, 0, 0.1)' : 'transparent',
                        border: visibleQuests[q.questId] ? '1px solid rgba(255, 215, 0, 0.3)' : '1px solid transparent'
                    }}>
                        <input 
                            type="checkbox" 
                            checked={!!visibleQuests[q.questId]} 
                            onChange={() => toggleQuest(q.questId)}
                        />
                        <span style={{fontSize:'0.9rem', color: visibleQuests[q.questId] ? '#fff' : '#888'}}>{q.title}</span>
                    </label>
                ))}
            </div>
        </div>
      </div>

      {/* MAP VIEWER (Scrollable) */}
      <div style={{flex: 1, background: '#151515', borderRadius: '8px', overflow: 'hidden', border: '1px solid #333', position: 'relative'}}>
        {loading ? (
            <div style={{padding:'40px', textAlign:'center'}}>{status}</div>
        ) : (
            // We allow scrolling so the map displays at full native resolution
            // This ensures the X/Y coordinates (pixels) align perfectly
            <div style={{width: '100%', height: '100%', overflow: 'auto', position: 'relative'}}>
                <div style={{position: 'relative', width: 'fit-content'}}>
                    {/* MAP IMAGE */}
                    <img 
                        src={mapImages[selectedMapId]} 
                        alt={selectedMapId}
                        style={{display: 'block'}} 
                        onError={(e) => {
                             e.target.style.display='none'; 
                             e.target.parentNode.innerHTML += '<div style="padding:20px;color:#aaa">Map image could not be loaded.</div>';
                        }}
                    />

                    {/* MARKERS */}
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