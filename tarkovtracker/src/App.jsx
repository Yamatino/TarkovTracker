import React, { useState, useEffect } from 'react';
import { RotateCw } from 'lucide-react';
import { auth } from './firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { useFirebaseSync } from './hooks/useFirebaseSync';
import { useSquadData } from './hooks/useSquadData';
import { useGlobalData } from './hooks/useGlobalData';

import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import BottomNav from './components/layout/BottomNav';
import PriceChecker from './components/PriceChecker';
import TrackerTab from './components/TrackerTab';
import HideoutTab from './components/HideoutTab';
import QuestsTab from './components/QuestsTab';
import SquadTab from './components/SquadTab';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('search');
  const [user, setUser] = useState(null);
  
  // NEW: State to track the selected game mode (defaults to regular)
  const [gameMode, setGameMode] = useState('pvp-season');

  // UPDATED: Pass the gameMode to your data fetching hook
  const { data: globalData, loading, status, retry } = useGlobalData(gameMode);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    return () => unsub();
  }, []);

  // Firebase sync hooks
  const [itemProgress, setItemProgress] = useFirebaseSync(user, 'tarkov_progress_v2', {});
  const [hideoutLevels, setHideoutLevels] = useFirebaseSync(user, 'tarkov_hideout_levels', {});
  const [completedQuests, setCompletedQuests] = useFirebaseSync(user, 'tarkov_completed_quests', []);
  const [faction, setFaction] = useFirebaseSync(user, 'tarkov_faction', null);

  const { squadCode, joinSquad, squadMembers, squadData } = useSquadData(user);

  if (loading) {
      return (
          <div className="loading-screen">
              <img src="/image.ico" alt="Loading" />
              <h2>Tarkov Tracker by Yama</h2>
              <p>{status}</p>
          </div>
      );
  }

  if (!globalData) {
      return (
          <div className="error-screen">
              <img src="/image.ico" alt="Error" />
              <h2>Tarkov Tracker by Yama</h2>
              <p>{status}</p>
              <button onClick={retry} className="btn btn-primary" style={{marginTop: '15px'}}>
                  <RotateCw size={16} /> Retry
              </button>
          </div>
      );
  }

  // Helper for button text
  const getSquadLabel = () => {
      if (!squadCode) return "Squad (Login)";
      if (squadCode === "general-lobby") return "Squad (Lobby)";
      return "Squad";
  };

  return (
    <div className="app-shell">
      <Header gameMode={gameMode} setGameMode={setGameMode} faction={faction} setFaction={setFaction} />

      <div className="app-body">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} squadLabel={getSquadLabel()} />

        <main className="app-main">
          <div className="app-main-inner">
            {activeTab === 'search' && (
              <PriceChecker
                globalData={globalData}
                gameMode={gameMode} // NEW: Passed down so PriceChecker can fetch price history
                itemProgress={itemProgress}
                hideoutLevels={hideoutLevels}
                completedQuests={completedQuests}
                squadMembers={squadMembers}
                squadData={squadData}
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
                faction={faction}
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
          </div>
        </main>
      </div>

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} squadLabel={getSquadLabel()} />
    </div>
  );
}

export default App;