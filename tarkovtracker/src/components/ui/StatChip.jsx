import React from 'react';

export default function StatChip({ icon, label, done, total }) {
  const Icon = icon;
  return (
    <span className="stat-chip">
      <Icon size={14} />
      {label}: <b>{done}/{total}</b>
    </span>
  );
}
