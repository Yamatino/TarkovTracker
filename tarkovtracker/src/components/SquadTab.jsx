import React, { useState, useEffect } from 'react';
import { auth, googleProvider, db } from '../firebaseConfig';
import { signInWithPopup, signOut } from 'firebase/auth';
import { doc, setDoc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';

export default function SquadTab({ user, hideoutLevels, itemProgress }) {
  const [squadCode, setSquadCode] = useState("");
  const [squadMembers, setSquadMembers] = useState([]); // List of user profiles
  const [squadData, setSquadData] = useState({}); // { uid: { hideout, progress, quests } }
  const [loading, setLoading] = useState(false);

  // 1. Join/Leave Squad Logic
  const handleJoinSquad = async () => {
    if (!user || !squadCode) return;
    setLoading(true);
    
    // Save my membership: squads -> CODE -> members -> MY_ID
    const memberRef = doc(db, 'squads', squadCode.toLowerCase(), 'members', user.uid);
    await setDoc(memberRef, {
        name: user.displayName,
        photo: user.photoURL,
        joinedAt: Date.now()
    });
    
    // Also save my code to my profile for persistence
    await setDoc(doc(db, 'users', user.uid), { currentSquad: squadCode.toLowerCase() }, { merge: true });
    
    setLoading(false);
  };

  // 2. Listen to Squad Members
  useEffect(() => {
    if (!squadCode) return;

    // Listen to the "members" collection of this squad
    const q = collection(db, 'squads', squadCode.toLowerCase(), 'members');
    const unsub = onSnapshot(q, (snapshot) => {
        const members = [];
        snapshot.forEach(doc => members.push({ uid: doc.id, ...doc.data() }));
        setSquadMembers(members);
        
        // Trigger data fetch for these members
        fetchMembersData(members);
    });
    return () => unsub();
  }, [squadCode]);

  // 3. Fetch (or Listen to) Friend's Data
  const fetchMembersData = (members) => {
    members.forEach(member => {
        // We listen to their "tarkov_hideout_levels" doc
        const hideoutRef = doc(db, 'users', member.uid, 'appData', 'tarkov_hideout_levels');
        onSnapshot(hideoutRef, (snap) => {
            if (snap.exists()) {
                setSquadData(prev => ({
                    ...prev,
                    [member.uid]: { ...prev[member.uid], hideout: snap.data().val }
                }));
            }
        });
        
        // We listen to their "completed_quests" (optional, heavy data)
        const questRef = doc(db, 'users', member.uid, 'appData', 'tarkov_completed_quests');
        onSnapshot(questRef, (snap) => {
            if (snap.exists()) {
                setSquadData(prev => ({
                    ...prev,
                    [member.uid]: { ...prev[member.uid], quests: snap.data().val }
                }));
            }
        });
    });
  };

  // Login UI
  if (!user) {
    return (
        <div className="tab-content" style={{textAlign:'center', marginTop:'50px'}}>
            <h2>Multiplayer Sync</h2>
            <p>Log in to save your progress to the cloud and share with friends.</p>
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
            {user.photoURL && <img src={user.photoURL} style={{width:30, borderRadius:'50%'}} />}
            <span>{user.displayName}</span>
        </div>
        <button onClick={() => signOut(auth)} className="btn-mini" style={{width:'auto', padding:'0 10px'}}>Sign Out</button>
      </div>

      <div className="filters">
        <input 
            placeholder="Enter Squad Code (e.g. RATPACK)" 
            value={squadCode}
            onChange={e => setSquadCode(e.target.value)}
        />
        <button onClick={handleJoinSquad} disabled={loading || !squadCode}>
            {loading ? "Joining..." : "Join / Create Squad"}
        </button>
      </div>

      <div className="station-grid">
        {squadMembers.map(m => {
            const data = squadData[m.uid] || {};
            const h = data.hideout || {};
            const q = data.quests || [];
            
            return (
                <div key={m.uid} className="station-card" style={{display:'block'}}>
                    <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px'}}>
                        {m.photo && <img src={m.photo} style={{width:40, borderRadius:'50%'}} />}
                        <h3 style={{margin:0}}>{m.name}</h3>
                    </div>
                    
                    <div style={{fontSize:'0.9em', color:'#aaa'}}>
                        <div>Quests Completed: <span style={{color:'white', fontWeight:'bold'}}>{q.length}</span></div>
                        <div style={{marginTop:'5px'}}><strong>Hideout Status:</strong></div>
                        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'5px', marginTop:'5px'}}>
                            <span>Vents: {h['Vents'] || 0}</span>
                            <span>Stash: {h['Stash'] || 0}</span>
                            <span>Med: {h['Medstation'] || 0}</span>
                            <span>Intel: {h['Intelligence Center'] || 0}</span>
                        </div>
                    </div>
                </div>
            );
        })}
      </div>
    </div>
  );
}