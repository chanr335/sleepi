import React from 'react';
import { Lightbulb, Zap, Wind, Moon, ChevronRight } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import '../index.css';

function Coach() {
  return (
    <div className="page-content">
      <header className="page-header">
        <h1>Your Sleep Coach</h1>
        <p>AI-powered insights for better rest.</p>
      </header>

      <GlassCard className="tip-card">
        <div className="icon-box icon-yellow"><Lightbulb size={24} /></div>
        <div>
          <h3>Daily Tip</h3>
          <p>Try to go to bed at the same time every night. Consistency reinforces your body's sleep-wake cycle.</p>
        </div>
      </GlassCard>

      <GlassCard className="insight-card">
        <div className="card-header-row">
          <h3><Zap size={16} color="#22d3ee" /> Insight</h3>
          <span className="badge badge-green">+15% Improvement</span>
        </div>
        <p>Your sleep consistency has improved significantly this week compared to last month.</p>
      </GlassCard>

      <h3 className="section-title">Guided Programs</h3>
      <div className="program-list">
        <GlassCard className="list-item clickable">
           <div className="icon-box icon-indigo"><Wind size={24} /></div>
           <div className="info-col">
             <h4>Relaxation & Meditation</h4>
             <p>10 min • Wind down</p>
           </div>
           <ChevronRight className="chevron" />
        </GlassCard>
        <GlassCard className="list-item clickable">
           <div className="icon-box icon-pink"><Moon size={24} /></div>
           <div className="info-col">
             <h4>Master Your Environment</h4>
             <p>5 min • Read</p>
           </div>
           <ChevronRight className="chevron" />
        </GlassCard>
      </div>
    </div>
  );
}

export default Coach;

