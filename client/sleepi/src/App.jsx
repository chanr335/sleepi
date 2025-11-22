import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Leaderboard from './pages/Leaderboard';
import Coach from './pages/Coach';
import Profile from './pages/Profile';
import Soundscape from './pages/Soundscape';
import './index.css';

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/coach" element={<Coach />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/soundscape" element={<Soundscape />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
