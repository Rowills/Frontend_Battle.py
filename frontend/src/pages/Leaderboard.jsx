import React, { useState, useEffect } from 'react';
import API from '../api/axios';
import { useNavigate } from 'react-router-dom';

function Leaderboard() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const myId = parseInt(localStorage.getItem('user_id'));

  useEffect(() => {
    API.get('/stats/leaderboard')
      .then(res => { setPlayers(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div style={styles.container}>

      {/* Navbar */}
      <div style={styles.navbar}>
        <h2 style={styles.logo}>⚔️ PyBattle</h2>
        <div style={styles.navLinks}>
          <button style={styles.navBtn} onClick={() => navigate('/lobby')}>🏠 Lobby</button>
          <button style={styles.navBtn} onClick={() => navigate('/profile')}>👤 My Profile</button>
        </div>
      </div>

      <div style={styles.content}>
        <h1 style={styles.heading}>🏆 Leaderboard</h1>
        <p style={styles.subheading}>Top coders ranked by wins</p>

        {loading ? (
          <p style={{ color: '#aaa', marginTop: '40px' }}>Loading...</p>
        ) : players.length === 0 ? (
          <div style={styles.emptyCard}>
            <p style={{ fontSize: '40px', marginBottom: '10px' }}>😴</p>
            <p style={{ fontWeight: '700' }}>No battles completed yet.</p>
            <p style={{ fontSize: '14px', marginTop: '5px' }}>Go fight someone!</p>
          </div>
        ) : (
          <div style={styles.table}>
            {/* Header */}
            <div style={styles.tableHeader}>
              <span style={{ width: '50px' }}>#</span>
              <span style={{ flex: 1 }}>Player</span>
              <span style={styles.col}>Wins</span>
              <span style={styles.col}>Losses</span>
              <span style={styles.col}>Win Rate</span>
            </div>

            {players.map((player, i) => {
              const isMe = player.user_id === myId;
              return (
                <div
                  key={player.user_id}
                  style={{
                    ...styles.tableRow,
                    background: isMe ? '#6c63ff22' : i % 2 === 0 ? '#1a1a2e' : '#16162a',
                    border: isMe ? '1px solid #6c63ff88' : '1px solid transparent',
                  }}
                >
                  <span style={{ width: '50px', fontSize: '20px' }}>
                    {i < 3 ? medals[i] : `#${i + 1}`}
                  </span>
                  <span style={{ flex: 1, color: isMe ? '#6c63ff' : '#ffffff', fontWeight: isMe ? '700' : '500' }}>
                    {player.username} {isMe && <span style={{ color: '#00d4aa', fontSize: '12px' }}>(You)</span>}
                  </span>
                  <span style={{ ...styles.col, color: '#00d4aa', fontWeight: '700' }}>{player.wins}</span>
                  <span style={{ ...styles.col, color: '#ff4757' }}>{player.losses}</span>
                  <span style={{ ...styles.col, color: '#ffa502', fontWeight: '700' }}>{player.win_rate}%</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', background: '#0f0f1a' },
  navbar: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '15px 30px', background: '#1a1a2e', borderBottom: '1px solid #6c63ff55',
  },
  logo: { fontSize: '22px', fontWeight: '900', color: '#6c63ff' },
  navLinks: { display: 'flex', gap: '10px' },
  navBtn: {
    background: 'transparent', border: '1px solid #6c63ff55',
    color: '#aaaaaa', padding: '6px 14px', borderRadius: '20px',
    cursor: 'pointer', fontSize: '13px', fontWeight: '600',
  },
  content: { maxWidth: '800px', margin: '0 auto', padding: '40px 20px', textAlign: 'center' },
  heading: { fontSize: '40px', fontWeight: '900', color: '#ffffff', marginBottom: '8px' },
  subheading: { color: '#aaaaaa', marginBottom: '30px' },
  emptyCard: {
    background: '#1a1a2e', borderRadius: '20px', padding: '40px',
    color: '#aaaaaa', border: '1px solid #6c63ff33',
  },
  table: { borderRadius: '16px', overflow: 'hidden', border: '1px solid #6c63ff33' },
  tableHeader: {
    display: 'flex', alignItems: 'center', padding: '12px 20px',
    background: '#6c63ff22', color: '#6c63ff', fontWeight: '700', fontSize: '13px',
  },
  tableRow: {
    display: 'flex', alignItems: 'center', padding: '14px 20px',
    fontSize: '14px', transition: 'background 0.2s',
  },
  col: { width: '90px', textAlign: 'center' },
};

export default Leaderboard;
