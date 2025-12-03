import React, { useState } from 'react';

export default function KeyringTab({ globalData, ownedKeys, setOwnedKeys }) {
  const [filter, setFilter] = useState("");

  const toggleKey = (id) => {
      setOwnedKeys(prev => {
          const next = { ...prev };
          if (next[id]) delete next[id]; else next[id] = true;
          return next;
      });
  };

  const displayKeys = globalData.keys.filter(k => 
      k.name.toLowerCase().includes(filter.toLowerCase()) || 
      k.shortName.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="tab-content">
      <div className="filters" style={{justifyContent: 'space-between'}}>
        <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
             <input placeholder="Search keys..." value={filter} onChange={e => setFilter(e.target.value)} style={{width: '250px'}} />
             <span style={{color: '#888'}}>{displayKeys.length} keys</span>
        </div>
        <div style={{color: 'var(--accent-color)', fontWeight: 'bold'}}>You own {Object.keys(ownedKeys).length} keys</div>
      </div>
      <div className="station-grid" style={{gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))'}}>
        {displayKeys.map(k => {
            const isOwned = !!ownedKeys[k.id];
            return (
                <div key={k.id} className={`station-card ${isOwned ? 'collected' : ''}`} onClick={() => toggleKey(k.id)} style={{cursor: 'pointer', border: isOwned ? '1px solid var(--success-bg)' : '1px solid #444', background: isOwned ? 'rgba(27, 94, 32, 0.2)' : 'var(--card-bg)'}}>
                    <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
                        <img src={k.iconLink} style={{width: 40, height: 40}} />
                        <div style={{flex:1}}>
                            <div style={{fontWeight:'bold', fontSize:'0.9rem'}}>{k.name}</div>
                            {k.avg24hPrice > 0 && <div style={{fontSize:'0.8rem', color:'#aaa'}}>~{k.avg24hPrice.toLocaleString()} ₽</div>}
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