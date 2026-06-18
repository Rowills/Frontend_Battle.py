import React, { useState, useEffect } from 'react';
import API from '../api/axios';
import { useNavigate } from 'react-router-dom';

function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const userId = localStorage.getItem('user_id');
  const username = localStorage.getItem('username');

  useEffect(() => {
    API.get(`/stats/profile/${userId}`)
      .then(res => { setProfile(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [userId]);

  const handleLogout = () => {
    localStorage.removeItem('user_id');
    localStorage.removeItem('username');
    navigate('/login');
  };

  return (
    <div style={styles.container}>

      {/* Navbar */}
      <div style={styles.navbar}>
        <h2 style={styles.logo}>⚔️ PyBattle</h2>
        <div style={styles.navLinks}>
          <button style={styles.navBtn} onClick={() => navigate('/lobby')}>🏠 Lobby</button>
          <button style={styles.navBtn} onClick={() => navigate('/leaderboard')}>🏆 Leaderboard</button>
          <button style={{ ...styles.navBtn, borderColor: '#ff4757', color: '#ff4757' }} onClick={handleLogout}>
            🚪 Logout
          </button>
        </div>
      </div>

      <div style={styles.content}>

        {/* Avatar */}
        <div style={styles.avatar}>{username?.[0]?.toUpperCase() || '?'}</div>
        <h1 style={styles.username}>{username}</h1>
        <p style={styles.subtitle}>PyBattle Player</p>

        {loading ? (
          <p style={{ color: '#aaa', marginTop: '30px' }}>Loading stats...</p>
        ) : !profile ? (
          <p style={{ color: '#aaa', marginTop: '30px' }}>Could not load profile.</p>
        ) : (
          <>
            {/* Stats Cards */}
            <div style={styles.statsRow}>
              <div style={styles.statCard}>
                <div style={{ ...styles.statNumber, color: '#00d4aa' }}>{profile.wins}</div>
                <div style={styles.statLabel}>Wins</div>
              </div>
              <div style={styles.statCard}>
                <div style={{ ...styles.statNumber, color: '#ff4757' }}>{profile.losses}</div>
                <div style={styles.statLabel}>Losses</div>
              </div>
              <div style={styles.statCard}>
                <div style={{ ...styles.statNumber, color: '#6c63ff' }}>{profile.total}</div>
                <div style={styles.statLabel}>Battles</div>
              </div>
              <div style={styles.statCard}>
                <div style={{ ...styles.statNumber, color: '#ffa502' }}>{profile.win_rate}%</div>
                <div style={styles.statLabel}>Win Rate</div>
              </div>
            </div>

            {/* Win Rate Bar */}
            <div style={styles.barContainer}>
              <div style={styles.barLabel}>
                <span style={{ color: '#00d4aa' }}>Wins</span>
                <span style={{ color: '#ff4757' }}>Losses</span>
              </div>
              <div style={styles.barTrack}>
                <div style={{ ...styles.barFill, width: `${profile.win_rate}%` }} />
              </div>
            </div>

            {/* Recent Battles */}
            <h2 style={styles.sectionTitle}>Recent Battles</h2>
            {profile.recent_battles.length === 0 ? (
              <div style={styles.emptyCard}>
                <p>No completed battles yet. Go fight someone! ⚔️</p>
              </div>
            ) : (
              <div style={styles.recentList}>
                {profile.recent_battles.map((b, i) => (
                  <div key={i} style={styles.recentRow}>
                    <span style={{ color: '#aaaaaa', fontSize: '13px' }}>Battle #{b.battle_id}</span>
                    <span style={{ color: '#aaaaaa', fontSize: '13px' }}>Problem #{b.problem_id}</span>
                    <span style={{
                      padding: '3px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '700',
                      background: b.result === 'win' ? '#00d4aa22' : '#ff475722',
                      color: b.result === 'win' ? '#00d4aa' : '#ff4757',
                      border: `1px solid ${b.result === 'win' ? '#00d4aa55' : '#ff475755'}`,
                    }}>
                      {b.result === 'win' ? '🏆 Win' : '💀 Loss'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <button className="btn-primary" style={styles.battleBtn} onClick={() => navigate('/lobby')}>
          ⚔️ Start a Battle
        </button>
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
  navLinks: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  navBtn: {
    background: 'transparent', border: '1px solid #6c63ff55',
    color: '#aaaaaa', padding: '6px 14px', borderRadius: '20px',
    cursor: 'pointer', fontSize: '13px', fontWeight: '600',
  },
  content: { maxWidth: '700px', margin: '0 auto', padding: '40px 20px', textAlign: 'center' },
  avatar: {
    width: '80px', height: '80px', borderRadius: '50%', margin: '0 auto 15px',
    background: 'linear-gradient(135deg, #6c63ff, #00d4aa)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '36px', fontWeight: '900', color: '#ffffff',
  },
  username: { fontSize: '32px', fontWeight: '900', color: '#ffffff', marginBottom: '5px' },
  subtitle: { color: '#aaaaaa', fontSize: '14px', marginBottom: '30px' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '25px' },
  statCard: {
    background: '#1a1a2e', borderRadius: '16px', padding: '20px 10px',
    border: '1px solid #6c63ff33',
  },
  statNumber: { fontSize: '32px', fontWeight: '900', marginBottom: '5px' },
  statLabel: { color: '#aaaaaa', fontSize: '12px', fontWeight: '600' },
  barContainer: { marginBottom: '30px' },
  barLabel: { display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px', fontWeight: '600' },
  barTrack: { background: '#ff475733', borderRadius: '10px', height: '10px', overflow: 'hidden' },
  barFill: { background: 'linear-gradient(90deg, #00d4aa, #6c63ff)', height: '100%', borderRadius: '10px', transition: 'width 1s ease' },
  sectionTitle: { fontSize: '20px', fontWeight: '700', color: '#6c63ff', marginBottom: '15px', textAlign: 'left' },
  emptyCard: {
    background: '#1a1a2e', borderRadius: '16px', padding: '30px',
    color: '#aaaaaa', border: '1px solid #6c63ff33', marginBottom: '25px',
  },
  recentList: { display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '25px' },
  recentRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    background: '#1a1a2e', borderRadius: '12px', padding: '12px 18px',
    border: '1px solid #6c63ff22',
  },
  battleBtn: { maxWidth: '250px', margin: '0 auto', display: 'block' },
};

export default Profile;
