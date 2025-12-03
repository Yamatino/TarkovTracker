import React, { useState } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import PriceChecker from './components/PriceChecker';
import TrackerTab from './components/TrackerTab';
import HideoutTab from './components/HideoutTab';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('search');
  
  // Storage
  const [itemProgress, setItemProgress] = useLocalStorage('tarkov_progress_v2', {});
  const [hideoutLevels, setHideoutLevels] = useLocalStorage('tarkov_hideout_levels', {});

  return (
    <div className="app-container">
      <header>
        <h1>Tarkov Companion Web</h1>
        <nav>
          <button className={activeTab === 'search' ? 'active' : ''} onClick={() => setActiveTab('search')}>Price Check</button>
          <button className={activeTab === 'tracker' ? 'active' : ''} onClick={() => setActiveTab('tracker')}>Tracker</button>
          <button className={activeTab === 'hideout' ? 'active' : ''} onClick={() => setActiveTab('hideout')}>Hideout</button>
        </nav>
      </header>
      
      <main>
        {activeTab === 'search' && (
          <PriceChecker 
            itemProgress={itemProgress} 
            hideoutLevels={hideoutLevels} 
          />
        )}
        {activeTab === 'tracker' && (
          <TrackerTab 
            itemProgress={itemProgress} 
            setItemProgress={setItemProgress}
            hideoutLevels={hideoutLevels}
          />
        )}
        {activeTab === 'hideout' && (
          <HideoutTab levels={hideoutLevels} setLevels={setHideoutLevels} />
        )}
      </main>
    </div>
  );
}

export default App;