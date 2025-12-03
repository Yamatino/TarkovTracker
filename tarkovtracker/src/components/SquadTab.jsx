import React, { useState } from 'react';
import { auth, googleProvider } from '../firebaseConfig';
import { signInWithPopup, signOut } from 'firebase/auth';

export default function SquadTab({ user, squadCode, joinSquad, squadMembers, squadData }) {
  const [inputCode, setInputCode] = useState(squadCode || "");

  if (!user) {
    return (
        <div className="tab-content" style={{textAlign:'center', marginTop:'50px'}}>
            <h2>Multiplayer Sync</h2>
            <button 
                onClick={() => signInWithPopup(auth, googleProvider)}
                style={{padding:'10px 20px', fontSize:'1.2rem', cursor:'pointer'}}
            >
                Sign in with Google
            </button>
        </div>
    );
  }

  return (
    <div className="tab-content">
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
        <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
            {user.photoURL && <img src={user.photoURL} style={{width:30, borderRadius:'50%'}} alt="" />}
            <span>{user.displayName}</span>
        </div>
        <button onClick={() => signOut(auth)} className="btn-mini" style={{width:'auto', padding:'0 10px'}}>Sign Out</button>
      </div>

      <div className="filters">
        <input 
            placeholder="Enter Squad Code..." 
            value={inputCode}
            onChange={e => setInputCode(e.target.value)}
        />
        <button onClick={() => joinSquad(inputCode)}>
            {squadCode ? "Switch Squad" : "Join Squad"}
        </button>
      </div>

      <h3 className="section-title">Squad Members ({squadMembers.length})</h3>
      <div className="station-grid">
        {squadMembers.map(m => {
            const data = squadData[m.uid] || {};
            const h = data.hideout || {};
            const q = data.quests || [];
            
            // Filter: Only show stations with Level > 0
            const activeStations = Object.entries(h).filter(([_, lvl]) => lvl > 0);

            return (
                <div key={m.uid} className="station-card" style={{display:'block'}}>
                    <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px', borderBottom:'1px solid #444', paddingBottom:'5px'}}>
                        {m.photo && <img src={m.photo} style={{width:40, borderRadius:'50%'}} alt="" />}
                        <h3 style={{margin:0}}>{m.name}</h3>
                    </div>
                    
                    <div style={{fontSize:'0.9em', color:'#aaa'}}>
                        <div style={{marginBottom:'10px'}}>Quests Completed: <span style={{color:'white', fontWeight:'bold'}}>{q.length}</span></div>
                        
                        {activeStations.length > 0 ? (
                            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'5px'}}>
                                {activeStations.map(([name, lvl]) => (
                                    <span key={name} style={{background:'#333', padding:'2px 6px', borderRadius:'4px', fontSize:'0.8em'}}>
                                        {name}: <span style={{color:'var(--accent-color)'}}>{lvl}</span>
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <div style={{fontStyle:'italic'}}>No hideout stations built yet.</div>
                        )}
                    </div>
                </div>
            );
        })}
      </div>
    </div>
  );
}