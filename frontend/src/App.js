import React from 'react';
import { Analytics } from '@vercel/analytics/react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Register from './pages/Register';
import Login from './pages/Login';
import Lobby from './pages/Lobby';
import Battle from './pages/Battle';
import Leaderboard from './pages/Leaderboard';
import Profile from './pages/Profile';
import About from './pages/About';
import Practice from './pages/Practice';

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
        <Route path="/about" element={<About />} />
        <Route path="/practice" element={<Practice />} />

        {/* Battle is public — guests can play too */}
        <Route path="/battle/:id" element={<Battle />} />
        {/* Private battle join link — requires login */}
        <Route path="/join/:id" element={isLoggedIn ? <Battle join={true} /> : <Navigate to="/login" />} />
        <Route path="/profile" element={isLoggedIn ? <Profile /> : <Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
