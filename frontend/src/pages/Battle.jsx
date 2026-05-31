import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const TIME_LIMIT = 300;

function Battle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [code, setCode] = useState('# Write your solution here\n');
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('connecting...');
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [warning, setWarning] = useState(false);
  const wsRef = useRef(null);
  const playerId = localStorage.getItem('user_id');
  const username = localStorage.getItem('username');

  // ✅ WebSocket Connection
  useEffect(() => {
    const ws = new WebSocket(`ws://127.0.0.1:8000/ws/battle/${id}/${playerId}`);
    wsRef.current = ws;
    ws.onopen = () => setStatus('connected');
    ws.onmessage = (e) => setMessages((prev) => [...prev, e.data]);
    ws.onclose = () => setStatus('disconnected');
    return () => ws.close();
  }, [id, playerId]);

  // ✅ Timer Countdown
  useEffect(() => {
    if (timeLeft <= 0) {
      setMessages((prev) => [...prev, '⏰ Time is up! Battle ended.']);
      setSubmitted(true);
      return;
    }
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  // ✅ Tab Switch - Actually Disconnect
  useEffect(() => {
    const handleBlur = () => {
      setWarning(true);
      if (wsRef.current) {
        wsRef.current.send('⚠️ ' + username + ' switched tabs — Battle DISCONNECTED!');
        setTimeout(() => {
          wsRef.current.close();
          setStatus('disconnected');
          setSubmitted(true);
          setMessages((prev) => [...prev, '🔴 You left the tab. Battle ended.']);
        }, 2000);
      }
    };
    const handleFocus = () => setWarning(false);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [username]);

  // ✅ Format Timer
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // ✅ Check Answer
  const checkAnswer = (userCode) => {
    const clean = (str) => str.replace(/\s/g, '').toLowerCase();
    return clean(userCode).includes(clean('seen[complement], i'));
  };

  // ✅ Submit Code
  const submitCode = () => {
    const isCorrect = checkAnswer(code);
    setResult(isCorrect ? 'correct' : 'wrong');
    setSubmitted(true);
    if (wsRef.current) {
      wsRef.current.send(
        isCorrect
          ? `🏆 ${username} submitted the CORRECT answer!`
          : `❌ ${username} submitted a wrong answer.`
      );
    }
  };

  // ✅ Block Paste, Copy, Cut, Right Click
  const blockAction = (e) => e.preventDefault();

  const timerColor = timeLeft <= 60 ? '#ff4757' : timeLeft <= 120 ? '#ffa502' : '#00d4aa';

  return (
    <div style={styles.container}>

      {/* Warning Banner */}
      {warning && (
        <div style={styles.warningBanner}>
          ⚠️ You switched tabs! Your opponent has been notified. Battle is being disconnected!
        </div>
      )}

      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.logo}>⚔️ Battle.py</h2>
        <div style={styles.battleInfo}>
          <span style={styles.battleId}>Battle #{id}</span>
          <span style={{ ...styles.timer, color: timerColor }}>
            ⏱️ {formatTime(timeLeft)}
          </span>
          <span style={status === 'connected' ? styles.online : styles.offline}>
            {status === 'connected' ? '🟢 Live' : '🔴 ' + status}
          </span>
        </div>
        <button style={styles.leaveBtn} onClick={() => navigate('/lobby')}>
          Leave Battle
        </button>
      </div>

      {/* Notice */}
      <div style={styles.notice}>
        🔒 Switching tabs will disconnect your battle. Copy & paste is disabled.
      </div>

      {/* Problem */}
      <div style={styles.problemCard}>
        <h3 style={styles.problemTitle}>📝 Problem: Two Sum</h3>
        <p style={styles.problemDesc}>
          Given an array of integers and a target, return the indices of the two numbers that add up to the target.
        </p>
        <p style={styles.example}>
          <strong>Example:</strong> nums = [2,7,11,15], target = 9 → Output: [0,1]
        </p>
      </div>

      {/* Result Banner */}
      {result && (
        <div style={result === 'correct' ? styles.correctBanner : styles.wrongBanner}>
          {result === 'correct'
            ? '🏆 Correct Answer! You Win!'
            : '❌ Wrong Answer! Try reviewing your logic.'}
        </div>
      )}

      {/* Battle Area */}
      <div style={styles.battleArea}>

        {/* Code Editor */}
        <div style={styles.editorSection}>
          <h3 style={styles.sectionTitle}>👨‍💻 Your Code — {username}</h3>
          <textarea
            style={styles.editor}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            disabled={submitted}
            onPaste={blockAction}
            onCopy={blockAction}
            onCut={blockAction}
            onContextMenu={blockAction}
          />
          <button
            className="btn-primary"
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
        </div>

        {/* Live Feed */}
        <div style={styles.feedSection}>
          <h3 style={styles.sectionTitle}>⚡ Live Battle Feed</h3>
          <div style={styles.feed}>
            {messages.length === 0 ? (
              <p style={styles.feedEmpty}>Waiting for opponent...</p>
            ) : (
              messages.map((msg, i) => (
                <div key={i} style={{
                  ...styles.feedMsg,
                  borderLeft: msg.includes('CORRECT') ? '3px solid #00d4aa' :
                    msg.includes('wrong') || msg.includes('⚠️') ? '3px solid #ff4757' :
                      '3px solid #6c63ff'
                }}>
                  {msg}
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', background: '#0f0f1a', display: 'flex', flexDirection: 'column' },
  warningBanner: {
    background: '#ff475722', border: '1px solid #ff4757', color: '#ff4757',
    padding: '10px 30px', textAlign: 'center', fontWeight: '600',
  },
  notice: {
    background: '#6c63ff11', color: '#aaaaaa', padding: '8px 30px',
    textAlign: 'center', fontSize: '13px', borderBottom: '1px solid #6c63ff22',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '15px 30px', background: '#1a1a2e', borderBottom: '1px solid #6c63ff55',
  },
  logo: { color: '#6c63ff', fontWeight: '900' },
  battleInfo: { display: 'flex', gap: '15px', alignItems: 'center' },
  battleId: { color: '#ffffff', fontWeight: '700', fontSize: '18px' },
  timer: { fontWeight: '900', fontSize: '22px' },
  online: { color: '#00d4aa', fontWeight: '600' },
  offline: { color: '#ff4757', fontWeight: '600' },
  leaveBtn: {
    background: 'transparent', border: '1px solid #ff4757',
    color: '#ff4757', padding: '6px 16px', borderRadius: '20px', cursor: 'pointer',
  },
  problemCard: {
    margin: '20px 30px', background: '#1a1a2e', borderRadius: '15px',
    padding: '20px', border: '1px solid #6c63ff55',
  },
  problemTitle: { color: '#6c63ff', marginBottom: '10px', fontSize: '18px' },
  problemDesc: { color: '#ffffff', marginBottom: '8px', lineHeight: '1.6' },
  example: { color: '#00d4aa', fontSize: '14px' },
  correctBanner: {
    margin: '0 30px', background: '#00d4aa22', border: '1px solid #00d4aa',
    color: '#00d4aa', padding: '15px', borderRadius: '10px',
    textAlign: 'center', fontWeight: '700', fontSize: '18px',
  },
  wrongBanner: {
    margin: '0 30px', background: '#ff475722', border: '1px solid #ff4757',
    color: '#ff4757', padding: '15px', borderRadius: '10px',
    textAlign: 'center', fontWeight: '700', fontSize: '18px',
  },
  battleArea: { display: 'flex', gap: '20px', padding: '20px 30px 30px 30px', flex: 1 },
  editorSection: { flex: 1, display: 'flex', flexDirection: 'column' },
  sectionTitle: { color: '#ffffff', marginBottom: '10px', fontSize: '16px' },
  editor: {
    flex: 1, minHeight: '350px', background: '#0d0d1a', color: '#00d4aa',
    border: '2px solid #6c63ff', borderRadius: '15px', padding: '15px',
    fontSize: '14px', fontFamily: 'monospace', resize: 'none', outline: 'none', lineHeight: '1.6',
    userSelect: 'none',
  },
  submitBtn: { marginTop: '15px', border: 'none', color: 'white', padding: '12px', borderRadius: '25px' },
  feedSection: { width: '320px', display: 'flex', flexDirection: 'column' },
  feed: {
    flex: 1, minHeight: '350px', background: '#1a1a2e', borderRadius: '15px',
    padding: '15px', border: '1px solid #6c63ff55', overflowY: 'auto',
  },
  feedEmpty: { color: '#aaaaaa', textAlign: 'center', marginTop: '20px', fontSize: '14px' },
  feedMsg: {
    background: '#0f0f1a', borderRadius: '10px', padding: '10px',
    marginBottom: '10px', color: '#ffffff', fontSize: '13px',
  },
};

export default Battle;


