import React, { useState, useEffect } from 'react';
import { Trophy } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import '../index.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Color palette for user avatars
const COLORS = ['#f59e0b', '#94a3b8', '#c2410c', '#4f46e5', '#0891b2', '#10b981', '#8b5cf6', '#ec4899'];

const Leaderboard = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLeaderboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch list of users
        const usersResponse = await fetch(`${API_BASE_URL}/sleep/users`);
        if (!usersResponse.ok) {
          throw new Error('Failed to fetch users');
        }
        const usersData = await usersResponse.json();
        const usernames = usersData.users || [];

        // Fetch sleep data for each user and calculate averages
        const usersWithAverages = await Promise.all(
          usernames.map(async (username, index) => {
            try {
              const sleepResponse = await fetch(`${API_BASE_URL}/sleep/${username}/total`);
              if (!sleepResponse.ok) {
                throw new Error(`Failed to fetch sleep data for ${username}`);
              }
              const sleepData = await sleepResponse.json();
              
              // Calculate average sleep hours
              const validSleepData = sleepData.filter(entry => entry.TotalSleepHours > 0);
              const averageSleep = validSleepData.length > 0
                ? validSleepData.reduce((sum, entry) => sum + entry.TotalSleepHours, 0) / validSleepData.length
                : 0;

              // Format name (capitalize first letter)
              const formattedName = username.charAt(0).toUpperCase() + username.slice(1);

              return {
                username,
                name: formattedName,
                averageSleep,
                color: COLORS[index % COLORS.length],
              };
            } catch (err) {
              console.error(`Error fetching data for ${username}:`, err);
              return {
                username,
                name: username.charAt(0).toUpperCase() + username.slice(1),
                averageSleep: 0,
                color: COLORS[index % COLORS.length],
              };
            }
          })
        );

        // Sort by average sleep (descending) and assign ranks
        const sortedUsers = usersWithAverages
          .sort((a, b) => b.averageSleep - a.averageSleep)
          .map((user, index) => ({
            ...user,
            rank: index + 1,
          }));

        setUsers(sortedUsers);
        setError(null);
      } catch (err) {
        console.error('Error fetching leaderboard data:', err);
        setError('Failed to load leaderboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboardData();
  }, []);

  const formatSleepHours = (hours) => {
    if (hours === 0) return '0 hrs';
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    if (minutes === 0) {
      return `${wholeHours} hrs`;
    }
    return `${wholeHours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <div className="page-content">
        <header className="page-header">
          <h1>Leaderboard</h1>
          <p>Compete with your friends.</p>
        </header>
        <GlassCard className="center-content">
          <p>Loading leaderboard...</p>
        </GlassCard>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-content">
        <header className="page-header">
          <h1>Leaderboard</h1>
          <p>Compete with your friends.</p>
        </header>
        <GlassCard className="center-content">
          <p style={{ color: '#ef4444' }}>{error}</p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="page-content">
      <header className="page-header">
        <h1>Leaderboard</h1>
        <p>Compete with your friends.</p>
      </header>

      {users.length === 0 ? (
        <GlassCard className="center-content">
          <p>No users found.</p>
        </GlassCard>
      ) : (
        <div className="leaderboard-list">
          {users.map((user) => (
            <GlassCard key={user.username} className={`list-item ${user.isMe ? 'highlight-me' : ''}`}>
              <div className="rank-col">
                {user.rank <= 3 ? (
                  <Trophy 
                    size={20} 
                    color={
                      user.rank === 1 ? '#fbbf24' :
                      user.rank === 2 ? '#cbd5e1' :
                                        '#fb923c'
                    } 
                  />
                ) : (
                  user.rank
                )}
              </div>

              <div className="avatar-col" style={{ backgroundColor: user.color }}>
                {user.name.charAt(0)}
              </div>

              <div className="info-col">
                <h4>
                  {user.name} {user.isMe && <span>(Me)</span>}
                </h4>
                <p>{formatSleepHours(user.averageSleep)}</p>
              </div>

              <div className="trend-col">
                {/* Trend indicators can be added later based on week-over-week comparison */}
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
