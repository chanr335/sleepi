import React from 'react';
import { Moon, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';
import CircularProgress from '../components/CircularProgress';
import '../index.css';

const Dashboard = () => {
  const sleepData = [
    { day: 'Mon', hours: 6.5 },
    { day: 'Tue', hours: 7.2 },
    { day: 'Wed', hours: 5.8 },
    { day: 'Thu', hours: 7.8 },
    { day: 'Fri', hours: 8.2 },
    { day: 'Sat', hours: 9.0 },
    { day: 'Sun', hours: 7.4 },
  ];

  return (
    <div className="page-content">
      <header className="page-header">
        <h1>Welcome Back!</h1>
        <p>Here's your sleep dashboard.</p>
      </header>

      <GlassCard className="center-content">
        <h3 className="card-label">Last Night's Sleep</h3>
        <CircularProgress value={7.75} max={9} label="7h 45m" subLabel="Goal: 8h 00m" />
        <div className="badge badge-green">Optimal Range</div>
      </GlassCard>

      <div className="grid-2-col">
        <GlassCard className="stat-card">
          <div className="icon-box icon-indigo"><Moon size={20} /></div>
          <div className="stat-info">
            <span className="stat-value">1h 59m</span>
            <span className="stat-label">Deep Sleep</span>
          </div>
        </GlassCard>
        <GlassCard className="stat-card">
          <div className="icon-box icon-cyan"><Activity size={20} /></div>
          <div className="stat-info">
            <span className="stat-value">86/100</span>
            <span className="stat-label">Sleep Score</span>
          </div>
        </GlassCard>
      </div>

      <GlassCard>
        <h3 className="card-title">Weekly Trend</h3>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sleepData}>
              <XAxis dataKey="day" stroke="#a5b4fc" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: '#2a2a2a', borderColor: '#4338ca', borderRadius: '12px', color: '#fff' }} />
              <Bar dataKey="hours" radius={[4, 4, 4, 4]}>
                {sleepData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.hours >= 7 ? '#22d3ee' : '#6366f1'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      <div className="button-group">
        <Button>Log My Sleep</Button>
        <Button variant="outline">Connect Wearable</Button>
      </div>
    </div>
  );
};

export default Dashboard;

