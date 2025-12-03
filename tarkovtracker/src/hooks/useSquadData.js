import { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
// ADDED: deleteDoc, getDoc
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

  // --- UPDATED JOIN LOGIC ---
  const joinSquad = async (code) => {
    if (!user || !code) return;
    const cleanCode = code.toLowerCase().trim();
    
    // 1. Check Previous Squad
    const userDocRef = doc(db, 'users', user.uid);
    try {
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
            const oldSquad = userSnap.data().currentSquad;
            
            // If we are in a different squad, remove us from the old one
            if (oldSquad && oldSquad !== cleanCode) {
                console.log(`Leaving old squad: ${oldSquad}`);
                const oldMemberRef = doc(db, 'squads', oldSquad, 'members', user.uid);
                await deleteDoc(oldMemberRef);
            }
        }
    } catch (e) {
        console.error("Error switching squads:", e);
    }

    // 2. Update Local State
    setSquadCode(cleanCode);
    
    // 3. Register in New Squad
    const memberRef = doc(db, 'squads', cleanCode, 'members', user.uid);
    await setDoc(memberRef, {
        name: user.displayName,
        photo: user.photoURL,
        joinedAt: Date.now()
    }, { merge: true });
    
    // 4. Update User Profile with new current
    await setDoc(userDocRef, { currentSquad: cleanCode }, { merge: true });
  };

  // 2. Listen to Members (Same as before)
  useEffect(() => {
    if (!squadCode) return;

    const q = collection(db, 'squads', squadCode, 'members');
    const unsub = onSnapshot(q, (snapshot) => {
        const members = [];
        snapshot.forEach(doc => members.push({ uid: doc.id, ...doc.data() }));
        setSquadMembers(members.filter(m => m.uid !== user?.uid));
    });
    return () => unsub();
  }, [squadCode, user]);

  // 3. Listen to Each Friend's Data (Same as before)
  useEffect(() => {
    if (squadMembers.length === 0) return;

    const unsubscribes = [];

    squadMembers.forEach(member => {
        const userRef = (key) => doc(db, 'users', member.uid, 'appData', key);

        unsubscribes.push(onSnapshot(userRef('tarkov_hideout_levels'), (snap) => {
            if (snap.exists()) {
                setSquadData(prev => ({
                    ...prev,
                    [member.uid]: { ...prev[member.uid], hideout: snap.data().val }
                }));
            }
        }));

        unsubscribes.push(onSnapshot(userRef('tarkov_completed_quests'), (snap) => {
            if (snap.exists()) {
                setSquadData(prev => ({
                    ...prev,
                    [member.uid]: { ...prev[member.uid], quests: snap.data().val || [] }
                }));
            }
        }));

        unsubscribes.push(onSnapshot(userRef('tarkov_progress_v2'), (snap) => {
            if (snap.exists()) {
                setSquadData(prev => ({
                    ...prev,
                    [member.uid]: { ...prev[member.uid], progress: snap.data().val || {} }
                }));
            }
        }));
    });

    return () => unsubscribes.forEach(u => u());
  }, [squadMembers]);

  return { squadCode, joinSquad, squadMembers, squadData };
}