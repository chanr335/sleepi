import React, { useState, useEffect } from 'react';
import { Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '../components/GlassCard';
import '../index.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Color palette for user avatars
const COLORS = ['#f59e0b', '#94a3b8', '#c2410c', '#4f46e5', '#0891b2', '#10b981', '#8b5cf6', '#ec4899'];

const CATEGORIES = [
  { id: 'total', label: 'Total', endpoint: 'total', column: 'TotalSleepHours' },
  { id: 'rem', label: 'REM', endpoint: 'rem', column: 'REM' },
  { id: 'core', label: 'Core', endpoint: 'core', column: 'Core' },
  { id: 'deep', label: 'Deep', endpoint: 'deep', column: 'Deep' },
];

const Leaderboard = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('total');

  const fetchLeaderboardData = async (category) => {
    try {
      setLoading(true);
      
      // Find the category config
      const categoryConfig = CATEGORIES.find(cat => cat.id === category);
      if (!categoryConfig) {
        throw new Error('Invalid category');
      }
      
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
            const sleepResponse = await fetch(`${API_BASE_URL}/sleep/${username}/${categoryConfig.endpoint}`);
            if (!sleepResponse.ok) {
              throw new Error(`Failed to fetch sleep data for ${username}`);
            }
            const sleepData = await sleepResponse.json();
            
            // Calculate average sleep hours for the selected category
            // Filter out entries with 0 or negative values
            const validSleepData = sleepData.filter(entry => entry[categoryConfig.column] > 0);
            const averageSleep = validSleepData.length > 0
              ? validSleepData.reduce((sum, entry) => sum + entry[categoryConfig.column], 0) / validSleepData.length
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

  useEffect(() => {
    fetchLeaderboardData(selectedCategory);
  }, [selectedCategory]);

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

  const getCategoryLabel = () => {
    const category = CATEGORIES.find(cat => cat.id === selectedCategory);
    return category ? category.label : 'Total';
  };

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
          <AnimatePresence mode="popLayout">
            {users.map((user, index) => (
              <motion.div
                key={`${user.username}-${selectedCategory}`}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{
                  layout: { duration: 0.4, ease: "easeInOut" },
                  opacity: { duration: 0.2 },
                  y: { duration: 0.3 }
                }}
                style={{ marginBottom: '0.75rem' }}
              >
                <GlassCard className={`list-item ${user.isMe ? 'highlight-me' : ''}`}>
                  <motion.div 
                    className="rank-col"
                    layout
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                  >
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
                  </motion.div>

                  <div className="avatar-col" style={{ backgroundColor: user.color }}>
                    {user.name.charAt(0)}
                  </div>

                  <div className="info-col">
                    <h4>
                      {user.name} {user.isMe && <span>(Me)</span>}
                    </h4>
                    <p>{formatSleepHours(user.averageSleep)} {getCategoryLabel()}</p>
                  </div>

                  <div className="trend-col">
                    {/* Trend indicators can be added later based on week-over-week comparison */}
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Category Buttons - Moved to bottom for better mobile accessibility */}
      <div style={{ 
        display: 'flex', 
        gap: '0.5rem', 
        marginTop: '1.5rem',
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        {CATEGORIES.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              border: 'none',
              backgroundColor: selectedCategory === category.id ? '#4f46e5' : 'rgba(255, 255, 255, 0.1)',
              color: selectedCategory === category.id ? '#fff' : 'rgba(255, 255, 255, 0.8)',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: selectedCategory === category.id ? '600' : '400',
              transition: 'all 0.2s ease',
              backdropFilter: 'blur(10px)',
            }}
            onMouseEnter={(e) => {
              if (selectedCategory !== category.id) {
                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedCategory !== category.id) {
                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              }
            }}
          >
            {category.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Leaderboard;
