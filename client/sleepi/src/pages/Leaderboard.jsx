import React, { useState } from 'react';
import { Trophy } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import '../index.css';

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

export default Leaderboard;

