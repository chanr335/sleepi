import React from 'react';
import '../index.css';

const GlassCard = ({ children, className = "", onClick }) => (
  <div 
    onClick={onClick} 
    className={`glass-card ${className}`}
    tabIndex={onClick ? 0 : -1}
    onMouseDown={(e) => {
      // Prevent focus on click
      if (!onClick) {
        e.preventDefault();
      }
    }}
  >
    {children}
  </div>
);

export default GlassCard;

