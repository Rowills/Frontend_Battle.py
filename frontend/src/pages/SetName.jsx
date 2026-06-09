import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function SetName() {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleStart = (e) => {
    e.preventDefault();
    if (name.trim().length < 3) {
      setError('Name must be at least 3 characters!');
      return;
    }
    if (name.trim().length > 15) {
      setError('Name must be less than 15 characters!');
      return;
    }
    const guestId = Math.floor(Math.random() * 100000);
    sessionStorage.setItem('guest_id', guestId);
    sessionStorage.setItem('guest_name', name.trim());
    navigate('/lobby');
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>

        <div style={styles.logo}>⚔️</div>
        <h1 style={styles.title}>Battle.py</h1>
        <p style={styles.subtitle}>Enter your battle name to begin!</p>

        {error && <p className="error-msg">{error}</p>}

        <form onSubmit={handleStart}>
          <input
            className="input-field"
            type="text"
            placeholder="Enter your name (e.g. CodeNinja)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={15}
            autoComplete="off"
            required
          />
          <button className="btn-primary" type="submit">
            Enter Battle Arena 🚀
          </button>
        </form>

        <p style={styles.hint}>
          No signup needed — just enter a name and battle!
        </p>

      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    background: '#0f0f1a',
  },
  card: {
    background: '#1a1a2e', borderRadius: '20px', padding: '40px',
    width: '90%', maxWidth: '420px',
    border: '1px solid #6c63ff55', textAlign: 'center',
  },
  logo: { fontSize: '60px', marginBottom: '10px' },
  title: {
    fontSize: '32px', fontWeight: '900',
    background: 'linear-gradient(135deg, #6c63ff, #00d4aa)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
    marginBottom: '5px',
  },
  subtitle: { color: '#aaaaaa', marginBottom: '25px', fontSize: '14px' },
  hint: { marginTop: '20px', color: '#aaaaaa', fontSize: '13px' },
};

export default SetName;