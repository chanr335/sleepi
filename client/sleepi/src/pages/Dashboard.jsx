import React, { useState, useEffect } from 'react';
import { Moon, Activity, X, CheckCircle, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';
import CircularProgress from '../components/CircularProgress';
import '../index.css';

const API_BASE_URL = 'http://localhost:8000';

const Dashboard = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [date, setDate] = useState('');
  const [sleepHours, setSleepHours] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [username, setUsername] = useState('chandler'); // Default username, can be made dynamic later
  const [notification, setNotification] = useState(null);

  const sleepData = [
    { day: 'Mon', hours: 6.5 },
    { day: 'Tue', hours: 7.2 },
    { day: 'Wed', hours: 5.8 },
    { day: 'Thu', hours: 7.8 },
    { day: 'Fri', hours: 8.2 },
    { day: 'Sat', hours: 9.0 },
    { day: 'Sun', hours: 7.4 },
  ];

  // Auto-close notification after 4 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
  };

  const handleOpenModal = () => {
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    setDate(today);
    setSleepHours('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setDate('');
    setSleepHours('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!date || !sleepHours) {
      showNotification('Please fill in all fields', 'error');
      return;
    }

    const hours = parseFloat(sleepHours);
    if (isNaN(hours) || hours < 0) {
      showNotification('Please enter a valid number of hours', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/sleep/${username}/log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          night: date,
          TotalSleepHours: hours,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to log sleep');
      }

      const result = await response.json();
      showNotification(`Sleep logged successfully! ${result.total_sleep_hours} hours on ${result.night}`, 'success');
      handleCloseModal();
    } catch (error) {
      let errorMessage = 'Error logging sleep: ';
      if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
        errorMessage += 'Could not connect to the server. Please make sure the server is running on http://localhost:8000';
      } else {
        errorMessage += error.message;
      }
      showNotification(errorMessage, 'error');
      console.error('Error logging sleep:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <Button onClick={handleOpenModal}>Log My Sleep</Button>
        <Button variant="outline">Connect Wearable</Button>
      </div>

      {/* Modal Overlay */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <GlassCard className="modal-card">
              <div className="modal-header">
                <h2>Log My Sleep</h2>
                <button className="modal-close" onClick={handleCloseModal}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="modal-form">
                <div className="form-section">
                  <label>Date</label>
                  <GlassCard className="input-group">
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                    />
                  </GlassCard>
                </div>

                <div className="form-section">
                  <label>Sleep Hours</label>
                  <GlassCard className="input-group">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="24"
                      value={sleepHours}
                      onChange={(e) => setSleepHours(e.target.value)}
                      placeholder="e.g., 7.5"
                      required
                    />
                  </GlassCard>
                </div>

                <div className="modal-actions">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseModal}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Logging...' : 'Submit'}
                  </Button>
                </div>
              </form>
            </GlassCard>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {notification && (
        <div className={`notification notification-${notification.type}`}>
          <GlassCard className="notification-card">
            <div className="notification-content">
              {notification.type === 'success' ? (
                <CheckCircle size={20} className="notification-icon" />
              ) : (
                <AlertCircle size={20} className="notification-icon" />
              )}
              <span className="notification-message">{notification.message}</span>
              <button 
                className="notification-close" 
                onClick={() => setNotification(null)}
              >
                <X size={16} />
              </button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

