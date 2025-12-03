import React, { useState, useEffect } from 'react';
import { auth } from './firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { useFirebaseSync } from './hooks/useFirebaseSync';
import { useSquadData } from './hooks/useSquadData';

import PriceChecker from './components/PriceChecker';
import TrackerTab from './components/TrackerTab';
import HideoutTab from './components/HideoutTab';
import QuestsTab from './components/QuestsTab';
import SquadTab from './components/SquadTab';
import MapsTab from './components/MapsTab';
import KeyringTab from './components/KeyringTab'; // Import the new tab
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('search');
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    return () => unsub();
  }, []);

  // --- STATE MANAGEMENT ---
  const [itemProgress, setItemProgress] = useFirebaseSync(user, 'tarkov_progress_v2', {});
  const [hideoutLevels, setHideoutLevels] = useFirebaseSync(user, 'tarkov_hideout_levels', {});
  const [completedQuests, setCompletedQuests] = useFirebaseSync(user, 'tarkov_completed_quests', []);
  const [ownedKeys, setOwnedKeys] = useFirebaseSync(user, 'tarkov_owned_keys', {}); // NEW

  const { squadCode, joinSquad, squadMembers, squadData } = useSquadData(user);

  return (
    <div className="app-container">
      <header>
        <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
            <img src="/image.ico" alt="Logo" style={{width: '40px', height: '40px'}} />
            <h1>Tarkov Tracker by Yama</h1>
        </div>

        <nav>
          <button className={activeTab === 'search' ? 'active' : ''} onClick={() => setActiveTab('search')}>Price Check</button>
          <button className={activeTab === 'tracker' ? 'active' : ''} onClick={() => setActiveTab('tracker')}>Tracker</button>
          <button className={activeTab === 'hideout' ? 'active' : ''} onClick={() => setActiveTab('hideout')}>Hideout</button>
          <button className={activeTab === 'quests' ? 'active' : ''} onClick={() => setActiveTab('quests')}>Quests</button>
          <button className={activeTab === 'maps' ? 'active' : ''} onClick={() => setActiveTab('maps')}>Maps</button>
          <button className={activeTab === 'keys' ? 'active' : ''} onClick={() => setActiveTab('keys')}>Keyring</button>
          
          <button className={activeTab === 'squad' ? 'active' : ''} onClick={() => setActiveTab('squad')}>
             {squadCode ? `Squad: ${squadCode}` : "Squad (Login)"}
          </button>
        </nav>
      </header>
      
      <main>
        {activeTab === 'search' && (
          <PriceChecker 
            itemProgress={itemProgress} 
            hideoutLevels={hideoutLevels} 
            completedQuests={completedQuests}
            squadMembers={squadMembers}
            squadData={squadData}
            ownedKeys={ownedKeys} // Pass this
          />
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
        {activeTab === 'maps' && (
          <MapsTab completedQuests={completedQuests} />
        )}
        {activeTab === 'keys' && (
          <KeyringTab ownedKeys={ownedKeys} setOwnedKeys={setOwnedKeys} />
        )}
        {activeTab === 'squad' && (
          <SquadTab 
            user={user} 
            squadCode={squadCode}
            joinSquad={joinSquad}
            squadMembers={squadMembers}
            squadData={squadData}
          />
        )}
      </main>
    </div>
  );
}

export default App;