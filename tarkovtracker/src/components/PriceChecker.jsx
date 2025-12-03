import React, { useState, useEffect } from 'react';
import { runQuery } from '../api';

const CACHE_KEY = 'tarkov_item_index';
const CACHE_DURATION = 24 * 60 * 60 * 1000; 

export default function PriceChecker() {
  const [term, setTerm] = useState("");
  const [index, setIndex] = useState([]); 
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Initializing...");

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
      const data = await runQuery(`{ items { id name } }`);
      if (data && data.items) {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data: data.items }));
        setIndex(data.items);
        setStatus("");
      }
    };
    loadIndex();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!term.trim()) return;
    const lowerTerm = term.toLowerCase();
    const matches = index.filter(i => i.name.toLowerCase().includes(lowerTerm));
    matches.sort((a, b) => a.name.length - b.name.length);
    const topMatches = matches.slice(0, 5);
    
    if (topMatches.length === 0) {
        setResults([]);
        alert("No item found.");
        return;
    }
    fetchDetails(topMatches[0].name);
  };

  const fetchDetails = async (exactName) => {
    setLoading(true);
    setResults([]); 
    
    // ADDED: iconLink to the query
    const query = `
    query getDetails($n: String!) {
        items(name: $n) {
            name
            iconLink 
            avg24hPrice
            sellFor { price currency vendor { name } }
            usedInTasks { name trader { name } }
        }
    }`;

    const data = await runQuery(query, { n: exactName });
    if (data && data.items) {
        setResults(data.items);
    }
    setLoading(false);
  };

  return (
    <div className="tab-content">
      <form onSubmit={handleSearch} className="search-box">
        <input 
          value={term} 
          onChange={e => setTerm(e.target.value)} 
          placeholder="Search item (e.g. Salewa)..." 
          disabled={index.length === 0}
        />
        <button type="submit" disabled={index.length === 0 || loading}>
            {loading ? "..." : "Search"}
        </button>
      </form>
      {status && <div style={{color: '#666', fontSize: '0.9em'}}>{status}</div>}

      {results.map((item, idx) => {
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
                {/* ADDED: Image Display */}
                {item.iconLink && <img src={item.iconLink} alt={item.name} style={{width: '64px', height: '64px'}} />}
                <h3>{item.name}</h3>
            </div>

            {item.usedInTasks.length > 0 ? (
                <div className="needed-alert">
                    [!] NEEDED FOR QUESTS:
                    <ul style={{marginTop: '5px', marginBottom: '5px'}}>
                        {item.usedInTasks.map(t => (
                            <li key={t.name}>{t.name} ({t.trader?.name})</li>
                        ))}
                    </ul>
                </div>
            ) : <div className="not-needed">No active quests.</div>}
            
            <div className="prices">
                <div className="trader-price">Trader: {bestTrader.name} @ {bestTrader.price.toLocaleString()} ₽</div>
                {flea > 0 ? (
                    <div className="flea-price">
                        Flea: ~{flea.toLocaleString()} ₽
                        <div className={profit > 0 ? "profit" : "loss"}>
                            {profit > 0 ? `PROFIT: +${profit.toLocaleString()}` : "SELL TO TRADER"}
                        </div>
                    </div>
                ) : <div>Flea: N/A</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}