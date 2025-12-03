import React, { useState, useEffect } from 'react';
// IMPORT FIREBASE AUTH
import { auth } from './firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';

// IMPORT NEW HOOK
import { useFirebaseSync } from './hooks/useFirebaseSync';

import PriceChecker from './components/PriceChecker';
import TrackerTab from './components/TrackerTab';
import HideoutTab from './components/HideoutTab';
import QuestsTab from './components/QuestsTab';
import SquadTab from './components/SquadTab'; // Import new Tab
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('search');
  
  // 1. User Auth State
  const [user, setUser] = useState(null);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
    });
    return () => unsub();
  }, []);

  // 2. REPLACE useLocalStorage WITH useFirebaseSync
  // We pass 'user' so it knows when to switch to Cloud mode
  const [itemProgress, setItemProgress] = useFirebaseSync(user, 'tarkov_progress_v2', {});
  const [hideoutLevels, setHideoutLevels] = useFirebaseSync(user, 'tarkov_hideout_levels', {});
  const [completedQuests, setCompletedQuests] = useFirebaseSync(user, 'tarkov_completed_quests', []);

  return (
    <div className="app-container">
      <header>
        <h1>Tarkov Companion Web</h1>
        <nav>
          <button className={activeTab === 'search' ? 'active' : ''} onClick={() => setActiveTab('search')}>Price Check</button>
          <button className={activeTab === 'tracker' ? 'active' : ''} onClick={() => setActiveTab('tracker')}>Tracker</button>
          <button className={activeTab === 'hideout' ? 'active' : ''} onClick={() => setActiveTab('hideout')}>Hideout</button>
          <button className={activeTab === 'quests' ? 'active' : ''} onClick={() => setActiveTab('quests')}>Quests</button>
          <button className={activeTab === 'squad' ? 'active' : ''} onClick={() => setActiveTab('squad')}>
             {user ? "Squad (Online)" : "Squad (Login)"}
          </button>
        </nav>
      </header>
      
      <main>
        {activeTab === 'search' && (
          <PriceChecker itemProgress={itemProgress} hideoutLevels={hideoutLevels} completedQuests={completedQuests} />
        )}
        {activeTab === 'tracker' && (
          <TrackerTab 
            itemProgress={itemProgress} setItemProgress={setItemProgress}
            hideoutLevels={hideoutLevels} completedQuests={completedQuests}
          />
        )}
        {activeTab === 'hideout' && (
          <HideoutTab levels={hideoutLevels} setLevels={setHideoutLevels} />
        )}
        {activeTab === 'quests' && (
          <QuestsTab completedQuests={completedQuests} setCompletedQuests={setCompletedQuests} />
        )}
        {/* NEW SQUAD TAB */}
        {activeTab === 'squad' && (
          <SquadTab 
            user={user} 
            hideoutLevels={hideoutLevels} 
            itemProgress={itemProgress} 
          />
        )}
      </main>
    </div>
  );
}

export default App;