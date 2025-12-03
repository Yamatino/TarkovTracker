import React, { useState, useEffect } from 'react';
import { runQuery } from '../api';

// Bumped to v6 for fresh data
const CACHE_KEY = 'tarkov_static_data_v6';
const CACHE_DURATION = 24 * 60 * 60 * 1000; 

const SQUAD_ALERT_STYLE = {
    marginTop: '10px',
    padding: '10px',
    backgroundColor: 'rgba(33, 150, 243, 0.15)',
    border: '1px solid #2196f3',
    borderRadius: '4px',
    color: '#90caf9',
    fontSize: '0.9em'
};

const FIR_STYLE = { color: '#ffd700', fontWeight: 'bold', marginLeft: '5px' };

export default function PriceChecker({ itemProgress, hideoutLevels, completedQuests, squadMembers, squadData }) {
  const [term, setTerm] = useState("");
  
  // Static Index holds all ITEM data (but not prices)
  const [staticIndex, setStaticIndex] = useState([]); 
  
  // Live Prices holds just the roubles (fetched on demand)
  const [livePrices, setLivePrices] = useState({}); 
  
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Initializing...");

  // 1. LOAD & PROCESS STATIC DATA (Happens once on startup)
  useEffect(() => {
    const loadData = async () => {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < CACHE_DURATION) {
          setStaticIndex(parsed.data);
          setStatus("");
          return; 
        }
      }

      setStatus("Downloading Database...");
      
      const query = `
      {
        items { id name shortName iconLink types }
        tasks {
          id
          name
          trader { name }
          objectives {
            type
            ... on TaskObjectiveItem { count foundInRaid item { id } }
          }
        }
        hideoutStations {
            name
            levels {
                level
                itemRequirements { count item { id } }
            }
        }
      }`;

      const data = await runQuery(query);
      
      if (data) {
        const itemMap = {};

        // Initialize Items
        data.items.forEach(i => {
            itemMap[i.id] = { ...i, questDetails: [], hideoutDetails: [] };
        });

        // Process Quests (Aggregate objectives to avoid duplicates)
        data.tasks.forEach(task => {
            const taskItems = {}; 

            task.objectives.forEach(obj => {
                if (obj.item && itemMap[obj.item.id]) {
                    const iid = obj.item.id;
                    if (!taskItems[iid]) taskItems[iid] = { give:0, find:0, plant:0, fir:false };
                    
                    const c = obj.count || 1;
                    if (obj.type === 'giveItem') taskItems[iid].give += c;
                    if (obj.type === 'findItem') taskItems[iid].find += c;
                    if (obj.type === 'plantItem') taskItems[iid].plant += c;
                    if (obj.foundInRaid) taskItems[iid].fir = true;
                }
            });

            Object.keys(taskItems).forEach(iid => {
                const t = taskItems[iid];
                const finalCount = Math.max(t.give, t.find) + t.plant;

                if (finalCount > 0) {
                    itemMap[iid].questDetails.push({
                        id: task.id,
                        name: task.name,
                        trader: task.trader?.name || "?",
                        count: finalCount,
                        fir: t.fir
                    });
                }
            });
        });

        // Process Hideout
        data.hideoutStations.forEach(station => {
            station.levels.forEach(lvl => {
                lvl.itemRequirements.forEach(req => {
                    if (req.item && itemMap[req.item.id]) {
                        itemMap[req.item.id].hideoutDetails.push({
                            station: station.name,
                            level: lvl.level,
                            count: req.count
                        });
                    }
                });
            });
        });

        const processedList = Object.values(itemMap);
        localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data: processedList }));
        setStaticIndex(processedList);
        setStatus("");
      }
    };
    loadData();
  }, []);

  // 2. INSTANT SEARCH
  const handleSearch = (e) => {
    e.preventDefault();
    if (!term.trim()) return;
    const q = term.toLowerCase().trim();

    let matches = staticIndex.filter(i => 
        (i.name && i.name.toLowerCase().includes(q)) || 
        (i.shortName && i.shortName.toLowerCase().includes(q))
    );
    
    matches.sort((a, b) => {
        const aShort = a.shortName ? a.shortName.toLowerCase() : "";
        const bShort = b.shortName ? b.shortName.toLowerCase() : "";
        if (aShort === q && bShort !== q) return -1;
        if (bShort === q && aShort !== q) return 1;
        return a.name.length - b.name.length;
    });

    const topMatches = matches.slice(0, 10);
    setResults(topMatches);
    
    // Fetch live prices in background
    if (topMatches.length > 0) {
        fetchPrices(topMatches.map(m => m.id));
    }
  };

  // 3. FETCH PRICES
  const fetchPrices = async (ids) => {
    setLoading(true);
    const query = `
    query getPrices($ids: [ID!]!) {
        items(ids: $ids) {
            id
            avg24hPrice
            sellFor { price currency vendor { name } }
        }
    }`;

    const data = await runQuery(query, { ids });
    if (data && data.items) {
        const newPrices = {};
        data.items.forEach(i => {
            newPrices[i.id] = i;
        });
        setLivePrices(prev => ({ ...prev, ...newPrices }));
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
          disabled={staticIndex.length === 0}
          style={{flex: 1}}
        />
        <button type="submit" disabled={staticIndex.length === 0} style={{height: '38px', minWidth: '80px'}}>
            Search
        </button>
      </form>

      {status && <div style={{color: '#666', fontSize: '0.9em'}}>{status}</div>}

      <div className="results-grid">
        {results.map((item, idx) => {
            const userHas = itemProgress[item.id] || 0;
            
            // Filter Completed Quests
            let questNeeded = 0;
            const activeQuests = item.questDetails.filter(q => !completedQuests.includes(q.id));
            activeQuests.forEach(q => questNeeded += q.count);

            // Filter Built Hideout Stations
            let hideoutNeeded = 0;
            const activeHideout = item.hideoutDetails.filter(h => {
                const current = hideoutLevels[h.station] || 0;
                return current < h.level;
            });
            activeHideout.forEach(h => hideoutNeeded += h.count);

            const totalNeeded = questNeeded + hideoutNeeded;
            const isComplete = userHas >= totalNeeded && totalNeeded > 0;

            // Price Data (Live)
            const priceData = livePrices[item.id];
            let bestTrader = { name: "None", price: 0 };
            let finalFlea = 0;

            if (priceData) {
                priceData.sellFor.forEach(sale => {
                    if (sale.vendor.name === "Flea Market") {
                        finalFlea = sale.price;
                    } else if (sale.currency === "RUB") {
                        if (sale.price > bestTrader.price) {
                            bestTrader = { name: sale.vendor.name, price: sale.price };
                        }
                    }
                });
                if (finalFlea === 0) finalFlea = priceData.avg24hPrice || 0;
            }
            const profit = finalFlea - bestTrader.price;

            // Squad Logic
            const squadNeeds = [];
            if (squadMembers && squadMembers.length > 0) {
                squadMembers.forEach(member => {
                    const mData = squadData[member.uid] || {};
                    const mHas = mData.progress?.[item.id] || 0;
                    const mQuests = mData.quests || [];
                    const mHideout = mData.hideout || {};
                    
                    let mNeed = 0;
                    let mFir = false;

                    item.questDetails.forEach(q => {
                        if (!mQuests.includes(q.id)) {
                           mNeed += q.count;
                           if(q.fir) mFir = true;
                        }
                    });
                    item.hideoutDetails.forEach(h => {
                        if ((mHideout[h.station] || 0) < h.level) mNeed += h.count;
                    });

                    if (mNeed > mHas) {
                        squadNeeds.push({ name: member.name, missing: mNeed - mHas, fir: mFir });
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

                {totalNeeded > 0 ? (
                    <div className={isComplete ? "status-complete" : "needed-alert"}>
                        {isComplete ? (
                            <span>✅ COMPLETED ({userHas}/{totalNeeded})</span>
                        ) : (
                            <span>[!] NEEDED: {totalNeeded} (Have {userHas})</span>
                        )}
                        {!isComplete && (
                            <div style={{marginTop: '10px', fontSize: '0.9em'}}>
                                {activeQuests.length > 0 && (
                                    <div style={{marginBottom: '5px'}}>
                                        <div style={{fontWeight: 'bold', color: '#ffcc80'}}>Quests:</div>
                                        <ul style={{margin: '2px 0 0 20px', padding: 0, color: '#e0e0e0'}}>
                                            {activeQuests.map((q, i) => (
                                                <li key={i}>
                                                    {q.name} ({q.trader}): <span style={{fontWeight:'bold'}}>{q.count}</span>
                                                    {q.fir && <span style={FIR_STYLE}>(FIR)</span>}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {activeHideout.length > 0 && (
                                    <div>
                                        <div style={{fontWeight: 'bold', color: '#90caf9'}}>Hideout:</div>
                                        <ul style={{margin: '2px 0 0 20px', padding: 0, color: '#e0e0e0'}}>
                                            {activeHideout.map((h, i) => (
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

                {squadNeeds.length > 0 && (
                    <div style={SQUAD_ALERT_STYLE}>
                        <div style={{fontWeight:'bold', marginBottom:'5px'}}>Needed by Squad:</div>
                        {squadNeeds.map((s, i) => (
                            <div key={i}>
                                • {s.name} needs <b>{s.missing}</b>
                                {s.fir && <span style={FIR_STYLE}>(FIR)</span>}
                            </div>
                        ))}
                    </div>
                )}
                
                <div className="prices">
                    {priceData ? (
                        <>
                            <div className="trader-price">Trader: {bestTrader.name} <br/> <b>{bestTrader.price.toLocaleString()} ₽</b></div>
                            {finalFlea > 0 ? (
                                <div className="flea-price">
                                    Flea: ~{finalFlea.toLocaleString()} ₽
                                    <div className={profit > 0 ? "profit" : "loss"}>
                                        {profit > 0 ? `PROFIT: +${profit.toLocaleString()}` : "SELL TRADER"}
                                    </div>
                                </div>
                            ) : <div>Flea: N/A</div>}
                        </>
                    ) : (
                        <div style={{color: '#888', fontStyle:'italic'}}>Loading prices...</div>
                    )}
                </div>
            </div>
            );
        })}
      </div>
    </div>
  );
}