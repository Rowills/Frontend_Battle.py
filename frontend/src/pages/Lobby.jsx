import React, { useState, useEffect } from 'react';
import API from '../api/axios';
import { useNavigate } from 'react-router-dom';

function Lobby() {
  const [battles, setBattles] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const username = localStorage.getItem('username');
  const playerId = localStorage.getItem('user_id');

  const fetchBattles = async () => {
    try {
      const res = await API.get('/battles/list');
      setBattles(res.data);
    } catch (err) {
      console.error('Failed to fetch battles');
    }
  };

  useEffect(() => {
    fetchBattles();
    const interval = setInterval(fetchBattles, 3000);
    return () => clearInterval(interval);
  }, []);

  const createBattle = async () => {
    setLoading(true);
    try {
      const res = await API.post(`/battles/create?player1_id=${playerId}`, {
        problem_id: 1,
      });
      navigate(`/battle/${res.data.id}`);
    } catch (err) {
      console.error('Failed to create battle');
    }
    setLoading(false);
  };

  const joinBattle = async (battleId) => {
    try {
      await API.post(`/battles/join/${battleId}?player2_id=${playerId}`);
      navigate(`/battle/${battleId}`);
    } catch (err) {
      console.error('Failed to join battle');
    }
  };

  return (
    <div style={styles.container}>

      {/* Navbar */}
      <div style={styles.navbar}>
        <h2 style={styles.navLogo}>⚔️ Battle.py</h2>
        <div style={styles.navRight}>
          <span style={styles.welcome}>👋 {username}</span>
          <button style={styles.logoutBtn} onClick={() => {
            localStorage.clear();
            navigate('/login');
          }}>Logout</button>
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.content}>
        <h1 style={styles.heading}>Battle Lobby</h1>
        <p style={styles.subheading}>Challenge someone or wait for an opponent!</p>

        {/* Create Battle Button */}
        <button
          className="btn-primary"
          style={styles.createBtn}
          onClick={createBattle}
          disabled={loading}
        >
          {loading ? 'Creating...' : '⚔️ Create New Battle'}
        </button>

        {/* Battle List */}
        <h2 style={styles.listTitle}>Open Battles</h2>

        {battles.length === 0 ? (
          <div style={styles.emptyCard}>
            <p>No open battles right now.</p>
            <p>Be the first to create one!</p>
          </div>
        ) : (
          <div style={styles.grid}>
            {battles.map((battle) => (
              <div key={battle.id} style={styles.battleCard}>
                <div style={styles.battleIcon}>⚔️</div>
                <p style={styles.battleTitle}>Battle #{battle.id}</p>
                <p style={styles.battleInfo}>Player {battle.player1_id} is waiting...</p>
                <p style={styles.battleStatus}>🟢 Open</p>
                <button
                  className="btn-primary"
                  style={styles.joinBtn}
                  onClick={() => joinBattle(battle.id)}
                >
                  Join Battle
                </button>
              </div>
            ))}
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
    padding: '15px 30px', background: '#1a1a2e',
    borderBottom: '1px solid #6c63ff55',
  },
  navLogo: { fontSize: '22px', fontWeight: '900', color: '#6c63ff' },
  navRight: { display: 'flex', alignItems: 'center', gap: '15px' },
  welcome: { color: '#00d4aa', fontWeight: '600' },
  logoutBtn: {
    background: 'transparent', border: '1px solid #ff4757',
    color: '#ff4757', padding: '6px 16px', borderRadius: '20px',
    cursor: 'pointer', fontWeight: '600',
  },
  content: { maxWidth: '900px', margin: '0 auto', padding: '40px 20px', textAlign: 'center' },
  heading: { fontSize: '42px', fontWeight: '900', color: '#ffffff', marginBottom: '10px' },
  subheading: { color: '#aaaaaa', marginBottom: '30px' },
  createBtn: { maxWidth: '300px', margin: '0 auto 40px auto', display: 'block' },
  listTitle: { fontSize: '24px', fontWeight: '700', color: '#6c63ff', marginBottom: '20px' },
  emptyCard: {
    background: '#1a1a2e', borderRadius: '20px', padding: '40px',
    color: '#aaaaaa', border: '1px solid #6c63ff33',
  },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' },
  battleCard: {
    background: '#1a1a2e', borderRadius: '20px', padding: '25px',
    border: '1px solid #6c63ff55', textAlign: 'center',
  },
  battleIcon: { fontSize: '40px', marginBottom: '10px' },
  battleTitle: { fontSize: '18px', fontWeight: '700', color: '#ffffff', marginBottom: '5px' },
  battleInfo: { color: '#aaaaaa', fontSize: '14px', marginBottom: '5px' },
  battleStatus: { color: '#00d4aa', marginBottom: '15px', fontWeight: '600' },
  joinBtn: { maxWidth: '150px', margin: '0 auto', padding: '8px 20px' },
};

export default Lobby;