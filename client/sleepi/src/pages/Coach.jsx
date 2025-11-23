import React, { useState, useEffect } from 'react';
import { Lightbulb, Zap } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import '../index.css';

const API_BASE_URL = 'http://localhost:8000';

function Coach() {
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dailyTip, setDailyTip] = useState('');
  const [insight, setInsight] = useState('');
  const [percentageChange, setPercentageChange] = useState(null);

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

  // Parse daily schedule item into event
  const parseScheduleItem = (scheduleItem, index) => {
    // Format: "7:15 AM: Step outside for 10-15 minutes..."
    // Need to find the colon after AM/PM, not the one in the time
    const amPmMatch = scheduleItem.match(/(\d+:\d+\s*(?:AM|PM)):\s*(.+)/i);
    if (!amPmMatch) {
      // Fallback: try to find colon after time pattern
      const timePattern = /(\d+:\d+\s*(?:AM|PM)?)/i;
      const match = scheduleItem.match(timePattern);
      if (!match) {
        return null;
      }
      const timeStr = match[1].trim();
      const descriptionStart = match.index + match[0].length;
      const description = scheduleItem.substring(descriptionStart).replace(/^:\s*/, '').trim();
      
      const normalizedTime = normalizeTimeFormat(timeStr);
      
      return {
        id: index + 1,
        time: normalizedTime,
        description: description
      };
    }
    
    const timeStr = amPmMatch[1].trim();
    const description = amPmMatch[2].trim();
    
    // Ensure time is in 12-hour format with AM/PM
    const normalizedTime = normalizeTimeFormat(timeStr);
    
    return {
      id: index + 1,
      time: normalizedTime,
      description: description
    };
  };

  // Normalize time to 12-hour format with AM/PM
  const normalizeTimeFormat = (timeStr) => {
    if (!timeStr) return '';
    
    // If it already has AM/PM, return as is
    if (timeStr.toLowerCase().includes('am') || timeStr.toLowerCase().includes('pm')) {
      return timeStr;
    }
    
    // If it's in 24-hour format, convert to 12-hour
    const match = timeStr.match(/(\d+):(\d+)/);
    if (!match) return timeStr;
    
    let hour = parseInt(match[1]);
    const minutes = match[2];
    
    if (hour === 0) {
      return `12:${minutes} AM`;
    } else if (hour < 12) {
      return `${hour}:${minutes} AM`;
    } else if (hour === 12) {
      return `12:${minutes} PM`;
    } else {
      return `${hour - 12}:${minutes} PM`;
    }
  };

  // Fetch events from API
  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/generate_schedule/eileen');
      if (!response.ok) {
        throw new Error('Failed to fetch schedule data');
      }
      const data = await response.json();
      
      // Set daily tip and insight
      setDailyTip(data.daily_tip || '');
      setInsight(data.weekly_insight?.insight || '');
      setPercentageChange(data.weekly_insight?.percentage_change ?? null);
      
      // Parse daily_schedule into events
      if (data.daily_schedule && Array.isArray(data.daily_schedule)) {
        const parsedEvents = data.daily_schedule
          .map((item, index) => parseScheduleItem(item, index))
          .filter(event => event !== null);
        setEvents(parsedEvents);
      } else {
        setEvents([]);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      setEvents([]);
      setDailyTip('');
      setInsight('');
      setPercentageChange(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // Sort events by time
  const sortedEvents = [...events].sort((a, b) => {
    const timeA = parseTimeToMinutes(a.time);
    const timeB = parseTimeToMinutes(b.time);
    return timeA - timeB;
  });

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
          <p>{dailyTip || 'Loading your daily tip...'}</p>
        </div>
      </GlassCard>

      <GlassCard className="insight-card">
        <div className="card-header-row">
          <h3><Zap size={16} color="#22d3ee" /> Insight</h3>
          {percentageChange !== null && (
            <span className={`badge ${percentageChange >= 0 ? 'badge-green' : 'badge-red'}`}>
              {percentageChange >= 0 ? '+' : ''}{percentageChange.toFixed(1)}%
            </span>
          )}
        </div>
        <p>{insight || 'Loading your insight...'}</p>
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
        ) : sortedEvents.length === 0 ? (
          <div className="calendar-empty">
            <p>No events scheduled for today.</p>
          </div>
        ) : (
          <div className="calendar-timeline">
            {sortedEvents.map((event) => (
              <GlassCard key={event.id} className="calendar-event">
                <div className="event-time">{event.time}</div>
                <div className="event-content">
                  <p className="event-description">{event.description}</p>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

export default Coach;

