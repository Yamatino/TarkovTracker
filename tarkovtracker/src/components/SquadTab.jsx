import React, { useState } from 'react';
import { auth, googleProvider, db } from '../firebaseConfig';
// ADDED: Email Auth imports
import { 
    signInWithPopup, 
    signOut, 
    updateProfile, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword 
} from 'firebase/auth';
import { doc, setDoc, updateDoc } from 'firebase/firestore';

const GENERAL_SQUAD_ID = "general-lobby";

export default function SquadTab({ user, squadCode, joinSquad, squadMembers, squadData }) {
  const [inputCode, setInputCode] = useState("");
  const [newName, setNewName] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // --- NEW: LOGIN STATE ---
  const [authMode, setAuthMode] = useState("google"); // 'google' or 'email'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isRegistering, setIsRegistering] = useState(false); // Toggle Login vs Register

  const handleUpdateName = async () => {
    if (!newName.trim() || !user) return;
    await updateProfile(user, { displayName: newName });
    if (squadCode && squadCode !== GENERAL_SQUAD_ID) {
        const memberRef = doc(db, 'squads', squadCode, 'members', user.uid);
        await setDoc(memberRef, { name: newName }, { merge: true });
    }
    setIsEditing(false);
    window.location.reload(); 
  };

  const handleJoinGeneral = () => {
      joinSquad(GENERAL_SQUAD_ID);
      setInputCode("");
  };

  // --- NEW: EMAIL AUTH LOGIC ---
  const handleEmailAuth = async (e) => {
      e.preventDefault();
      setAuthError("");
      try {
          if (isRegistering) {
              const res = await createUserWithEmailAndPassword(auth, email, password);
              // Set a default display name for new users
              await updateProfile(res.user, { displayName: email.split('@')[0] });
          } else {
              await signInWithEmailAndPassword(auth, email, password);
          }
      } catch (err) {
          setAuthError(err.message.replace("Firebase: ", ""));
      }
  };

  // --- 1. LOGGED OUT VIEW (LOGIN FORM) ---
  if (!user) {
    return (
        <div className="tab-content" style={{textAlign:'center', marginTop:'50px', maxWidth:'400px', margin:'50px auto'}}>
            <h2 style={{color:'var(--accent-color)'}}>Tarkov Tracker Sync</h2>
            
            {/* Auth Switcher */}
            <div style={{display:'flex', justifyContent:'center', gap:'10px', marginBottom:'20px'}}>
                <button 
                    onClick={() => setAuthMode('google')}
                    className={authMode === 'google' ? 'btn-mini' : ''}
                    style={{padding:'8px 16px', background: authMode === 'google' ? '#444' : 'transparent', border:'1px solid #555'}}
                >Google</button>
                <button 
                    onClick={() => setAuthMode('email')}
                    className={authMode === 'email' ? 'btn-mini' : ''}
                    style={{padding:'8px 16px', background: authMode === 'email' ? '#444' : 'transparent', border:'1px solid #555'}}
                >Email / Hotmail</button>
            </div>

            {authMode === 'google' ? (
                <button 
                    onClick={() => signInWithPopup(auth, googleProvider)}
                    style={{padding:'12px 24px', fontSize:'1.1rem', cursor:'pointer', background:'#fff', color:'#000', border:'none', borderRadius:'4px', fontWeight:'bold'}}
                >
                    <span style={{marginRight:'10px'}}>G</span> Sign in with Google
                </button>
            ) : (
                <form onSubmit={handleEmailAuth} style={{display:'flex', flexDirection:'column', gap:'10px', textAlign:'left'}}>
                    <input 
                        type="email" 
                        placeholder="Email (Hotmail, Yahoo, etc.)" 
                        value={email} 
                        onChange={e => setEmail(e.target.value)}
                        required
                        style={{width:'100%'}}
                    />
                    <input 
                        type="password" 
                        placeholder="Password" 
                        value={password} 
                        onChange={e => setPassword(e.target.value)}
                        required
                        style={{width:'100%'}}
                    />
                    {authError && <div style={{color:'#ff8a80', fontSize:'0.9em'}}>{authError}</div>}
                    
                    <button type="submit" style={{padding:'10px', background:'var(--accent-color)', color:'white', border:'none', borderRadius:'4px', cursor:'pointer', fontWeight:'bold'}}>
                        {isRegistering ? "Create Account" : "Log In"}
                    </button>
                    
                    <div style={{textAlign:'center', fontSize:'0.9em', marginTop:'10px', color:'#aaa'}}>
                        {isRegistering ? "Already have an account?" : "Need an account?"} 
                        <span 
                            onClick={() => setIsRegistering(!isRegistering)} 
                            style={{color:'var(--accent-color)', cursor:'pointer', marginLeft:'5px', textDecoration:'underline'}}
                        >
                            {isRegistering ? "Log In" : "Register"}
                        </span>
                    </div>
                </form>
            )}
        </div>
    );
  }

  // --- 2. LOGGED IN VIEW (SQUAD DASHBOARD) ---
  const isGeneral = squadCode === GENERAL_SQUAD_ID;

  return (
    <div className="tab-content">
      {/* USER HEADER */}
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px', background:'#222', padding:'10px', borderRadius:'8px'}}>
        <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
            {user.photoURL ? (
                <img src={user.photoURL} style={{width:40, borderRadius:'50%'}} alt="" />
            ) : (
                <div style={{width:40, height:40, borderRadius:'50%', background:'#555', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold'}}>
                    {user.displayName ? user.displayName.charAt(0).toUpperCase() : "?"}
                </div>
            )}
            
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
                        onClick={() => { setIsEditing(true); setNewName(user.displayName || ""); }} 
                        style={{background:'none', border:'none', cursor:'pointer', color:'#aaa', fontSize:'0.8rem'}}
                    >
                        (Edit)
                    </button>
                </div>
            )}
        </div>
        <button onClick={() => signOut(auth)} className="btn-mini" style={{width:'auto', padding:'0 10px', background:'#444'}}>Sign Out</button>
      </div>

      {/* JOIN CONTROLS */}
      <div className="filters" style={{flexDirection: 'column', alignItems: 'stretch', gap: '10px'}}>
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
                        {m.photo ? (
                            <img src={m.photo} style={{width:30, borderRadius:'50%'}} alt="" />
                        ) : (
                            <div style={{width:30, height:30, borderRadius:'50%', background:'#555', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.8em', fontWeight:'bold'}}>
                                {m.name ? m.name.charAt(0).toUpperCase() : "?"}
                            </div>
                        )}
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