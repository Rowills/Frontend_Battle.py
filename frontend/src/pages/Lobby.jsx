import React, { useState, useEffect } from 'react';
import API from '../api/axios';
import { useNavigate } from 'react-router-dom';
import problems from '../problems';

function Lobby() {
  const [battles, setBattles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [privateLoading, setPrivateLoading] = useState(false);
  const [shareModal, setShareModal] = useState(null); // { battleId, link }
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const userId = localStorage.getItem('user_id');
  const username = localStorage.getItem('username');
  const isLoggedIn = !!userId;

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

  const requireLogin = () => {
    if (!isLoggedIn) { navigate('/login'); return false; }
    return true;
  };

  const createBattle = async () => {
    if (!requireLogin()) return;
    setLoading(true);
    try {
      const randomProblem = problems[Math.floor(Math.random() * problems.length)];
      const res = await API.post(`/battles/create?player1_id=${userId}`, {
        problem_id: randomProblem.id,
      });
      navigate(`/battle/${res.data.id}`, { state: { problem: randomProblem } });
    } catch (err) {
      console.error('Failed to create battle');
    }
    setLoading(false);
  };

  // Create a private battle and show share link
  const createPrivateBattle = async () => {
    if (!requireLogin()) return;
    setPrivateLoading(true);
    try {
      const randomProblem = problems[Math.floor(Math.random() * problems.length)];
      const res = await API.post(`/battles/create?player1_id=${userId}`, {
        problem_id: randomProblem.id,
      });
      const battleId = res.data.id;
      const link = `${window.location.origin}/join/${battleId}`;
      setShareModal({ battleId, link, problem: randomProblem });
    } catch (err) {
      console.error('Failed to create private battle');
    }
    setPrivateLoading(false);
  };

  const joinBattle = async (battleId) => {
    if (!requireLogin()) return;
    try {
      const res = await API.post(`/battles/join/${battleId}?player2_id=${userId}`);
      const problem = problems.find(p => p.id === res.data.problem_id);
      navigate(`/battle/${battleId}`, { state: { problem } });
    } catch (err) {
      console.error('Failed to join battle');
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareModal.link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const enterPrivateBattle = () => {
    navigate(`/battle/${shareModal.battleId}`, { state: { problem: shareModal.problem } });
    setShareModal(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('user_id');
    localStorage.removeItem('username');
    navigate('/lobby');
  };

  return (
    <div style={styles.container}>

      {/* Share Link Modal */}
      {shareModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <div style={{ fontSize: '50px', marginBottom: '12px' }}>🔗</div>
            <h2 style={styles.modalTitle}>Private Battle Created!</h2>
            <p style={styles.modalText}>Share this link with your friend. They click it and join your battle directly!</p>

            <div style={styles.linkBox}>
              <span style={styles.linkText}>{shareModal.link}</span>
            </div>

            <button style={styles.copyBtn} onClick={copyLink}>
              {copied ? '✅ Copied!' : '📋 Copy Link'}
            </button>

            <p style={styles.modalHint}>Waiting for your friend to click the link...</p>

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button style={styles.enterBtn} onClick={enterPrivateBattle}>
                ⚔️ Enter Battle Room
              </button>
              <button style={styles.cancelBtn} onClick={() => setShareModal(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navbar */}
      <div style={styles.navbar}>
        <h2 style={styles.navLogo}>⚔️ PyBattle</h2>
        <div style={styles.navRight}>
          {isLoggedIn ? (
            <>
              <span style={styles.welcome}>👋 {username}</span>
              <button style={styles.navBtn} onClick={() => navigate('/leaderboard')}>🏆 Leaderboard</button>
              <button style={styles.navBtn} onClick={() => navigate('/about')}>ℹ️ About</button>
              <button style={styles.navBtn} onClick={() => navigate('/profile')}>👤 Profile</button>
              <button style={styles.logoutBtn} onClick={handleLogout}>🚪 Logout</button>
            </>
          ) : (
            <>
              <button style={styles.navBtn} onClick={() => navigate('/leaderboard')}>🏆 Leaderboard</button>
              <button style={styles.navBtn} onClick={() => navigate('/about')}>ℹ️ About</button>
              <button style={styles.loginBtn} onClick={() => navigate('/login')}>Login</button>
              <button style={styles.registerBtn} onClick={() => navigate('/register')}>Register</button>
            </>
          )}
        </div>
      </div>

      {/* Hero banner for guests */}
      {!isLoggedIn && (
        <div style={styles.heroBanner}>
          <h2 style={styles.heroTitle}>⚔️ Real-time 1v1 Python Battles</h2>
          <p style={styles.heroText}>Compete against other coders live. Login to create or join a battle!</p>
          <button style={styles.heroBtn} onClick={() => navigate('/register')}>
            🚀 Get Started Free
          </button>
        </div>
      )}

      {/* Main Content */}
      <div style={styles.content}>
        <h1 style={styles.heading}>Battle Lobby</h1>
        <p style={styles.subheading}>Challenge someone or play with a friend!</p>

        {/* Battle Mode Buttons */}
        <div style={styles.btnRow}>
          <div style={styles.modeCard}>
            <div style={{ fontSize: '36px', marginBottom: '10px' }}>🌍</div>
            <h3 style={styles.modeTitle}>Public Battle</h3>
            <p style={styles.modeDesc}>Join the open lobby and battle any random opponent</p>
            <button
              className="btn-primary"
              style={styles.modeBtn}
              onClick={createBattle}
              disabled={loading}
            >
              {loading ? 'Creating...' : '⚔️ Create Public Battle'}
            </button>
          </div>

          <div style={styles.modeCard}>
            <div style={{ fontSize: '36px', marginBottom: '10px' }}>👫</div>
            <h3 style={styles.modeTitle}>Play with Friend</h3>
            <p style={styles.modeDesc}>Create a private room and share the link with your friend</p>
            <button
              style={styles.friendBtn}
              onClick={createPrivateBattle}
              disabled={privateLoading}
            >
              {privateLoading ? 'Creating...' : '🔗 Create Private Battle'}
            </button>
          </div>
        </div>

        {!isLoggedIn && (
          <p style={styles.loginHint}>🔒 You need to <span style={{ color: '#6c63ff', cursor: 'pointer' }} onClick={() => navigate('/login')}>login</span> to create or join battles</p>
        )}

        {/* Open Battles List */}
        <h2 style={styles.listTitle}>Open Public Battles</h2>

        {battles.length === 0 ? (
          <div style={styles.emptyCard}>
            <p style={{ fontSize: '40px', marginBottom: '10px' }}>🎮</p>
            <p style={{ fontWeight: '700', marginBottom: '5px' }}>No open battles right now.</p>
            <p style={{ fontSize: '14px' }}>Be the first to create one!</p>
          </div>
        ) : (
          <div style={styles.grid}>
            {battles.map((battle) => (
              <div key={battle.id} style={styles.battleCard}>
                <div style={styles.battleIcon}>⚔️</div>
                <p style={styles.battleTitle}>Battle #{battle.id}</p>
                <p style={styles.battleInfo}>Problem #{battle.problem_id} • Waiting...</p>
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

  // Modal
  modalOverlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.85)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px',
  },
  modalBox: {
    background: '#1a1a2e', borderRadius: '24px', padding: '40px 30px',
    textAlign: 'center', width: '100%', maxWidth: '480px',
    border: '2px solid #6c63ff55', boxShadow: '0 0 60px #6c63ff33',
  },
  modalTitle: { color: '#ffffff', fontSize: '24px', fontWeight: '900', marginBottom: '10px' },
  modalText: { color: '#aaaaaa', fontSize: '14px', marginBottom: '20px', lineHeight: '1.6' },
  linkBox: {
    background: '#0f0f1a', border: '1px solid #6c63ff55', borderRadius: '12px',
    padding: '12px 16px', marginBottom: '14px', wordBreak: 'break-all',
  },
  linkText: { color: '#00d4aa', fontSize: '13px', fontFamily: 'monospace' },
  copyBtn: {
    background: 'linear-gradient(135deg, #6c63ff, #00d4aa)',
    border: 'none', color: '#fff', padding: '10px 28px',
    borderRadius: '20px', fontWeight: '700', cursor: 'pointer', fontSize: '14px',
    width: '100%', marginBottom: '12px',
  },
  modalHint: { color: '#aaaaaa', fontSize: '12px', marginBottom: '4px' },
  enterBtn: {
    flex: 1, background: 'transparent', border: '1px solid #00d4aa',
    color: '#00d4aa', padding: '10px', borderRadius: '20px',
    fontWeight: '700', cursor: 'pointer', fontSize: '13px',
  },
  cancelBtn: {
    flex: 1, background: 'transparent', border: '1px solid #ff4757',
    color: '#ff4757', padding: '10px', borderRadius: '20px',
    fontWeight: '700', cursor: 'pointer', fontSize: '13px',
  },

  // Navbar
  navbar: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '15px 30px', background: '#1a1a2e', borderBottom: '1px solid #6c63ff55',
  },
  navLogo: { fontSize: '22px', fontWeight: '900', color: '#6c63ff' },
  navRight: { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' },
  welcome: { color: '#00d4aa', fontWeight: '600', fontSize: '14px' },
  navBtn: {
    background: 'transparent', border: '1px solid #6c63ff55',
    color: '#aaaaaa', padding: '6px 14px', borderRadius: '20px',
    cursor: 'pointer', fontWeight: '600', fontSize: '13px',
  },
  loginBtn: {
    background: 'transparent', border: '1px solid #6c63ff',
    color: '#6c63ff', padding: '6px 16px', borderRadius: '20px',
    cursor: 'pointer', fontWeight: '700', fontSize: '13px',
  },
  registerBtn: {
    background: 'linear-gradient(135deg, #6c63ff, #00d4aa)',
    border: 'none', color: '#fff', padding: '6px 16px', borderRadius: '20px',
    cursor: 'pointer', fontWeight: '700', fontSize: '13px',
  },
  logoutBtn: {
    background: 'transparent', border: '1px solid #ff4757',
    color: '#ff4757', padding: '6px 14px', borderRadius: '20px',
    cursor: 'pointer', fontWeight: '600', fontSize: '13px',
  },

  // Hero
  heroBanner: {
    background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
    borderBottom: '1px solid #6c63ff33', padding: '60px 20px', textAlign: 'center',
  },
  heroTitle: { fontSize: '30px', fontWeight: '900', color: '#ffffff', marginBottom: '14px' },
  heroText: { color: '#aaaaaa', fontSize: '16px', marginBottom: '28px', lineHeight: '1.6' },
  heroBtn: {
    background: 'linear-gradient(135deg, #6c63ff, #00d4aa)',
    border: 'none', color: '#fff', padding: '14px 36px',
    borderRadius: '25px', fontSize: '16px', fontWeight: '700', cursor: 'pointer',
  },

  // Content
  content: { maxWidth: '900px', margin: '0 auto', padding: '60px 20px 40px', textAlign: 'center' },
  heading: { fontSize: '42px', fontWeight: '900', color: '#ffffff', marginBottom: '12px' },
  subheading: { color: '#aaaaaa', marginBottom: '36px', fontSize: '16px' },

  // Mode cards
  btnRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '16px' },
  modeCard: {
    background: '#1a1a2e', borderRadius: '20px', padding: '28px 20px',
    border: '1px solid #6c63ff33', textAlign: 'center',
  },
  modeTitle: { color: '#ffffff', fontSize: '18px', fontWeight: '700', marginBottom: '8px' },
  modeDesc: { color: '#aaaaaa', fontSize: '13px', marginBottom: '20px', lineHeight: '1.5' },
  modeBtn: { width: '100%', padding: '12px 0' },
  friendBtn: {
    width: '100%', padding: '12px 0', borderRadius: '25px', fontWeight: '700',
    fontSize: '14px', cursor: 'pointer', border: '2px solid #6c63ff',
    background: 'transparent', color: '#6c63ff',
    transition: 'all 0.2s',
  },

  loginHint: {
    color: '#aaaaaa', fontSize: '13px', marginBottom: '30px',
    background: '#6c63ff11', border: '1px solid #6c63ff33',
    borderRadius: '10px', padding: '10px 16px', display: 'inline-block',
  },
  listTitle: { fontSize: '24px', fontWeight: '700', color: '#6c63ff', marginBottom: '24px', marginTop: '20px' },
  emptyCard: {
    background: '#1a1a2e', borderRadius: '20px', padding: '40px',
    color: '#aaaaaa', border: '1px solid #6c63ff33',
  },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '24px' },
  battleCard: {
    background: '#1a1a2e', borderRadius: '20px', padding: '28px 20px',
    border: '1px solid #6c63ff55', textAlign: 'center',
  },
  battleIcon: { fontSize: '40px', marginBottom: '14px' },
  battleTitle: { fontSize: '18px', fontWeight: '700', color: '#ffffff', marginBottom: '8px' },
  battleInfo: { color: '#aaaaaa', fontSize: '13px', marginBottom: '8px' },
  battleStatus: { color: '#00d4aa', marginBottom: '18px', fontWeight: '600', fontSize: '14px' },
  joinBtn: { maxWidth: '160px', margin: '0 auto', padding: '10px 20px' },
};

export default Lobby;
