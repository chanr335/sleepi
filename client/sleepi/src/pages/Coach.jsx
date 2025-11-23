import React, { useState, useEffect } from 'react';
import { Lightbulb, Zap } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import '../index.css';

const API_BASE_URL = 'http://localhost:8000';
const CACHE_KEY = 'sleep_coach_data'; // Key for sessionStorage

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

  // --- HELPER: Time Parsing Logic ---
  // (Moved these up so they can be used by the processing function)
  
  const normalizeTimeFormat = (timeStr) => {
    if (!timeStr) return '';
    if (timeStr.toLowerCase().includes('am') || timeStr.toLowerCase().includes('pm')) {
      return timeStr;
    }
    const match = timeStr.match(/(\d+):(\d+)/);
    if (!match) return timeStr;
    let hour = parseInt(match[1]);
    const minutes = match[2];
    if (hour === 0) return `12:${minutes} AM`;
    if (hour < 12) return `${hour}:${minutes} AM`;
    if (hour === 12) return `12:${minutes} PM`;
    return `${hour - 12}:${minutes} PM`;
  };

  const parseScheduleItem = (scheduleItem, index) => {
    const amPmMatch = scheduleItem.match(/(\d+:\d+\s*(?:AM|PM)):\s*(.+)/i);
    if (!amPmMatch) {
      const timePattern = /(\d+:\d+\s*(?:AM|PM)?)/i;
      const match = scheduleItem.match(timePattern);
      if (!match) return null;
      
      const timeStr = match[1].trim();
      const descriptionStart = match.index + match[0].length;
      const description = scheduleItem.substring(descriptionStart).replace(/^:\s*/, '').trim();
      const normalizedTime = normalizeTimeFormat(timeStr);
      
      return { id: index + 1, time: normalizedTime, description: description };
    }
    
    const timeStr = amPmMatch[1].trim();
    const description = amPmMatch[2].trim();
    const normalizedTime = normalizeTimeFormat(timeStr);
    
    return { id: index + 1, time: normalizedTime, description: description };
  };

  const parseTimeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const match = timeStr.match(/(\d+):(\d+)/);
    if (!match) return 0;
    let hour = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    if (timeStr.toLowerCase().includes('pm') && hour !== 12) hour += 12;
    if (timeStr.toLowerCase().includes('am') && hour === 12) hour = 0;
    return hour * 60 + minutes;
  };

  // --- NEW: Centralized Data Processor ---
  const processAndSetData = (data) => {
    setDailyTip(data.daily_tip || '');
    setInsight(data.weekly_insight?.insight || '');
    setPercentageChange(data.weekly_insight?.percentage_change ?? null);
    
    if (data.daily_schedule && Array.isArray(data.daily_schedule)) {
      const parsedEvents = data.daily_schedule
        .map((item, index) => parseScheduleItem(item, index))
        .filter(event => event !== null);
      setEvents(parsedEvents);
    } else {
      setEvents([]);
    }
  };

  // --- UPDATED: Fetch with Caching Strategy ---
  const fetchEvents = async () => {
    setIsLoading(true);
    
    // 1. Check Session Storage first
    const cachedData = sessionStorage.getItem(CACHE_KEY);
    
    if (cachedData) {
      console.log("Loading schedule from cache...");
      try {
        const parsedData = JSON.parse(cachedData);
        processAndSetData(parsedData);
        setIsLoading(false);
        return; // EXIT FUNCTION: Do not make API call
      } catch (e) {
        console.error("Error parsing cache, falling back to API", e);
        sessionStorage.removeItem(CACHE_KEY); // Clear corrupted cache
      }
    }

    // 2. If no cache, fetch from API
    console.log("Fetching new schedule from API...");
    try {
      // Note: Assuming 'eileen' is the user. You might want to make this dynamic later.
      const response = await fetch(`${API_BASE_URL}/generate_schedule/eileen`);
      if (!response.ok) {
        throw new Error('Failed to fetch schedule data');
      }
      const data = await response.json();
      
      // 3. Save to Session Storage
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
      
      // 4. Update State
      processAndSetData(data);

    } catch (error) {
      console.error('Error fetching events:', error);
      setEvents([]);
      setDailyTip('Could not load tip.');
      setInsight('Could not load insight.');
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