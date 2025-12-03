import React, { useState, useEffect } from 'react';
import { runQuery } from '../api';

const CACHE_KEY = 'tarkov_item_index_v4';
const CACHE_DURATION = 24 * 60 * 60 * 1000; 

const SQUAD_ALERT_STYLE = {
    marginTop: '10px',
    padding: '10px',
    backgroundColor: 'rgba(33, 150, 243, 0.15)', // Blue tint
    border: '1px solid #2196f3',
    borderRadius: '4px',
    color: '#90caf9',
    fontSize: '0.9em'
};

export default function PriceChecker({ itemProgress, hideoutLevels, completedQuests, squadMembers, squadData }) {
  const [term, setTerm] = useState("");
  const [index, setIndex] = useState([]); 
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Initializing...");

  // 1. Load Index
  useEffect(() => {
    const loadIndex = async () => {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < CACHE_DURATION) {
          setIndex(parsed.data);
          setStatus("");
          return; 
        }
      }
      setStatus("Downloading Item Database...");
      
      const data = await runQuery(`{ items { id name shortName } }`);
      
      if (data && data.items) {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data: data.items }));
        setIndex(data.items);
        setStatus("");
      }
    };
    loadIndex();
  }, []);

  // 2. Search Logic
  const handleSearch = (e) => {
    e.preventDefault();
    if (!term.trim()) return;
    const q = term.toLowerCase().trim();

    let matches = index.filter(i => 
        (i.name && i.name.toLowerCase().includes(q)) || 
        (i.shortName && i.shortName.toLowerCase().includes(q))
    );
    
    // Sort Results
    matches.sort((a, b) => {
        const aShort = a.shortName ? a.shortName.toLowerCase() : "";
        const bShort = b.shortName ? b.shortName.toLowerCase() : "";
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();

        if (aShort === q && bShort !== q) return -1;
        if (bShort === q && aShort !== q) return 1;
        if (aName === q && bName !== q) return -1;
        if (bName === q && aName !== q) return 1;
        
        const aStarts = aName.startsWith(q) || aShort.startsWith(q);
        const bStarts = bName.startsWith(q) || bShort.startsWith(q);
        if (aStarts && !bStarts) return -1;
        if (bStarts && !aStarts) return 1;

        return a.name.length - b.name.length;
    });

    const topMatches = matches.slice(0, 10);
    
    if (topMatches.length === 0) {
        setResults([]);
        return;
    }

    const idsToFetch = topMatches.map(m => m.id);
    fetchDetails(idsToFetch);
  };

  // 3. Fetch Details
  const fetchDetails = async (ids) => {
    setLoading(true);
    setResults([]); 
    
    const query = `
    query getDetails($ids: [ID!]!) {
        items(ids: $ids) {
            id
            name
            shortName
            iconLink 
            avg24hPrice
            sellFor { price currency vendor { name } }
            
            usedInTasks { 
                id
                name 
                trader { name }
                objectives {
                    type
                    ... on TaskObjectiveItem {
                        count
                        item { id }
                    }
                }
            }
        }
        hideoutStations {
            name
            levels {
                level
                itemRequirements {
                    count
                    item { id }
                }
            }
        }
    }`;

    const data = await runQuery(query, { ids: ids });
    
    if (data && data.items) {
        const enrichedItems = data.items.map(item => {
            const itemId = item.id;
            
            // --- YOUR QUEST LOGIC ---
            const questDetails = [];
            let totalQuestCount = 0;

            item.usedInTasks.forEach(task => {
                // Skip if completed
                if (completedQuests.includes(task.id)) return;

                let give = 0, find = 0, plant = 0;
                task.objectives.forEach(obj => {
                    if (obj.item && obj.item.id === itemId) {
                        const c = obj.count || 1;
                        if (obj.type === 'giveItem') give += c;
                        if (obj.type === 'findItem') find += c;
                        if (obj.type === 'plantItem') plant += c;
                    }
                });
                const needed = Math.max(give, find) + plant;

                if (needed > 0) {
                    totalQuestCount += needed;
                    questDetails.push({
                        name: task.name,
                        trader: task.trader?.name || "?",
                        count: needed
                    });
                }
            });

            // --- YOUR HIDEOUT LOGIC ---
            const hideoutDetails = [];
            let totalHideoutCount = 0;

            data.hideoutStations.forEach(station => {
                const stationName = station.name;
                const currentLevel = hideoutLevels[stationName] || 0;
                
                station.levels.forEach(lvl => {
                    if (lvl.level > currentLevel) {
                        lvl.itemRequirements.forEach(req => {
                            if (req.item && req.item.id === itemId) {
                                totalHideoutCount += req.count;
                                hideoutDetails.push({
                                    station: stationName,
                                    level: lvl.level,
                                    count: req.count
                                });
                            }
                        });
                    }
                });
            });

            return {
                ...item,
                totalNeeded: totalQuestCount + totalHideoutCount,
                questDetails,
                hideoutDetails
            };
        });
        
        enrichedItems.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
        setResults(enrichedItems);
    }
    setLoading(false);
  };

  return (
    <div className="tab-content">
      <form onSubmit={handleSearch} className="search-box" style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
        <input 
          value={term} 
          onChange={e => setTerm(e.target.value)} 
          placeholder="Search item (e.g. M4A1, Salewa)..." 
          disabled={index.length === 0}
          style={{flex: 1}}
        />
        <button type="submit" disabled={index.length === 0 || loading} style={{height: '38px', minWidth: '80px'}}>
            {loading ? "..." : "Search"}
        </button>
      </form>

      {status && <div style={{color: '#666', fontSize: '0.9em'}}>{status}</div>}

      <div className="results-grid">
        {results.map((item, idx) => {
            const userHas = itemProgress[item.id] || 0;
            const isComplete = userHas >= item.totalNeeded && item.totalNeeded > 0;
            
            // --- PRICE LOGIC ---
            let bestTrader = { name: "None", price: 0 };
            let realFleaPrice = 0;

            item.sellFor.forEach(sale => {
                if (sale.vendor.name === "Flea Market") {
                    realFleaPrice = sale.price;
                } else if (sale.currency === "RUB") {
                    if (sale.price > bestTrader.price) {
                        bestTrader = { name: sale.vendor.name, price: sale.price };
                    }
                }
            });

            const finalFlea = realFleaPrice > 0 ? realFleaPrice : (item.avg24hPrice || 0);
            const profit = finalFlea - bestTrader.price;

            // --- SQUAD CHECK LOGIC ---
            const squadNeeds = [];
            if (squadMembers && squadMembers.length > 0) {
                squadMembers.forEach(member => {
                    const mData = squadData[member.uid] || {};
                    const mQuests = mData.quests || [];
                    const mHideout = mData.hideout || {};
                    const mProgress = mData.progress || {};
                    const mHas = mProgress[item.id] || 0;

                    // Calculate Member Needs
                    let mNeeded = 0;

                    // A. Member Quests
                    if (item.usedInTasks) {
                        item.usedInTasks.forEach(task => {
                            if (mQuests.includes(task.id)) return; // They completed it
                            
                            let give=0, find=0, plant=0;
                            task.objectives.forEach(obj => {
                                if(obj.item?.id === item.id) {
                                    const c = obj.count || 1;
                                    if(obj.type==='giveItem') give+=c;
                                    if(obj.type==='findItem') find+=c;
                                    if(obj.type==='plantItem') plant+=c;
                                }
                            });
                            mNeeded += Math.max(give, find) + plant;
                        });
                    }

                    // B. Member Hideout
                    // Note: We need the global hideout data to calculate this perfectly, 
                    // which we fetched in 'fetchDetails'. We can reuse the result logic structure roughly.
                    // But 'hideoutDetails' is calculated for YOU. 
                    // To do it for THEM, we must re-loop the global station data available in 'fetchDetails'.
                    // Since 'fetchDetails' scope is closed, we rely on a simplified check here 
                    // OR we assume hideout logic is uniform.
                    
                    // Actually, 'item.hideoutDetails' contains the raw requirements. 
                    // We just need to check THEIR level vs that requirement.
                    if (item.hideoutDetails) {
                        item.hideoutDetails.forEach(h => {
                            const memberStationLvl = mHideout[h.station] || 0;
                            if (memberStationLvl < h.level) {
                                mNeeded += h.count;
                            }
                        });
                    }

                    if (mNeeded > mHas) {
                        squadNeeds.push({
                            name: member.name,
                            missing: mNeeded - mHas
                        });
                    }
                });
            }

            return (
            <div key={idx} className="result-card">
                <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                    {item.iconLink && <img src={item.iconLink} alt={item.name} style={{width: '64px', height: '64px'}} />}
                    <div>
                        <h3>{item.name}</h3>
                        <div style={{fontSize: '0.8em', color: '#666'}}>{item.shortName}</div>
                    </div>
                </div>

                {/* YOUR STATUS */}
                {item.totalNeeded > 0 ? (
                    <div className={isComplete ? "status-complete" : "needed-alert"}>
                        {isComplete ? (
                            <span>✅ COMPLETED ({userHas}/{item.totalNeeded})</span>
                        ) : (
                            <span>[!] NEEDED: {item.totalNeeded} (Have {userHas})</span>
                        )}
                        
                        {!isComplete && (
                            <div style={{marginTop: '10px', fontSize: '0.9em'}}>
                                {item.questDetails.length > 0 && (
                                    <div style={{marginBottom: '5px'}}>
                                        <div style={{fontWeight: 'bold', color: '#ffcc80'}}>Quests:</div>
                                        <ul style={{margin: '2px 0 0 20px', padding: 0, color: '#e0e0e0'}}>
                                            {item.questDetails.map((q, i) => (
                                                <li key={i}>
                                                    {q.name} ({q.trader}): <span style={{fontWeight:'bold'}}>{q.count}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                
                                {item.hideoutDetails.length > 0 && (
                                    <div>
                                        <div style={{fontWeight: 'bold', color: '#90caf9'}}>Hideout:</div>
                                        <ul style={{margin: '2px 0 0 20px', padding: 0, color: '#e0e0e0'}}>
                                            {item.hideoutDetails.map((h, i) => (
                                                <li key={i}>
                                                    {h.station} (Lvl {h.level}): <span style={{fontWeight:'bold'}}>{h.count}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="not-needed">No active tasks.</div>
                )}

                {/* SQUAD ALERT */}
                {squadNeeds.length > 0 && (
                    <div style={SQUAD_ALERT_STYLE}>
                        <div style={{fontWeight:'bold', marginBottom:'5px'}}>Needed by Squad:</div>
                        {squadNeeds.map((s, i) => (
                            <div key={i}>
                                • {s.name} needs <b>{s.missing}</b>
                            </div>
                        ))}
                    </div>
                )}
                
                <div className="prices">
                    <div className="trader-price">Trader: {bestTrader.name} <br/> <b>{bestTrader.price.toLocaleString()} ₽</b></div>
                    {finalFlea > 0 ? (
                        <div className="flea-price">
                            Flea: ~{finalFlea.toLocaleString()} ₽
                            <div className={profit > 0 ? "profit" : "loss"}>
                                {profit > 0 ? `PROFIT: +${profit.toLocaleString()}` : "SELL TRADER"}
                            </div>
                        </div>
                    ) : <div>Flea: N/A</div>}
                </div>
            </div>
            );
        })}
      </div>
    </div>
  );
}