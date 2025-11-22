import React, { useState } from 'react';
import { User, Smartphone, LogOut } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';
import '../index.css';

const Profile = () => {
  const [dailyRemindersOn, setDailyRemindersOn] = useState(true);

  return (
    <div className="page-content">
      <header className="page-header">
        <h1>Profile</h1>
        <p>Manage your settings and devices.</p>
      </header>

      <div className="profile-header">
        <div className="profile-avatar">
          <User size={40} />
        </div>
        <h2>Sleepy Person</h2>
      </div>

      <div className="form-section">
        <label>Personal Info</label>
        <GlassCard className="input-group">
          <input type="text" defaultValue="Sleepy Person" />
          <div className="divider" />
          <input type="email" defaultValue="user@example.com" />
        </GlassCard>
      </div>

      <div className="form-section">
        <label>Devices</label>
        <GlassCard className="list-item">
          <div className="flex-row" style={{ display: "flex", alignItems: "center" }}>
            <Smartphone color="#22d3ee" size={20} style={{ marginRight: 10 }} />
            <span>Apple Watch Series 8</span>
          </div>

          <span className="badge badge-green">Connected</span>
        </GlassCard>
      </div>

      <div className="form-section">
        <label>Preferences</label>
        <GlassCard className="settings-list">
          <div className="setting-row">
            <span>Daily Reminders</span>

            <div
              className={`switch ${dailyRemindersOn ? 'checked' : ''}`}
              onClick={() => setDailyRemindersOn(prev => !prev)}
              role="switch"
              aria-checked={dailyRemindersOn}
            >
              <div className="knob" />
            </div>
          </div>
        </GlassCard>
      </div>

      <div className="button-group footer-actions">
        <Button variant="primary">Save Changes</Button>
        <Button variant="ghost">
          <LogOut size={18} /> Sign Out
        </Button>
      </div>
    </div>
  );
};

export default Profile;
