import React, { useState, useEffect } from 'react';
import { runQuery } from '../api';

// We use this repo for BOTH coordinates AND images to ensure they align perfectly
const TARKOV_DATA_BASE = "https://raw.githubusercontent.com/TarkovTracker/tarkovdata/master";

export default function MapsTab({ completedQuests }) {
  const [maps, setMaps] = useState([]);
  const [selectedMapId, setSelectedMapId] = useState("customs");
  const [questLocations, setQuestLocations] = useState({}); // Map of { mapId: [markers] }
  const [activeQuests, setActiveQuests] = useState([]); 
  const [visibleQuests, setVisibleQuests] = useState({}); 
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("Loading Map Data...");

  useEffect(() => {
    const init = async () => {
      try {
        setStatus("Fetching Map & Quest Data...");
        
        // 1. Fetch User's Active Quests (from Tarkov.dev API)
        const apiQuery = `
        {
          maps { id name }
          tasks { id name map { id } }
        }`;
        const apiData = await runQuery(apiQuery);
        
        // 2. Fetch Community Quest Coordinates (quests.json)
        const questsResp = await fetch(`${TARKOV_DATA_BASE}/quests.json`);
        const communityQuests = await questsResp.json();

        // 3. Process Markers
        const processedLocations = {};

        // We iterate through the community data because it has the coordinates
        communityQuests.forEach(cTask => {
            // Only process if it has objectives with coordinates
            if (cTask.objectives) {
                cTask.objectives.forEach(obj => {
                    if (obj.maps && obj.maps.length > 0) {
                        obj.maps.forEach(loc => {
                            // Normalize map ID (e.g., "WOODS" -> "woods")
                            const mapId = loc.id.toLowerCase(); 
                            
                            if (!processedLocations[mapId]) processedLocations[mapId] = [];
                            
                            processedLocations[mapId].push({
                                questId: String(cTask.id), // Ensure ID is string
                                questName: cTask.title,
                                x: loc.x, 
                                y: loc.y,
                                note: obj.tool || "Objective"
                            });
                        });
                    }
                });
            }
        });

        // 4. Set State
        setMaps(apiData.maps);
        setQuestLocations(processedLocations);
        setStatus("");
        setLoading(false);

      } catch (e) {
        console.error(e);
        setStatus("Error loading maps.");
      }
    };

    init();
  }, []);

  // Update Active Markers when Map or Completed list changes
  useEffect(() => {
    if (!maps.length) return;

    const markersOnMap = questLocations[selectedMapId] || [];
    
    // Filter: Must NOT be in completedQuests
    // Note: We try to match by ID. If IDs differ between API and Community data, 
    // we might need a Name fallback, but usually they share the MongoID.
    const relevantMarkers = markersOnMap.filter(m => 
        !completedQuests.includes(m.questId)
    );

    // Get unique quests for the sidebar list
    const uniqueQuests = [];
    const seenIds = new Set();
    
    relevantMarkers.forEach(m => {
        if (!seenIds.has(m.questId)) {
            uniqueQuests.push(m);
            seenIds.add(m.questId);
        }
    });

    setActiveQuests(uniqueQuests);

    // Reset visibility: all visible by default
    const vis = {};
    uniqueQuests.forEach(q => vis[q.questId] = true);
    setVisibleQuests(vis);

  }, [selectedMapId, completedQuests, questLocations]);

  const toggleQuest = (id) => {
    setVisibleQuests(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // --- CORRECT IMAGE URL ---
  // We use the map ID from the dropdown to fetch the PNG from the same repo
  // e.g. https://raw.githubusercontent.com/TarkovTracker/tarkovdata/master/maps/customs.png
  const mapImageUrl = `${TARKOV_DATA_BASE}/maps/${selectedMapId}.png`;

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
                {maps
                  .filter(m => ["customs","factory4_day","interchange","lighthouse","reserve","shoreline","streets","woods","groundzero"].includes(m.id))
                  .map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                ))}
            </select>
        </div>

        <div className="result-card" style={{flex: 1}}>
            <h3>Active Quests ({activeQuests.length})</h3>
            <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
                {activeQuests.length === 0 && <div style={{color:'#888', fontStyle:'italic'}}>No active quests with markers.</div>}
                
                {activeQuests.map(q => (
                    <label key={q.questId} style={{display:'flex', alignItems:'center', gap:'8px', cursor:'pointer', padding:'4px', borderRadius:'4px', background: visibleQuests[q.questId] ? 'rgba(255,255,255,0.05)' : 'transparent'}}>
                        <input 
                            type="checkbox" 
                            checked={!!visibleQuests[q.questId]} 
                            onChange={() => toggleQuest(q.questId)}
                        />
                        <span style={{fontSize:'0.9rem'}}>{q.questName}</span>
                    </label>
                ))}
            </div>
        </div>
      </div>

      {/* MAP VIEWER */}
      <div style={{flex: 1, background: '#151515', borderRadius: '8px', overflow: 'hidden', position: 'relative', border: '1px solid #333'}}>
        {loading ? (
            <div style={{padding:'40px', textAlign:'center'}}>{status}</div>
        ) : (
            <div style={{width: '100%', height: '100%', position: 'relative', overflow: 'auto'}}>
                {/* The Container needs relative positioning for absolute markers */}
                <div style={{position: 'relative', width: 'fit-content', minWidth: '100%'}}>
                    <img 
                        src={mapImageUrl} 
                        alt="Map" 
                        style={{display: 'block', maxWidth: '100%'}}
                        onError={(e) => {
                             e.target.style.display='none'; 
                             e.target.parentNode.innerHTML = '<div style="padding:20px;color:#aaa">Map image not found in community repo.</div>';
                        }}
                    />

                    {/* MARKERS */}
                    {(questLocations[selectedMapId] || []).map((m, i) => {
                        // Only show if valid, not completed, and toggle is ON
                        if (completedQuests.includes(m.questId)) return null;
                        if (!visibleQuests[m.questId]) return null;

                        return (
                            <div 
                                key={i}
                                className="map-marker quest"
                                style={{
                                    // TarkovData coordinates are usually X, Y pixels relative to the original image.
                                    // However, since we are scaling the image with `maxWidth: 100%`, 
                                    // we ideally need percentages. 
                                    // Fortunately, some TarkovData sets use 0-100 floats. 
                                    // If the dots are way off, we might need to switch to `left: m.x + 'px'` and remove `maxWidth: 100%` from image.
                                    left: m.x + 'px', 
                                    top: m.y + 'px'
                                }}
                            >
                                <div className="marker-dot quest-dot"></div>
                                <div className="marker-label">
                                    <strong>{m.questName}</strong>
                                    <br/>{m.note}
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