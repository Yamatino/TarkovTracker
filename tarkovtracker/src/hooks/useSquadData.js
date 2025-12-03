import { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { doc, setDoc, onSnapshot, collection } from 'firebase/firestore';

export function useSquadData(user) {
  const [squadCode, setSquadCode] = useState(() => {
      return localStorage.getItem("tarkov_squad_code") || "";
  });
  const [squadMembers, setSquadMembers] = useState([]);
  const [squadData, setSquadData] = useState({}); // { uid: { hideout, progress, quests } }

  // Save code to local storage when changed
  useEffect(() => {
      localStorage.setItem("tarkov_squad_code", squadCode);
  }, [squadCode]);

  // 1. Join Squad Logic
  const joinSquad = async (code) => {
    if (!user || !code) return;
    const cleanCode = code.toLowerCase().trim();
    setSquadCode(cleanCode);
    
    // Register myself in the squad
    const memberRef = doc(db, 'squads', cleanCode, 'members', user.uid);
    await setDoc(memberRef, {
        name: user.displayName,
        photo: user.photoURL,
        joinedAt: Date.now()
    }, { merge: true });
  };

  // 2. Listen to Members
  useEffect(() => {
    if (!squadCode) return;

    const q = collection(db, 'squads', squadCode, 'members');
    const unsub = onSnapshot(q, (snapshot) => {
        const members = [];
        snapshot.forEach(doc => members.push({ uid: doc.id, ...doc.data() }));
        // Filter out myself from the list (optional, but usually you want to see friends)
        setSquadMembers(members.filter(m => m.uid !== user?.uid));
    });
    return () => unsub();
  }, [squadCode, user]);

  // 3. Listen to Each Friend's Data
  useEffect(() => {
    if (squadMembers.length === 0) return;

    const unsubscribes = [];

    squadMembers.forEach(member => {
        const userRef = (key) => doc(db, 'users', member.uid, 'appData', key);

        // A. Listen to Hideout
        unsubscribes.push(onSnapshot(userRef('tarkov_hideout_levels'), (snap) => {
            if (snap.exists()) {
                setSquadData(prev => ({
                    ...prev,
                    [member.uid]: { ...prev[member.uid], hideout: snap.data().val }
                }));
            }
        }));

        // B. Listen to Quests
        unsubscribes.push(onSnapshot(userRef('tarkov_completed_quests'), (snap) => {
            if (snap.exists()) {
                setSquadData(prev => ({
                    ...prev,
                    [member.uid]: { ...prev[member.uid], quests: snap.data().val || [] }
                }));
            }
        }));

        // C. Listen to Item Progress (Inventory)
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