import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import problems from '../problems';

const DIFFICULTIES = ['All', 'Easy', 'Medium', 'Hard'];

function Practice() {
  const navigate = useNavigate();
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [filter, setFilter] = useState('All');
  const [code, setCode]     = useState('');
  const [result, setResult] = useState(null); // 'correct' | 'wrong' | null
  const [submitted, setSubmitted] = useState(false);
  const [showHint, setShowHint]   = useState(false);
  const [attempts, setAttempts]   = useState(0);

  const username = localStorage.getItem('username') || 'You';

  const filteredProblems = filter === 'All'
    ? problems
    : problems.filter(p => p.difficulty === filter);

  const startPractice = (problem) => {
    setSelectedProblem(problem);
    setCode(problem.starter);
    setResult(null);
    setSubmitted(false);
    setShowHint(false);
    setAttempts(0);
  };

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
    setAttempts(a => a + 1);
    if (ok) {
      // Track practice wins in localStorage so leaderboard can show them
      const prev = parseInt(localStorage.getItem('practice_wins') || '0');
      localStorage.setItem('practice_wins', prev + 1);
    }
  };

  const handleTryAgain = () => {
    setResult(null);
    setSubmitted(false);
  };

  const handleReset = () => {
    setCode(selectedProblem.starter);
    setResult(null);
    setSubmitted(false);
  };

  // ── Problem picker ─────────────────────────────────────────────────────────
  if (!selectedProblem) {
    return (
      <div style={S.page}>
        <nav style={S.navbar}>
          <span style={S.navLogo} onClick={() => navigate('/lobby')}>⚔️ PyBattle</span>
          <div style={S.navRight}>
            <button style={S.navBtn} onClick={() => navigate('/lobby')}>🏠 Lobby</button>
            <button style={S.navBtn} onClick={() => navigate('/leaderboard')}>🏆 Leaderboard</button>
          </div>
        </nav>

        <div style={S.pickerContainer}>
          <div style={S.pickerHeader}>
            <div style={S.pickerIcon}>🧪</div>
            <h1 style={S.pickerTitle}>Practice Mode</h1>
            <p style={S.pickerSub}>Pick a problem, solve it at your own pace. No timer. No opponent. Just you and the code.</p>
          </div>

          <div style={S.filterRow}>
            {DIFFICULTIES.map(d => (
              <button
                key={d}
                style={{ ...S.filterBtn, ...(filter === d ? S.filterBtnActive : {}) }}
                onClick={() => setFilter(d)}
              >{d}</button>
            ))}
          </div>

          <div style={S.problemGrid}>
            {filteredProblems.map(p => (
              <div key={p.id} style={S.problemCard} onClick={() => startPractice(p)}>
                <div style={S.problemCardTop}>
                  <span style={S.problemNum}>#{p.id}</span>
                  <span style={diffStyle(p.difficulty)}>{p.difficulty}</span>
                </div>
                <p style={S.problemTitle}>{p.title}</p>
                <p style={S.problemDesc}>{p.description.slice(0, 70)}...</p>
                <div style={S.startBtn}>▶ Start Practice</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Solo practice editor ───────────────────────────────────────────────────
  return (
    <div style={S.page}>
      {/* Navbar */}
      <nav style={S.navbar}>
        <span style={S.navLogo} onClick={() => navigate('/lobby')}>⚔️ PyBattle</span>
        <div style={S.navRight}>
          <span style={S.practiceTag}>🧪 Practice</span>
          <button style={S.navBtn} onClick={() => { setSelectedProblem(null); setResult(null); }}>📋 All Problems</button>
          <button style={S.navBtn} onClick={() => navigate('/lobby')}>🏠 Lobby</button>
        </div>
      </nav>

      {/* Result banner */}
      {result === 'correct' && (
        <div style={S.correctBanner}>🎉 Correct! Great work, {username}!</div>
      )}
      {result === 'wrong' && (
        <div style={S.wrongBanner}>❌ Not quite — review your logic and try again!</div>
      )}

      {/* Problem statement */}
      <div style={S.problemBar}>
        <div style={S.problemBarLeft}>
          <span style={S.problemIcon}>📄</span>
          <span style={S.problemBarTitle}>{selectedProblem.title}</span>
          <span style={diffStyle(selectedProblem.difficulty)}>{selectedProblem.difficulty}</span>
        </div>
        <div style={S.problemBarRight}>
          {attempts > 0 && (
            <span style={S.attemptsBadge}>Attempt {attempts}</span>
          )}
          <button style={S.hintBtn} onClick={() => setShowHint(v => !v)}>
            {showHint ? '🙈 Hide Hint' : '💡 Hint'}
          </button>
          <button style={S.resetBtn} onClick={handleReset}>↺ Reset</button>
        </div>
      </div>

      {/* Description */}
      <div style={S.descBar}>
        <p style={S.descText}>{selectedProblem.description}</p>
        <p style={S.exampleText}><strong style={{ color: '#00d4aa' }}>Example: </strong>{selectedProblem.example}</p>
        {showHint && (
          <div style={S.hintBox}>💡 <strong>Hint:</strong> {selectedProblem.hint}</div>
        )}
      </div>

      {/* Solo editor — full width */}
      <div style={S.editorPane}>
        <div style={S.editorHeader}>
          <span>👤 {username} — Your Solution</span>
          {submitted && result === 'correct' && <span style={S.correctTag}>✅ Solved!</span>}
          {submitted && result === 'wrong'   && <span style={S.wrongTag}>❌ Try again</span>}
        </div>
        <div style={S.editorWrap}>
          <Editor
            height="420px"
            defaultLanguage="python"
            theme="vs-dark"
            value={code}
            onChange={v => !submitted && setCode(v || '')}
            options={{
              fontSize: 15,
              minimap: { enabled: false },
              readOnly: submitted && result === 'correct',
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
            }}
          />
        </div>
      </div>

      {/* Action bar */}
      <div style={S.actionBar}>
        {!submitted ? (
          <button style={S.submitBtn} onClick={handleSubmit}>🚀 Submit Solution</button>
        ) : result === 'correct' ? (
          <div style={S.actionBtns}>
            <button style={S.nextBtn} onClick={() => {
              const next = problems.find(p => p.id === selectedProblem.id + 1);
              if (next) startPractice(next);
              else { setSelectedProblem(null); setResult(null); }
            }}>
              ➡️ Next Problem
            </button>
            <button style={S.lobbyBtn} onClick={() => navigate('/lobby')}>⚔️ Battle Now</button>
            <button style={S.listBtn} onClick={() => { setSelectedProblem(null); setResult(null); }}>📋 Problem List</button>
          </div>
        ) : (
          <div style={S.actionBtns}>
            <button style={S.tryAgainBtn} onClick={handleTryAgain}>🔄 Try Again</button>
            <button style={S.listBtn} onClick={() => { setSelectedProblem(null); setResult(null); }}>📋 Different Problem</button>
          </div>
        )}
      </div>
    </div>
  );
}

// Difficulty badge style helper
function diffStyle(diff) {
  const map = {
    Easy:   { bg: '#00d4aa22', color: '#00d4aa', border: '1px solid #00d4aa44' },
    Medium: { bg: '#ffa50222', color: '#ffa502', border: '1px solid #ffa50244' },
    Hard:   { bg: '#ff475722', color: '#ff4757', border: '1px solid #ff475744' },
  };
  const c = map[diff] || map.Easy;
  return {
    padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
    background: c.bg, color: c.color, border: c.border,
  };
}

const S = {
  page: { minHeight: '100vh', background: '#0f0f1a', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column' },

  navbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', background: '#1a1a2e', borderBottom: '1px solid #6c63ff55' },
  navLogo: { fontSize: '20px', fontWeight: '900', color: '#6c63ff', cursor: 'pointer' },
  navRight: { display: 'flex', alignItems: 'center', gap: '10px' },
  navBtn: { background: 'transparent', border: '1px solid #6c63ff44', color: '#aaa', padding: '6px 14px', borderRadius: 20, cursor: 'pointer', fontSize: 13 },
  practiceTag: { background: '#6c63ff22', color: '#6c63ff', border: '1px solid #6c63ff44', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 },

  // Picker
  pickerContainer: { maxWidth: 960, margin: '0 auto', padding: '40px 20px', width: '100%' },
  pickerHeader: { textAlign: 'center', marginBottom: 32 },
  pickerIcon: { fontSize: 56, marginBottom: 10 },
  pickerTitle: { fontSize: 36, fontWeight: 900, color: '#fff', margin: '0 0 10px' },
  pickerSub: { color: '#aaa', fontSize: 15, lineHeight: 1.6 },

  filterRow: { display: 'flex', gap: 10, marginBottom: 28, justifyContent: 'center' },
  filterBtn: { background: 'transparent', border: '1px solid #6c63ff44', color: '#aaa', padding: '8px 22px', borderRadius: 20, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  filterBtnActive: { background: '#6c63ff', color: '#fff', border: '1px solid #6c63ff' },

  problemGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 18 },
  problemCard: { background: '#1a1a2e', borderRadius: 16, padding: 20, border: '1px solid #6c63ff22', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 8, transition: 'border .15s' },
  problemCardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  problemNum: { color: '#555', fontSize: 12, fontWeight: 600 },
  problemTitle: { color: '#fff', fontWeight: 700, fontSize: 16, margin: 0 },
  problemDesc: { color: '#777', fontSize: 13, lineHeight: 1.5, margin: 0, flexGrow: 1 },
  startBtn: { marginTop: 8, background: 'linear-gradient(135deg,#6c63ff,#00d4aa)', color: '#fff', padding: '8px 0', borderRadius: 20, textAlign: 'center', fontSize: 13, fontWeight: 700 },

  // Editor page
  problemBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 18px', background: '#1a1a2e', borderBottom: '1px solid #6c63ff22' },
  problemBarLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  problemBarRight: { display: 'flex', alignItems: 'center', gap: 8 },
  problemIcon: { fontSize: 18 },
  problemBarTitle: { color: '#fff', fontWeight: 700, fontSize: 16 },
  attemptsBadge: { background: '#6c63ff22', color: '#6c63ff', border: '1px solid #6c63ff44', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  hintBtn: { background: 'transparent', border: '1px solid #ffa50244', color: '#ffa502', padding: '5px 14px', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  resetBtn: { background: 'transparent', border: '1px solid #ffffff22', color: '#888', padding: '5px 12px', borderRadius: 20, cursor: 'pointer', fontSize: 12 },

  descBar: { padding: '14px 18px', background: '#0d0d1a', borderBottom: '1px solid #ffffff0a' },
  descText: { color: '#ccc', fontSize: 14, margin: '0 0 6px', lineHeight: 1.6 },
  exampleText: { color: '#888', fontSize: 13, margin: 0 },
  hintBox: { marginTop: 10, background: '#ffa50211', border: '1px solid #ffa50233', borderRadius: 8, padding: '10px 14px', color: '#ffa502', fontSize: 13, lineHeight: 1.5 },

  // Full-width editor
  editorPane: { flex: 1, display: 'flex', flexDirection: 'column', minHeight: 420 },
  editorHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', background: '#1a1a2e', borderBottom: '1px solid #ffffff11', color: '#00d4aa', fontWeight: 700, fontSize: 13 },
  editorWrap: { height: '420px' },
  correctTag: { background: '#00d4aa22', color: '#00d4aa', border: '1px solid #00d4aa44', padding: '2px 10px', borderRadius: 20, fontSize: 11 },
  wrongTag: { background: '#ff475722', color: '#ff4757', border: '1px solid #ff475744', padding: '2px 10px', borderRadius: 20, fontSize: 11 },

  correctBanner: { background: '#00d4aa22', border: '1px solid #00d4aa55', color: '#00d4aa', padding: '12px', textAlign: 'center', fontWeight: 700, fontSize: 15 },
  wrongBanner: { background: '#ff475722', border: '1px solid #ff475755', color: '#ff4757', padding: '12px', textAlign: 'center', fontWeight: 700, fontSize: 15 },

  actionBar: { padding: '14px 18px', background: '#1a1a2e', borderTop: '1px solid #6c63ff22', display: 'flex', justifyContent: 'center' },
  actionBtns: { display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' },
  submitBtn: { background: 'linear-gradient(135deg,#6c63ff,#00d4aa)', border: 'none', color: '#fff', padding: '13px 48px', borderRadius: 25, fontSize: 15, fontWeight: 700, cursor: 'pointer' },
  tryAgainBtn: { background: 'transparent', border: '2px solid #ffa502', color: '#ffa502', padding: '11px 24px', borderRadius: 25, fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  nextBtn: { background: 'linear-gradient(135deg,#6c63ff,#00d4aa)', border: 'none', color: '#fff', padding: '11px 24px', borderRadius: 25, fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  lobbyBtn: { background: 'transparent', border: '2px solid #00d4aa', color: '#00d4aa', padding: '11px 24px', borderRadius: 25, fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  listBtn: { background: 'transparent', border: '2px solid #6c63ff55', color: '#aaa', padding: '11px 24px', borderRadius: 25, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
};

export default Practice;
