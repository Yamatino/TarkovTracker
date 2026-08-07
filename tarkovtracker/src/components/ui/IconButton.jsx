import React from 'react';

export default function IconButton({ icon, label, onClick, className = '', size = 16, ...rest }) {
  const Icon = icon;
  return (
    <button
      type="button"
      className={`icon-btn ${className}`}
      onClick={onClick}
      aria-label={label}
      title={label}
      {...rest}
    >
      <Icon size={size} />
    </button>
  );
}
