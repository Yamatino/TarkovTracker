import React from 'react';

export default function Avatar({ src, name, size = 40, className = '' }) {
  const initial = name ? name.charAt(0).toUpperCase() : '?';
  return (
    <div className={`avatar ${className}`} style={{ '--avatar-size': `${size}px` }}>
      {src ? <img src={src} alt="" /> : <span>{initial}</span>}
    </div>
  );
}
