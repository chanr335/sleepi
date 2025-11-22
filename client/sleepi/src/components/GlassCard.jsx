import React from 'react';
import '../index.css';

const GlassCard = ({ children, className = "", onClick }) => (
  <div onClick={onClick} className={`glass-card ${className}`}>
    {children}
  </div>
);

export default GlassCard;

