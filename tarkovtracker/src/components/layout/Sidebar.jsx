import React from 'react';
import { NAV_ITEMS } from '../../config/navItems';

export default function Sidebar({ activeTab, setActiveTab, squadLabel }) {
  return (
    <nav className="sidebar" aria-label="Primary">
      {NAV_ITEMS.map((item) => {
        const Icon = item.Icon;
        return (
          <button
            key={item.key}
            type="button"
            className={`sidebar-nav-item ${activeTab === item.key ? 'active' : ''}`}
            onClick={() => setActiveTab(item.key)}
            title={item.key === 'squad' ? squadLabel : item.label}
          >
            <Icon size={20} />
            <span className="nav-label">{item.key === 'squad' ? squadLabel : item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
