import React from 'react';
import { NAV_ITEMS } from '../../config/navItems';

export default function BottomNav({ activeTab, setActiveTab, squadLabel }) {
  return (
    <nav className="bottomnav" aria-label="Primary">
      {NAV_ITEMS.map((item) => {
        const Icon = item.Icon;
        return (
          <button
            key={item.key}
            type="button"
            className={`bottomnav-item ${activeTab === item.key ? 'active' : ''}`}
            onClick={() => setActiveTab(item.key)}
          >
            <Icon size={20} />
            <span className="nav-label">{item.key === 'squad' ? squadLabel : item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
