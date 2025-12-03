import React, { useState, useEffect } from 'react';
import { runQuery } from '../api';

// Changed key to force re-download of index since we are adding 'shortName'
const CACHE_KEY = 'tarkov_item_index_v2';
const CACHE_DURATION = 24 * 60 * 60 * 1000; 

export default function PriceChecker({ itemProgress, hideoutLevels }) {
  const [term, setTerm] = useState("");
  const [index, setIndex] = useState([]); 
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Initializing...");

  // 1. Load Index (Now includes shortName)
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
      // We fetch shortName too now!
      const data = await runQuery(`{ items { id name shortName } }`);
      if (data && data.items) {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data: data.items }));
        setIndex(data.items);
        setStatus("");
      }
    };
    loadIndex();
  }, []);

  // 2. Search Logic (Smart Sorting & Multiple Results)
  const handleSearch = (e) => {
    e.preventDefault();
    if (!term.trim()) return;
    const q = term.toLowerCase().trim();

    // Filter
    const matches = index.filter(i => 
        (i.name && i.name.toLowerCase().includes(q)) || 
        (i.shortName && i.shortName.toLowerCase().includes(q))
    );
    
    // Sort Priority:
    // 1. Exact ShortName match (e.g. "M4A1" -> Gun)
    // 2. Exact Name match
    // 3. Starts with ShortName
    // 4. Starts with Name
    // 5. Shortest Name length
    matches.sort((a, b) => {
        const aShort = a.shortName ? a.shortName.toLowerCase() : "";
        const bShort = b.shortName ? b.shortName.toLowerCase() : "";
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();

        // Priority 1: Exact Short Name Match
        if (aShort === q && bShort !== q) return -1;
        if (bShort === q && aShort !== q) return 1;

        // Priority 2: Exact Name Match
        if (aName === q && bName !== q) return -1;
        if (bName === q && aName !== q) return 1;

        // Priority 3: Starts with Query
        const aStarts = aName.startsWith(q) || aShort.startsWith(q);
        const bStarts = bName.startsWith(q) || bShort.startsWith(q);
        if (aStarts && !bStarts) return -1;
        if (bStarts && !aStarts) return 1;

        // Priority 4: Shortest Name (Fallback)
        return a.name.length - b.name.length;
    });

    // Take top 10 results
    const topMatches = matches.slice(0, 10);
    
    if (topMatches.length === 0) {
        setResults([]);
        alert("No item found.");
        return;
    }

    // Extract IDs to fetch details for ALL of them
    const idsToFetch = topMatches.map(m => m.id);
    fetchDetails(idsToFetch);
  };

  const fetchDetails = async (ids) => {
    setLoading(true);
    setResults([]); 
    
    // Query by IDs instead of single name
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
        // Enriched Data Logic (Same as before, just processing the list)
        const enrichedItems = data.items.map(item => {
            const itemId = item.id;
            
            let questNeeded = 0;
            item.usedInTasks.forEach(task => {
                let give = 0, find = 0, plant = 0;
                task.objectives.forEach(obj => {
                    if (obj.item && obj.item.id === itemId) {
                        const count = obj.count || 1;
                        if (obj.type === 'giveItem') give += count;
                        if (obj.type === 'findItem') find += count;
                        if (obj.type === 'plantItem') plant += count;
                    }
                });
                questNeeded += Math.max(give, find) + plant;
            });

            let hideoutNeeded = 0;
            data.hideoutStations.forEach(station => {
                const stationName = station.name;
                const currentLevel = hideoutLevels[stationName] || 0;
                
                station.levels.forEach(lvl => {
                    if (lvl.level > currentLevel) {
                        lvl.itemRequirements.forEach(req => {
                            if (req.item && req.item.id === itemId) {
                                hideoutNeeded += req.count;
                            }
                        });
                    }
                });
            });

            return {
                ...item,
                totalNeeded: questNeeded + hideoutNeeded,
                questNeeded,
                hideoutNeeded
            };
        });
        
        // Re-sort enriched items to match our smart sort order (API might return random order)
        // We use the 'ids' array order which was already sorted
        enrichedItems.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));

        setResults(enrichedItems);
    }
    setLoading(false);
  };

  return (
    <div className="tab-content">
      <form onSubmit={handleSearch} className="search-box">
        <input 
          value={term} 
          onChange={e => setTerm(e.target.value)} 
          placeholder="Search item (e.g. M4A1, Salewa)..." 
          disabled={index.length === 0}
        />
        <button type="submit" disabled={index.length === 0 || loading}>
            {loading ? "..." : "Search"}
        </button>
      </form>
      {status && <div style={{color: '#666', fontSize: '0.9em'}}>{status}</div>}

      <div className="results-grid">
        {results.map((item, idx) => {
            const userHas = itemProgress[item.id] || 0;
            const isComplete = userHas >= item.totalNeeded && item.totalNeeded > 0;
            
            let bestTrader = { name: "None", price: 0 };
            item.sellFor.forEach(sale => {
                if (sale.vendor.name !== "Flea Market" && sale.currency === "RUB") {
                    if (sale.price > bestTrader.price) bestTrader = { name: sale.vendor.name, price: sale.price };
                }
            });
            const flea = item.avg24hPrice || 0;
            const profit = flea - bestTrader.price;

            return (
            <div key={idx} className="result-card">
                <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                    {item.iconLink && <img src={item.iconLink} alt={item.name} style={{width: '64px', height: '64px'}} />}
                    <div>
                        <h3>{item.name}</h3>
                        {/* Show shortName for clarity */}
                        <div style={{fontSize: '0.8em', color: '#666'}}>{item.shortName}</div>
                    </div>
                </div>

                {item.totalNeeded > 0 ? (
                    <div className={isComplete ? "status-complete" : "needed-alert"}>
                        {isComplete ? (
                            <span>✅ COMPLETED ({userHas}/{item.totalNeeded})</span>
                        ) : (
                            <span>[!] NEEDED: {item.totalNeeded} (Have {userHas})</span>
                        )}
                        {!isComplete && (
                            <ul style={{marginTop: '5px', marginBottom: '5px', fontSize: '0.9em'}}>
                                {item.questNeeded > 0 && <li>Quests: {item.questNeeded}</li>}
                                {item.hideoutNeeded > 0 && <li>Hideout: {item.hideoutNeeded}</li>}
                            </ul>
                        )}
                    </div>
                ) : (
                    <div className="not-needed">No active tasks.</div>
                )}
                
                <div className="prices">
                    <div className="trader-price">Trader: {bestTrader.name} <br/> <b>{bestTrader.price.toLocaleString()} ₽</b></div>
                    {flea > 0 ? (
                        <div className="flea-price">
                            Flea: ~{flea.toLocaleString()} ₽
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