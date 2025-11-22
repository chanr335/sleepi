import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, Trophy, Zap, User, Moon, Activity, 
  ChevronRight, Lightbulb, Wind, Smartphone, LogOut 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import './index.css'; // Make sure to import the CSS file

// --- UI Components ---

const GlassCard = ({ children, className = "", onClick }) => (
  <div onClick={onClick} className={`glass-card ${className}`}>
    {children}
  </div>
);

const Button = ({ children, variant = "primary", className = "", ...props }) => {
  return (
    <button className={`btn btn-${variant} ${className}`} {...props}>
      {children}
    </button>
  );
};

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

// --- Page Components ---

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
              <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: '#1e1b4b', borderColor: '#4338ca', borderRadius: '12px', color: '#fff' }} />
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

const Leaderboard = () => {
  const [view, setView] = useState('global');
  const users = [
    { rank: 1, name: "Sarah M.", score: 98.5, trend: 'up', color: '#f59e0b' },
    { rank: 2, name: "David K.", score: 94.2, trend: 'up', color: '#94a3b8' },
    { rank: 3, name: "Jessica L.", score: 89.1, trend: 'down', color: '#c2410c' },
    { rank: 4, name: "Mike R.", score: 82.0, trend: 'neutral', color: '#4f46e5' },
    { rank: 12, name: "You", score: 65.2, trend: 'up', color: '#0891b2', isMe: true },
  ];

  return (
    <div className="page-content">
      <header className="page-header">
        <h1>Leaderboard</h1>
        <p>Compete with friends & the world.</p>
      </header>

      <div className="toggle-container">
        <div className={`toggle-slider ${view === 'friends' ? 'left' : 'right'}`} />
        <button onClick={() => setView('friends')} className={view === 'friends' ? 'active' : ''}>Friends</button>
        <button onClick={() => setView('global')} className={view === 'global' ? 'active' : ''}>Global</button>
      </div>

      <div className="leaderboard-list">
        {users.map((user) => (
          <GlassCard key={user.rank} className={`list-item ${user.isMe ? 'highlight-me' : ''}`}>
            <div className="rank-col">
              {user.rank <= 3 ? <Trophy size={20} color={user.rank === 1 ? '#fbbf24' : user.rank === 2 ? '#cbd5e1' : '#fb923c'} /> : user.rank}
            </div>
            <div className="avatar-col" style={{ backgroundColor: user.color }}>
              {user.name.charAt(0)}
            </div>
            <div className="info-col">
              <h4>{user.name} {user.isMe && <span>(Me)</span>}</h4>
              <p>{user.score} POINTS</p>
            </div>
            <div className="trend-col">
              {user.trend === 'up' && <span className="trend-up">▲</span>}
              {user.trend === 'down' && <span className="trend-down">▼</span>}
              {user.trend === 'neutral' && <span className="trend-flat">-</span>}
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
};

const Coach = () => (
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

const Profile = () => (
  <div className="page-content">
    <header className="page-header">
      <h1>Profile</h1>
      <p>Manage your settings and devices.</p>
    </header>

    <div className="profile-header">
      <div className="profile-avatar">
         <User size={40} />
      </div>
      <h2>FertenhxBnans</h2>
      <p>London, Ontario</p>
    </div>

    <div className="form-section">
      <label>Personal Info</label>
      <GlassCard className="input-group">
         <input type="text" defaultValue="FertenhxBnans" />
         <div className="divider" />
         <input type="email" defaultValue="user@example.com" />
      </GlassCard>
    </div>

    <div className="form-section">
      <label>Devices</label>
      <GlassCard className="list-item">
         <div className="flex-row">
            <Smartphone color="#22d3ee" size={20} style={{ marginRight: 10 }} />
            <span>Apple Watch Series 8</span>
         </div>
         <span className="badge badge-green">Connected</span>
      </GlassCard>
    </div>

    <div className="form-section">
      <label>Preferences</label>
      <GlassCard className="settings-list">
         <div className="setting-row">
            <span>Daily Reminders</span>
            <div className="switch checked"><div className="knob" /></div>
         </div>
         <div className="setting-row">
            <span>Dark Mode</span>
            <div className="switch checked"><div className="knob" /></div>
         </div>
      </GlassCard>
    </div>
    
    <div className="button-group footer-actions">
       <Button variant="primary">Save Changes</Button>
       <Button variant="ghost"><LogOut size={18} /> Sign Out</Button>
    </div>
  </div>
);

// --- Main App Component ---

export default function App() {
  const [activeTab, setActiveTab] = useState('home');

  const tabs = {
    home: <Dashboard />,
    leaderboard: <Leaderboard />,
    coach: <Coach />,
    profile: <Profile />
  };

  return (
    <div className="app-container">
      <div className="background-fx">
        <div className="bg-gradient" />
        <div className="glow glow-1" />
        <div className="glow glow-2" />
        <div className="stars" />
      </div>

      <main className="main-viewport">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -10, filter: 'blur(10px)' }}
            transition={{ duration: 0.25 }}
          >
            {tabs[activeTab]}
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className="bottom-nav">
        {[
          { id: 'home', icon: Home, label: 'Home' },
          { id: 'leaderboard', icon: Trophy, label: 'Rank' },
          { id: 'coach', icon: Zap, label: 'Coach' },
          { id: 'profile', icon: User, label: 'Profile' },
        ].map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              {isActive && <motion.div layoutId="nav-glow" className="nav-indicator" />}
              <item.icon size={24} className="nav-icon" />
              <span className="nav-label">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
