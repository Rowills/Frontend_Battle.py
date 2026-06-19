import React, { useState, useEffect, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import problems from '../problems';
import API from '../api/axios';
import { runOpponentBattle, randomHumanName } from '../utils/botSimulator';

// ── Animation CSS ─────────────────────────────────────────────────────────────
const css = `
  @keyframes confettiFall {
    0%   { transform: translateY(-100px) rotate(0deg);   opacity: 1; }
    100% { transform: translateY(100vh)  rotate(720deg); opacity: 0; }
  }
  @keyframes victoryPulse {
    0%   { transform: scale(0.5); opacity: 0; }
    50%  { transform: scale(1.1); }
    100% { transform: scale(1);   opacity: 1; }
  }
  @keyframes battleStart {
    0%   { transform: scale(0.3); opacity: 0; }
    60%  { transform: scale(1.2); opacity: 1; }
    100% { transform: scale(1);   opacity: 0; }
  }
  @keyframes cntPop {
    0%   { transform: scale(0.5); opacity: 0; }
    50%  { transform: scale(1.3); opacity: 1; }
    100% { transform: scale(1);   opacity: 0; }
  }
  @keyframes dotBounce {
    0%, 100% { transform: translateY(0);    opacity: .4; }
    50%       { transform: translateY(-8px); opacity: 1;  }
  }
  @keyframes hintSlide {
    from { transform: translateY(-8px); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }
  @keyframes searchPulse {
    0%,100% { opacity: .5; transform: scale(1);   }
    50%     { opacity: 1;  transform: scale(1.08); }
  }
  .confetti-piece   { position:fixed; animation:confettiFall linear forwards; z-index:9999; }
  .victory-box      { animation:victoryPulse .6s ease forwards; }
  .battle-start-txt { animation:battleStart 1s ease forwards; }
  .cnt-num          { animation:cntPop .8s ease forwards; }
  .dot-bounce       { animation:dotBounce 1s infinite; }
  .hint-box         { animation:hintSlide .3s ease forwards; }
  .search-pulse     { animation:searchPulse 2s ease-in-out infinite; }
  * { box-sizing:border-box; }
  @media(max-width:768px){
    .battle-area      { flex-direction:column !important; }
    .hdr-center       { display:none !important; }
    .problem-card     { margin:10px 15px !important; }
    .feed-section     { margin:0 15px 15px 15px !important; }
    .battle-area-wrap { padding:10px 15px !important; }
    .editor-height    { height:220px !important; }
    .mobile-timer {
      display:flex !important; justify-content:center;
      padding:8px; background:#1a1a2e; font-size:20px; font-weight:900;
    }
  }
  @media(min-width:769px){ .mobile-timer{ display:none !important; } }
`;

// ── Confetti ──────────────────────────────────────────────────────────────────
const Confetti = () => {
  const colors = ['#6c63ff','#00d4aa','#ff4757','#ffa502','#fff','#ff6b9d'];
  return (
    <>
      {Array.from({length:80}).map((_,i)=>(
        <div key={i} className="confetti-piece" style={{
          left:`${Math.random()*100}vw`, top:'-20px',
          background: colors[Math.floor(Math.random()*colors.length)],
          borderRadius: Math.random()>.5?'50%':'0',
          width:`${Math.random()*10+6}px`, height:`${Math.random()*10+6}px`,
          animationDuration:`${Math.random()*2+2}s`,
          animationDelay:`${Math.random()*1.5}s`,
        }}/>
      ))}
    </>
  );
};

const TIME_LIMIT    = 300;
const MATCH_WAIT_MS = 15000; // wait for real player before silent fallback

// ─────────────────────────────────────────────────────────────────────────────
function Battle({ join = false }) {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const location  = useLocation();
  const problem   = location.state?.problem || problems[0];

  // ── Game state ──────────────────────────────────────────────────────────────
  const [code,              setCode]              = useState('');
  const [opponentCode,      setOpponentCode]      = useState('');
  const [messages,          setMessages]          = useState([]);
  const [status,            setStatus]            = useState('connecting...');
  const [submitted,         setSubmitted]         = useState(false);
  const [opponentSubmitted, setOpponentSubmitted] = useState(false);
  const [result,            setResult]            = useState(null);
  const [timeLeft,          setTimeLeft]          = useState(TIME_LIMIT);
  const [warning,           setWarning]           = useState(false);
  const [opponentName,      setOpponentName]      = useState('');
  const [battleStarted,     setBattleStarted]     = useState(false);
  const [showStartAnim,     setShowStartAnim]     = useState(false);
  const [countdown,         setCountdown]         = useState(null);
  const [timerActive,       setTimerActive]       = useState(false);
  const [showHint,          setShowHint]          = useState(false);
  const [opponentWon,       setOpponentWon]       = useState(false);

  // ── Internal (not shown to user) ───────────────────────────────────────────
  const [realJoined,        setRealJoined]        = useState(false);

  // ── Refs ────────────────────────────────────────────────────────────────────
  const wsRef          = useRef(null);
  const codeRef        = useRef('');
  const submittedRef   = useRef(false);
  const matchTimerRef  = useRef(null);
  const abortRef       = useRef(null);    // AbortController for typing sim

  const playerId = localStorage.getItem('user_id') || '1';
  const username = localStorage.getItem('username') || 'Player';

  // ── Set starter when battle begins ─────────────────────────────────────────
  useEffect(() => {
    if (battleStarted && problem) setCode(problem.starter);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battleStarted]);

  // ── Auto-join friend link ───────────────────────────────────────────────────
  useEffect(() => {
    if (join) API.post(`/battles/join/${id}?player2_id=${playerId}`).catch(()=>{});
  }, [join, id, playerId]);

  // ── 3-2-1 countdown then battle ────────────────────────────────────────────
  const startCountdown = useCallback(() => {
    let n = 3;
    setCountdown(n);
    const iv = setInterval(() => {
      n -= 1;
      if (n === 0) {
        clearInterval(iv);
        setCountdown(null);
        setShowStartAnim(true);
        setTimerActive(true);
        setTimeout(() => setShowStartAnim(false), 1500);
      } else {
        setCountdown(n);
      }
    }, 1000);
  }, []);

  // ── Silent opponent fallback after MATCH_WAIT_MS ──────────────────────────
  const launchSilentOpponent = useCallback(() => {
    const fakeName = randomHumanName();
    // 50% chance opponent wins when they finally submit correct
    const opponentWinsOnCorrect = Math.random() < 0.50;

    setOpponentName(fakeName);
    setMessages(p => [...p, `⚔️ ${fakeName} joined the battle!`]);

    setTimeout(() => {
      setBattleStarted(true);
      startCountdown();

      const COUNTDOWN_MS = 4500;
      abortRef.current = new AbortController();
      const signal = abortRef.current.signal;

      let wrongCount = 0;

      setTimeout(() => {
        runOpponentBattle(
          problem,
          setOpponentCode,

          // onWrongSubmit — called each time opponent submits wrong
          (attemptNum) => {
            wrongCount++;
            setOpponentSubmitted(true);
            setMessages(p => [...p, `🏁 ${fakeName} submitted!`]);
            setMessages(p => [...p, `❌ ${fakeName} got a wrong answer.`]);
            // After a short moment show them going back to edit
            setTimeout(() => {
              setOpponentSubmitted(false);
              setMessages(p => [...p, `✏️ ${fakeName} is editing... (attempt ${attemptNum + 1})`]);
            }, 3000);
          },

          // onCorrectSubmit — final correct submission
          () => {
            setOpponentSubmitted(true);
            setMessages(p => [...p, `🏁 ${fakeName} submitted!`]);
            if (!submittedRef.current && opponentWinsOnCorrect) {
              setTimeout(() => {
                setOpponentWon(true);
                setMessages(p => [...p, `🏆 ${fakeName} got it correct!`]);
              }, 1200);
            } else if (!submittedRef.current) {
              setMessages(p => [...p, `✅ ${fakeName} fixed it — hurry up!`]);
            }
          },

          signal
        ).catch(() => {}); // swallow AbortError
      }, COUNTDOWN_MS);

    }, 1200);
  }, [problem, startCountdown]);

  // ── WebSocket ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const ws = new WebSocket(`wss://pybattle-backend.onrender.com/ws/battle/${id}/${playerId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('connected');
      ws.send(`JOIN:${username}`);

      // Start the silent matchmaking timer
      matchTimerRef.current = setTimeout(() => {
        if (!realJoined) launchSilentOpponent();
      }, MATCH_WAIT_MS);
    };

    ws.onmessage = (e) => {
      const data = e.data;

      if (data === 'BATTLE_READY') {
        clearTimeout(matchTimerRef.current);  // cancel silent fallback
        setRealJoined(true);
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

    return () => {
      ws.close();
      clearTimeout(matchTimerRef.current);
      abortRef.current?.abort();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, playerId, username]);

  // ── Tab switch detection ────────────────────────────────────────────────────
  useEffect(() => {
    if (!battleStarted || submitted) return;
    const handle = () => {
      if (!document.hidden) return;
      setWarning(true);
      setMessages(p => [...p, '⚠️ You switched tabs! Warning issued.']);
      if (wsRef.current) wsRef.current.send(`❌ ${username} switched tabs!`);
      setSubmitted(true); submittedRef.current = true;
      setResult('wrong');
    };
    document.addEventListener('visibilitychange', handle);
    return () => document.removeEventListener('visibilitychange', handle);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battleStarted, submitted]);

  // ── Block copy/paste ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!battleStarted) return;
    const block = e => e.preventDefault();
    ['copy','paste','cut','contextmenu'].forEach(ev => document.addEventListener(ev, block));
    return () => ['copy','paste','cut','contextmenu'].forEach(ev => document.removeEventListener(ev, block));
  }, [battleStarted]);

  // ── Battle countdown timer ──────────────────────────────────────────────────
  useEffect(() => {
    if (!timerActive) return;
    if (timeLeft <= 0) {
      const latest    = codeRef.current;
      const isCorrect = checkAnswer(latest);
      setResult(isCorrect ? 'correct' : 'wrong');
      setSubmitted(true); submittedRef.current = true;
      setMessages(p => [...p, '⏰ Time is up!']);
      if (wsRef.current) {
        wsRef.current.send(`SUBMITTED:${username}`);
        wsRef.current.send(isCorrect ? `🏆 ${username} correct!` : `❌ ${username} time out.`);
      }
      return;
    }
    const t = setInterval(() => setTimeLeft(s => s - 1), 1000);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerActive, timeLeft]);

  const formatTime = s =>
    `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;

  const checkAnswer = code => {
    const clean = s => s.replace(/\s/g,'').replace(/['"]/g,'').toLowerCase();
    return code.trim().length > 10 &&
           clean(code).includes(clean(problem?.answer_key || ''));
  };

  const submitCode = () => {
    const ok = checkAnswer(code);
    setResult(ok ? 'correct' : 'wrong');
    setSubmitted(true); submittedRef.current = true;
    if (ok) {
      setTimeLeft(0);
      API.post(`/stats/battle/${id}/result?winner_id=${playerId}`).catch(()=>{});
    }
    if (wsRef.current) {
      wsRef.current.send(`SUBMITTED:${username}`);
      wsRef.current.send(ok ? `🏆 ${username} correct!` : `❌ ${username} wrong.`);
    }
  };

  const timerColor = timeLeft <= 60 ? '#ff4757' : timeLeft <= 120 ? '#ffa502' : '#00d4aa';

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div style={S.page}>
      <style>{css}</style>

      {/* ── Victory ── */}
      {result === 'correct' && (
        <>
          <Confetti/>
          <div style={S.overlay}>
            <div style={S.victoryBox} className="victory-box">
              <div style={{fontSize:70,marginBottom:10}}>🏆</div>
              <h1 style={S.victoryTitle}>YOU WIN!</h1>
              <p style={S.victorySub}>Correct Answer! Amazing job!</p>
              <div style={{fontSize:28,marginBottom:20}}>⭐⭐⭐</div>
              <button style={S.victoryBtn} onClick={()=>navigate('/lobby')}>🎮 Play Again</button>
            </div>
          </div>
        </>
      )}

      {/* ── Defeat ── */}
      {opponentWon && result !== 'correct' && (
        <div style={S.overlay}>
          <div style={S.defeatBox} className="victory-box">
            <div style={{fontSize:70,marginBottom:10}}>💀</div>
            <h1 style={S.defeatTitle}>YOU LOSE!</h1>
            <p style={S.defeatSub}>
              {opponentName || 'Opponent'} solved it first. Better luck next time!
            </p>
            <div style={{fontSize:28,marginBottom:20}}>🌑🌑🌑</div>
            <button style={S.defeatBtn} onClick={()=>navigate('/lobby')}>🔁 Try Again</button>
          </div>
        </div>
      )}

      {/* ── Matchmaking screen (no countdown visible) ── */}
      {!battleStarted && (
        <div style={S.waitOverlay}>
          <div style={S.waitBox}>
            <div className="search-pulse" style={{fontSize:64,marginBottom:16}}>⚔️</div>
            <h2 style={S.waitTitle}>Finding Opponent...</h2>
            <p style={S.waitSub}>Searching for a worthy challenger</p>
            <div style={{display:'flex',justifyContent:'center',gap:8,margin:'20px 0'}}>
              <span className="dot-bounce" style={{...S.dot,animationDelay:'0s'}}/>
              <span className="dot-bounce" style={{...S.dot,animationDelay:'.2s'}}/>
              <span className="dot-bounce" style={{...S.dot,animationDelay:'.4s'}}/>
            </div>
            <p style={{color:'#aaa',fontSize:14,marginBottom:24}}>
              You: <strong style={{color:'#00d4aa'}}>{username}</strong>
            </p>
            <button style={S.cancelBtn} onClick={()=>navigate('/lobby')}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── 3-2-1 ── */}
      {countdown !== null && (
        <div style={S.cntOverlay}>
          <p style={{color:'#aaa',fontSize:20,marginBottom:10}}>Battle starts in</p>
          <div key={countdown} className="cnt-num" style={S.cntNum}>{countdown}</div>
        </div>
      )}

      {/* ── BATTLE START flash ── */}
      {showStartAnim && (
        <div style={S.cntOverlay}>
          <div className="battle-start-txt" style={S.startTxt}>⚔️ BATTLE START! ⚔️</div>
        </div>
      )}

      {/* ── Warning ── */}
      {warning && (
        <div style={S.warningBar}>⚠️ You switched tabs! Battle is being disconnected!</div>
      )}

      {/* ── Header ── */}
      <div style={S.header}>
        <h2 style={S.logo}>⚔️ PyBattle</h2>
        <div className="hdr-center" style={S.hdrCenter}>
          <span style={S.battleId}>Battle #{id}</span>
          <span style={{...S.timer,color:timerColor}}>
            ⏱️ {timerActive ? formatTime(timeLeft) : '--:--'}
          </span>
          <span style={status==='connected'?S.online:S.offline}>
            {status==='connected'?'🟢 Live':'🔴 '+status}
          </span>
        </div>
        <button style={S.leaveBtn} onClick={()=>navigate('/lobby')}>Leave</button>
      </div>

      {/* ── Mobile timer ── */}
      <div className="mobile-timer" style={{color:timerColor}}>
        ⏱️ {timerActive ? formatTime(timeLeft) : '--:--'} &nbsp;
        <span style={{color:status==='connected'?'#00d4aa':'#ff4757',fontSize:14}}>
          {status==='connected'?'🟢 Live':'🔴 '+status}
        </span>
      </div>

      {/* ── Notice ── */}
      <div style={S.notice}>🔒 Switching tabs disconnects you. Code updates live!</div>

      {/* ── Problem ── */}
      {battleStarted && (
        <div className="problem-card" style={S.problemCard}>
          <div style={S.problemHdr}>
            <h3 style={S.problemTitle}>📝 {problem.title}</h3>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <span style={{
                ...S.diffBadge,
                background: problem.difficulty==='Easy'?'#00d4aa22':'#ffa50222',
                color:      problem.difficulty==='Easy'?'#00d4aa':'#ffa502',
                border:`1px solid ${problem.difficulty==='Easy'?'#00d4aa':'#ffa502'}`,
              }}>{problem.difficulty}</span>
              <button style={S.hintBtn} onClick={()=>setShowHint(!showHint)}>
                💡 {showHint?'Hide':'Hint'}
              </button>
            </div>
          </div>
          <p style={S.problemDesc}>{problem.description}</p>
          <p style={S.example}><strong>Example:</strong> {problem.example}</p>
          {showHint && (
            <div className="hint-box" style={S.hintBox}>
              💡 <span style={{color:'#ffa502',fontSize:13}}>{problem.hint}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Result banner ── */}
      {result && (
        <div style={result==='correct'?S.correctBanner:S.wrongBanner}>
          {result==='correct'?'🏆 Correct Answer! You Win!':'❌ Wrong Answer! Try again!'}
        </div>
      )}

      {/* ── Editors ── */}
      {battleStarted && (
        <div className="battle-area battle-area-wrap" style={S.battleArea}>

          {/* Your editor */}
          <div style={S.editorCol}>
            <div style={S.editorHdr}>
              <h3 style={S.editorTitle}>👨‍💻 {username} (You)</h3>
              {submitted && <span style={S.subBadge}>✅ Submitted</span>}
            </div>
            <div style={S.editorWrap}>
              <Editor
                height="300px" className="editor-height"
                defaultLanguage="python" theme="vs-dark"
                value={code}
                onChange={v => { setCode(v); codeRef.current = v;
                  if (wsRef.current?.readyState===1) wsRef.current.send(`CODE:${v}`); }}
                onMount={ed => ed.onKeyDown(e => {
                  if ((e.keyCode===33||e.keyCode===52||e.keyCode===54)&&(e.ctrlKey||e.metaKey))
                    { e.preventDefault(); e.stopPropagation(); }
                })}
                options={{
                  fontSize:13, minimap:{enabled:false}, scrollBeyondLastLine:false,
                  automaticLayout:true, readOnly:submitted, tabSize:4,
                  insertSpaces:true, lineNumbers:'on', wordWrap:'on',
                }}
              />
            </div>
            <button
              style={{...S.submitBtn,
                background:submitted?'#333':'linear-gradient(135deg,#6c63ff,#00d4aa)',
                cursor:submitted?'not-allowed':'pointer'}}
              onClick={submitCode} disabled={submitted}
            >
              {submitted?'✅ Submitted':'🚀 Submit Solution'}
            </button>
            {submitted && result==='wrong' && timeLeft>0 && (
              <button style={S.editBtn} onClick={()=>{
                setSubmitted(false); submittedRef.current=false;
                setResult(null);
                setMessages(p=>[...p,'✏️ You re-opened your solution.']);
              }}>✏️ Edit & Resubmit</button>
            )}
          </div>

          {/* Opponent editor */}
          <div style={S.editorCol}>
            <div style={S.editorHdr}>
              <h3 style={{...S.editorTitle,color:'#ff4757'}}>
                👤 {opponentName || 'Opponent'}
              </h3>
              {opponentSubmitted && <span style={S.subBadge}>✅ Submitted</span>}
            </div>
            <div style={{...S.editorWrap,borderColor:'#ff475755'}}>
              <Editor
                height="300px" className="editor-height"
                defaultLanguage="python" theme="vs-dark"
                value={opponentCode || '# Waiting for opponent to start typing...'}
                options={{
                  fontSize:13, minimap:{enabled:false}, scrollBeyondLastLine:false,
                  automaticLayout:true, readOnly:true, contextmenu:false,
                  lineNumbers:'on', wordWrap:'on',
                }}
              />
            </div>
            <div style={S.liveTag}>👁️ Live View — Read Only</div>
          </div>

        </div>
      )}

      {/* ── Feed ── */}
      {battleStarted && (
        <div className="feed-section" style={S.feed}>
          <h3 style={{color:'#6c63ff',marginBottom:8,fontSize:13}}>⚡ Battle Feed</h3>
          <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
            {messages.length===0
              ? <p style={{color:'#aaa',fontSize:12}}>Battle events will appear here...</p>
              : messages.map((m,i)=>(
                  <span key={i} style={{
                    fontSize:12, padding:'4px 8px',
                    background:'#0f0f1a', borderRadius:8,
                    color: m.includes('🏆')||m.includes('correct') ? '#00d4aa'
                         : m.includes('❌')||m.includes('⚠️')     ? '#ff4757'
                         : '#ffffff',
                  }}>{m}</span>
                ))
            }
          </div>
        </div>
      )}

    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  page: { minHeight:'100vh', background:'#0f0f1a', display:'flex', flexDirection:'column' },

  // Matchmaking (no countdown shown)
  waitOverlay: { position:'fixed',top:0,left:0,right:0,bottom:0, background:'#0f0f1a',
    display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, padding:20 },
  waitBox: { background:'#1a1a2e', borderRadius:30, padding:'40px 30px', textAlign:'center',
    border:'1px solid #6c63ff55', width:'100%', maxWidth:400, boxShadow:'0 0 40px #6c63ff22' },
  waitTitle: { color:'#6c63ff', fontSize:24, fontWeight:900, marginBottom:8 },
  waitSub:   { color:'#aaa', fontSize:15, marginBottom:0 },
  dot: { width:10, height:10, borderRadius:'50%', background:'#6c63ff', display:'inline-block' },
  cancelBtn: { background:'transparent', border:'1px solid #ff4757', color:'#ff4757',
    padding:'10px 25px', borderRadius:20, cursor:'pointer', fontWeight:600, width:'100%' },

  // Countdown / flash
  cntOverlay: { position:'fixed',top:0,left:0,right:0,bottom:0, background:'rgba(0,0,0,.9)',
    display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', zIndex:500 },
  cntNum: { fontSize:120, fontWeight:900,
    background:'linear-gradient(135deg,#6c63ff,#00d4aa)',
    WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' },
  startTxt: { fontSize:36, fontWeight:900, color:'#ff4757',
    textShadow:'0 0 30px #ff475799', textAlign:'center', padding:'0 20px' },

  // Victory / Defeat
  overlay: { position:'fixed',top:0,left:0,right:0,bottom:0, background:'rgba(0,0,0,.85)',
    display:'flex', alignItems:'center', justifyContent:'center', zIndex:9998, padding:20 },
  victoryBox: { background:'linear-gradient(135deg,#1a1a2e,#16213e)', border:'2px solid #00d4aa',
    borderRadius:30, padding:'40px 30px', textAlign:'center', width:'100%', maxWidth:420,
    boxShadow:'0 0 60px #00d4aa55' },
  victoryTitle: { fontSize:48, fontWeight:900,
    background:'linear-gradient(135deg,#6c63ff,#00d4aa)',
    WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', marginBottom:10 },
  victorySub: { color:'#aaa', fontSize:16, marginBottom:15 },
  victoryBtn: { background:'linear-gradient(135deg,#6c63ff,#00d4aa)', border:'none',
    color:'white', padding:'14px 30px', borderRadius:25, fontSize:16, fontWeight:700,
    cursor:'pointer', width:'100%' },
  defeatBox: { background:'linear-gradient(135deg,#1a1a2e,#2a0a0a)', border:'2px solid #ff4757',
    borderRadius:30, padding:'40px 30px', textAlign:'center', width:'100%', maxWidth:420,
    boxShadow:'0 0 60px #ff475555' },
  defeatTitle: { fontSize:48, fontWeight:900, color:'#ff4757', marginBottom:10,
    textShadow:'0 0 20px #ff475799' },
  defeatSub: { color:'#aaa', fontSize:15, marginBottom:15 },
  defeatBtn: { background:'linear-gradient(135deg,#ff4757,#c0392b)', border:'none',
    color:'white', padding:'14px 30px', borderRadius:25, fontSize:16, fontWeight:700,
    cursor:'pointer', width:'100%' },

  // Header
  warningBar: { background:'#ff475722', border:'1px solid #ff4757', color:'#ff4757',
    padding:'10px 20px', textAlign:'center', fontWeight:600, fontSize:13 },
  notice: { background:'#6c63ff11', color:'#aaa', padding:'6px 20px',
    textAlign:'center', fontSize:11, borderBottom:'1px solid #6c63ff22' },
  header: { display:'flex', justifyContent:'space-between', alignItems:'center',
    padding:'12px 20px', background:'#1a1a2e', borderBottom:'1px solid #6c63ff55' },
  logo:     { color:'#6c63ff', fontWeight:900, fontSize:18 },
  hdrCenter:{ display:'flex', gap:12, alignItems:'center' },
  battleId: { color:'#fff', fontWeight:700, fontSize:14 },
  timer:    { fontWeight:900, fontSize:20 },
  online:   { color:'#00d4aa', fontWeight:600, fontSize:13 },
  offline:  { color:'#ff4757', fontWeight:600, fontSize:13 },
  leaveBtn: { background:'transparent', border:'1px solid #ff4757', color:'#ff4757',
    padding:'6px 14px', borderRadius:20, cursor:'pointer', fontSize:13 },

  // Problem
  problemCard: { margin:'12px 20px', background:'#1a1a2e', borderRadius:15,
    padding:15, border:'1px solid #6c63ff55' },
  problemHdr: { display:'flex', justifyContent:'space-between', alignItems:'center',
    marginBottom:8, flexWrap:'wrap', gap:8 },
  problemTitle:{ color:'#6c63ff', fontSize:15, fontWeight:700 },
  diffBadge:   { padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700 },
  hintBtn:     { background:'transparent', border:'1px solid #ffa502', color:'#ffa502',
    padding:'3px 12px', borderRadius:20, cursor:'pointer', fontSize:12, fontWeight:600 },
  hintBox: { background:'#ffa50211', border:'1px solid #ffa50244', borderRadius:10,
    padding:'10px 15px', marginTop:10, display:'flex', gap:8 },
  problemDesc: { color:'#fff', marginBottom:6, lineHeight:1.5, fontSize:13 },
  example:     { color:'#00d4aa', fontSize:12, marginBottom:4 },
  correctBanner: { margin:'0 20px', background:'#00d4aa22', border:'1px solid #00d4aa',
    color:'#00d4aa', padding:10, borderRadius:10, textAlign:'center', fontWeight:700, fontSize:16 },
  wrongBanner:   { margin:'0 20px', background:'#ff475722', border:'1px solid #ff4757',
    color:'#ff4757', padding:10, borderRadius:10, textAlign:'center', fontWeight:700, fontSize:16 },

  // Editors
  battleArea: { display:'flex', gap:12, padding:'12px 20px', flex:1 },
  editorCol:  { flex:1, display:'flex', flexDirection:'column', minWidth:0 },
  editorHdr:  { display:'flex', justifyContent:'space-between', alignItems:'center',
    marginBottom:6, flexWrap:'wrap', gap:4 },
  editorTitle:{ color:'#00d4aa', fontSize:13, fontWeight:700 },
  subBadge:   { background:'#00d4aa22', color:'#00d4aa', padding:'2px 8px',
    borderRadius:10, fontSize:11, fontWeight:600 },
  editorWrap: { border:'2px solid #6c63ff', borderRadius:10, overflow:'hidden' },
  submitBtn:  { marginTop:8, border:'none', color:'white', padding:10,
    borderRadius:25, fontWeight:600, fontSize:14, width:'100%' },
  editBtn:    { marginTop:8, border:'1px solid #ffa502', background:'transparent',
    color:'#ffa502', padding:10, borderRadius:25, fontWeight:600, fontSize:14,
    width:'100%', cursor:'pointer' },
  liveTag:    { marginTop:8, textAlign:'center', color:'#ff4757', fontSize:11, fontWeight:600 },

  // Feed
  feed: { margin:'0 20px 15px', background:'#1a1a2e', borderRadius:15,
    padding:12, border:'1px solid #6c63ff33' },
};

export default Battle;
