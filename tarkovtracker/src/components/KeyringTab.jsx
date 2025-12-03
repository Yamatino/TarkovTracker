import React, { useState, useEffect } from 'react';
import { runQuery } from '../api';

// Cached index for keys specifically
const KEYS_CACHE_KEY = 'tarkov_keys_index';

export default function KeyringTab({ ownedKeys, setOwnedKeys }) {
  const [keys, setKeys] = useState([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
        // Check cache
        const cached = localStorage.getItem(KEYS_CACHE_KEY);
        if (cached) {
            setKeys(JSON.parse(cached));
            setLoading(false);
        }

        // Fetch fresh list of keys
        // We filter for types containing 'key' but exclude some junk if needed
        const query = `
        {
            items(type: key, limit: 1000) {
                id
                name
                shortName
                iconLink
                avg24hPrice
            }
        }`;
        
        const data = await runQuery(query);
        if (data && data.items) {
            // Filter out some non-keys if the API returns them (like keycards usually included)
            // Sort by price (expensive keys first usually implies importance) or Name
            const sorted = data.items.sort((a, b) => a.name.localeCompare(b.name));
            
            setKeys(sorted);
            localStorage.setItem(KEYS_CACHE_KEY, JSON.stringify(sorted));
            setLoading(false);
        }
    };
    init();
  }, []);

  const toggleKey = (id) => {
      setOwnedKeys(prev => {
          const next = { ...prev };
          if (next[id]) delete next[id];
          else next[id] = true;
          return next;
      });
  };

  // Filter Logic
  const displayKeys = keys.filter(k => 
      k.name.toLowerCase().includes(filter.toLowerCase()) || 
      k.shortName.toLowerCase().includes(filter.toLowerCase())
  );

  const ownedCount = Object.keys(ownedKeys).length;

  return (
    <div className="tab-content">
      <div className="filters" style={{justifyContent: 'space-between'}}>
        <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
             <input 
                placeholder="Search keys..." 
                value={filter} 
                onChange={e => setFilter(e.target.value)} 
                style={{width: '250px'}}
            />
            <span style={{color: '#888'}}>
                {loading ? "Loading..." : `${displayKeys.length} keys found`}
            </span>
        </div>
        <div style={{color: 'var(--accent-color)', fontWeight: 'bold'}}>
            You own {ownedCount} keys
        </div>
      </div>

      <div className="station-grid" style={{gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))'}}>
        {displayKeys.map(k => {
            const isOwned = !!ownedKeys[k.id];
            
            return (
                <div 
                    key={k.id} 
                    className={`station-card ${isOwned ? 'collected' : ''}`}
                    onClick={() => toggleKey(k.id)}
                    style={{
                        cursor: 'pointer', 
                        border: isOwned ? '1px solid var(--success-bg)' : '1px solid #444',
                        background: isOwned ? 'rgba(27, 94, 32, 0.2)' : 'var(--card-bg)'
                    }}
                >
                    <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
                        <img src={k.iconLink} alt="" style={{width: '40px', height: '40px'}} />
                        <div style={{flex:1}}>
                            <div style={{fontWeight:'bold', fontSize:'0.9rem'}}>{k.name}</div>
                            {k.avg24hPrice > 0 && (
                                <div style={{fontSize:'0.8rem', color:'#aaa'}}>
                                    ~{k.avg24hPrice.toLocaleString()} ₽
                                </div>
                            )}
                        </div>
                        {isOwned && <span style={{color: '#4caf50', fontSize:'1.2rem'}}>✔</span>}
                    </div>
                </div>
            );
        })}
      </div>
    </div>
  );
}