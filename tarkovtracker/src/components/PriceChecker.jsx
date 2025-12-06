import React, { useState } from 'react';

const SQUAD_ALERT_STYLE = { marginTop: '10px', padding: '10px', backgroundColor: 'rgba(33, 150, 243, 0.15)', border: '1px solid #2196f3', borderRadius: '4px', color: '#90caf9', fontSize: '0.9em' };
const OWNED_STYLE = { marginTop: '5px', padding: '8px', backgroundColor: 'rgba(76, 175, 80, 0.15)', border: '1px solid #4caf50', borderRadius: '4px', color: '#a5d6a7', fontSize: '0.9em' };
const FIR_STYLE = { color: '#ffd700', fontWeight: 'bold', marginLeft: '5px' };

export default function PriceChecker({ globalData, itemProgress, hideoutLevels, completedQuests, squadMembers, squadData, ownedKeys }) {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState([]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!term.trim()) return;
    const q = term.toLowerCase().trim();

    let matches = globalData.items.filter(i => 
        (i.name && i.name.toLowerCase().includes(q)) || 
        (i.shortName && i.shortName.toLowerCase().includes(q))
    );
    
    matches.sort((a, b) => a.name.length - b.name.length);
    setResults(matches.slice(0, 10));
  };

  return (
    <div className="tab-content">
      <form onSubmit={handleSearch} className="search-box" style={{display: 'flex', gap: '10px'}}>
        <input value={term} onChange={e => setTerm(e.target.value)} placeholder="Search item..." style={{flex: 1}} />
        <button type="submit">Search</button>
      </form>

      <div className="results-grid">
        {results.map((item, idx) => {
            const userHas = itemProgress[item.id] || 0;
            
            // Quest Status Logic
            const activeQuests = [];
            const completedQuestList = [];

            item.questDetails.forEach(q => {
                if (completedQuests.includes(q.id)) {
                    completedQuestList.push(q);
                } else {
                    activeQuests.push(q);
                }
            });

            let questNeeded = 0;
            activeQuests.forEach(q => questNeeded += q.count);

            let hideoutNeeded = 0;
            const activeHideout = item.hideoutDetails.filter(h => (hideoutLevels[h.station]||0) < h.level);
            activeHideout.forEach(h => hideoutNeeded += h.count);

            const totalNeeded = questNeeded + hideoutNeeded;
            const isComplete = userHas >= totalNeeded && totalNeeded > 0;

            // Prices
            let bestTrader = { name: "None", price: 0 }, finalFlea = 0;
            if (item.sellFor) {
                item.sellFor.forEach(sale => {
                    if (sale.vendor.name === "Flea Market") finalFlea = sale.price;
                    else if (sale.currency === "RUB" && sale.price > bestTrader.price) bestTrader = { name: sale.vendor.name, price: sale.price };
                });
                if (finalFlea === 0) finalFlea = item.avg24hPrice || 0;
            }
            const profit = finalFlea - bestTrader.price;

            // Squad Logic
            const squadNeeds = [];
            if (squadMembers && squadMembers.length > 0) {
                squadMembers.forEach(member => {
                    const d = squadData[member.uid] || {};
                    const mHas = d.progress?.[item.id] || 0;
                    const mQuests = d.quests || [];
                    const mHideout = d.hideout || {};
                    let mNeed = 0, mFir = false;
                    item.questDetails.forEach(q => { if(!mQuests.includes(q.id)) { mNeed += q.count; if(q.fir) mFir = true; }});
                    item.hideoutDetails.forEach(h => { if((mHideout[h.station]||0) < h.level) mNeed += h.count; });
                    if (mNeed > mHas) squadNeeds.push({ name: member.name, photo: member.photo, missing: mNeed - mHas, fir: mFir });
                });
            }

            const isKey = item.types?.includes('key') || item.name.toLowerCase().includes('key');

            // WIKI HANDLER
            const openWiki = (e) => {
                e.preventDefault();
                if (item.wikiLink) window.open(item.wikiLink, '_blank');
            };

            return (
              <div key={idx} className="result-card">
                <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                    {item.iconLink && (
                        <img 
                            src={item.iconLink} 
                            alt="" 
                            style={{width: 64, height: 64, cursor: 'context-menu'}}
                            onContextMenu={openWiki}
                            title="Right-click for Wiki"
                        />
                    )}
                    <div>
                        <h3>{item.name}</h3>
                        <div style={{color:'#666', fontSize:'0.8em'}}>{item.shortName}</div>
                    </div>
                </div>

                {isKey && (
                    <div style={{marginTop: '10px', marginBottom: '10px'}}>
                        {ownedKeys[item.id] ? <div style={OWNED_STYLE}><b>✓ You own this key.</b></div> : <div style={{...OWNED_STYLE, borderColor: '#555', color: '#888', backgroundColor: 'transparent'}}>You do NOT own this key.</div>}
                        {squadMembers.length > 0 && <div style={{marginTop: '5px', fontSize: '0.9em', color: '#ccc'}}>Squad Owners: {squadMembers.map(m => squadData[m.uid]?.keys?.[item.id] ? <span key={m.uid} style={{marginLeft:'8px', background:'#1b5e20', padding:'2px 6px', borderRadius:'4px'}}>{m.name}</span> : null)}</div>}
                    </div>
                )}

                {totalNeeded > 0 ? (
                    <div className={isComplete ? "status-complete" : "needed-alert"}>
                        {isComplete ? <span>✅ COMPLETED ({userHas}/{totalNeeded})</span> : <span>[!] NEEDED: {totalNeeded} (Have {userHas})</span>}
                        {!isComplete && <div style={{marginTop: 10, fontSize:'0.9em'}}>
                             {activeQuests.length > 0 && <ul style={{margin:'5px 0 5px 20px', color:'#ddd'}}>{activeQuests.map((q,i)=><li key={i}>{q.name} ({q.trader}): <b>{q.count}</b>{q.fir && <span style={FIR_STYLE}>(FIR)</span>}</li>)}</ul>}
                             {activeHideout.length > 0 && <ul style={{margin:'5px 0 5px 20px', color:'#ddd'}}>{activeHideout.map((h,i)=><li key={i}>{h.station} (Lvl {h.level}): <b>{h.count}</b></li>)}</ul>}
                        </div>}
                    </div>
                ) : (
                    <div className="not-needed">
                        No active tasks.
                        {completedQuestList.length > 0 && (
                            <div style={{marginTop: '8px', fontSize: '0.85em', color: '#666'}}>
                                <div>Used in completed quests:</div>
                                <ul style={{margin: '2px 0 0 20px', padding: 0}}>
                                    {completedQuestList.map((q, i) => (
                                        <li key={i} style={{textDecoration: 'line-through'}}>
                                            {q.name} ({q.trader})
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                {squadNeeds.length > 0 && <div style={SQUAD_ALERT_STYLE}><b>Needed by Squad:</b>{squadNeeds.map((s, i) => (
                    <div key={i} style={{display:'flex', alignItems:'center', gap:'8px', marginTop:'4px'}}>
                        {s.photo ? <img src={s.photo} style={{width:20, height:20, borderRadius:'50%'}}/> : <span style={{width:20, height:20, background:'#0d47a1', borderRadius:'50%', textAlign:'center', fontSize:'0.7em'}}>{s.name[0]}</span>}
                        {s.name} needs <b>{s.missing}</b>{s.fir && <span style={FIR_STYLE}>(FIR)</span>}
                    </div>
                ))}</div>}
                
                <div className="prices">
                    <div className="trader-price">Trader: {bestTrader.name}<br/><b>{bestTrader.price.toLocaleString()} ₽</b></div>
                    {finalFlea > 0 ? <div className="flea-price">Flea: ~{finalFlea.toLocaleString()} ₽<div className={profit>0?"profit":"loss"}>{profit>0?`PROFIT: +${profit.toLocaleString()}`:"SELL TRADER"}</div></div> : <div>Flea: N/A</div>}
                </div>
              </div>
            );
        })}
      </div>
    </div>
  );
}