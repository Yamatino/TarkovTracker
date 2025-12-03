import React, { useState, useEffect } from 'react';
import { auth } from './firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { useFirebaseSync } from './hooks/useFirebaseSync';
import { useSquadData } from './hooks/useSquadData';
import { useGlobalData } from './hooks/useGlobalData';

import PriceChecker from './components/PriceChecker';
import TrackerTab from './components/TrackerTab';
import HideoutTab from './components/HideoutTab';
import QuestsTab from './components/QuestsTab';
import SquadTab from './components/SquadTab';
import KeyringTab from './components/KeyringTab';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('search');
  const [user, setUser] = useState(null);

  const { data: globalData, loading, status } = useGlobalData();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    return () => unsub();
  }, []);

  const [itemProgress, setItemProgress] = useFirebaseSync(user, 'tarkov_progress_v2', {});
  const [hideoutLevels, setHideoutLevels] = useFirebaseSync(user, 'tarkov_hideout_levels', {});
  const [completedQuests, setCompletedQuests] = useFirebaseSync(user, 'tarkov_completed_quests', []);
  const [ownedKeys, setOwnedKeys] = useFirebaseSync(user, 'tarkov_owned_keys', {}); 

  const { squadCode, joinSquad, squadMembers, squadData } = useSquadData(user);

  if (loading) {
      return (
          <div className="app-container" style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', flexDirection:'column'}}>
              <img src="/image.ico" alt="Loading" style={{width:'80px', marginBottom:'20px', animation:'spin 2s linear infinite'}} />
              <h2>Tarkov Tracker by Yama</h2>
              <p style={{color:'#888'}}>{status}</p>
              <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
          </div>
      );
  }

  // Helper for button text
  const getSquadLabel = () => {
      if (!squadCode) return "Squad (Login)";
      if (squadCode === "general-lobby") return "Squad (Lobby)";
      return "Squad"; // Keep it short so it doesn't wrap
  };

  return (
    <div className="app-container">
      <header>
        <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
            <img src="/image.ico" alt="Logo" style={{width: '40px', height: '40px'}} />
            <h1 className="app-title">Tarkov Tracker</h1>
        </div>

        <nav>
          <button className={activeTab === 'search' ? 'active' : ''} onClick={() => setActiveTab('search')}>Price Check</button>
          <button className={activeTab === 'tracker' ? 'active' : ''} onClick={() => setActiveTab('tracker')}>Tracker</button>
          <button className={activeTab === 'hideout' ? 'active' : ''} onClick={() => setActiveTab('hideout')}>Hideout</button>
          <button className={activeTab === 'quests' ? 'active' : ''} onClick={() => setActiveTab('quests')}>Quests</button>
          <button className={activeTab === 'keys' ? 'active' : ''} onClick={() => setActiveTab('keys')}>Keyring</button>
          <button className={activeTab === 'squad' ? 'active' : ''} onClick={() => setActiveTab('squad')}>
             {getSquadLabel()}
          </button>
        </nav>
      </header>
      
      <main>
        {activeTab === 'search' && (
          <PriceChecker 
            globalData={globalData} 
            itemProgress={itemProgress} 
            hideoutLevels={hideoutLevels} 
            completedQuests={completedQuests}
            squadMembers={squadMembers}
            squadData={squadData}
            ownedKeys={ownedKeys}
          />
        )}
        {activeTab === 'tracker' && (
          <TrackerTab 
            globalData={globalData} 
            itemProgress={itemProgress} setItemProgress={setItemProgress}
            hideoutLevels={hideoutLevels} completedQuests={completedQuests}
          />
        )}
        {activeTab === 'hideout' && (
          <HideoutTab 
            globalData={globalData} 
            levels={hideoutLevels} setLevels={setHideoutLevels} 
           />
        )}
        {activeTab === 'quests' && (
          <QuestsTab 
            globalData={globalData} 
            completedQuests={completedQuests} setCompletedQuests={setCompletedQuests} 
           />
        )}
        {activeTab === 'keys' && (
          <KeyringTab 
            globalData={globalData} 
            ownedKeys={ownedKeys} setOwnedKeys={setOwnedKeys} 
            squadMembers={squadMembers} squadData={squadData}
           />
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