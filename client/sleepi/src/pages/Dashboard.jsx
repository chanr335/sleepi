import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Moon, Activity, Sun, Zap, Bed, Brain, X, CheckCircle, AlertCircle} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
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
  const [username, setUsername] = useState('eileen'); // Default username, can be made dynamic later
  const [notification, setNotification] = useState(null);
  const [confirmationData, setConfirmationData] = useState(null); // { hours, date }


  const [sleepData, setSleepData] = useState([
    { day: 'Mon', hours: 6.5 },
    { day: 'Tue', hours: 7.2 },
    { day: 'Wed', hours: 5.8 },
    { day: 'Thu', hours: 7.8 },
    { day: 'Fri', hours: 8.2 },
    { day: 'Sat', hours: 9.0 },
    { day: 'Sun', hours: 7.4 },
  ]);
  const [lastNightData, setLastNightData] = useState(null);

  // Helper function to format hours to "Xh Ym" format
  const formatHours = (hours) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  // Custom tooltip component for the bar chart
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const hours = payload[0].value;
      const formattedTime = formatHours(hours);
      return (
        <div style={{
          backgroundColor: '#2a2a2a',
          border: '1px solid #4338ca',
          borderRadius: '12px',
          padding: '12px 16px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
        }}>
          <p style={{ 
            color: '#a5b4fc', 
            margin: 0, 
            fontSize: '14px', 
            fontWeight: 600 
          }}>
            {formattedTime}
          </p>
        </div>
      );
    }
    return null;
  };

  // Fetch sleep data function - can be called to refresh data
  const fetchSleepData = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/sleep/eileen');
      const data = await response.json();
      
      // Get the last data point for "Last Night's Sleep"
      const lastPoint = data[data.length - 1];
      setLastNightData(lastPoint);
      
      // Get the last 5 data points (most recent dates: 17, 18, 19, 20, 21)
      const lastFivePoints = data.slice(-5);
      
      // Transform the data to match the chart format
      const transformedData = lastFivePoints.map((point, index) => {
        // Parse date string directly to avoid timezone issues
        // point.night should be in format "YYYY-MM-DD"
        const dateStr = String(point.night).substring(0, 10); // Take first 10 chars (YYYY-MM-DD)
        const dateParts = dateStr.split('-');
        
        if (dateParts.length !== 3) {
          console.error('Invalid date format:', point.night);
          return {
            day: 'Invalid',
            hours: point.TotalSleepHours,
            fullData: point
          };
        }
        
        // Format as MM-DD (e.g., "2025-11-17" -> "11-17")
        const month = dateParts[1];
        const day = dateParts[2];
        const formattedDate = `${month}-${day}`;
        
        return {
          day: formattedDate,
          hours: point.TotalSleepHours,
          // Store the full data point for potential future use
          fullData: point
        };
      });
      
      setSleepData(transformedData);
    } catch (error) {
      console.error('Error fetching sleep data:', error);
    }
  };

  useEffect(() => {
    fetchSleepData();
  }, []);

  // Auto-close notification after 4 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Auto-close confirmation screen after 3 seconds
  useEffect(() => {
    if (confirmationData) {
      const timer = setTimeout(() => {
        setConfirmationData(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [confirmationData]);

  const handleCloseConfirmation = () => {
    setConfirmationData(null);
  };

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
      handleCloseModal();
      
      // Refresh sleep data to update the chart
      await fetchSleepData();
      
      // Show confirmation screen after a brief delay
      setTimeout(() => {
        setConfirmationData({
          hours: result.total_sleep_hours,
          date: result.night
        });
      }, 300);
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
        <h1>Welcome Back Eileen!</h1>
      </header>

      <GlassCard className="center-content">
        <h3 className="card-label">Last Night's Sleep</h3>
        <CircularProgress 
          value={lastNightData ? lastNightData.TotalSleepHours : 0} 
          max={9} 
          label={lastNightData ? formatHours(lastNightData.TotalSleepHours) : "0h 0m"} 
        />
        <div className="badge badge-green">Optimal Range</div>
        
        <div className="sleep-metrics-grid">
          <div className="sleep-metric-item">
            <div className="icon-box icon-yellow"><Sun size={18} /></div>
            <div className="sleep-metric-info">
              <span className="sleep-metric-value">{lastNightData ? formatHours(lastNightData.Awake) : "0h 0m"}</span>
              <span className="sleep-metric-label">Awake</span>
            </div>
          </div>
          
          <div className="sleep-metric-item">
            <div className="icon-box icon-cyan"><Zap size={18} /></div>
            <div className="sleep-metric-info">
              <span className="sleep-metric-value">{lastNightData ? formatHours(lastNightData.Core) : "0h 0m"}</span>
              <span className="sleep-metric-label">Core</span>
            </div>
          </div>
          
          <div className="sleep-metric-item">
            <div className="icon-box icon-indigo"><Moon size={18} /></div>
            <div className="sleep-metric-info">
              <span className="sleep-metric-value">{lastNightData ? formatHours(lastNightData.Deep) : "0h 0m"}</span>
              <span className="sleep-metric-label">Deep</span>
            </div>
          </div>
          
          <div className="sleep-metric-item">
            <div className="icon-box icon-pink"><Brain size={18} /></div>
            <div className="sleep-metric-info">
              <span className="sleep-metric-value">{lastNightData ? formatHours(lastNightData.REM) : "0h 0m"}</span>
              <span className="sleep-metric-label">REM</span>
            </div>
          </div>
        </div>
      </GlassCard>

      <GlassCard>
        <h3 className="card-title">Weekly Trend</h3>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sleepData} margin={{ left: 5, right: 10, top: 5, bottom: 5 }}>
              <XAxis dataKey="day" stroke="#a5b4fc" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis 
                stroke="#a5b4fc" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false}
                domain={[0, 10]}
                tickFormatter={(value) => `${value.toFixed(1)}h`}
                width={50}
              />
              <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
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
      </div>

      {/* Modal Overlay - rendered via portal to escape transform container */}
      {isModalOpen && createPortal(
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
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      onFocus={(e) => e.stopPropagation()}
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
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      onFocus={(e) => e.stopPropagation()}
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
        </div>,
        document.body
      )}

      {/* Success Confirmation Screen */}
      {confirmationData && createPortal(
        <div className="confirmation-overlay" onClick={handleCloseConfirmation}>
          <div className="confirmation-content" onClick={(e) => e.stopPropagation()}>
            <GlassCard className="confirmation-card">
              <div className="confirmation-icon-wrapper">
                <CheckCircle size={64} className="confirmation-icon" />
              </div>
              <h2 className="confirmation-title">Successfully logged your sleep!</h2>
              <p className="confirmation-message">
                {formatHours(confirmationData.hours)} on {(() => {
                  // Parse date string directly to avoid timezone issues
                  const dateStr = String(confirmationData.date).substring(0, 10);
                  const dateParts = dateStr.split('-');
                  if (dateParts.length === 3) {
                    const date = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                  }
                  return confirmationData.date;
                })()}
              </p>
              <Button onClick={handleCloseConfirmation} className="confirmation-close-btn">
                Got it!
              </Button>
            </GlassCard>
          </div>
        </div>,
        document.body
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

