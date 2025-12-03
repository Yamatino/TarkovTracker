import { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { doc, setDoc, deleteDoc, getDoc, onSnapshot, collection } from 'firebase/firestore';

export function useSquadData(user) {
  const [squadCode, setSquadCode] = useState(() => {
      return localStorage.getItem("tarkov_squad_code") || "";
  });
  const [squadMembers, setSquadMembers] = useState([]);
  const [squadData, setSquadData] = useState({}); 

  useEffect(() => {
      localStorage.setItem("tarkov_squad_code", squadCode);
  }, [squadCode]);

  const joinSquad = async (code) => {
    if (!user || !code) return;
    const cleanCode = code.toLowerCase().trim();
    
    const userDocRef = doc(db, 'users', user.uid);
    try {
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
            const oldSquad = userSnap.data().currentSquad;
            if (oldSquad && oldSquad !== cleanCode) {
                await deleteDoc(doc(db, 'squads', oldSquad, 'members', user.uid));
            }
        }
    } catch (e) { console.error(e); }

    setSquadCode(cleanCode);
    
    await setDoc(doc(db, 'squads', cleanCode, 'members', user.uid), {
        name: user.displayName,
        photo: user.photoURL,
        joinedAt: Date.now()
    }, { merge: true });
    
    await setDoc(userDocRef, { currentSquad: cleanCode }, { merge: true });
  };

  useEffect(() => {
    if (!squadCode) return;
    const q = collection(db, 'squads', squadCode, 'members');
    return onSnapshot(q, (snapshot) => {
        const members = [];
        snapshot.forEach(doc => members.push({ uid: doc.id, ...doc.data() }));
        setSquadMembers(members.filter(m => m.uid !== user?.uid));
    });
  }, [squadCode, user]);

  // Listen to Data
  useEffect(() => {
    if (squadMembers.length === 0) return;
    const unsubscribes = [];

    squadMembers.forEach(member => {
        const userRef = (key) => doc(db, 'users', member.uid, 'appData', key);

        // 1. Hideout
        unsubscribes.push(onSnapshot(userRef('tarkov_hideout_levels'), (snap) => {
            if (snap.exists()) {
                setSquadData(prev => ({
                    ...prev,
                    [member.uid]: { ...prev[member.uid], hideout: snap.data().val }
                }));
            }
        }));
        // 2. Quests
        unsubscribes.push(onSnapshot(userRef('tarkov_completed_quests'), (snap) => {
            if (snap.exists()) {
                setSquadData(prev => ({
                    ...prev,
                    [member.uid]: { ...prev[member.uid], quests: snap.data().val || [] }
                }));
            }
        }));
        // 3. Items
        unsubscribes.push(onSnapshot(userRef('tarkov_progress_v2'), (snap) => {
            if (snap.exists()) {
                setSquadData(prev => ({
                    ...prev,
                    [member.uid]: { ...prev[member.uid], progress: snap.data().val || {} }
                }));
            }
        }));
        
        // 4. NEW: Keys
        unsubscribes.push(onSnapshot(userRef('tarkov_owned_keys'), (snap) => {
            if (snap.exists()) {
                setSquadData(prev => ({
                    ...prev,
                    [member.uid]: { ...prev[member.uid], keys: snap.data().val || {} }
                }));
            }
        }));
    });

    return () => unsubscribes.forEach(u => u());
  }, [squadMembers]);

  return { squadCode, joinSquad, squadMembers, squadData };
}