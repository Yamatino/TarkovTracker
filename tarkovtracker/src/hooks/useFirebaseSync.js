import { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export function useFirebaseSync(user, key, initialValue) {
  // 1. Initialize state from LocalStorage (for instant load/offline support)
  const [value, setValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      return initialValue;
    }
  });

  const isFirstLoad = useRef(true);

  // 2. SYNC FROM CLOUD (Listener)
  useEffect(() => {
    if (!user) return; // If not logged in, do nothing

    // Reference to: db -> users -> USER_ID -> data -> KEY
    const docRef = doc(db, 'users', user.uid, 'appData', key);

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const cloudData = docSnap.data().val;
        
        // Deep compare or simple check to avoid infinite loops
        if (JSON.stringify(cloudData) !== JSON.stringify(value)) {
            console.log(`[Cloud] Received update for ${key}`);
            setValue(cloudData);
            // Also update local storage to keep them in sync
            window.localStorage.setItem(key, JSON.stringify(cloudData));
        }
      } else {
        // If doc doesn't exist yet, create it with current local value
        setDoc(docRef, { val: value }, { merge: true });
      }
      isFirstLoad.current = false;
    });

    return () => unsubscribe();
  }, [user, key]); // Re-run if user logs in/out

  // 3. SAVE TO CLOUD & LOCAL (Setter)
  const setAndSave = (newValue) => {
    // Handle "function updates" like setCount(prev => prev + 1)
    const valueToStore = newValue instanceof Function ? newValue(value) : newValue;
    
    // A. Update React State
    setValue(valueToStore);

    // B. Save Local
    try {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch(e) { console.error("Local Save Error", e); }

    // C. Save Cloud (Debounced mostly by UI speed, but direct write here)
    if (user) {
        const docRef = doc(db, 'users', user.uid, 'appData', key);
        // We use setDoc with merge to ensure the document structure exists
        setDoc(docRef, { val: valueToStore, updatedAt: Date.now() }, { merge: true })
            .catch(e => console.error("Cloud Save Error", e));
    }
  };

  return [value, setAndSave];
}