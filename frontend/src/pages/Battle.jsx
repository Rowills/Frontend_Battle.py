import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import problems from '../problems';
import API from '../api/axios';

// ─── Bot Profiles ────────────────────────────────────────────────────────────
const BOT_PROFILES = [
  { name: 'CodeNinja42',   emoji: '🥷', rating: 1870, level: 'hard'   },
  { name: 'PyMaster99',    emoji: '🐍', rating: 1620, level: 'medium' },
  { name: 'AlgoKing_X',   emoji: '👑', rating: 1430, level: 'medium' },
  { name: 'ByteWizard',   emoji: '🧙', rating: 1190, level: 'easy'   },
  { name: 'LoopBreaker',  emoji: '⚡', rating: 1760, level: 'hard'   },
  { name: 'IndentError',  emoji: '🤖', rating:  920, level: 'easy'   },
  { name: 'RecursivePy',  emoji: '🔄', rating: 1550, level: 'medium' },
  { name: 'SyntaxSlayer', emoji: '⚔️', rating: 1910, level: 'hard'   },
  { name: 'PEP8Prophet',  emoji: '📜', rating: 1080, level: 'easy'   },
  { name: 'LambdaLord',   emoji: 'λ',  rating: 1650, level: 'medium' },
  { name: 'NullPointer',  emoji: '💀', rating:  850, level: 'easy'   },
  { name: 'HashTable_H',  emoji: '📊', rating: 1720, level: 'hard'   },
];

// Bot solve-time ranges in seconds [min, max] based on difficulty + skill
const BOT_SOLVE_TIME = {
  easy:   { hard: [15,35],  medium: [35,60],  easy: [60,90]  },
  medium: { hard: [45,90],  medium: [90,150], easy: [150,210] },
  hard:   { hard: [110,180],medium: [180,250],easy: [250,295] },
};

function pickBot() {
  return BOT_PROFILES[Math.floor(Math.random() * BOT_PROFILES.length)];
}

function getBotSolveTime(problemDifficulty, botLevel) {
  const diff = (problemDifficulty || 'Easy').toLowerCase();
  const key  = diff === 'easy' ? 'easy' : diff === 'medium' ? 'medium' : 'hard';
  const [min, max] = BOT_SOLVE_TIME[key][botLevel];
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Fake bot typing lines — looks like real solving attempt
function buildBotLines(problem) {
  const starterLines = (problem?.starter || 'def solution():\n    pass').split('\n');
  const fakeExtra = [
    '    # think...',
    '    result = []',
    '    for i in range(len(input_val)):',
    '        if input_val[i]:',
    '            result.append(input_val[i])',
    '    return result',
  ];
  return [...starterLines, ...fakeExtra];
}

// ─── Confetti ─────────────────────────────────────────────────────────────────
const Confetti = () => {
  const colors = ['#6c63ff','#00d4aa','#ff4757','#ffa502','#ffffff','#ff6b9d'];
  return (
    <>
      {Array.from({ length: 80 }).map((_, i) => (
        <div key={i} className="confetti-piece" style={{
          left: `${Math.random()*100}vw`, top: '-20px',
          background: colors[Math.floor(Math.random()*colors.length)],
          borderRadius: Math.random() > 0.5 ? '50%' : '0',
          width:  `${Math.random()*10+6}px`,
          height: `${Math.random()*10+6}px`,
          animationDuration: `${Math.random()*2+2}s`,
          animationDelay:    `${Math.random()*1.5}s`,
        }} />
      ))}
    </>
  );
};

const celebrationStyle = `
  @keyframes confettiFall {
    0%   { transform: translateY(-100px) rotate(0deg);   opacity: 1; }
    100% { transform: translateY(100vh)  rotate(720deg); opacity: 0; }
  }
  @keyframes victoryPulse {
    0%   { transform: scale(0.5); opacity: 0; }
    50%  { transform: scale(1.1); }
    100% { transform: scale(1);   opacity: 1; }
  }
  @keyframes battleStartPulse {
    0%   { transform: scale(0.3); opacity: 0; }
    60%  { transform: scale(1.2); opacity: 1; }
    100% { transform: scale(1);   opacity: 0; }
  }
  @keyframes countdownPop {
    0%   { transform: scale(0.5); opacity: 0; }
    50%  { transform: scale(1.3); opacity: 1; }
    100% { transform: scale(1);   opacity: 0; }
  }
  @keyframes dotBounce {
    0%, 100% { transform: translateY(0);   opacity: 0.4; }
    50%       { transform: translateY(-8px); opacity: 1;   }
  }
  @keyframes hintSlide {
    0%   { transform: translateY(-10px); opacity: 0; }
    100% { transform: translateY(0);     opacity: 1; }
  }
  @keyframes botJoin {
    0%   { transform: scale(0.5) rotate(-10deg); opacity: 0; }
    60%  { transform: scale(1.15) rotate(2deg);  opacity: 1; }
    100% { transform: scale(1) rotate(0deg);     opacity: 1; }
  }
  .confetti-piece  { position: fixed; animation: confettiFall linear forwards; z-index: 9999; }
  .victory-box     { animation: victoryPulse 0.6s ease forwards; }
  .battle-start-text { animation: battleStartPulse 1s ease forwards; }
  .countdown-number  { animation: countdownPop 0.8s ease forwards; }
  .dot-bounce { animation: dotBounce 1s infinite; }
  .hint-box   { animation: hintSlide 0.3s ease forwards; }
  .bot-join   { animation: botJoin 0.7s ease forwards; }
  * { box-sizing: border-box; }
  @media (max-width: 768px) {
    .battle-area { flex-direction: column !important; }
    .header-center { display: none !important; }
    .problem-card  { margin: 10px 15px !important; }
    .feed-section  { margin: 0 15px 15px 15px !important; }
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

const TIME_LIMIT = 300;
const BOT_WAIT   = 15; // seconds before bot joins

function Battle({ join = false }) {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const location     = useLocation();
  const problem      = location.state?.problem || problems[0];

  // ── Core state ──────────────────────────────────────────────────────────────
  const [code,             setCode]             = useState('');
  const [opponentCode,     setOpponentCode]     = useState('');
  const [messages,         setMessages]         = useState([]);
  const [status,           setStatus]           = useState('connecting...');
  const [submitted,        setSubmitted]        = useState(false);
  const [opponentSubmitted,setOpponentSubmitted]= useState(false);
  const [result,           setResult]           = useState(null);
  const [timeLeft,         setTimeLeft]         = useState(TIME_LIMIT);
  const [warning,          setWarning]          = useState(false);
  const [opponentName,     setOpponentName]     = useState('');
  const [battleStarted,    setBattleStarted]    = useState(false);
  const [showStartAnimation,setShowStartAnimation] = useState(false);
  const [countdown,        setCountdown]        = useState(null);
  const [timerActive,      setTimerActive]      = useState(false);
  const [showHint,         setShowHint]         = useState(false);
  const [opponentWon,      setOpponentWon]      = useState(false);

  // ── Bot state ────────────────────────────────────────────────────────────────
  const [waitCountdown,  setWaitCountdown]  = useState(BOT_WAIT);
  const [isBot,          setIsBot]          = useState(false);
  const [botProfile,     setBotProfile]     = useState(null);
  const [botJoinAnim,    setBotJoinAnim]    = useState(false);
  const [botTyping,      setBotTyping]      = useState(false);
  const [realPlayerJoined, setRealPlayerJoined] = useState(false);

  // ── Refs ─────────────────────────────────────────────────────────────────────
  const wsRef         = useRef(null);
  const codeRef       = useRef('');
  const botSolveRef   = useRef(null);   // solve time in seconds
  const botTimerRef   = useRef(null);   // interval ref for bot countdown
  const submittedRef  = useRef(false);  // track if user already submitted (for bot win logic)

  const playerId = localStorage.getItem('user_id') || '1';
  const username = localStorage.getItem('username') || 'Player';

  // ── Set starter code when battle begins ────────────────────────────────────
  useEffect(() => {
    if (battleStarted && problem) setCode(problem.starter);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battleStarted]);

  // ── Auto-join if friend link ────────────────────────────────────────────────
  useEffect(() => {
    if (join) {
      API.post(`/battles/join/${id}?player2_id=${playerId}`)
        .catch(() => {});
    }
  }, [join, id, playerId]);

  // ── WebSocket connection ────────────────────────────────────────────────────
  useEffect(() => {
    const ws = new WebSocket(`wss://pybattle-backend.onrender.com/ws/battle/${id}/${playerId}`);
    wsRef.current = ws;
    ws.onopen = () => {
      setStatus('connected');
      ws.send(`JOIN:${username}`);
    };
    ws.onmessage = (e) => {
      const data = e.data;
      if (data === 'BATTLE_READY') {
        setRealPlayerJoined(true);
        setBattleStarted(true);
        startCountdown();
        return;
      }
      if (data.startsWith('CODE:'))      { setOpponentCode(data.replace('CODE:', '')); return; }
      if (data.startsWith('JOIN:'))      { setOpponentName(data.replace('JOIN:', '')); return; }
      if (data.startsWith('SUBMITTED:')) {
        setOpponentSubmitted(true);
        setMessages(p => [...p, '🏁 Opponent submitted!']);
        return;
      }
      if (data.startsWith('you: CODE:') || data.startsWith('you: JOIN:')) return;
      if (data.includes('CORRECT') && !data.startsWith('you:')) setOpponentWon(true);
      setMessages(p => [...p, data]);
    };
    ws.onclose = () => setStatus('disconnected');
    return () => ws.close();
  }, [id, playerId, username]);

  // ── 15-second waiting countdown → spawn bot ────────────────────────────────
  useEffect(() => {
    if (battleStarted || realPlayerJoined) return;   // real player joined — no bot needed

    const interval = setInterval(() => {
      setWaitCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          spawnBot();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battleStarted, realPlayerJoined]);

  function spawnBot() {
    const bot = pickBot();
    setBotProfile(bot);
    setIsBot(true);
    setOpponentName(`${bot.emoji} ${bot.name}`);
    setBotJoinAnim(true);

    // Calculate solve time
    const solveTime = getBotSolveTime(problem?.difficulty, bot.level);
    botSolveRef.current = solveTime;

    setMessages(p => [...p, `🤖 ${bot.emoji} ${bot.name} [${bot.rating}⭐] joined the battle!`]);

    // Short delay then start battle
    setTimeout(() => {
      setBotJoinAnim(false);
      setBattleStarted(true);
      startCountdown();
    }, 2000);
  }

  // ── Bot typing + submit simulation ─────────────────────────────────────────
  useEffect(() => {
    if (!isBot || !battleStarted || !timerActive) return;

    const botLines  = buildBotLines(problem);
    let lineIdx     = 0;
    let currentText = '';

    // Think delay: 2–6 s before starting to type
    const thinkDelay = (Math.random() * 4 + 2) * 1000;

    const typingTimeout = setTimeout(() => {
      setBotTyping(true);
      setMessages(p => [...p, `⌨️ ${botProfile?.emoji} ${botProfile?.name} started typing...`]);

      // Reveal code line by line
      const lineInterval = setInterval(() => {
        if (lineIdx >= botLines.length) {
          clearInterval(lineInterval);
          setBotTyping(false);

          // Occasional mistake: bot "deletes" last line and retypes
          const makesMistake = Math.random() < 0.4;
          if (makesMistake) {
            const linesWithoutLast = currentText.split('\n').slice(0, -2).join('\n');
            setTimeout(() => {
              setOpponentCode(linesWithoutLast + '\n    # hmm...');
              setMessages(p => [...p, `😅 ${botProfile?.name} made an edit...`]);
              setTimeout(() => {
                setOpponentCode(currentText);
              }, 2500);
            }, 1500);
          }
          return;
        }
        currentText += (lineIdx === 0 ? '' : '\n') + botLines[lineIdx];
        setOpponentCode(currentText);
        lineIdx++;
      }, 600 + Math.random() * 800);

      botTimerRef.current = lineInterval;
    }, thinkDelay);

    // Bot submission timer
    const solveMs = (botSolveRef.current || 60) * 1000;
    const submitTimeout = setTimeout(() => {
      clearInterval(botTimerRef.current);
      setBotTyping(false);
      setOpponentSubmitted(true);
      setOpponentCode(currentText || (problem?.starter || '') + '\n    return result');
      setMessages(p => [...p, `🏁 ${botProfile?.emoji} ${botProfile?.name} submitted!`]);

      // Bot wins only if user hasn't already submitted a correct answer
      if (!submittedRef.current) {
        // Higher rated bots win more often
        const rating = botProfile?.rating || 1200;
        const winsChance = rating >= 1700 ? 0.75 : rating >= 1300 ? 0.45 : 0.20;
        if (Math.random() < winsChance) {
          setTimeout(() => {
            setOpponentWon(true);
            setMessages(p => [...p, `🏆 ${botProfile?.name} got CORRECT answer!`]);
          }, 1500);
        } else {
          setMessages(p => [...p, `❌ ${botProfile?.name} submitted a wrong answer.`]);
        }
      }
    }, solveMs);

    return () => {
      clearTimeout(typingTimeout);
      clearTimeout(submitTimeout);
      clearInterval(botTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBot, battleStarted, timerActive]);

  // ── Tab switch detection ────────────────────────────────────────────────────
  useEffect(() => {
    if (!battleStarted || submitted) return;
    const handleVisibility = () => {
      if (document.hidden) {
        setWarning(true);
        setMessages(p => [...p, '⚠️ You switched tabs! Warning issued.']);
        if (wsRef.current) wsRef.current.send(`❌ ${username} switched tabs!`);
        setSubmitted(true);
        setResult('wrong');
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battleStarted, submitted]);

  // ── Block copy/paste ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!battleStarted) return;
    const block = e => e.preventDefault();
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

  // ── 3-2-1 countdown ────────────────────────────────────────────────────────
  const startCountdown = () => {
    let count = 3;
    setCountdown(count);
    const iv = setInterval(() => {
      count -= 1;
      if (count === 0) {
        clearInterval(iv);
        setCountdown(null);
        setShowStartAnimation(true);
        setTimerActive(true);
        setTimeout(() => setShowStartAnimation(false), 1500);
      } else {
        setCountdown(count);
      }
    }, 1000);
  };

  // ── Battle timer ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!timerActive) return;
    if (timeLeft <= 0) {
      const latestCode = codeRef.current;
      const isCorrect  = checkAnswer(latestCode);
      setResult(isCorrect ? 'correct' : 'wrong');
      setSubmitted(true);
      submittedRef.current = true;
      setMessages(p => [...p, '⏰ Time is up! Auto-submitting...']);
      if (wsRef.current) {
        wsRef.current.send(`SUBMITTED:${username}`);
        wsRef.current.send(isCorrect ? `🏆 ${username} submitted correct!` : `❌ ${username} time out.`);
      }
      return;
    }
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerActive, timeLeft]);

  const formatTime = s => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;

  const checkAnswer = userCode => {
    const clean    = str => str.replace(/\s/g,'').replace(/['"]/g,'').toLowerCase();
    const cleanKey = clean(problem?.answer_key || '');
    const notEmpty = userCode.replace(/\s/g,'') !== 'pass' && userCode.trim().length > 10;
    return notEmpty && clean(userCode).includes(cleanKey);
  };

  const submitCode = () => {
    const isCorrect = checkAnswer(code);
    setResult(isCorrect ? 'correct' : 'wrong');
    setSubmitted(true);
    submittedRef.current = true;
    if (isCorrect) {
      setTimeLeft(0);
      API.post(`/stats/battle/${id}/result?winner_id=${playerId}`).catch(() => {});
    }
    if (wsRef.current) {
      wsRef.current.send(`SUBMITTED:${username}`);
      wsRef.current.send(isCorrect ? `🏆 ${username} submitted the CORRECT answer!` : `❌ ${username} submitted a wrong answer.`);
    }
  };

  const timerColor = timeLeft <= 60 ? '#ff4757' : timeLeft <= 120 ? '#ffa502' : '#00d4aa';

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div style={styles.container}>
      <style>{celebrationStyle}</style>

      {/* ── Victory ── */}
      {result === 'correct' && (
        <>
          <Confetti />
          <div style={styles.victoryOverlay}>
            <div style={styles.victoryBox} className="victory-box">
              <div style={styles.victoryEmoji}>🏆</div>
              <h1 style={styles.victoryTitle}>YOU WIN!</h1>
              <p style={styles.victorySubtitle}>
                {isBot
                  ? `You beat ${botProfile?.emoji} ${botProfile?.name} [${botProfile?.rating}⭐]!`
                  : 'Correct Answer! Amazing job!'}
              </p>
              <div style={styles.victoryStars}>⭐⭐⭐</div>
              <button style={styles.victoryBtn} onClick={() => navigate('/lobby')}>🎮 Play Again</button>
            </div>
          </div>
        </>
      )}

      {/* ── Defeat ── */}
      {opponentWon && result !== 'correct' && (
        <div style={styles.defeatOverlay}>
          <div style={styles.defeatBox} className="victory-box">
            <div style={styles.defeatEmoji}>💀</div>
            <h1 style={styles.defeatTitle}>YOU LOSE!</h1>
            <p style={styles.defeatSubtitle}>
              {opponentName || 'Opponent'} solved it first. Better luck next time!
            </p>
            <div style={styles.defeatStars}>🌑🌑🌑</div>
            <button style={styles.defeatBtn} onClick={() => navigate('/lobby')}>🔁 Try Again</button>
          </div>
        </div>
      )}

      {/* ── Bot join animation overlay ── */}
      {botJoinAnim && botProfile && (
        <div style={styles.botJoinOverlay}>
          <div className="bot-join" style={styles.botJoinBox}>
            <div style={{ fontSize: '60px' }}>{botProfile.emoji}</div>
            <h2 style={styles.botJoinName}>{botProfile.name}</h2>
            <p style={styles.botJoinRating}>⭐ Rating: {botProfile.rating}</p>
            <p style={styles.botJoinLevel}>
              {botProfile.level === 'hard' ? '🔥 Strong opponent!' :
               botProfile.level === 'medium' ? '⚡ Decent challenger!' : '🌱 Beginner bot'}
            </p>
            <p style={{ color: '#aaaaaa', fontSize: '13px' }}>No players found — Bot joined!</p>
          </div>
        </div>
      )}

      {/* ── Waiting screen ── */}
      {!battleStarted && !botJoinAnim && (
        <div style={styles.waitingOverlay}>
          <div style={styles.waitingBox}>
            <div style={styles.waitingEmoji}>⚔️</div>
            <h2 style={styles.waitingTitle}>Battle #{id}</h2>
            <p style={styles.waitingText}>Waiting for a real opponent...</p>
            <div style={styles.waitingDots}>
              <span className="dot-bounce" style={{ ...styles.dot, animationDelay: '0s'   }} />
              <span className="dot-bounce" style={{ ...styles.dot, animationDelay: '0.2s' }} />
              <span className="dot-bounce" style={{ ...styles.dot, animationDelay: '0.4s' }} />
            </div>
            {/* Countdown timer */}
            <div style={styles.waitCountdownBox}>
              <p style={styles.waitCountdownLabel}>Bot joins in</p>
              <div style={{
                ...styles.waitCountdownNum,
                color: waitCountdown <= 5 ? '#ff4757' : '#6c63ff',
              }}>
                {waitCountdown}s
              </div>
              <div style={styles.waitProgressBar}>
                <div style={{
                  ...styles.waitProgressFill,
                  width: `${((BOT_WAIT - waitCountdown) / BOT_WAIT) * 100}%`,
                  background: waitCountdown <= 5 ? '#ff4757' : '#6c63ff',
                }} />
              </div>
            </div>
            <p style={styles.waitingUsername}>
              You: <strong style={{ color: '#00d4aa' }}>{username}</strong>
            </p>
            <button style={styles.leaveWaitBtn} onClick={() => navigate('/lobby')}>Leave Lobby</button>
          </div>
        </div>
      )}

      {/* ── 3-2-1 Countdown ── */}
      {countdown !== null && (
        <div style={styles.countdownOverlay}>
          <div style={styles.countdownBox}>
            <p style={styles.countdownLabel}>Battle starts in</p>
            <div key={countdown} className="countdown-number" style={styles.countdownNumber}>{countdown}</div>
          </div>
        </div>
      )}

      {/* ── Battle Start Flash ── */}
      {showStartAnimation && (
        <div style={styles.countdownOverlay}>
          <div className="battle-start-text" style={styles.startTextBox}>⚔️ BATTLE START! ⚔️</div>
        </div>
      )}

      {/* ── Warning Banner ── */}
      {warning && (
        <div style={styles.warningBanner}>⚠️ You switched tabs! Battle is being disconnected!</div>
      )}

      {/* ── Header ── */}
      <div style={styles.header}>
        <h2 style={styles.logo}>⚔️ PyBattle</h2>
        <div className="header-center" style={styles.battleInfo}>
          <span style={styles.battleId}>Battle #{id}</span>
          {isBot && botProfile && (
            <span style={styles.botTag}>🤖 vs Bot [{botProfile.rating}⭐]</span>
          )}
          <span style={{ ...styles.timer, color: timerColor }}>
            ⏱️ {timerActive ? formatTime(timeLeft) : '--:--'}
          </span>
          <span style={status === 'connected' ? styles.online : styles.offline}>
            {status === 'connected' ? '🟢 Live' : '🔴 ' + status}
          </span>
        </div>
        <button style={styles.leaveBtn} onClick={() => navigate('/lobby')}>Leave</button>
      </div>

      {/* ── Mobile Timer ── */}
      <div className="mobile-timer" style={{ color: timerColor }}>
        ⏱️ {timerActive ? formatTime(timeLeft) : '--:--'} &nbsp;
        <span style={{ color: status === 'connected' ? '#00d4aa' : '#ff4757', fontSize: '14px' }}>
          {status === 'connected' ? '🟢 Live' : '🔴 ' + status}
        </span>
      </div>

      {/* ── Notice ── */}
      <div style={styles.notice}>
        🔒 Switching tabs disconnects you. Code updates live!
        {isBot && <span style={{ color: '#ffa502', marginLeft: '12px' }}>🤖 Playing vs Bot</span>}
      </div>

      {/* ── Problem Card ── */}
      {battleStarted && (
        <div className="problem-card" style={styles.problemCard}>
          <div style={styles.problemHeader}>
            <h3 style={styles.problemTitle}>📝 {problem.title}</h3>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{
                ...styles.diffBadge,
                background: problem.difficulty === 'Easy' ? '#00d4aa22' : '#ffa50222',
                color:      problem.difficulty === 'Easy' ? '#00d4aa'   : '#ffa502',
                border: `1px solid ${problem.difficulty === 'Easy' ? '#00d4aa' : '#ffa502'}`,
              }}>{problem.difficulty}</span>
              <button style={styles.hintBtn} onClick={() => setShowHint(!showHint)}>
                💡 {showHint ? 'Hide Hint' : 'Hint'}
              </button>
            </div>
          </div>
          <p style={styles.problemDesc}>{problem.description}</p>
          <p style={styles.example}><strong>Example:</strong> {problem.example}</p>
          {showHint && (
            <div className="hint-box" style={styles.hintBox}>
              <span style={styles.hintIcon}>💡</span>
              <span style={styles.hintText}>{problem.hint}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Result Banner ── */}
      {result && (
        <div style={result === 'correct' ? styles.correctBanner : styles.wrongBanner}>
          {result === 'correct' ? '🏆 Correct Answer! You Win!' : '❌ Wrong Answer! Try again!'}
        </div>
      )}

      {/* ── Split Editors ── */}
      {battleStarted && (
        <div className="battle-area battle-area-wrap" style={styles.battleArea}>

          {/* Your Editor */}
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
                onChange={value => {
                  setCode(value);
                  codeRef.current = value;
                  if (wsRef.current?.readyState === 1) wsRef.current.send(`CODE:${value}`);
                }}
                onMount={editor => {
                  editor.onKeyDown(e => {
                    const isCopy  = e.keyCode === 33 && (e.ctrlKey || e.metaKey);
                    const isPaste = e.keyCode === 52 && (e.ctrlKey || e.metaKey);
                    const isCut   = e.keyCode === 54 && (e.ctrlKey || e.metaKey);
                    if (isCopy || isPaste || isCut) { e.preventDefault(); e.stopPropagation(); }
                  });
                }}
                options={{
                  fontSize: 13, minimap: { enabled: false }, scrollBeyondLastLine: false,
                  automaticLayout: true, readOnly: submitted, tabSize: 4,
                  insertSpaces: true, lineNumbers: 'on', cursorStyle: 'line', wordWrap: 'on',
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
            {submitted && result === 'wrong' && timeLeft > 0 && (
              <button style={styles.editBtn} onClick={() => {
                setSubmitted(false);
                submittedRef.current = false;
                setResult(null);
                setMessages(p => [...p, '✏️ You re-opened your solution to edit.']);
              }}>✏️ Edit & Resubmit</button>
            )}
          </div>

          {/* Opponent / Bot Editor */}
          <div style={styles.editorSection}>
            <div style={styles.editorHeader}>
              <h3 style={{ ...styles.editorTitle, color: '#ff4757' }}>
                {isBot ? `🤖 ${botProfile?.emoji} ${botProfile?.name}` : `🤖 ${opponentName || 'Opponent'}`} (Opponent)
              </h3>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                {isBot && botProfile && (
                  <span style={styles.ratingBadge}>⭐ {botProfile.rating}</span>
                )}
                {opponentSubmitted && <span style={styles.submittedBadge}>✅ Submitted</span>}
                {botTyping && <span style={styles.typingBadge}>⌨️ typing...</span>}
              </div>
            </div>
            <div style={{ ...styles.editorWrapper, borderColor: '#ff475755' }}>
              <Editor
                height="300px"
                className="editor-height"
                defaultLanguage="python"
                theme="vs-dark"
                value={opponentCode || '# Waiting for opponent to start typing...'}
                options={{
                  fontSize: 13, minimap: { enabled: false }, scrollBeyondLastLine: false,
                  automaticLayout: true, readOnly: true, contextmenu: false,
                  lineNumbers: 'on', wordWrap: 'on',
                }}
              />
            </div>
            <div style={styles.liveTag}>👁️ Live View — Read Only</div>
          </div>

        </div>
      )}

      {/* ── Live Feed ── */}
      {battleStarted && (
        <div className="feed-section" style={styles.feedSection}>
          <h3 style={styles.feedTitle}>⚡ Battle Feed</h3>
          <div style={styles.feed}>
            {messages.length === 0
              ? <p style={styles.feedEmpty}>Battle events will appear here...</p>
              : messages.map((msg, i) => (
                  <span key={i} style={{
                    ...styles.feedMsg,
                    color: msg.includes('CORRECT') || msg.includes('🏆') ? '#00d4aa' :
                           msg.includes('wrong')  || msg.includes('⚠️') ? '#ff4757' : '#ffffff',
                  }}>{msg}</span>
                ))
            }
          </div>
        </div>
      )}

    </div>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const styles = {
  container: { minHeight: '100vh', background: '#0f0f1a', display: 'flex', flexDirection: 'column' },

  // Waiting
  waitingOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: '#0f0f1a', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' },
  waitingBox: { background: '#1a1a2e', borderRadius: '30px', padding: '40px 30px', textAlign: 'center', border: '1px solid #6c63ff55', width: '100%', maxWidth: '400px', boxShadow: '0 0 40px #6c63ff22' },
  waitingEmoji: { fontSize: '60px', marginBottom: '15px' },
  waitingTitle: { color: '#6c63ff', fontSize: '24px', fontWeight: '900', marginBottom: '10px' },
  waitingText:  { color: '#aaaaaa', fontSize: '15px', marginBottom: '20px' },
  waitingDots:  { display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '20px' },
  dot: { width: '10px', height: '10px', borderRadius: '50%', background: '#6c63ff', display: 'inline-block' },
  waitingUsername: { color: '#aaaaaa', fontSize: '14px', marginBottom: '25px', marginTop: '10px' },
  leaveWaitBtn: { background: 'transparent', border: '1px solid #ff4757', color: '#ff4757', padding: '10px 25px', borderRadius: '20px', cursor: 'pointer', fontWeight: '600', width: '100%' },

  // Bot countdown in waiting
  waitCountdownBox:   { margin: '10px 0 15px', padding: '15px', background: '#0f0f1a', borderRadius: '15px', border: '1px solid #6c63ff33' },
  waitCountdownLabel: { color: '#aaaaaa', fontSize: '12px', marginBottom: '6px' },
  waitCountdownNum:   { fontSize: '36px', fontWeight: '900', marginBottom: '8px' },
  waitProgressBar:    { background: '#333', borderRadius: '10px', height: '6px', overflow: 'hidden' },
  waitProgressFill:   { height: '100%', borderRadius: '10px', transition: 'width 1s linear, background 0.3s' },

  // Bot join animation
  botJoinOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  botJoinBox:     { background: '#1a1a2e', borderRadius: '25px', padding: '40px', textAlign: 'center', border: '2px solid #ff4757', boxShadow: '0 0 50px #ff475544', maxWidth: '350px', width: '90%' },
  botJoinName:    { color: '#ff4757', fontSize: '28px', fontWeight: '900', margin: '10px 0 5px' },
  botJoinRating:  { color: '#ffa502', fontSize: '18px', marginBottom: '8px' },
  botJoinLevel:   { color: '#ffffff', fontSize: '15px', marginBottom: '10px' },

  // Countdown
  countdownOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500 },
  countdownBox:     { textAlign: 'center' },
  countdownLabel:   { color: '#aaaaaa', fontSize: '20px', marginBottom: '10px' },
  countdownNumber:  { fontSize: '120px', fontWeight: '900', background: 'linear-gradient(135deg,#6c63ff,#00d4aa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  startTextBox:     { fontSize: '36px', fontWeight: '900', color: '#ff4757', textShadow: '0 0 30px #ff475799', textAlign: 'center', padding: '0 20px' },

  // Victory / Defeat
  victoryOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9998, padding: '20px' },
  victoryBox:     { background: 'linear-gradient(135deg,#1a1a2e,#16213e)', border: '2px solid #00d4aa', borderRadius: '30px', padding: '40px 30px', textAlign: 'center', width: '100%', maxWidth: '420px', boxShadow: '0 0 60px #00d4aa55' },
  victoryEmoji:   { fontSize: '70px', marginBottom: '10px' },
  victoryTitle:   { fontSize: '48px', fontWeight: '900', background: 'linear-gradient(135deg,#6c63ff,#00d4aa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '10px' },
  victorySubtitle:{ color: '#aaaaaa', fontSize: '16px', marginBottom: '15px' },
  victoryStars:   { fontSize: '28px', marginBottom: '20px' },
  victoryBtn:     { background: 'linear-gradient(135deg,#6c63ff,#00d4aa)', border: 'none', color: 'white', padding: '14px 30px', borderRadius: '25px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', width: '100%' },
  defeatOverlay:  { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9998, padding: '20px' },
  defeatBox:      { background: 'linear-gradient(135deg,#1a1a2e,#2a0a0a)', border: '2px solid #ff4757', borderRadius: '30px', padding: '40px 30px', textAlign: 'center', width: '100%', maxWidth: '420px', boxShadow: '0 0 60px #ff475555' },
  defeatEmoji:    { fontSize: '70px', marginBottom: '10px' },
  defeatTitle:    { fontSize: '48px', fontWeight: '900', color: '#ff4757', marginBottom: '10px', textShadow: '0 0 20px #ff475799' },
  defeatSubtitle: { color: '#aaaaaa', fontSize: '15px', marginBottom: '15px' },
  defeatStars:    { fontSize: '28px', marginBottom: '20px' },
  defeatBtn:      { background: 'linear-gradient(135deg,#ff4757,#c0392b)', border: 'none', color: 'white', padding: '14px 30px', borderRadius: '25px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', width: '100%' },

  // Game
  warningBanner: { background: '#ff475722', border: '1px solid #ff4757', color: '#ff4757', padding: '10px 20px', textAlign: 'center', fontWeight: '600', fontSize: '13px' },
  notice:        { background: '#6c63ff11', color: '#aaaaaa', padding: '6px 20px', textAlign: 'center', fontSize: '11px', borderBottom: '1px solid #6c63ff22' },
  header:        { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', background: '#1a1a2e', borderBottom: '1px solid #6c63ff55' },
  logo:          { color: '#6c63ff', fontWeight: '900', fontSize: '18px' },
  battleInfo:    { display: 'flex', gap: '12px', alignItems: 'center' },
  battleId:      { color: '#ffffff', fontWeight: '700', fontSize: '14px' },
  botTag:        { background: '#ff475722', color: '#ff4757', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', border: '1px solid #ff475755' },
  timer:         { fontWeight: '900', fontSize: '20px' },
  online:        { color: '#00d4aa', fontWeight: '600', fontSize: '13px' },
  offline:       { color: '#ff4757', fontWeight: '600', fontSize: '13px' },
  leaveBtn:      { background: 'transparent', border: '1px solid #ff4757', color: '#ff4757', padding: '6px 14px', borderRadius: '20px', cursor: 'pointer', fontSize: '13px' },
  problemCard:   { margin: '12px 20px', background: '#1a1a2e', borderRadius: '15px', padding: '15px', border: '1px solid #6c63ff55' },
  problemHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' },
  problemTitle:  { color: '#6c63ff', fontSize: '15px', fontWeight: '700' },
  diffBadge:     { padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' },
  hintBtn:       { background: 'transparent', border: '1px solid #ffa502', color: '#ffa502', padding: '3px 12px', borderRadius: '20px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' },
  hintBox:       { background: '#ffa50211', border: '1px solid #ffa50244', borderRadius: '10px', padding: '10px 15px', marginTop: '10px', display: 'flex', alignItems: 'flex-start', gap: '8px' },
  hintIcon:      { fontSize: '16px' },
  hintText:      { color: '#ffa502', fontSize: '13px', lineHeight: '1.5' },
  problemDesc:   { color: '#ffffff', marginBottom: '6px', lineHeight: '1.5', fontSize: '13px' },
  example:       { color: '#00d4aa', fontSize: '12px', marginBottom: '4px' },
  correctBanner: { margin: '0 20px', background: '#00d4aa22', border: '1px solid #00d4aa', color: '#00d4aa', padding: '10px', borderRadius: '10px', textAlign: 'center', fontWeight: '700', fontSize: '16px' },
  wrongBanner:   { margin: '0 20px', background: '#ff475722', border: '1px solid #ff4757', color: '#ff4757', padding: '10px', borderRadius: '10px', textAlign: 'center', fontWeight: '700', fontSize: '16px' },
  battleArea:    { display: 'flex', gap: '12px', padding: '12px 20px', flex: 1 },
  editorSection: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 },
  editorHeader:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '4px' },
  editorTitle:   { color: '#00d4aa', fontSize: '13px', fontWeight: '700' },
  submittedBadge:{ background: '#00d4aa22', color: '#00d4aa', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '600' },
  ratingBadge:   { background: '#ffa50222', color: '#ffa502', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '600', border: '1px solid #ffa50255' },
  typingBadge:   { background: '#6c63ff22', color: '#6c63ff', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '600', border: '1px solid #6c63ff55' },
  editorWrapper: { border: '2px solid #6c63ff', borderRadius: '10px', overflow: 'hidden' },
  submitBtn:     { marginTop: '8px', border: 'none', color: 'white', padding: '10px', borderRadius: '25px', fontWeight: '600', fontSize: '14px', width: '100%' },
  editBtn:       { marginTop: '8px', border: '1px solid #ffa502', background: 'transparent', color: '#ffa502', padding: '10px', borderRadius: '25px', fontWeight: '600', fontSize: '14px', width: '100%', cursor: 'pointer' },
  liveTag:       { marginTop: '8px', textAlign: 'center', color: '#ff4757', fontSize: '11px', fontWeight: '600' },
  feedSection:   { margin: '0 20px 15px 20px', background: '#1a1a2e', borderRadius: '15px', padding: '12px', border: '1px solid #6c63ff33' },
  feedTitle:     { color: '#6c63ff', marginBottom: '8px', fontSize: '13px' },
  feed:          { display: 'flex', flexWrap: 'wrap', gap: '6px' },
  feedEmpty:     { color: '#aaaaaa', fontSize: '12px' },
  feedMsg:       { fontSize: '12px', padding: '4px 8px', background: '#0f0f1a', borderRadius: '8px' },
};

export default Battle;
