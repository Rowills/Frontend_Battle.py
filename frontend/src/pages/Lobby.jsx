import React, { useState, useEffect } from 'react';
import API from '../api/axios';
import { useNavigate } from 'react-router-dom';
import problems from '../problems';

const GUEST_BATTLE_LIMIT = 3;

// Daily challenge: deterministic problem based on today's date
function getDailyChallenge() {
  const today = new Date();
  const dayIndex = Math.floor(today.getTime() / 86400000); // days since epoch
  return problems[dayIndex % problems.length];
}

function Lobby() {
  const [battles, setBattles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [privateLoading, setPrivateLoading] = useState(false);
  const [shareModal, setShareModal] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showGuestWall, setShowGuestWall] = useState(false);
  const [diffFilter, setDiffFilter] = useState('All');
  const navigate = useNavigate();

  const dailyChallenge = getDailyChallenge();

  const userId = localStorage.getItem('user_id');
  const username = localStorage.getItem('username');
  const isLoggedIn = !!userId;

  // Guest battle counter (persists in localStorage)
  const getGuestCount = () => parseInt(localStorage.getItem('guest_battles') || '0');
  const incrementGuestCount = () => {
    const next = getGuestCount() + 1;
    localStorage.setItem('guest_battles', String(next));
    return next;
  };

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

  // Check guest limit — returns true if allowed to proceed
  const checkGuestLimit = () => {
    if (isLoggedIn) return true;
    const count = getGuestCount();
    if (count >= GUEST_BATTLE_LIMIT) {
      setShowGuestWall(true);
      return false;
    }
    return true;
  };

  const requireLogin = () => {
    if (!isLoggedIn) { navigate('/login'); return false; }
    return true;
  };

  const createBattle = async (forceProblem = null) => {
    if (!checkGuestLimit()) return;
    setLoading(true);
    try {
      const pool = forceProblem ? [forceProblem]
        : diffFilter === 'All' ? problems
        : problems.filter(p => p.difficulty === diffFilter);
      const randomProblem = pool[Math.floor(Math.random() * pool.length)];
      if (isLoggedIn) {
        const res = await API.post(`/battles/create?player1_id=${userId}`, {
          problem_id: randomProblem.id,
        });
        incrementGuestCount();
        navigate(`/battle/${res.data.id}`, { state: { problem: randomProblem } });
      } else {
        incrementGuestCount();
        navigate(`/battle/guest-${Date.now()}`, { state: { problem: randomProblem, isGuest: true } });
      }
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

  const guestBattlesLeft = isLoggedIn ? null : Math.max(0, GUEST_BATTLE_LIMIT - getGuestCount());

  return (
    <div style={styles.container}>

      {/* Guest Wall Modal */}
      {showGuestWall && (
        <div style={styles.modalOverlay}>
          <div style={styles.guestWallBox}>
            <div style={{ fontSize: '56px', marginBottom: '12px' }}>🏆</div>
            <h2 style={styles.guestWallTitle}>You've played {GUEST_BATTLE_LIMIT} free battles!</h2>
            <p style={styles.guestWallText}>
              Create a free account to keep battling, track your wins, climb the leaderboard, and unlock your full battle history.
            </p>
            <div style={styles.guestWallPerks}>
              <div style={styles.perk}>✅ Unlimited battles</div>
              <div style={styles.perk}>🏆 Leaderboard ranking</div>
              <div style={styles.perk}>📊 Win/loss history</div>
              <div style={styles.perk}>👤 Public profile</div>
            </div>
            <button style={styles.guestRegisterBtn} onClick={() => navigate('/register')}>
              🚀 Create Free Account
            </button>
            <button style={styles.guestLoginBtn} onClick={() => navigate('/login')}>
              Already have an account? Login
            </button>
          </div>
        </div>
      )}

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
              <button style={styles.navBtn} onClick={() => navigate('/practice')}>🧪 Practice</button>
              <button style={styles.navBtn} onClick={() => navigate('/leaderboard')}>🏆 Leaderboard</button>
              <button style={styles.navBtn} onClick={() => navigate('/about')}>ℹ️ About</button>
              <button style={styles.navBtn} onClick={() => navigate('/profile')}>👤 Profile</button>
              <button style={styles.logoutBtn} onClick={handleLogout}>🚪 Logout</button>
            </>
          ) : (
            <>
              <button style={styles.navBtn} onClick={() => navigate('/practice')}>🧪 Practice</button>
              <button style={styles.navBtn} onClick={() => navigate('/leaderboard')}>🏆 Leaderboard</button>
              <button style={styles.navBtn} onClick={() => navigate('/about')}>ℹ️ About</button>
              <button style={styles.loginBtn} onClick={() => navigate('/login')}>Login</button>
              <button style={styles.registerBtn} onClick={() => navigate('/register')}>Register</button>
            </>
          )}
        </div>
      </div>

      {/* Guest battle counter strip */}
      {!isLoggedIn && guestBattlesLeft > 0 && (
        <div style={styles.guestStrip}>
          🎮 You have <strong style={{ color: '#00d4aa', margin: '0 4px' }}>{guestBattlesLeft} free battle{guestBattlesLeft !== 1 ? 's' : ''}</strong> left as a guest —&nbsp;
          <span style={{ color: '#6c63ff', cursor: 'pointer', fontWeight: 700 }} onClick={() => navigate('/register')}>
            Register free
          </span> to play unlimited!
        </div>
      )}

      {/* Hero banner for guests */}
      {!isLoggedIn && (
        <div style={styles.heroBanner}>
          <h2 style={styles.heroTitle}>⚔️ Real-time 1v1 Python Battles</h2>
          <p style={styles.heroText}>No account needed to start — jump straight into a battle!</p>
          <button style={styles.heroBtn} onClick={createBattle}>
            ⚔️ Play Now (Free)
          </button>
        </div>
      )}

      {/* Main Content */}
      <div style={styles.content}>
        <h1 style={styles.heading}>Battle Lobby</h1>
        <p style={styles.subheading}>Challenge someone or sharpen your skills!</p>

        {/* Daily Challenge Card */}
        <div style={styles.dailyCard}>
          <div style={styles.dailyLeft}>
            <div style={styles.dailyEmoji}>🌟</div>
            <div>
              <p style={styles.dailyLabel}>DAILY CHALLENGE</p>
              <p style={styles.dailyTitle}>{dailyChallenge.title}</p>
              <p style={styles.dailyDiff}>{dailyChallenge.difficulty}</p>
            </div>
          </div>
          <button style={styles.dailyBtn} onClick={() => createBattle(dailyChallenge)} disabled={loading}>
            ⚔️ Battle It
          </button>
        </div>

        {/* Battle Mode Buttons */}
        <div style={styles.btnRow}>
          <div style={styles.modeCard}>
            <div style={{ fontSize: '36px', marginBottom: '10px' }}>🌍</div>
            <h3 style={styles.modeTitle}>Public Battle</h3>
            <p style={styles.modeDesc}>1v1 real-time battle against a random opponent</p>
            {/* Difficulty filter */}
            <div style={styles.diffRow}>
              {['All','Easy','Medium','Hard'].map(d => (
                <button
                  key={d}
                  style={{ ...styles.diffBtn, ...(diffFilter === d ? styles.diffBtnActive : {}) }}
                  onClick={() => setDiffFilter(d)}
                >{d}</button>
              ))}
            </div>
            <button
              className="btn-primary"
              style={styles.modeBtn}
              onClick={() => createBattle()}
              disabled={loading}
            >
              {loading ? 'Creating...' : '⚔️ Create Battle'}
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

          <div style={styles.modeCard}>
            <div style={{ fontSize: '36px', marginBottom: '10px' }}>🧪</div>
            <h3 style={styles.modeTitle}>Practice Mode</h3>
            <p style={styles.modeDesc}>Pick any problem and solve it solo. No timer, no pressure.</p>
            <button style={styles.practiceBtn} onClick={() => navigate('/practice')}>
              📚 Open Practice
            </button>
          </div>
        </div>

        {!isLoggedIn && (
          <p style={styles.loginHint}>🔒 <span style={{ color: '#6c63ff', cursor: 'pointer' }} onClick={() => navigate('/login')}>Login</span> to create public battles and track your wins!</p>
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
            {battles.slice(0, 6).map((battle) => (
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

  // Guest strip + wall
  guestStrip: {
    background: '#1a1a2e', borderBottom: '1px solid #6c63ff33',
    padding: '10px 20px', textAlign: 'center', color: '#aaaaaa', fontSize: '14px',
  },
  guestWallBox: {
    background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
    borderRadius: '24px', padding: '44px 32px', textAlign: 'center',
    width: '100%', maxWidth: '480px',
    border: '2px solid #6c63ff', boxShadow: '0 0 60px #6c63ff44',
  },
  guestWallTitle: { color: '#ffffff', fontSize: '24px', fontWeight: '900', marginBottom: '12px' },
  guestWallText: { color: '#aaaaaa', fontSize: '14px', lineHeight: '1.7', marginBottom: '20px' },
  guestWallPerks: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '24px',
  },
  perk: {
    background: '#0f0f1a', border: '1px solid #6c63ff33', borderRadius: '10px',
    padding: '10px 12px', color: '#00d4aa', fontSize: '13px', fontWeight: '600',
  },
  guestRegisterBtn: {
    width: '100%', background: 'linear-gradient(135deg, #6c63ff, #00d4aa)',
    border: 'none', color: '#fff', padding: '14px', borderRadius: '25px',
    fontSize: '16px', fontWeight: '700', cursor: 'pointer', marginBottom: '12px',
  },
  guestLoginBtn: {
    width: '100%', background: 'transparent', border: '1px solid #6c63ff55',
    color: '#aaaaaa', padding: '10px', borderRadius: '25px',
    fontSize: '13px', fontWeight: '600', cursor: 'pointer',
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

  // Daily challenge
  dailyCard: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
    border: '1px solid #ffa50244', borderRadius: '16px', padding: '20px 24px',
    marginBottom: '24px',
  },
  dailyLeft: { display: 'flex', alignItems: 'center', gap: '16px' },
  dailyEmoji: { fontSize: '36px' },
  dailyLabel: { color: '#ffa502', fontSize: '11px', fontWeight: '800', letterSpacing: '1px', margin: '0 0 4px' },
  dailyTitle: { color: '#fff', fontWeight: '700', fontSize: '18px', margin: '0 0 4px' },
  dailyDiff: { color: '#aaa', fontSize: '13px', margin: 0 },
  dailyBtn: {
    background: 'linear-gradient(135deg, #ffa502, #ff6b35)', border: 'none',
    color: '#fff', padding: '10px 22px', borderRadius: '20px',
    fontWeight: '700', fontSize: '14px', cursor: 'pointer',
  },

  // Difficulty filter
  diffRow: { display: 'flex', gap: '6px', marginBottom: '14px', justifyContent: 'center' },
  diffBtn: { background: 'transparent', border: '1px solid #6c63ff33', color: '#888', padding: '4px 12px', borderRadius: '20px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' },
  diffBtnActive: { background: '#6c63ff', color: '#fff', border: '1px solid #6c63ff' },

  // Practice button
  practiceBtn: {
    width: '100%', padding: '12px 0', borderRadius: '25px', fontWeight: '700',
    fontSize: '14px', cursor: 'pointer', border: '2px solid #00d4aa',
    background: 'transparent', color: '#00d4aa',
  },

  // Mode cards
  btnRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '16px' },
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
