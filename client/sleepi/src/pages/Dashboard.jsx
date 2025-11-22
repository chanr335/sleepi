import React, { useState, useEffect } from 'react';
import { Moon, Activity, Sun, Zap, Bed, Brain } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';
import CircularProgress from '../components/CircularProgress';
import '../index.css';

const Dashboard = () => {
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

  useEffect(() => {
    const fetchSleepData = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/sleep/eileen');
        const data = await response.json();
        
        // Get the last data point for "Last Night's Sleep"
        const lastPoint = data[data.length - 1];
        setLastNightData(lastPoint);
        
        // Get the last 5 data points
        const lastFivePoints = data.slice(-5);
        
        // Transform the data to match the chart format
        const transformedData = lastFivePoints.map((point, index) => {
          // Format date as MM-DD (e.g., "2025-02-03" -> "02-03")
          const date = new Date(point.night);
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
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

    fetchSleepData();
  }, []);

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
            <div className="icon-box icon-pink"><Bed size={18} /></div>
            <div className="sleep-metric-info">
              <span className="sleep-metric-value">{lastNightData ? formatHours(lastNightData.InBed) : "0h 0m"}</span>
              <span className="sleep-metric-label">In Bed</span>
            </div>
          </div>
          
          <div className="sleep-metric-item">
            <div className="icon-box icon-cyan"><Brain size={18} /></div>
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
                domain={['dataMin - 1', 'dataMax + 1']}
                tickFormatter={(value) => `${value.toFixed(1)}h`}
                width={50}
              />
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
        <Button>Log My Sleep</Button>
      </div>
    </div>
  );
};

export default Dashboard;

