import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Trophy, Zap, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../index.css';

const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { id: 'home', path: '/', icon: Home, label: 'Home' },
    { id: 'leaderboard', path: '/leaderboard', icon: Trophy, label: 'Rank' },
    { id: 'coach', path: '/coach', icon: Zap, label: 'Coach' },
    { id: 'profile', path: '/profile', icon: User, label: 'Profile' },
  ];

  const getActiveTab = () => {
    const currentPath = location.pathname;
    const activeItem = navItems.find(item => item.path === currentPath);
    return activeItem?.id || 'home';
  };

  const activeTab = getActiveTab();

  return (
    <div className="app-container">
      <div className="background-fx">
        <div className="bg-gradient" />
        <div className="glow glow-1" />
        <div className="glow glow-2" />
        <div className="stars" />
      </div>

      <main className="main-viewport">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -10, filter: 'blur(10px)' }}
            transition={{ duration: 0.25 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className="bottom-nav">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              {isActive && <motion.div layoutId="nav-glow" className="nav-indicator" />}
              <item.icon size={24} className="nav-icon" />
              <span className="nav-label">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default Layout;

