import React, { useState, useEffect } from 'react';
import { Lightbulb, Zap, Clock } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import '../index.css';

const API_BASE_URL = 'http://localhost:8000';

function Coach() {
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Get today's date formatted
  const today = new Date();
  const todayFormatted = today.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  // Group events by hour
  const groupEventsByHour = (eventsList) => {
    const grouped = {};
    eventsList.forEach(event => {
      // Extract hour from time (assuming format like "10:30 PM" or "14:30")
      const hour = parseHour(event.time);
      if (!grouped[hour]) {
        grouped[hour] = [];
      }
      grouped[hour].push(event);
    });
    
    // Sort hours and events within each hour
    const sortedHours = Object.keys(grouped).sort((a, b) => parseInt(a) - parseInt(b));
    const sorted = {};
    sortedHours.forEach(hour => {
      sorted[hour] = grouped[hour].sort((a, b) => {
        const timeA = parseTimeToMinutes(a.time);
        const timeB = parseTimeToMinutes(b.time);
        return timeA - timeB;
      });
    });
    return sorted;
  };

  // Parse hour from time string (handles both 12h and 24h formats)
  const parseHour = (timeStr) => {
    if (!timeStr) return '0';
    const match = timeStr.match(/(\d+):(\d+)/);
    if (!match) return '0';
    let hour = parseInt(match[1]);
    // Handle PM (add 12 if not 12 PM)
    if (timeStr.toLowerCase().includes('pm') && hour !== 12) {
      hour += 12;
    }
    // Handle AM (if 12 AM, make it 0)
    if (timeStr.toLowerCase().includes('am') && hour === 12) {
      hour = 0;
    }
    return hour.toString();
  };

  // Parse time to minutes for sorting
  const parseTimeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const match = timeStr.match(/(\d+):(\d+)/);
    if (!match) return 0;
    let hour = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    
    // Handle PM (add 12 if not 12 PM)
    if (timeStr.toLowerCase().includes('pm') && hour !== 12) {
      hour += 12;
    }
    // Handle AM (if 12 AM, make it 0)
    if (timeStr.toLowerCase().includes('am') && hour === 12) {
      hour = 0;
    }
    return hour * 60 + minutes;
  };

  // Format hour for display
  const formatHour = (hour) => {
    const h = parseInt(hour);
    if (h === 0) return '12:00 AM';
    if (h < 12) return `${h}:00 AM`;
    if (h === 12) return '12:00 PM';
    return `${h - 12}:00 PM`;
  };

  // Fetch events from API
  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual API endpoint for daily events
      // For now, using mock data structure
      // Example API call: const response = await fetch(`${API_BASE_URL}/coach/events/today`);
      // const data = await response.json();
      
      // Mock data structure - replace with actual API call
      const mockEvents = [
        { id: 1, time: '10:00 AM', title: 'Stop drinking coffee', description: 'Limit caffeine intake' },
        { id: 2, time: '2:00 PM', title: 'No more caffeine', description: 'Caffeine cutoff time' },
        { id: 3, time: '9:00 PM', title: 'No eating after this time', description: 'Allow digestion before bed' },
        { id: 4, time: '10:15 PM', title: 'Turn off all screens', description: 'Put phone, TV, computer away' },
        { id: 5, time: '10:30 PM', title: 'Read for 20 minutes', description: 'Physical book only' },
        { id: 6, time: '10:50 PM', title: 'Gentle stretching', description: '10 minutes in bedroom' },
        { id: 7, time: '11:00 PM', title: 'Set thermostat to 67°F', description: 'Optimal sleep temperature' },
      ];
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      setEvents(mockEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const eventsByHour = groupEventsByHour(events);

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
        </div>
        <p>Your sleep consistency has improved significantly this week compared to last month.</p>
      </GlassCard>

      <h3 className="section-title">Sleep Program</h3>
      
      <GlassCard className="calendar-card">
        <div className="calendar-header">
          <h4>{todayFormatted}</h4>
        </div>
        
        {isLoading ? (
          <div className="calendar-loading">
            <p>Loading your sleep program...</p>
          </div>
        ) : Object.keys(eventsByHour).length === 0 ? (
          <div className="calendar-empty">
            <p>No events scheduled for today.</p>
          </div>
        ) : (
          <div className="calendar-timeline">
            {Object.entries(eventsByHour).map(([hour, hourEvents]) => (
              <div key={hour} className="calendar-hour-section">
                <div className="hour-header">
                  <Clock size={16} className="hour-icon" />
                  <span className="hour-time">{formatHour(hour)}</span>
                </div>
                <div className="hour-events">
                  {hourEvents.map((event) => (
                    <GlassCard key={event.id} className="calendar-event">
                      <div className="event-time">{event.time}</div>
                      <div className="event-content">
                        <h5 className="event-title">{event.title}</h5>
                        {event.description && (
                          <p className="event-description">{event.description}</p>
                        )}
                      </div>
                    </GlassCard>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

export default Coach;

