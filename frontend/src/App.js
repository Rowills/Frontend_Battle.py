import React from 'react';
import { Analytics } from '@vercel/analytics/react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Register from './pages/Register';
import Login from './pages/Login';
import Lobby from './pages/Lobby';
import Battle from './pages/Battle';
import Leaderboard from './pages/Leaderboard';
import Profile from './pages/Profile';

function App() {
  const isLoggedIn = localStorage.getItem('user_id');

  return (
    <BrowserRouter>
      <Analytics />
      <Routes>
        {/* Lobby is public — anyone can view */}
        <Route path="/" element={<Lobby />} />
        <Route path="/lobby" element={<Lobby />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/leaderboard" element={<Leaderboard />} />

        {/* These require login */}
        <Route path="/battle/:id" element={isLoggedIn ? <Battle /> : <Navigate to="/login" />} />
        {/* Private battle join link */}
        <Route path="/join/:id" element={isLoggedIn ? <Battle join={true} /> : <Navigate to="/login" />} />
        <Route path="/profile" element={isLoggedIn ? <Profile /> : <Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
