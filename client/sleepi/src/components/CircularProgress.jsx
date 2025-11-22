import React from 'react';
import '../index.css';

const CircularProgress = ({ value, max, label, subLabel }) => {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / max) * circumference;

  return (
    <div className="circular-progress-container">
      <svg className="progress-ring" width="192" height="192">
        <circle
          className="progress-ring-bg"
          stroke="currentColor"
          strokeWidth="12"
          fill="transparent"
          r={radius}
          cx="96"
          cy="96"
        />
        <circle
          className="progress-ring-fill"
          stroke="currentColor"
          strokeWidth="12"
          fill="transparent"
          r={radius}
          cx="96"
          cy="96"
          style={{ 
            strokeDasharray: `${circumference} ${circumference}`, 
            strokeDashoffset 
          }}
        />
      </svg>
      <div className="progress-label">
        <span className="progress-text">{label}</span>
        <span className="progress-subtext">{subLabel}</span>
      </div>
    </div>
  );
};

export default CircularProgress;

