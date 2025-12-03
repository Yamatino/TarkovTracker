import React, { useState } from 'react';
import { auth, googleProvider, db } from '../firebaseConfig';
import { 
    signInWithPopup, 
    signOut, 
    updateProfile, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword 
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

const GENERAL_SQUAD_ID = "general-lobby";

export default function SquadTab({ user, squadCode, joinSquad, squadMembers, squadData }) {
  const [inputCode, setInputCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newPhoto, setNewPhoto] = useState(""); // New state for photo URL
  const [isEditing, setIsEditing] = useState(false);

  // Login State
  const [authMode, setAuthMode] = useState("google");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  const handleUpdateProfile = async () => {
    if (!user) return;
    
    const updates = {};
    if (newName.trim()) updates.displayName = newName;
    if (newPhoto.trim()) updates.photoURL = newPhoto;

    if (Object.keys(updates).length > 0) {
        // 1. Update Auth Profile
        await updateProfile(user, updates);
        
        // 2. Update Database Entry
        if (squadCode) {
            const memberRef = doc(db, 'squads', squadCode, 'members', user.uid);
            await setDoc(memberRef, { 
                name: newName || user.displayName,
                photo: newPhoto || user.photoURL 
            }, { merge: true });
        }
        
        window.location.reload(); 
    }
    setIsEditing(false);
  };

  const handleJoinGeneral = () => {
      joinSquad(GENERAL_SQUAD_ID);
      setInputCode("");
  };

  const handleEmailAuth = async (e) => {
      e.preventDefault();
      setAuthError("");
      try {
          if (isRegistering) {
              const res = await createUserWithEmailAndPassword(auth, email, password);
              await updateProfile(res.user, { displayName: email.split('@')[0] });
          } else {
              await signInWithEmailAndPassword(auth, email, password);
          }
      } catch (err) {
          setAuthError(err.message.replace("Firebase: ", ""));
      }
  };

  // --- LOGGED OUT VIEW ---
  if (!user) {
    return (
        <div className="tab-content" style={{textAlign:'center', marginTop:'50px', maxWidth:'400px', margin:'50px auto'}}>
            <h2 style={{color:'var(--accent-color)', marginBottom: '30px'}}>Tarkov Tracker Sync</h2>
            
            <div style={{display:'flex', marginBottom:'20px', borderBottom: '2px solid #333'}}>
                <button onClick={() => setAuthMode('google')} style={{flex: 1, padding: '10px', background: 'transparent', border: 'none', borderBottom: authMode === 'google' ? '3px solid var(--accent-color)' : 'none', color: authMode === 'google' ? '#fff' : '#666', fontWeight: 'bold', cursor: 'pointer'}}>Google</button>
                <button onClick={() => setAuthMode('email')} style={{flex: 1, padding: '10px', background: 'transparent', border: 'none', borderBottom: authMode === 'email' ? '3px solid var(--accent-color)' : 'none', color: authMode === 'email' ? '#fff' : '#666', fontWeight: 'bold', cursor: 'pointer'}}>Email / Password</button>
            </div>

            {authMode === 'google' ? (
                <div style={{padding: '20px 0'}}>
                     <button onClick={() => signInWithPopup(auth, googleProvider)} style={{padding:'12px 24px', fontSize:'1.1rem', cursor:'pointer', background:'#fff', color:'#000', border:'none', borderRadius:'4px', fontWeight:'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', width: '100%'}}>
                        <img src="https://www.google.com/favicon.ico" width="20" alt="" /> Sign in with Google
                    </button>
                </div>
            ) : (
                <form onSubmit={handleEmailAuth} style={{display:'flex', flexDirection:'column', gap:'15px', textAlign:'left'}}>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required style={{width:'100%', padding: '10px', background: '#222', border: '1px solid #444', color: '#fff'}} />
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required style={{width:'100%', padding: '10px', background: '#222', border: '1px solid #444', color: '#fff'}} />
                    {authError && <div style={{color:'#ff5252', fontSize:'0.9em', background: 'rgba(255, 82, 82, 0.1)', padding: '10px', borderRadius: '4px'}}>{authError}</div>}
                    <button type="submit" style={{padding:'12px', background:'var(--accent-color)', color:'white', border:'none', borderRadius:'4px', cursor:'pointer', fontWeight:'bold', fontSize: '1rem', marginTop: '10px'}}>{isRegistering ? "Create Account" : "Log In"}</button>
                    <div style={{textAlign:'center', fontSize:'0.9em', marginTop:'10px', color:'#aaa'}}>{isRegistering ? "Already have an account?" : "Need an account?"} <span onClick={() => setIsRegistering(!isRegistering)} style={{color:'var(--accent-color)', cursor:'pointer', marginLeft:'5px', textDecoration:'underline'}}>{isRegistering ? "Log In" : "Register"}</span></div>
                </form>
            )}
        </div>
    );
  }

  const isGeneral = squadCode === GENERAL_SQUAD_ID;

  return (
    <div className="tab-content">
      {/* USER HEADER */}
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px', background:'#222', padding:'10px', borderRadius:'8px', flexWrap: 'wrap', gap: '10px'}}>
        <div style={{display:'flex', alignItems:'center', gap:'15px', flex: 1}}>
            {/* Avatar Display */}
            {user.photoURL ? (
                <img src={user.photoURL} style={{width:50, height:50, borderRadius:'50%', objectFit:'cover', border: '2px solid #444'}} alt="" />
            ) : (
                <div style={{width:50, height:50, borderRadius:'50%', background:'#555', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold', fontSize:'1.2rem'}}>
                    {user.displayName ? user.displayName.charAt(0).toUpperCase() : "?"}
                </div>
            )}
            
            {/* Edit Mode */}
            {isEditing ? (
                <div style={{display:'flex', flexDirection: 'column', gap:'5px', flex: 1}}>
                    <input 
                        value={newName} 
                        onChange={e => setNewName(e.target.value)} 
                        placeholder="Display Name"
                        style={{padding:'6px', width: '100%', maxWidth: '200px'}}
                    />
                    <input 
                        value={newPhoto} 
                        onChange={e => setNewPhoto(e.target.value)} 
                        placeholder="Image URL (https://...)"
                        style={{padding:'6px', width: '100%', maxWidth: '300px'}}
                    />
                    <div style={{display: 'flex', gap: '5px'}}>
                        <button onClick={handleUpdateProfile} className="btn-mini" style={{width:'auto', padding:'4px 12px', background: 'var(--success-bg)', border:'none'}}>Save</button>
                        <button onClick={() => setIsEditing(false)} className="btn-mini" style={{width:'auto', padding:'4px 12px'}}>Cancel</button>
                    </div>
                </div>
            ) : (
                <div style={{display:'flex', flexDirection:'column'}}>
                    <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                        <span style={{fontWeight:'bold', fontSize:'1.2rem'}}>{user.displayName}</span>
                        <button 
                            onClick={() => { setIsEditing(true); setNewName(user.displayName || ""); setNewPhoto(user.photoURL || ""); }} 
                            style={{background:'none', border:'none', cursor:'pointer', color:'#aaa', fontSize:'0.8rem', textDecoration:'underline'}}
                        >
                            Edit Profile
                        </button>
                    </div>
                </div>
            )}
        </div>
        <button onClick={() => signOut(auth)} className="btn-mini" style={{width:'auto', padding:'8px 16px', background:'#444'}}>Sign Out</button>
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
                            <img src={m.photo} style={{width:30, height: 30, borderRadius:'50%', objectFit: 'cover'}} alt="" />
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