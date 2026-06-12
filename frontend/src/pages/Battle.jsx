import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import problems from '../problems';
import API from '../api/axios';

const celebrationStyle = `
  @keyframes confettiFall {
    0% { transform: translateY(-100px) rotate(0deg); opacity: 1; }
    100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
  }
  @keyframes victoryPulse {
    0% { transform: scale(0.5); opacity: 0; }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); opacity: 1; }
  }
  @keyframes battleStartPulse {
    0% { transform: scale(0.3); opacity: 0; }
    60% { transform: scale(1.2); opacity: 1; }
    100% { transform: scale(1); opacity: 0; }
  }
  @keyframes countdownPop {
    0% { transform: scale(0.5); opacity: 0; }
    50% { transform: scale(1.3); opacity: 1; }
    100% { transform: scale(1); opacity: 0; }
  }
  @keyframes dotBounce {
    0%, 100% { transform: translateY(0); opacity: 0.4; }
    50% { transform: translateY(-8px); opacity: 1; }
  }
  @keyframes hintSlide {
    0% { transform: translateY(-10px); opacity: 0; }
    100% { transform: translateY(0); opacity: 1; }
  }
  .confetti-piece {
    position: fixed;
    animation: confettiFall linear forwards;
    z-index: 9999;
  }
  .victory-box { animation: victoryPulse 0.6s ease forwards; }
  .battle-start-text { animation: battleStartPulse 1s ease forwards; }
  .countdown-number { animation: countdownPop 0.8s ease forwards; }
  .dot-bounce { animation: dotBounce 1s infinite; }
  .hint-box { animation: hintSlide 0.3s ease forwards; }

  * { box-sizing: border-box; }

  @media (max-width: 768px) {
    .battle-area { flex-direction: column !important; }
    .header-center { display: none !important; }
    .problem-card { margin: 10px 15px !important; }
    .feed-section { margin: 0 15px 15px 15px !important; }
    .battle-area-wrap { padding: 10px 15px !important; }
    .editor-height { height: 220px !important; }
    .mobile-timer {
      display: flex !important;
      justify-content: center;
      padding: 8px;
      background: #1a1a2e;
      font-size: 20px;
      font-weight: 900;
    }
  }
  @media (min-width: 769px) {
    .mobile-timer { display: none !important; }
  }
`;

const Confetti = () => {
  const colors = ['#6c63ff', '#00d4aa', '#ff4757', '#ffa502', '#ffffff', '#ff6b9d'];
  const pieces = Array.from({ length: 80 });
  return (
    <>
      {pieces.map((_, i) => (
        <div
          key={i}
          className="confetti-piece"
          style={{
            left: `${Math.random() * 100}vw`,
            top: `-20px`,
            background: colors[Math.floor(Math.random() * colors.length)],
            borderRadius: Math.random() > 0.5 ? '50%' : '0',
            width: `${Math.random() * 10 + 6}px`,
            height: `${Math.random() * 10 + 6}px`,
            animationDuration: `${Math.random() * 2 + 2}s`,
            animationDelay: `${Math.random() * 1.5}s`,
          }}
        />
      ))}
    </>
  );
};

const TIME_LIMIT = 300;

function Battle({ join = false }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const problem = location.state?.problem || problems[0];

  // If friend opened via /join/:id link, auto-join the battle
  useEffect(() => {
    if (join) {
      const userId = localStorage.getItem('user_id');
      API.post(`/battles/join/${id}?player2_id=${userId}`)
        .then(res => {
          // problem will be loaded from location state or default
        })
        .catch(() => {}); // already joined or other error — continue anyway
    }
  }, [join, id]);

  const [code, setCode] = useState('');
  const [opponentCode, setOpponentCode] = useState('');
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('connecting...');
  const [submitted, setSubmitted] = useState(false);
  const [opponentSubmitted, setOpponentSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [warning, setWarning] = useState(false);
  const [opponentName, setOpponentName] = useState('');
  const [battleStarted, setBattleStarted] = useState(false);
  const [showStartAnimation, setShowStartAnimation] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [timerActive, setTimerActive] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [opponentWon, setOpponentWon] = useState(false);
  const wsRef = useRef(null);
  const codeRef = useRef('');
  const playerId = localStorage.getItem('user_id') || '1';
  const username = localStorage.getItem('username') || 'Player';

  useEffect(() => {
    if (battleStarted && problem) {
      setCode(problem.starter);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battleStarted]);

  useEffect(() => {
    const wsUrl = 'wss://pybattle-backend.onrender.com';
    const ws = new WebSocket(`${wsUrl}/ws/battle/${id}/${playerId}`);
    wsRef.current = ws;
    ws.onopen = () => {
      setStatus('connected');
      ws.send(`JOIN:${username}`);
    };
    ws.onmessage = (e) => {
      const data = e.data;
      if (data === 'BATTLE_READY') {
        setBattleStarted(true);
        startCountdown();
        return;
      }
      if (data.startsWith('CODE:')) {
        setOpponentCode(data.replace('CODE:', ''));
        return;
      }
      if (data.startsWith('JOIN:')) {
        setOpponentName(data.replace('JOIN:', ''));
        return;
      }
      if (data.startsWith('SUBMITTED:')) {
        setOpponentSubmitted(true);
        setMessages((prev) => [...prev, '🏁 Opponent submitted!']);
        return;
      }
      if (data.startsWith('you: CODE:') || data.startsWith('you: JOIN:')) return;
      // Detect opponent winning
      if (data.includes('CORRECT') && !data.startsWith('you:')) {
        setOpponentWon(true);
      }
      setMessages((prev) => [...prev, data]);
    };
    ws.onclose = () => setStatus('disconnected');
    return () => ws.close();
  }, [id, playerId, username]);

  // Tab switch detection
  useEffect(() => {
    if (!battleStarted || submitted) return;
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setWarning(true);
        setMessages((prev) => [...prev, '⚠️ You switched tabs! Warning issued.']);
        // Auto-submit on tab switch as penalty
        if (wsRef.current) {
          wsRef.current.send(`❌ ${username} switched tabs and was auto-submitted!`);
        }
        setSubmitted(true);
        setResult('wrong');
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battleStarted, submitted]);

  // Disable copy/paste and right-click
  useEffect(() => {
    if (!battleStarted) return;
    const block = (e) => e.preventDefault();
    document.addEventListener('copy', block);
    document.addEventListener('paste', block);
    document.addEventListener('cut', block);
    document.addEventListener('contextmenu', block);
    return () => {
      document.removeEventListener('copy', block);
      document.removeEventListener('paste', block);
      document.removeEventListener('cut', block);
      document.removeEventListener('contextmenu', block);
    };
  }, [battleStarted]);

  const startCountdown = () => {
    let count = 3;
    setCountdown(count);
    const interval = setInterval(() => {
      count -= 1;
      if (count === 0) {
        clearInterval(interval);
        setCountdown(null);
        setShowStartAnimation(true);
        setTimerActive(true);
        setTimeout(() => setShowStartAnimation(false), 1500);
      } else {
        setCountdown(count);
      }
    }, 1000);
  };

  useEffect(() => {
    if (!timerActive) return;
    if (timeLeft <= 0) {
      setMessages((prev) => [...prev, '⏰ Time is up! Auto-submitting...']);
      // Auto-submit with latest code
      const latestCode = codeRef.current;
      const isCorrect = latestCode && problem.answer_key &&
        latestCode.replace(/\s/g, '').toLowerCase().includes(problem.answer_key.replace(/\s/g, '').toLowerCase());
      setResult(isCorrect ? 'correct' : 'wrong');
      setSubmitted(true);
      if (wsRef.current) {
        wsRef.current.send(`SUBMITTED:${username}`);
        wsRef.current.send(
          isCorrect
            ? `🏆 ${username} submitted the CORRECT answer!`
            : `❌ ${username} submitted a wrong answer.`
        );
      }
      return;
    }
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerActive, timeLeft]);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const checkAnswer = (userCode) => {
    // Remove all whitespace, quotes, and lowercase for flexible matching
    const clean = (str) => str.replace(/\s/g, '').replace(/['"]/g, '').toLowerCase();
    const cleanCode = clean(userCode);
    const cleanKey = clean(problem.answer_key);
    // Also check if code has a proper function definition and is not just 'pass'
    const hasFunction = userCode.includes('def ');
    const notEmpty = userCode.replace(/\s/g, '') !== 'pass' && userCode.trim().length > 10;
    return hasFunction && notEmpty && cleanCode.includes(cleanKey);
  };

  const submitCode = () => {
    const isCorrect = checkAnswer(code);
    setResult(isCorrect ? 'correct' : 'wrong');
    setSubmitted(true);
    if (isCorrect) {
      setTimeLeft(0);
      // Record win in database
      API.post(`/stats/battle/${id}/result?winner_id=${playerId}`).catch(() => {});
    }
    if (wsRef.current) {
      wsRef.current.send(`SUBMITTED:${username}`);
      wsRef.current.send(
        isCorrect
          ? `🏆 ${username} submitted the CORRECT answer!`
          : `❌ ${username} submitted a wrong answer.`
      );
    }
  };

  const timerColor = timeLeft <= 60 ? '#ff4757' : timeLeft <= 120 ? '#ffa502' : '#00d4aa';

  return (
    <div style={styles.container}>
      <style>{celebrationStyle}</style>

      {/* Victory */}
      {result === 'correct' && (
        <>
          <Confetti />
          <div style={styles.victoryOverlay}>
            <div style={styles.victoryBox} className="victory-box">
              <div style={styles.victoryEmoji}>🏆</div>
              <h1 style={styles.victoryTitle}>YOU WIN!</h1>
              <p style={styles.victorySubtitle}>Correct Answer! Amazing job!</p>
              <div style={styles.victoryStars}>⭐⭐⭐</div>
              <button style={styles.victoryBtn} onClick={() => navigate('/lobby')}>
                🎮 Play Again
              </button>
            </div>
          </div>
        </>
      )}

      {/* Defeat */}
      {opponentWon && result !== 'correct' && (
        <div style={styles.defeatOverlay}>
          <div style={styles.defeatBox} className="victory-box">
            <div style={styles.defeatEmoji}>💀</div>
            <h1 style={styles.defeatTitle}>YOU LOSE!</h1>
            <p style={styles.defeatSubtitle}>
              {opponentName || 'Opponent'} solved it first. Better luck next time!
            </p>
            <div style={styles.defeatStars}>🌑🌑🌑</div>
            <button style={styles.defeatBtn} onClick={() => navigate('/lobby')}>
              🔁 Try Again
            </button>
          </div>
        </div>
      )}

      {/* Waiting */}
      {!battleStarted && (
        <div style={styles.waitingOverlay}>
          <div style={styles.waitingBox}>
            <div style={styles.waitingEmoji}>⚔️</div>
            <h2 style={styles.waitingTitle}>Battle #{id}</h2>
            <p style={styles.waitingText}>Waiting for opponent to join...</p>
            <div style={styles.waitingDots}>
              <span className="dot-bounce" style={{ ...styles.dot, animationDelay: '0s' }} />
              <span className="dot-bounce" style={{ ...styles.dot, animationDelay: '0.2s' }} />
              <span className="dot-bounce" style={{ ...styles.dot, animationDelay: '0.4s' }} />
            </div>
            <p style={styles.waitingUsername}>
              You are: <strong style={{ color: '#00d4aa' }}>{username}</strong>
            </p>
            <button style={styles.leaveWaitBtn} onClick={() => navigate('/lobby')}>
              Leave Lobby
            </button>
            <button
              style={{ ...styles.leaveWaitBtn, borderColor: '#6c63ff', color: '#6c63ff', marginTop: '10px' }}
              onClick={() => {
                sessionStorage.removeItem('guest_name');
                sessionStorage.removeItem('guest_id');
                navigate('/setname');
              }}
            >
              ✏️ Change My Name
            </button>
          </div>
        </div>
      )}

      {/* Countdown */}
      {countdown !== null && (
        <div style={styles.countdownOverlay}>
          <div style={styles.countdownBox}>
            <p style={styles.countdownLabel}>Battle starts in</p>
            <div key={countdown} className="countdown-number" style={styles.countdownNumber}>
              {countdown}
            </div>
          </div>
        </div>
      )}

      {/* Battle Start */}
      {showStartAnimation && (
        <div style={styles.countdownOverlay}>
          <div className="battle-start-text" style={styles.startTextBox}>
            ⚔️ BATTLE START! ⚔️
          </div>
        </div>
      )}

      {/* Warning */}
      {warning && (
        <div style={styles.warningBanner}>
          ⚠️ You switched tabs! Battle is being disconnected!
        </div>
      )}

      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.logo}>⚔️ Battle.py</h2>
        <div className="header-center" style={styles.battleInfo}>
          <span style={styles.battleId}>Battle #{id}</span>
          <span style={{ ...styles.timer, color: timerColor }}>
            ⏱️ {timerActive ? formatTime(timeLeft) : '--:--'}
          </span>
          <span style={status === 'connected' ? styles.online : styles.offline}>
            {status === 'connected' ? '🟢 Live' : '🔴 ' + status}
          </span>
        </div>
        <button style={styles.leaveBtn} onClick={() => navigate('/lobby')}>
          Leave
        </button>
      </div>

      {/* Mobile Timer */}
      <div className="mobile-timer" style={{ color: timerColor }}>
        ⏱️ {timerActive ? formatTime(timeLeft) : '--:--'} &nbsp;
        <span style={{ color: status === 'connected' ? '#00d4aa' : '#ff4757', fontSize: '14px' }}>
          {status === 'connected' ? '🟢 Live' : '🔴 ' + status}
        </span>
      </div>

      {/* Notice */}
      <div style={styles.notice}>
        🔒 Switching tabs disconnects you. Code updates live!
      </div>

      {/* Problem */}
      {battleStarted && (
        <div className="problem-card" style={styles.problemCard}>
          <div style={styles.problemHeader}>
            <h3 style={styles.problemTitle}>📝 {problem.title}</h3>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{
                ...styles.diffBadge,
                background: problem.difficulty === 'Easy' ? '#00d4aa22' : '#ffa50222',
                color: problem.difficulty === 'Easy' ? '#00d4aa' : '#ffa502',
                border: `1px solid ${problem.difficulty === 'Easy' ? '#00d4aa' : '#ffa502'}`,
              }}>
                {problem.difficulty}
              </span>

              {/* Hint Button */}
              <button
                style={styles.hintBtn}
                onClick={() => setShowHint(!showHint)}
                title="Show Hint"
              >
                💡 {showHint ? 'Hide Hint' : 'Hint'}
              </button>
            </div>
          </div>

          <p style={styles.problemDesc}>{problem.description}</p>
          <p style={styles.example}><strong>Example:</strong> {problem.example}</p>

          {/* Hint Box — only shows when clicked */}
          {showHint && (
            <div className="hint-box" style={styles.hintBox}>
              <span style={styles.hintIcon}>💡</span>
              <span style={styles.hintText}>{problem.hint}</span>
            </div>
          )}
        </div>
      )}

      {/* Result Banner */}
      {result && (
        <div style={result === 'correct' ? styles.correctBanner : styles.wrongBanner}>
          {result === 'correct' ? '🏆 Correct Answer! You Win!' : '❌ Wrong Answer! Try again!'}
        </div>
      )}

      {/* Split Screen Editors */}
      {battleStarted && (
        <div className="battle-area battle-area-wrap" style={styles.battleArea}>

          {/* YOUR Editor */}
          <div style={styles.editorSection}>
            <div style={styles.editorHeader}>
              <h3 style={styles.editorTitle}>👨‍💻 {username} (You)</h3>
              {submitted && <span style={styles.submittedBadge}>✅ Submitted</span>}
            </div>
            <div style={styles.editorWrapper}>
              <Editor
                height="300px"
                className="editor-height"
                defaultLanguage="python"
                theme="vs-dark"
                value={code}
                onChange={(value) => {
                  setCode(value);
                  codeRef.current = value;
                  if (wsRef.current && wsRef.current.readyState === 1) {
                    wsRef.current.send(`CODE:${value}`);
                  }
                }}
                onMount={(editor) => {
                  // Block Ctrl+C, Ctrl+V, Ctrl+X inside Monaco
                  editor.onKeyDown((e) => {
                    const isCopy  = e.keyCode === 33 && (e.ctrlKey || e.metaKey);
                    const isPaste = e.keyCode === 52 && (e.ctrlKey || e.metaKey);
                    const isCut   = e.keyCode === 54 && (e.ctrlKey || e.metaKey);
                    if (isCopy || isPaste || isCut) {
                      e.preventDefault();
                      e.stopPropagation();
                    }
                  });
                }}
                options={{
                  fontSize: 13,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  readOnly: submitted,
                  tabSize: 4,
                  insertSpaces: true,
                  lineNumbers: 'on',
                  cursorStyle: 'line',
                  wordWrap: 'on',
                  // Disable Monaco's built-in paste action
                  find: { addExtraSpaceOnTop: false },
                }}
              />
            </div>
            <button
              style={{
                ...styles.submitBtn,
                background: submitted ? '#333' : 'linear-gradient(135deg, #6c63ff, #00d4aa)',
                cursor: submitted ? 'not-allowed' : 'pointer',
              }}
              onClick={submitCode}
              disabled={submitted}
            >
              {submitted ? '✅ Submitted' : '🚀 Submit Solution'}
            </button>

            {/* Edit button — only show if submitted wrong and time still going */}
            {submitted && result === 'wrong' && timeLeft > 0 && (
              <button
                style={styles.editBtn}
                onClick={() => {
                  setSubmitted(false);
                  setResult(null);
                  setMessages((prev) => [...prev, '✏️ You re-opened your solution to edit.']);
                }}
              >
                ✏️ Edit & Resubmit
              </button>
            )}
          </div>

          {/* OPPONENT Editor */}
          <div style={styles.editorSection}>
            <div style={styles.editorHeader}>
              <h3 style={{ ...styles.editorTitle, color: '#ff4757' }}>
                🤖 {opponentName || 'Opponent'} (Opponent)
              </h3>
              {opponentSubmitted && <span style={styles.submittedBadge}>✅ Submitted</span>}
            </div>
            <div style={{ ...styles.editorWrapper, borderColor: '#ff475755' }}>
              <Editor
                height="300px"
                className="editor-height"
                defaultLanguage="python"
                theme="vs-dark"
                value={opponentCode || '# Waiting for opponent to start typing...'}
                options={{
                  fontSize: 13,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  readOnly: true,
                  contextmenu: false,
                  lineNumbers: 'on',
                  wordWrap: 'on',
                }}
              />
            </div>
            <div style={styles.liveTag}>👁️ Live View — Read Only</div>
          </div>

        </div>
      )}

      {/* Live Feed */}
      {battleStarted && (
        <div className="feed-section" style={styles.feedSection}>
          <h3 style={styles.feedTitle}>⚡ Battle Feed</h3>
          <div style={styles.feed}>
            {messages.length === 0 ? (
              <p style={styles.feedEmpty}>Battle events will appear here...</p>
            ) : (
              messages.map((msg, i) => (
                <span key={i} style={{
                  ...styles.feedMsg,
                  color: msg.includes('CORRECT') || msg.includes('🏆') ? '#00d4aa' :
                    msg.includes('wrong') || msg.includes('⚠️') ? '#ff4757' : '#ffffff'
                }}>
                  {msg}
                </span>
              ))
            )}
          </div>
        </div>
      )}

    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', background: '#0f0f1a', display: 'flex', flexDirection: 'column' },
  waitingOverlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: '#0f0f1a', display: 'flex',
    alignItems: 'center', justifyContent: 'center', zIndex: 100,
    padding: '20px',
  },
  waitingBox: {
    background: '#1a1a2e', borderRadius: '30px', padding: '40px 30px',
    textAlign: 'center', border: '1px solid #6c63ff55', width: '100%', maxWidth: '400px',
    boxShadow: '0 0 40px #6c63ff22',
  },
  waitingEmoji: { fontSize: '60px', marginBottom: '15px' },
  waitingTitle: { color: '#6c63ff', fontSize: '24px', fontWeight: '900', marginBottom: '10px' },
  waitingText: { color: '#aaaaaa', fontSize: '15px', marginBottom: '20px' },
  waitingDots: { display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '20px' },
  dot: { width: '10px', height: '10px', borderRadius: '50%', background: '#6c63ff', display: 'inline-block' },
  waitingUsername: { color: '#aaaaaa', fontSize: '14px', marginBottom: '25px' },
  leaveWaitBtn: {
    background: 'transparent', border: '1px solid #ff4757',
    color: '#ff4757', padding: '10px 25px', borderRadius: '20px',
    cursor: 'pointer', fontWeight: '600', width: '100%',
  },
  countdownOverlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.9)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', zIndex: 500,
  },
  countdownBox: { textAlign: 'center' },
  countdownLabel: { color: '#aaaaaa', fontSize: '20px', marginBottom: '10px' },
  countdownNumber: {
    fontSize: '120px', fontWeight: '900',
    background: 'linear-gradient(135deg, #6c63ff, #00d4aa)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
  },
  startTextBox: {
    fontSize: '36px', fontWeight: '900', color: '#ff4757',
    textShadow: '0 0 30px #ff475799', textAlign: 'center', padding: '0 20px',
  },
  victoryOverlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.85)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', zIndex: 9998, padding: '20px',
  },
  victoryBox: {
    background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
    border: '2px solid #00d4aa', borderRadius: '30px',
    padding: '40px 30px', textAlign: 'center', width: '100%', maxWidth: '420px',
    boxShadow: '0 0 60px #00d4aa55',
  },
  victoryEmoji: { fontSize: '70px', marginBottom: '10px' },
  victoryTitle: {
    fontSize: '48px', fontWeight: '900',
    background: 'linear-gradient(135deg, #6c63ff, #00d4aa)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '10px',
  },
  victorySubtitle: { color: '#aaaaaa', fontSize: '16px', marginBottom: '15px' },
  victoryStars: { fontSize: '28px', marginBottom: '20px' },
  victoryBtn: {
    background: 'linear-gradient(135deg, #6c63ff, #00d4aa)',
    border: 'none', color: 'white', padding: '14px 30px',
    borderRadius: '25px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', width: '100%',
  },
  warningBanner: {
    background: '#ff475722', border: '1px solid #ff4757', color: '#ff4757',
    padding: '10px 20px', textAlign: 'center', fontWeight: '600', fontSize: '13px',
  },
  notice: {
    background: '#6c63ff11', color: '#aaaaaa', padding: '6px 20px',
    textAlign: 'center', fontSize: '11px', borderBottom: '1px solid #6c63ff22',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 20px', background: '#1a1a2e', borderBottom: '1px solid #6c63ff55',
  },
  logo: { color: '#6c63ff', fontWeight: '900', fontSize: '18px' },
  battleInfo: { display: 'flex', gap: '12px', alignItems: 'center' },
  battleId: { color: '#ffffff', fontWeight: '700', fontSize: '14px' },
  timer: { fontWeight: '900', fontSize: '20px' },
  online: { color: '#00d4aa', fontWeight: '600', fontSize: '13px' },
  offline: { color: '#ff4757', fontWeight: '600', fontSize: '13px' },
  leaveBtn: {
    background: 'transparent', border: '1px solid #ff4757',
    color: '#ff4757', padding: '6px 14px', borderRadius: '20px', cursor: 'pointer', fontSize: '13px',
  },
  problemCard: {
    margin: '12px 20px', background: '#1a1a2e', borderRadius: '15px',
    padding: '15px', border: '1px solid #6c63ff55',
  },
  problemHeader: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px',
  },
  problemTitle: { color: '#6c63ff', fontSize: '15px', fontWeight: '700' },
  diffBadge: { padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' },
  hintBtn: {
    background: 'transparent', border: '1px solid #ffa502',
    color: '#ffa502', padding: '3px 12px', borderRadius: '20px',
    cursor: 'pointer', fontSize: '12px', fontWeight: '600',
    transition: 'all 0.2s',
  },
  hintBox: {
    background: '#ffa50211', border: '1px solid #ffa50244',
    borderRadius: '10px', padding: '10px 15px', marginTop: '10px',
    display: 'flex', alignItems: 'flex-start', gap: '8px',
  },
  hintIcon: { fontSize: '16px' },
  hintText: { color: '#ffa502', fontSize: '13px', lineHeight: '1.5' },
  problemDesc: { color: '#ffffff', marginBottom: '6px', lineHeight: '1.5', fontSize: '13px' },
  example: { color: '#00d4aa', fontSize: '12px', marginBottom: '4px' },
  correctBanner: {
    margin: '0 20px', background: '#00d4aa22', border: '1px solid #00d4aa',
    color: '#00d4aa', padding: '10px', borderRadius: '10px',
    textAlign: 'center', fontWeight: '700', fontSize: '16px',
  },
  wrongBanner: {
    margin: '0 20px', background: '#ff475722', border: '1px solid #ff4757',
    color: '#ff4757', padding: '10px', borderRadius: '10px',
    textAlign: 'center', fontWeight: '700', fontSize: '16px',
  },
  battleArea: {
    display: 'flex', gap: '12px', padding: '12px 20px', flex: 1,
  },
  editorSection: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 },
  editorHeader: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '4px',
  },
  editorTitle: { color: '#00d4aa', fontSize: '13px', fontWeight: '700' },
  submittedBadge: {
    background: '#00d4aa22', color: '#00d4aa', padding: '2px 8px',
    borderRadius: '10px', fontSize: '11px', fontWeight: '600',
  },
  editorWrapper: { border: '2px solid #6c63ff', borderRadius: '10px', overflow: 'hidden' },
  submitBtn: {
    marginTop: '8px', border: 'none', color: 'white', padding: '10px',
    borderRadius: '25px', fontWeight: '600', fontSize: '14px', width: '100%',
  },
  liveTag: { marginTop: '8px', textAlign: 'center', color: '#ff4757', fontSize: '11px', fontWeight: '600' },
  editBtn: {
    marginTop: '8px', border: '1px solid #ffa502', background: 'transparent',
    color: '#ffa502', padding: '10px', borderRadius: '25px',
    fontWeight: '600', fontSize: '14px', width: '100%', cursor: 'pointer',
  },
  feedSection: {
    margin: '0 20px 15px 20px', background: '#1a1a2e',
    borderRadius: '15px', padding: '12px', border: '1px solid #6c63ff33',
  },
  feedTitle: { color: '#6c63ff', marginBottom: '8px', fontSize: '13px' },
  feed: { display: 'flex', flexWrap: 'wrap', gap: '6px' },
  feedEmpty: { color: '#aaaaaa', fontSize: '12px' },
  feedMsg: { fontSize: '12px', padding: '4px 8px', background: '#0f0f1a', borderRadius: '8px' },
  defeatOverlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.85)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', zIndex: 9998, padding: '20px',
  },
  defeatBox: {
    background: 'linear-gradient(135deg, #1a1a2e, #2a0a0a)',
    border: '2px solid #ff4757', borderRadius: '30px',
    padding: '40px 30px', textAlign: 'center', width: '100%', maxWidth: '420px',
    boxShadow: '0 0 60px #ff475555',
  },
  defeatEmoji: { fontSize: '70px', marginBottom: '10px' },
  defeatTitle: {
    fontSize: '48px', fontWeight: '900', color: '#ff4757',
    marginBottom: '10px', textShadow: '0 0 20px #ff475799',
  },
  defeatSubtitle: { color: '#aaaaaa', fontSize: '15px', marginBottom: '15px' },
  defeatStars: { fontSize: '28px', marginBottom: '20px' },
  defeatBtn: {
    background: 'linear-gradient(135deg, #ff4757, #c0392b)',
    border: 'none', color: 'white', padding: '14px 30px',
    borderRadius: '25px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', width: '100%',
  },
};

export default Battle;