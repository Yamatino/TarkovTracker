import React, { useState } from 'react';
import { auth, googleProvider, db } from '../firebaseConfig';
import { signInWithPopup, signOut, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

const GENERAL_SQUAD_ID = "general-lobby";

export default function SquadTab({ user, squadCode, joinSquad, squadMembers, squadData }) {
  const [inputCode, setInputCode] = useState(""); // Cleared default to avoid confusion
  const [newName, setNewName] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const handleUpdateName = async () => {
    if (!newName.trim() || !user) return;
    
    await updateProfile(user, { displayName: newName });
    
    if (squadCode) {
        const memberRef = doc(db, 'squads', squadCode, 'members', user.uid);
        await setDoc(memberRef, { name: newName }, { merge: true });
    }

    setIsEditing(false);
    window.location.reload(); 
  };

  const handleJoinGeneral = () => {
      joinSquad(GENERAL_SQUAD_ID);
      setInputCode(""); // Clear manual input
  };

  if (!user) {
    return (
        <div className="tab-content" style={{textAlign:'center', marginTop:'50px'}}>
            <h2>Multiplayer Sync</h2>
            <p style={{marginBottom: '20px', color: '#aaa'}}>
                Join a squad to see your friends' progress and help them find items.
            </p>
            <button 
                onClick={() => signInWithPopup(auth, googleProvider)}
                style={{padding:'10px 20px', fontSize:'1.2rem', cursor:'pointer'}}
            >
                Sign in with Google
            </button>
        </div>
    );
  }

  const isGeneral = squadCode === GENERAL_SQUAD_ID;

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

      {/* JOIN CONTROLS */}
      <div className="filters" style={{flexDirection: 'column', alignItems: 'stretch', gap: '10px'}}>
        
        {/* Row 1: Manual Code */}
        <div style={{display: 'flex', gap: '10px'}}>
            <input 
                placeholder="Enter Private Code..." 
                value={inputCode}
                onChange={e => setInputCode(e.target.value)}
                style={{flex: 1}}
            />
            <button onClick={() => joinSquad(inputCode)} disabled={!inputCode.trim()}>
                Join Private
            </button>
        </div>

        {/* Row 2: General Channel */}
        <button 
            onClick={handleJoinGeneral}
            style={{
                background: isGeneral ? 'var(--success-bg)' : '#333',
                border: isGeneral ? '1px solid #4caf50' : '1px solid #555',
                padding: '10px',
                cursor: isGeneral ? 'default' : 'pointer',
                opacity: isGeneral ? 1 : 0.8
            }}
            disabled={isGeneral}
        >
            {isGeneral ? "You are in the General Channel" : "Join General Channel (Public)"}
        </button>

      </div>

      <h3 className="section-title">
          {isGeneral ? "General Channel" : `Squad: ${squadCode}`} Members ({squadMembers.length})
      </h3>
      
      <div className="station-grid">
        {squadMembers.map(m => {
            const data = squadData[m.uid] || {};
            const h = data.hideout || {};
            const q = data.quests || [];
            
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