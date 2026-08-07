import React, { useState } from 'react';
import { Search, CheckCircle2, AlertTriangle, Package, Users, TrendingUp, TrendingDown, ExternalLink } from 'lucide-react';
import Avatar from './ui/Avatar';

export default function PriceChecker({ globalData, itemProgress, hideoutLevels, completedQuests, squadMembers, squadData }) {
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
      <form onSubmit={handleSearch} className="search-box" style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
        <div className="input-with-icon">
          <Search size={16} />
          <input value={term} onChange={e => setTerm(e.target.value)} placeholder="Search item..." />
        </div>
        <button type="submit"><Search size={16} /> Search</button>
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

            // WIKI HANDLER
            const openWiki = (e) => {
                e.preventDefault();
                if (item.wikiLink) window.open(item.wikiLink, '_blank');
            };

            return (
              <div key={idx} className="card result-card">
                <div className="result-card-header">
                    <div className="card-media" onContextMenu={openWiki} title="Right-click for Wiki">
                        {item.iconLink && <img src={item.iconLink} alt="" />}
                        {item.wikiLink && <span className="wiki-hint"><ExternalLink size={10} /></span>}
                    </div>
                    <div>
                        <h3>{item.name}</h3>
                        <div style={{color:'var(--text-secondary)', fontSize:'0.8em'}}>{item.shortName}</div>
                    </div>
                </div>

                {totalNeeded > 0 ? (
                    <div className={isComplete ? "status-complete" : "needed-alert"}>
                        {isComplete
                          ? <span className="alert-title"><CheckCircle2 size={16} /> COMPLETED ({userHas}/{totalNeeded})</span>
                          : <span className="alert-title"><AlertTriangle size={16} /> NEEDED: {totalNeeded} (Have {userHas})</span>}
                        {!isComplete && <div style={{fontSize:'0.9em'}}>
                             {activeQuests.length > 0 && <ul style={{margin:'5px 0 5px 20px', color:'var(--text-primary)'}}>{activeQuests.map((q,i)=><li key={i}>{q.name} ({q.trader}): <b>{q.count}</b>{q.fir && <span className="badge badge-fir" style={{marginLeft: 6}}><Package size={10} /> FIR</span>}</li>)}</ul>}
                             {activeHideout.length > 0 && <ul style={{margin:'5px 0 5px 20px', color:'var(--text-primary)'}}>{activeHideout.map((h,i)=><li key={i}>{h.station} (Lvl {h.level}): <b>{h.count}</b></li>)}</ul>}
                        </div>}
                    </div>
                ) : (
                    <div className="not-needed">
                        No active tasks.
                        {completedQuestList.length > 0 && (
                            <div style={{marginTop: '8px', fontSize: '0.85em'}}>
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

                {squadNeeds.length > 0 && (
                  <div className="squad-alert">
                    <div className="squad-alert-title"><Users size={14} /> Needed by Squad:</div>
                    {squadNeeds.map((s, i) => (
                        <div key={i} className="squad-need-row">
                            <Avatar src={s.photo} name={s.name} size={20} />
                            {s.name} needs <b>{s.missing}</b>{s.fir && <span className="badge badge-fir"><Package size={10} /> FIR</span>}
                        </div>
                    ))}
                  </div>
                )}

                <div className="prices">
                    <div className="trader-price">Trader: {bestTrader.name}<br/><b>{bestTrader.price.toLocaleString()} ₽</b></div>
                    {finalFlea > 0 ? (
                      <div className="flea-price">
                        Flea: ~{finalFlea.toLocaleString()} ₽
                        <div className={profit>0?"profit":"loss"}>
                          {profit>0
                            ? <><TrendingUp size={14} /> PROFIT: +{profit.toLocaleString()}</>
                            : <><TrendingDown size={14} /> SELL TRADER</>}
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
