import React, { useState, useEffect } from 'react';
import API from '../api/axios';
import { useNavigate } from 'react-router-dom';
import problems from '../problems';

const GUEST_BATTLE_LIMIT = 10;

const css = `
  * { box-sizing: border-box; }

  /* ── Mobile nav ── */
  .mob-menu {
    display: none;
    flex-direction: column;
    background: #1a1a2e;
    border-top: 1px solid #6c63ff33;
    padding: 12px 16px;
    gap: 8px;
  }
  .mob-menu.open { display: flex; }
  .mob-btn {
    background: transparent;
    border: 1px solid #6c63ff33;
    color: #aaa;
    padding: 10px 14px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    text-align: left;
    width: 100%;
  }
  .mob-logout { border-color: #ff475755 !important; color: #ff4757 !important; }
  .mob-register { background: linear-gradient(135deg,#6c63ff,#00d4aa) !important; color: #fff !important; border: none !important; }

  /* ── Responsive grid ── */
  @media (max-width: 700px) {
    .mode-grid { grid-template-columns: 1fr !important; }
    .battle-grid { grid-template-columns: 1fr !important; }
    .daily-card { flex-direction: column !important; align-items: flex-start !important; gap: 14px !important; }
    .daily-btn-wrap { width: 100%; }
    .daily-btn-wrap button { width: 100% !important; }
    .hero-title { font-size: 22px !important; }
    .lobby-heading { font-size: 28px !important; }
    .lobby-subheading { font-size: 14px !important; }
    .nav-desktop { display: none !important; }
    .hamburger { display: flex !important; }
    .content-pad { padding: 24px 14px 40px !important; }
    .diff-row { flex-wrap: wrap !important; }
  }
  @media (min-width: 701px) {
    .hamburger { display: none !important; }
    .mob-menu { display: none !important; }
  }

  .hamburger {
    background: transparent;
    border: 1px solid #6c63ff44;
    border-radius: 10px;
    color: #fff;
    padding: 6px 12px;
    font-size: 20px;
    cursor: pointer;
    display: none;
    align-items: center;
    justify-content: center;
  }
`;

function getDailyChallenge() {
  const dayIndex = Math.floor(new Date().getTime() / 86400000);
  return problems[dayIndex % problems.length];
}

function Lobby() {
  const [battles, setBattles]             = useState([]);
  const [loading, setLoading]             = useState(false);
  const [privateLoading, setPrivateLoading] = useState(false);
  const [shareModal, setShareModal]       = useState(null);
  const [copied, setCopied]               = useState(false);
  const [showGuestWall, setShowGuestWall] = useState(false);
  const [diffFilter, setDiffFilter]       = useState('All');
  const [menuOpen, setMenuOpen]           = useState(false);
  const navigate = useNavigate();

  const dailyChallenge = getDailyChallenge();
  const userId    = localStorage.getItem('user_id');
  const username  = localStorage.getItem('username');
  const isLoggedIn = !!userId;

  const getGuestCount     = () => parseInt(localStorage.getItem('guest_battles') || '0');
  const incrementGuestCount = () => {
    const next = getGuestCount() + 1;
    localStorage.setItem('guest_battles', String(next));
    return next;
  };

  const fetchBattles = async () => {
    try { const res = await API.get('/battles/list'); setBattles(res.data); }
    catch { /* silent */ }
  };

  useEffect(() => {
    fetchBattles();
    const iv = setInterval(fetchBattles, 3000);
    return () => clearInterval(iv);
  }, []);

  const checkGuestLimit = () => {
    if (isLoggedIn) return true;
    if (getGuestCount() >= GUEST_BATTLE_LIMIT) { setShowGuestWall(true); return false; }
    return true;
  };

  const requireLogin = () => { if (!isLoggedIn) { navigate('/login'); return false; } return true; };

  const createBattle = async (forceProblem = null) => {
    if (!checkGuestLimit()) return;
    setLoading(true);
    try {
      let pool = forceProblem ? [forceProblem]
        : diffFilter === 'All' ? problems
        : problems.filter(p => p.difficulty === diffFilter);
      if (!pool || pool.length === 0) pool = problems;
      const prob = pool[Math.floor(Math.random() * pool.length)];
      if (isLoggedIn) {
        const res = await API.post(`/battles/create?player1_id=${userId}`, { problem_id: prob.id });
        navigate(`/battle/${res.data.id}`, { state: { problem: prob } });
      } else {
        navigate(`/battle/guest-${Date.now()}`, { state: { problem: prob, isGuest: true } });
      }
    } catch { /* silent */ }
    setLoading(false);
  };

  const createPrivateBattle = async () => {
    if (!requireLogin()) return;
    setPrivateLoading(true);
    try {
      const prob = problems[Math.floor(Math.random() * problems.length)];
      const res  = await API.post(`/battles/create?player1_id=${userId}`, { problem_id: prob.id });
      const battleId = res.data.id;
      setShareModal({ battleId, link: `${window.location.origin}/join/${battleId}`, problem: prob });
    } catch { /* silent */ }
    setPrivateLoading(false);
  };

  const joinBattle = async (battleId) => {
    if (!requireLogin()) return;
    try {
      const res = await API.post(`/battles/join/${battleId}?player2_id=${userId}`);
      const prob = problems.find(p => p.id === res.data.problem_id);
      navigate(`/battle/${battleId}`, { state: { problem: prob } });
    } catch { /* silent */ }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareModal.link);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const handleLogout = () => {
    localStorage.removeItem('user_id'); localStorage.removeItem('username'); navigate('/lobby');
  };

  const go = (path) => { setMenuOpen(false); navigate(path); };

  const guestLeft = isLoggedIn ? null : Math.max(0, GUEST_BATTLE_LIMIT - getGuestCount());

  return (
    <div style={S.page}>
      <style>{css}</style>

      {/* ── Guest Wall Modal ── */}
      {showGuestWall && (
        <div style={S.overlay}>
          <div style={S.wallBox}>
            <button onClick={() => setShowGuestWall(false)} style={{ position:'absolute', top:14, right:18, background:'transparent', border:'none', color:'#666', fontSize:22, cursor:'pointer' }}>✕</button>
            <div style={{ fontSize: '56px', marginBottom: '12px' }}>🏆</div>
            <h2 style={S.wallTitle}>You've played {GUEST_BATTLE_LIMIT} free battles!</h2>
            <p style={S.wallText}>Create a free account to keep battling, track your wins, and climb the leaderboard.</p>
            <div style={S.perksGrid}>
              {['✅ Unlimited battles','🏆 Leaderboard ranking','📊 Win/loss history','👤 Public profile'].map(p => (
                <div key={p} style={S.perk}>{p}</div>
              ))}
            </div>
            <button style={S.wallRegBtn} onClick={() => navigate('/register')}>🚀 Create Free Account</button>
            <button style={S.wallLoginBtn} onClick={() => navigate('/login')}>Already have an account? Login</button>
          </div>
        </div>
      )}

      {/* ── Share Modal ── */}
      {shareModal && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <div style={{ fontSize: '50px', marginBottom: '12px' }}>🔗</div>
            <h2 style={S.modalTitle}>Private Battle Created!</h2>
            <p style={S.modalText}>Share this link with your friend to let them join directly!</p>
            <div style={S.linkBox}><span style={S.linkText}>{shareModal.link}</span></div>
            <button style={S.copyBtn} onClick={copyLink}>{copied ? '✅ Copied!' : '📋 Copy Link'}</button>
            <p style={{ color: '#aaa', fontSize: '12px', marginBottom: '10px' }}>Waiting for your friend to click the link...</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button style={S.enterBtn} onClick={() => { navigate(`/battle/${shareModal.battleId}`, { state: { problem: shareModal.problem } }); setShareModal(null); }}>⚔️ Enter Battle Room</button>
              <button style={S.cancelBtn} onClick={() => setShareModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Navbar ── */}
      <nav style={S.navbar}>
        <span style={S.logo} onClick={() => navigate('/lobby')}>⚔️ PyBattle</span>

        {/* Desktop nav */}
        <div className="nav-desktop" style={S.navDesktop}>
          {isLoggedIn ? (
            <>
              <span style={S.welcome}>👋 {username}</span>
              <button style={S.navBtn} onClick={() => navigate('/practice')}>🧪 Practice</button>
              <button style={S.navBtn} onClick={() => navigate('/leaderboard')}>🏆 Leaderboard</button>
              <button style={S.navBtn} onClick={() => navigate('/about')}>ℹ️ About</button>
              <button style={S.navBtn} onClick={() => navigate('/profile')}>👤 Profile</button>
              <button style={S.logoutBtn} onClick={handleLogout}>🚪 Logout</button>
            </>
          ) : (
            <>
              <button style={S.navBtn} onClick={() => navigate('/practice')}>🧪 Practice</button>
              <button style={S.navBtn} onClick={() => navigate('/leaderboard')}>🏆 Leaderboard</button>
              <button style={S.navBtn} onClick={() => navigate('/about')}>ℹ️ About</button>
              <button style={S.loginBtn} onClick={() => navigate('/login')}>Login</button>
              <button style={S.registerBtn} onClick={() => navigate('/register')}>Register</button>
            </>
          )}
        </div>

        {/* Hamburger */}
        <button className="hamburger" onClick={() => setMenuOpen(o => !o)}>
          {menuOpen ? '✕' : '☰'}
        </button>
      </nav>

      {/* Mobile dropdown menu */}
      <div className={`mob-menu${menuOpen ? ' open' : ''}`}>
        {isLoggedIn && <span style={{ color: '#00d4aa', fontWeight: 700, fontSize: 14, padding: '4px 0' }}>👋 {username}</span>}
        <button className="mob-btn" onClick={() => go('/practice')}>🧪 Practice</button>
        <button className="mob-btn" onClick={() => go('/leaderboard')}>🏆 Leaderboard</button>
        <button className="mob-btn" onClick={() => go('/about')}>ℹ️ About</button>
        {isLoggedIn ? (
          <>
            <button className="mob-btn" onClick={() => go('/profile')}>👤 Profile</button>
            <button className="mob-btn mob-logout" onClick={() => { handleLogout(); setMenuOpen(false); }}>🚪 Logout</button>
          </>
        ) : (
          <>
            <button className="mob-btn" onClick={() => go('/login')}>Login</button>
            <button className="mob-btn mob-register" onClick={() => go('/register')}>🚀 Register Free</button>
          </>
        )}
      </div>

      {/* Guest strip */}
      {!isLoggedIn && guestLeft > 0 && (
        <div style={S.guestStrip}>
          🎮 <strong style={{ color: '#00d4aa' }}>{guestLeft} free battle{guestLeft !== 1 ? 's' : ''}</strong> left as guest —&nbsp;
          <span style={{ color: '#6c63ff', cursor: 'pointer', fontWeight: 700 }} onClick={() => navigate('/register')}>Register free</span> to play unlimited!
        </div>
      )}

      {/* Hero for guests */}
      {!isLoggedIn && (
        <div style={S.hero}>
          <h2 className="hero-title" style={S.heroTitle}>⚔️ Real-time 1v1 Python Battles</h2>
          <p style={S.heroText}>No account needed — jump straight in!</p>
          <button style={S.heroBtn} onClick={createBattle} disabled={loading}>
      {loading ? 'Starting...' : '⚔️ Play Now (Free)'}
    </button>
        </div>
      )}

      {/* Main content */}
      <div className="content-pad" style={S.content}>
        <h1 className="lobby-heading" style={S.heading}>Battle Lobby</h1>
        <p className="lobby-subheading" style={S.subheading}>Challenge someone or sharpen your skills!</p>

        {/* Daily Challenge */}
        <div className="daily-card" style={S.dailyCard}>
          <div style={S.dailyLeft}>
            <span style={{ fontSize: 36 }}>🌟</span>
            <div>
              <p style={S.dailyLabel}>DAILY CHALLENGE</p>
              <p style={S.dailyTitle}>{dailyChallenge.title}</p>
              <p style={S.dailyDiff}>{dailyChallenge.difficulty}</p>
            </div>
          </div>
          <div className="daily-btn-wrap">
            <button style={S.dailyBtn} onClick={() => createBattle(dailyChallenge)} disabled={loading}>
              ⚔️ Battle It
            </button>
          </div>
        </div>

        {/* Mode cards */}
        <div className="mode-grid" style={S.modeGrid}>
          {/* Public Battle */}
          <div style={S.modeCard}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🌍</div>
            <h3 style={S.modeTitle}>Public Battle</h3>
            <p style={S.modeDesc}>1v1 real-time battle against a random opponent</p>
            <div className="diff-row" style={S.diffRow}>
              {['All','Easy','Medium','Hard'].map(d => (
                <button key={d}
                  style={{ ...S.diffBtn, ...(diffFilter === d ? S.diffActive : {}) }}
                  onClick={() => setDiffFilter(d)}>{d}</button>
              ))}
            </div>
            <button style={S.primaryBtn} onClick={() => createBattle()} disabled={loading}>
              {loading ? 'Creating...' : '⚔️ Create Battle'}
            </button>
          </div>

          {/* Play with Friend */}
          <div style={S.modeCard}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>👫</div>
            <h3 style={S.modeTitle}>Play with Friend</h3>
            <p style={S.modeDesc}>Create a private room and share the link with a friend</p>
            <button style={S.friendBtn} onClick={createPrivateBattle} disabled={privateLoading}>
              {privateLoading ? 'Creating...' : '🔗 Create Private Battle'}
            </button>
          </div>

          {/* Practice */}
          <div style={S.modeCard}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🧪</div>
            <h3 style={S.modeTitle}>Practice Mode</h3>
            <p style={S.modeDesc}>Pick any problem and solve it solo. No timer, no pressure.</p>
            <button style={S.practiceBtn} onClick={() => navigate('/practice')}>📚 Open Practice</button>
          </div>
        </div>

        {!isLoggedIn && (
          <p style={S.hint}>🔒 <span style={{ color: '#6c63ff', cursor: 'pointer' }} onClick={() => navigate('/login')}>Login</span> to create public battles and track your wins!</p>
        )}

        {/* Open battles */}
        <h2 style={S.listTitle}>Open Public Battles</h2>
        {battles.length === 0 ? (
          <div style={S.emptyCard}>
            <p style={{ fontSize: 40, marginBottom: 10 }}>🎮</p>
            <p style={{ fontWeight: 700 }}>No open battles right now.</p>
            <p style={{ fontSize: 14 }}>Be the first to create one!</p>
          </div>
        ) : (
          <div className="battle-grid" style={S.battleGrid}>
            {battles.slice(0, 6).map(b => (
              <div key={b.id} style={S.battleCard}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>⚔️</div>
                <p style={S.battleTitle}>Battle #{b.id}</p>
                <p style={S.battleInfo}>Problem #{b.problem_id} • Waiting...</p>
                <p style={{ color: '#00d4aa', fontWeight: 600, marginBottom: 14 }}>🟢 Open</p>
                <button style={S.joinBtn} onClick={() => joinBattle(b.id)}>Join Battle</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const S = {
  page: { minHeight: '100vh', background: '#0f0f1a', fontFamily: 'sans-serif' },

  // Modals
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 },
  wallBox: { position:'relative', background: 'linear-gradient(135deg,#1a1a2e,#16213e)', borderRadius: 24, padding: '36px 24px', textAlign: 'center', width: '100%', maxWidth: 460, border: '2px solid #6c63ff', boxShadow: '0 0 60px #6c63ff44' },
  wallTitle: { color: '#fff', fontSize: 22, fontWeight: 900, marginBottom: 12 },
  wallText: { color: '#aaa', fontSize: 14, lineHeight: 1.7, marginBottom: 20 },
  perksGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 },
  perk: { background: '#0f0f1a', border: '1px solid #6c63ff33', borderRadius: 10, padding: '10px 12px', color: '#00d4aa', fontSize: 13, fontWeight: 600 },
  wallRegBtn: { width: '100%', background: 'linear-gradient(135deg,#6c63ff,#00d4aa)', border: 'none', color: '#fff', padding: 14, borderRadius: 25, fontSize: 15, fontWeight: 700, cursor: 'pointer', marginBottom: 10 },
  wallLoginBtn: { width: '100%', background: 'transparent', border: '1px solid #6c63ff44', color: '#aaa', padding: 10, borderRadius: 25, fontSize: 13, cursor: 'pointer' },

  modal: { background: '#1a1a2e', borderRadius: 24, padding: '36px 24px', textAlign: 'center', width: '100%', maxWidth: 460, border: '2px solid #6c63ff55', boxShadow: '0 0 60px #6c63ff33' },
  modalTitle: { color: '#fff', fontSize: 22, fontWeight: 900, marginBottom: 10 },
  modalText: { color: '#aaa', fontSize: 14, marginBottom: 18, lineHeight: 1.6 },
  linkBox: { background: '#0f0f1a', border: '1px solid #6c63ff44', borderRadius: 12, padding: '10px 14px', marginBottom: 12, wordBreak: 'break-all' },
  linkText: { color: '#00d4aa', fontSize: 12, fontFamily: 'monospace' },
  copyBtn: { width: '100%', background: 'linear-gradient(135deg,#6c63ff,#00d4aa)', border: 'none', color: '#fff', padding: '10px', borderRadius: 20, fontWeight: 700, cursor: 'pointer', fontSize: 14, marginBottom: 12 },
  enterBtn: { flex: 1, background: 'transparent', border: '1px solid #00d4aa', color: '#00d4aa', padding: 10, borderRadius: 20, fontWeight: 700, cursor: 'pointer', fontSize: 13 },
  cancelBtn: { flex: 1, background: 'transparent', border: '1px solid #ff4757', color: '#ff4757', padding: 10, borderRadius: 20, fontWeight: 700, cursor: 'pointer', fontSize: 13 },

  // Navbar
  navbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', background: '#1a1a2e', borderBottom: '1px solid #6c63ff55', position: 'sticky', top: 0, zIndex: 100 },
  logo: { fontSize: 20, fontWeight: 900, color: '#6c63ff', cursor: 'pointer' },
  navDesktop: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  welcome: { color: '#00d4aa', fontWeight: 600, fontSize: 13 },
  navBtn: { background: 'transparent', border: '1px solid #6c63ff44', color: '#aaa', padding: '6px 12px', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  loginBtn: { background: 'transparent', border: '1px solid #6c63ff', color: '#6c63ff', padding: '6px 14px', borderRadius: 20, cursor: 'pointer', fontWeight: 700, fontSize: 13 },
  registerBtn: { background: 'linear-gradient(135deg,#6c63ff,#00d4aa)', border: 'none', color: '#fff', padding: '6px 14px', borderRadius: 20, cursor: 'pointer', fontWeight: 700, fontSize: 13 },
  logoutBtn: { background: 'transparent', border: '1px solid #ff475744', color: '#ff4757', padding: '6px 12px', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: 600 },

  // Guest strip
  guestStrip: { background: '#1a1a2e', borderBottom: '1px solid #6c63ff22', padding: '10px 20px', textAlign: 'center', color: '#aaa', fontSize: 13 },

  // Hero
  hero: { background: 'linear-gradient(135deg,#1a1a2e,#16213e)', borderBottom: '1px solid #6c63ff22', padding: '48px 20px', textAlign: 'center' },
  heroTitle: { fontSize: 28, fontWeight: 900, color: '#fff', marginBottom: 12 },
  heroText: { color: '#aaa', fontSize: 15, marginBottom: 24 },
  heroBtn: { background: 'linear-gradient(135deg,#6c63ff,#00d4aa)', border: 'none', color: '#fff', padding: '12px 32px', borderRadius: 25, fontSize: 15, fontWeight: 700, cursor: 'pointer' },

  // Content
  content: { maxWidth: 900, margin: '0 auto', padding: '40px 20px', textAlign: 'center' },
  heading: { fontSize: 36, fontWeight: 900, color: '#fff', marginBottom: 10 },
  subheading: { color: '#aaa', marginBottom: 28, fontSize: 15 },

  // Daily challenge
  dailyCard: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg,#1a1a2e,#16213e)', border: '1px solid #ffa50244', borderRadius: 16, padding: '18px 20px', marginBottom: 24, gap: 14, textAlign: 'left' },
  dailyLeft: { display: 'flex', alignItems: 'center', gap: 14 },
  dailyLabel: { color: '#ffa502', fontSize: 10, fontWeight: 800, letterSpacing: 1, margin: '0 0 4px' },
  dailyTitle: { color: '#fff', fontWeight: 700, fontSize: 17, margin: '0 0 4px' },
  dailyDiff: { color: '#aaa', fontSize: 12, margin: 0 },
  dailyBtn: { background: 'linear-gradient(135deg,#ffa502,#ff6b35)', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: 20, fontWeight: 700, fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap' },

  // Mode grid
  modeGrid: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 16 },
  modeCard: { background: '#1a1a2e', borderRadius: 20, padding: '24px 16px', border: '1px solid #6c63ff22', textAlign: 'center' },
  modeTitle: { color: '#fff', fontSize: 17, fontWeight: 700, marginBottom: 8 },
  modeDesc: { color: '#aaa', fontSize: 13, marginBottom: 18, lineHeight: 1.5 },

  // Difficulty filter
  diffRow: { display: 'flex', gap: 6, marginBottom: 14, justifyContent: 'center' },
  diffBtn: { background: 'transparent', border: '1px solid #6c63ff33', color: '#888', padding: '4px 11px', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  diffActive: { background: '#6c63ff', color: '#fff', border: '1px solid #6c63ff' },

  // Buttons inside mode cards
  primaryBtn: { width: '100%', background: 'linear-gradient(135deg,#6c63ff,#00d4aa)', border: 'none', color: '#fff', padding: '12px 0', borderRadius: 25, fontWeight: 700, fontSize: 14, cursor: 'pointer' },
  friendBtn: { width: '100%', background: 'transparent', border: '2px solid #6c63ff', color: '#6c63ff', padding: '12px 0', borderRadius: 25, fontWeight: 700, fontSize: 14, cursor: 'pointer' },
  practiceBtn: { width: '100%', background: 'transparent', border: '2px solid #00d4aa', color: '#00d4aa', padding: '12px 0', borderRadius: 25, fontWeight: 700, fontSize: 14, cursor: 'pointer' },

  hint: { color: '#aaa', fontSize: 13, marginBottom: 28, background: '#6c63ff11', border: '1px solid #6c63ff22', borderRadius: 10, padding: '10px 16px', display: 'inline-block' },
  listTitle: { fontSize: 22, fontWeight: 700, color: '#6c63ff', marginBottom: 20, marginTop: 16 },
  emptyCard: { background: '#1a1a2e', borderRadius: 20, padding: 40, color: '#aaa', border: '1px solid #6c63ff22' },

  battleGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 20 },
  battleCard: { background: '#1a1a2e', borderRadius: 20, padding: '24px 16px', border: '1px solid #6c63ff44', textAlign: 'center' },
  battleTitle: { fontSize: 17, fontWeight: 700, color: '#fff', marginBottom: 6 },
  battleInfo: { color: '#aaa', fontSize: 13, marginBottom: 6 },
  joinBtn: { background: 'linear-gradient(135deg,#6c63ff,#00d4aa)', border: 'none', color: '#fff', padding: '10px 24px', borderRadius: 20, fontWeight: 700, fontSize: 14, cursor: 'pointer' },
};

export default Lobby;
 
