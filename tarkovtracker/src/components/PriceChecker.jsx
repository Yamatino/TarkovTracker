import React, { useState } from 'react';
import { runQuery } from '../api';

export default function PriceChecker() {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    // Get Index First
    const indexData = await runQuery(`{ items(name: "${term}", limit:5) { name } }`);
    
    if (indexData && indexData.items.length > 0) {
      // Sort by length match
      const exactName = indexData.items.sort((a,b) => a.name.length - b.name.length)[0].name;
      
      // Get Details
      const details = await runQuery(`
        query getDetails($n: String!) {
            items(name: $n) {
                name
                avg24hPrice
                sellFor { price currency vendor { name } }
                usedInTasks { name trader { name } }
            }
        }`, { n: exactName });
        
      setResults(details.items);
    } else {
      setResults([]);
    }
    setLoading(false);
  };

  return (
    <div className="tab-content">
      <form onSubmit={handleSearch} className="search-box">
        <input value={term} onChange={e => setTerm(e.target.value)} placeholder="Search item..." />
        <button type="submit">Search</button>
      </form>

      {loading && <div>Searching...</div>}

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
            <h3>{item.name}</h3>
            {item.usedInTasks.length > 0 ? (
                <div className="needed-alert">
                    [!] NEEDED FOR QUESTS:
                    <ul>
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