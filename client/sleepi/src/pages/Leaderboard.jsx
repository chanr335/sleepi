import React, { useState, useEffect } from 'react';
import { Trophy, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '../components/GlassCard';
import '../index.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Color palette for user avatars - standard colors
const COLORS = ['#E63946', '#F77F00', '#FCBF49', '#06A77D', '#118AB2', '#073B4C', '#7209B7', '#560BAD'];

const CATEGORIES = [
  { id: 'total', label: 'Total', endpoint: 'total', column: 'TotalSleepHours' },
  { id: 'rem', label: 'REM', endpoint: 'rem', column: 'REM' },
  { id: 'core', label: 'Core', endpoint: 'core', column: 'Core' },
  { id: 'deep', label: 'Deep', endpoint: 'deep', column: 'Deep' },
];

const DATE_FILTERS = [
  { id: 'day', label: 'Past Day', days: 1 },
  { id: 'week', label: 'Week', days: 7 },
  { id: 'month', label: 'Month', days: 30 },
  { id: '6months', label: '6 Months', days: 180 },
  { id: 'year', label: 'Year', days: 365 },
  { id: 'all', label: 'All Time', days: null },
];

const Leaderboard = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('total');
  const [selectedDateFilter, setSelectedDateFilter] = useState('all');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const filterDataByDate = (data, dateFilterId) => {
    if (dateFilterId === 'all') {
      return data;
    }

    const dateFilter = DATE_FILTERS.find(filter => filter.id === dateFilterId);
    if (!dateFilter || !dateFilter.days) {
      return data;
    }

    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    const cutoffDate = new Date(today);
    cutoffDate.setDate(cutoffDate.getDate() - dateFilter.days);
    cutoffDate.setHours(0, 0, 0, 0); // Start of that day

    return data.filter(entry => {
      if (!entry.night) return false;
      const entryDate = new Date(entry.night);
      return entryDate >= cutoffDate && entryDate <= today;
    });
  };

  const fetchLeaderboardData = async (category, dateFilterId) => {
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
            
            // Filter by date range
            const dateFilteredData = filterDataByDate(sleepData, dateFilterId);
            
            // Calculate average sleep hours for the selected category
            // Filter out entries with 0 or negative values
            const validSleepData = dateFilteredData.filter(entry => entry[categoryConfig.column] > 0);
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
    fetchLeaderboardData(selectedCategory, selectedDateFilter);
  }, [selectedCategory, selectedDateFilter]);

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
          <p style={{ color: '#D9B88F' }}>{error}</p>
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
                key={`${user.username}-${selectedCategory}-${selectedDateFilter}`}
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
                          user.rank === 1 ? '#E8C085' :
                          user.rank === 2 ? '#F0E0C0' :
                                            '#D9B88F'
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

      {/* Category Buttons and Date Filter - Moved to bottom for better mobile accessibility */}
      <div style={{ 
        display: 'flex', 
        gap: '0.5rem', 
        marginTop: '1.5rem',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        {CATEGORIES.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '18px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backgroundColor: selectedCategory === category.id ? 'rgba(232, 192, 133, 0.2)' : '#1C1C1E',
              color: selectedCategory === category.id ? '#FFFFFF' : '#8E8E93',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: selectedCategory === category.id ? '600' : '400',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (selectedCategory !== category.id) {
                e.target.style.backgroundColor = '#222224';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedCategory !== category.id) {
                e.target.style.backgroundColor = '#1C1C1E';
              }
            }}
          >
            {category.label}
          </button>
        ))}
        
        {/* Date Filter Dropdown */}
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            style={{
              padding: '0.5rem 1rem',
              paddingRight: '2rem',
              borderRadius: '18px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backgroundColor: '#1C1C1E',
              color: '#8E8E93',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '400',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#222224';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#1C1C1E';
            }}
          >
            {DATE_FILTERS.find(f => f.id === selectedDateFilter)?.label || 'All Time'}
            <ChevronDown 
              size={16} 
              style={{ 
                position: 'absolute',
                right: '0.5rem',
                transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease'
              }} 
            />
          </button>
          
          {isDropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              style={{
                position: 'absolute',
                bottom: '100%',
                left: 0,
                marginBottom: '0.5rem',
                backgroundColor: '#1C1C1E',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '18px',
                padding: '0.25rem',
                minWidth: '150px',
                zIndex: 1000,
              }}
            >
              {DATE_FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => {
                    setSelectedDateFilter(filter.id);
                    setIsDropdownOpen(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '0.5rem 1rem',
                    borderRadius: '12px',
                    border: 'none',
                    backgroundColor: selectedDateFilter === filter.id ? 'rgba(232, 192, 133, 0.2)' : 'transparent',
                    color: selectedDateFilter === filter.id ? '#FFFFFF' : '#8E8E93',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    textAlign: 'left',
                    fontWeight: selectedDateFilter === filter.id ? '600' : '400',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedDateFilter !== filter.id) {
                      e.target.style.backgroundColor = '#222224';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedDateFilter !== filter.id) {
                      e.target.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {filter.label}
                </button>
              ))}
            </motion.div>
          )}
        </div>
      </div>
      
      {/* Click outside to close dropdown */}
      {isDropdownOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999,
          }}
          onClick={() => setIsDropdownOpen(false)}
        />
      )}
    </div>
  );
};

export default Leaderboard;
