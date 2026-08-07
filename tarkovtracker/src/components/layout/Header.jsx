import React from 'react';

export default function Header({ gameMode, setGameMode, faction, setFaction }) {
  return (
    <header className="app-header">
      <div className="brand">
        <img src="/image.ico" alt="Logo" />
        <h1>Tarkov Tracker</h1>
      </div>

      <div className="header-selectors">
        <select value={gameMode} onChange={(e) => setGameMode(e.target.value)} className="mode-select" aria-label="Game mode">
          <option value="regular">Regular (PvP)</option>
          <option value="pve">PvE</option>
          <option value="pvp-season">PvP Season</option>
        </select>

        <select value={faction || ''} onChange={(e) => setFaction(e.target.value || null)} className="mode-select" aria-label="Faction">
          <option value="">Faction: Unset</option>
          <option value="BEAR">BEAR</option>
          <option value="USEC">USEC</option>
        </select>
      </div>
    </header>
  );
}
