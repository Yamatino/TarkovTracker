import React, { useState } from 'react';
import { auth, googleProvider, db } from '../firebaseConfig';
import { signInWithPopup, signOut, updateProfile } from 'firebase/auth';
import { doc, updateDoc, setDoc } from 'firebase/firestore';

export default function SquadTab({ user, squadCode, joinSquad, squadMembers, squadData }) {
  const [inputCode, setInputCode] = useState(squadCode || "");
  const [newName, setNewName] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const handleUpdateName = async () => {
    if (!newName.trim() || !user) return;
    
    // 1. Update Auth Profile (Local & Global)
    await updateProfile(user, { displayName: newName });
    
    // 2. Update Squad Member Entry (If in a squad)
    if (squadCode) {
        const memberRef = doc(db, 'squads', squadCode, 'members', user.uid);
        await setDoc(memberRef, { name: newName }, { merge: true });
    }

    setIsEditing(false);
    window.location.reload(); // Force reload to reflect auth changes everywhere
  };

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
      {/* USER HEADER */}
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px', background:'#222', padding:'10px', borderRadius:'8px'}}>
        <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
            {user.photoURL && <img src={user.photoURL} style={{width:40, borderRadius:'50%'}} alt="" />}
            
            {isEditing ? (
                <div style={{display:'flex', gap:'5px'}}>
                    <input 
                        value={newName} 
                        onChange={e => setNewName(e.target.value)} 
                        placeholder={user.displayName}
                        style={{padding:'4px'}}
                    />
                    <button onClick={handleUpdateName} className="btn-mini" style={{width:'auto', padding:'0 8px'}}>Save</button>
                    <button onClick={() => setIsEditing(false)} className="btn-mini" style={{width:'auto', padding:'0 8px'}}>X</button>
                </div>
            ) : (
                <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                    <span style={{fontWeight:'bold', fontSize:'1.1rem'}}>{user.displayName}</span>
                    <button 
                        onClick={() => { setIsEditing(true); setNewName(user.displayName); }} 
                        style={{background:'none', border:'none', cursor:'pointer', color:'#aaa', fontSize:'0.8rem'}}
                    >
                        (Edit Name)
                    </button>
                </div>
            )}
        </div>
        <button onClick={() => signOut(auth)} className="btn-mini" style={{width:'auto', padding:'0 10px', background:'#444'}}>Sign Out</button>
      </div>

      {/* JOIN SQUAD */}
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
                        {m.photo && <img src={m.photo} style={{width:30, borderRadius:'50%'}} alt="" />}
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