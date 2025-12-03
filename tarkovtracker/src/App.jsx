import React, { useState } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import PriceChecker from './components/PriceChecker';
import TrackerTab from './components/TrackerTab';
import HideoutTab from './components/HideoutTab';
import QuestsTab from './components/QuestsTab';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('search');
  
  // Storage
  const [itemProgress, setItemProgress] = useLocalStorage('tarkov_progress_v2', {});
  const [hideoutLevels, setHideoutLevels] = useLocalStorage('tarkov_hideout_levels', {});
  const [completedQuests, setCompletedQuests] = useLocalStorage('tarkov_completed_quests', []);

  return (
    <div className="app-container">
      <header>
        <h1>Tarkov Companion Web</h1>
        <nav>
          <button className={activeTab === 'search' ? 'active' : ''} onClick={() => setActiveTab('search')}>Price Check</button>
          <button className={activeTab === 'tracker' ? 'active' : ''} onClick={() => setActiveTab('tracker')}>Tracker</button>
          <button className={activeTab === 'hideout' ? 'active' : ''} onClick={() => setActiveTab('hideout')}>Hideout</button>
          <button className={activeTab === 'quests' ? 'active' : ''} onClick={() => setActiveTab('quests')}>Quests Graph</button>
        </nav>
      </header>
      
      <main>
        {activeTab === 'search' && (
          <PriceChecker 
            itemProgress={itemProgress} 
            hideoutLevels={hideoutLevels}
            completedQuests={completedQuests} // <--- ADDED THIS LINE
          />
        )}
        {activeTab === 'tracker' && (
          <TrackerTab 
            itemProgress={itemProgress} 
            setItemProgress={setItemProgress}
            hideoutLevels={hideoutLevels}
            completedQuests={completedQuests}
          />
        )}
        {activeTab === 'hideout' && (
          <HideoutTab levels={hideoutLevels} setLevels={setHideoutLevels} />
        )}
        {activeTab === 'quests' && (
          <QuestsTab 
            completedQuests={completedQuests} 
            setCompletedQuests={setCompletedQuests} 
          />
        )}
      </main>
    </div>
  );
}

export default App;