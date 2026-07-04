import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import problems from '../problems';
import { runOpponentBattle, randomHumanName } from '../utils/botSimulator';

const DIFFICULTIES = ['All', 'Easy', 'Medium', 'Hard'];

function Practice() {
  const navigate = useNavigate();
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [filter, setFilter]   = useState('All');
  const [code, setCode]       = useState('');
  const [opponentCode, setOpponentCode] = useState('');
  const [result, setResult]   = useState(null); // 'correct' | 'wrong' | null
  const [submitted, setSubmitted] = useState(false);
  const [botName]   = useState(randomHumanName);
  const [botDone, setBotDone] = useState(false);
  const [messages, setMessages] = useState([]);
  const [showHint, setShowHint] = useState(false);
  const abortRef = useRef(null);

  const username = localStorage.getItem('username') || 'You';

  const filteredProblems = filter === 'All'
    ? problems
    : problems.filter(p => p.difficulty === filter);

  // Start practice session for a chosen problem
  const startPractice = useCallback((problem) => {
    // Cancel any running bot
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setSelectedProblem(problem);
    setCode(problem.starter);
    setOpponentCode('');
    setResult(null);
    setSubmitted(false);
    setBotDone(false);
    setShowHint(false);
    setMessages([`⚔️ ${botName} joined practice!`]);

    runOpponentBattle(
      problem,
      setOpponentCode,
      (attemptNum) => {
        setMessages(p => [...p, `❌ ${botName} got it wrong (attempt ${attemptNum + 1})`]);
      },
      () => {
        setBotDone(true);
        setMessages(p => [...p, `✅ ${botName} solved it!`]);
      },
      abortRef.current.signal
    ).catch(() => {});
  }, [botName]);

  // Cleanup on unmount
  useEffect(() => () => abortRef.current?.abort(), []);

  const checkAnswer = (code) => {
    if (!selectedProblem) return false;
    const clean = s => s.replace(/\s/g, '').replace(/['"]/g, '').toLowerCase();
    return code.trim().length > 10 &&
      clean(code).includes(clean(selectedProblem.answer_key || ''));
  };

  const handleSubmit = () => {
    const ok = checkAnswer(code);
    setResult(ok ? 'correct' : 'wrong');
    setSubmitted(true);
  };

  const handleTryAgain = () => {
    setResult(null);
    setSubmitted(false);
    setCode(selectedProblem.starter);
  };

  const handleNewProblem = () => {
    abortRef.current?.abort();
    setSelectedProblem(null);
    setOpponentCode('');
    setResult(null);
    setSubmitted(false);
    setMessages([]);
  };

  // ── Problem picker ─────────────────────────────────────────────────────────
  if (!selectedProblem) {
    return (
      <div style={S.page}>
        {/* Navbar */}
        <nav style={S.navbar}>
          <span style={S.navLogo} onClick={() => navigate('/lobby')}>⚔️ PyBattle</span>
          <div style={S.navRight}>
            <button style={S.navBtn} onClick={() => navigate('/lobby')}>🏠 Lobby</button>
            <button style={S.navBtn} onClick={() => navigate('/leaderboard')}>🏆 Leaderboard</button>
          </div>
        </nav>

        <div style={S.pickerContainer}>
          <div style={S.pickerHeader}>
            <h1 style={S.pickerTitle}>🧪 Practice Mode</h1>
            <p style={S.pickerSub}>No pressure. Pick a problem, solve it at your own pace, and see how the bot does it.</p>
          </div>

          {/* Difficulty filter */}
          <div style={S.filterRow}>
            {DIFFICULTIES.map(d => (
              <button
                key={d}
                style={{ ...S.filterBtn, ...(filter === d ? S.filterBtnActive : {}) }}
                onClick={() => setFilter(d)}
              >
                {d}
              </button>
            ))}
          </div>

          {/* Problem grid */}
          <div style={S.problemGrid}>
            {filteredProblems.map(p => (
              <div key={p.id} style={S.problemCard} onClick={() => startPractice(p)}>
                <div style={S.problemCardTop}>
                  <span style={S.problemNum}>#{p.id}</span>
                  <span style={{
                    ...S.diffBadge,
                    background: p.difficulty === 'Easy' ? '#00d4aa22' : p.difficulty === 'Medium' ? '#ffa50222' : '#ff475722',
                    color: p.difficulty === 'Easy' ? '#00d4aa' : p.difficulty === 'Medium' ? '#ffa502' : '#ff4757',
                    border: `1px solid ${p.difficulty === 'Easy' ? '#00d4aa44' : p.difficulty === 'Medium' ? '#ffa50244' : '#ff475744'}`,
                  }}>
                    {p.difficulty}
                  </span>
                </div>
                <p style={S.problemTitle}>{p.title}</p>
                <p style={S.problemDesc}>{p.description.slice(0, 65)}...</p>
                <div style={S.startBtn}>▶ Start Practice</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Practice editor ────────────────────────────────────────────────────────
  return (
    <div style={S.page}>
      {/* Navbar */}
      <nav style={S.navbar}>
        <span style={S.navLogo} onClick={() => navigate('/lobby')}>⚔️ PyBattle</span>
        <div style={S.navRight}>
          <span style={S.practiceTag}>🧪 Practice</span>
          <button style={S.navBtn} onClick={handleNewProblem}>📋 Problem List</button>
          <button style={S.navBtn} onClick={() => navigate('/lobby')}>🏠 Lobby</button>
        </div>
      </nav>

      {/* Result banners */}
      {result === 'correct' && (
        <div style={S.correctBanner}>🏆 Correct Answer! Great job!</div>
      )}
      {result === 'wrong' && (
        <div style={S.wrongBanner}>❌ Not quite — check your logic and try again!</div>
      )}

      {/* Problem statement */}
      <div style={S.problemBar}>
        <div style={S.problemBarLeft}>
          <span style={S.problemIcon}>📄</span>
          <span style={S.problemBarTitle}>{selectedProblem.title}</span>
          <span style={{
            ...S.diffBadge,
            background: selectedProblem.difficulty === 'Easy' ? '#00d4aa22' : '#ffa50222',
            color: selectedProblem.difficulty === 'Easy' ? '#00d4aa' : '#ffa502',
            border: `1px solid ${selectedProblem.difficulty === 'Easy' ? '#00d4aa44' : '#ffa50244'}`,
          }}>{selectedProblem.difficulty}</span>
        </div>
        <button style={S.hintBtn} onClick={() => setShowHint(v => !v)}>💡 Hint</button>
      </div>
      <div style={S.descBar}>
        <p style={S.descText}>{selectedProblem.description}</p>
        <p style={S.exampleText}><strong style={{color:'#00d4aa'}}>Example: </strong>{selectedProblem.example}</p>
        {showHint && <p style={S.hintText}>💡 {selectedProblem.hint}</p>}
      </div>

      {/* Dual editors */}
      <div style={S.editorRow}>
        {/* Your editor */}
        <div style={S.editorPane}>
          <div style={S.editorHeader}>
            <span>👤 {username} (You)</span>
            {submitted && <span style={S.submittedTag}>✅ Submitted</span>}
          </div>
          <div style={S.editorWrap}>
            <Editor
              height="100%"
              defaultLanguage="python"
              theme="vs-dark"
              value={code}
              onChange={v => !submitted && setCode(v || '')}
              options={{ fontSize: 14, minimap: { enabled: false }, readOnly: submitted }}
            />
          </div>
        </div>

        {/* Bot editor */}
        <div style={S.editorPane}>
          <div style={S.editorHeader}>
            <span>🤖 {botName}</span>
            {botDone && <span style={S.submittedTag}>✅ Solved</span>}
            {!botDone && <span style={S.liveTag}>⌨️ Typing...</span>}
          </div>
          <div style={S.editorWrap}>
            <Editor
              height="100%"
              defaultLanguage="python"
              theme="vs-dark"
              value={opponentCode}
              options={{ fontSize: 14, minimap: { enabled: false }, readOnly: true }}
            />
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div style={S.actionBar}>
        {!submitted ? (
          <button style={S.submitBtn} onClick={handleSubmit}>🚀 Submit Solution</button>
        ) : result === 'correct' ? (
          <div style={S.actionBtns}>
            <button style={S.playAgainBtn} onClick={handleNewProblem}>📋 Try Another Problem</button>
            <button style={S.lobbyBtn} onClick={() => navigate('/lobby')}>⚔️ Go Battle</button>
          </div>
        ) : (
          <div style={S.actionBtns}>
            <button style={S.tryAgainBtn} onClick={handleTryAgain}>🔄 Try Again</button>
            <button style={S.playAgainBtn} onClick={handleNewProblem}>📋 Different Problem</button>
          </div>
        )}
      </div>

      {/* Battle feed */}
      <div style={S.feed}>
        <span style={S.feedTitle}>⚡ Practice Feed</span>
        <div style={S.feedMessages}>
          {messages.map((m, i) => (
            <span key={i} style={S.feedMsg}>{m}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

const S = {
  page: { minHeight: '100vh', background: '#0f0f1a', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column' },

  // Navbar
  navbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', background: '#1a1a2e', borderBottom: '1px solid #6c63ff55' },
  navLogo: { fontSize: '20px', fontWeight: '900', color: '#6c63ff', cursor: 'pointer' },
  navRight: { display: 'flex', alignItems: 'center', gap: '10px' },
  navBtn: { background: 'transparent', border: '1px solid #6c63ff44', color: '#aaa', padding: '6px 14px', borderRadius: '20px', cursor: 'pointer', fontSize: '13px' },
  practiceTag: { background: '#6c63ff22', color: '#6c63ff', border: '1px solid #6c63ff44', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' },

  // Picker
  pickerContainer: { maxWidth: '960px', margin: '0 auto', padding: '40px 20px', width: '100%' },
  pickerHeader: { textAlign: 'center', marginBottom: '32px' },
  pickerTitle: { fontSize: '36px', fontWeight: '900', color: '#fff', marginBottom: '10px' },
  pickerSub: { color: '#aaa', fontSize: '15px' },

  filterRow: { display: 'flex', gap: '10px', marginBottom: '28px', justifyContent: 'center' },
  filterBtn: { background: 'transparent', border: '1px solid #6c63ff44', color: '#aaa', padding: '8px 20px', borderRadius: '20px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
  filterBtnActive: { background: '#6c63ff', color: '#fff', border: '1px solid #6c63ff' },

  problemGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '18px' },
  problemCard: { background: '#1a1a2e', borderRadius: '16px', padding: '20px', border: '1px solid #6c63ff33', cursor: 'pointer', transition: 'border-color .2s', display: 'flex', flexDirection: 'column', gap: '8px' },
  problemCardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  problemNum: { color: '#666', fontSize: '12px', fontWeight: '600' },
  diffBadge: { padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' },
  problemTitle: { color: '#fff', fontWeight: '700', fontSize: '16px', margin: 0 },
  problemDesc: { color: '#888', fontSize: '13px', lineHeight: '1.5', margin: 0, flexGrow: 1 },
  startBtn: { marginTop: '8px', background: 'linear-gradient(135deg, #6c63ff, #00d4aa)', color: '#fff', padding: '8px 0', borderRadius: '20px', textAlign: 'center', fontSize: '13px', fontWeight: '700' },

  // Editor layout
  problemBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: '#1a1a2e', borderBottom: '1px solid #6c63ff22' },
  problemBarLeft: { display: 'flex', alignItems: 'center', gap: '10px' },
  problemIcon: { fontSize: '18px' },
  problemBarTitle: { color: '#fff', fontWeight: '700', fontSize: '16px' },
  hintBtn: { background: 'transparent', border: '1px solid #ffa50244', color: '#ffa502', padding: '6px 14px', borderRadius: '20px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
  descBar: { padding: '12px 16px', background: '#0f0f1a', borderBottom: '1px solid #ffffff11' },
  descText: { color: '#ccc', fontSize: '14px', margin: '0 0 6px' },
  exampleText: { color: '#888', fontSize: '13px', margin: 0 },
  hintText: { color: '#ffa502', fontSize: '13px', margin: '8px 0 0', background: '#ffa50211', padding: '8px 12px', borderRadius: '8px' },

  editorRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', flex: 1, minHeight: '380px' },
  editorPane: { display: 'flex', flexDirection: 'column', borderRight: '1px solid #ffffff11' },
  editorHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', background: '#1a1a2e', borderBottom: '1px solid #ffffff11', color: '#00d4aa', fontWeight: '700', fontSize: '13px' },
  editorWrap: { flex: 1, minHeight: '340px' },
  submittedTag: { background: '#00d4aa22', color: '#00d4aa', border: '1px solid #00d4aa44', padding: '2px 10px', borderRadius: '20px', fontSize: '11px' },
  liveTag: { background: '#6c63ff22', color: '#6c63ff', border: '1px solid #6c63ff44', padding: '2px 10px', borderRadius: '20px', fontSize: '11px' },

  actionBar: { padding: '12px 16px', background: '#1a1a2e', borderTop: '1px solid #6c63ff22', display: 'flex', justifyContent: 'center' },
  actionBtns: { display: 'flex', gap: '12px' },
  submitBtn: { background: 'linear-gradient(135deg, #6c63ff, #00d4aa)', border: 'none', color: '#fff', padding: '12px 40px', borderRadius: '25px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', width: '100%', maxWidth: '400px' },
  tryAgainBtn: { background: 'transparent', border: '2px solid #ffa502', color: '#ffa502', padding: '10px 24px', borderRadius: '25px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' },
  playAgainBtn: { background: 'linear-gradient(135deg, #6c63ff, #00d4aa)', border: 'none', color: '#fff', padding: '10px 24px', borderRadius: '25px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' },
  lobbyBtn: { background: 'transparent', border: '2px solid #00d4aa', color: '#00d4aa', padding: '10px 24px', borderRadius: '25px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' },

  correctBanner: { background: '#00d4aa22', border: '1px solid #00d4aa', color: '#00d4aa', padding: '10px', textAlign: 'center', fontWeight: '700', fontSize: '15px' },
  wrongBanner: { background: '#ff475722', border: '1px solid #ff4757', color: '#ff4757', padding: '10px', textAlign: 'center', fontWeight: '700', fontSize: '15px' },

  feed: { display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 16px', background: '#0a0a15', borderTop: '1px solid #ffffff0a', overflowX: 'auto' },
  feedTitle: { color: '#6c63ff', fontWeight: '700', fontSize: '12px', whiteSpace: 'nowrap' },
  feedMessages: { display: 'flex', gap: '16px', overflowX: 'auto' },
  feedMsg: { color: '#888', fontSize: '12px', whiteSpace: 'nowrap' },
};

export default Practice;
