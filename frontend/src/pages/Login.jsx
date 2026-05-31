import React, { useState } from 'react';
import API from '../api/axios';
import { useNavigate, Link } from 'react-router-dom';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await API.post('/auth/login', {
        username: '',
        email: email,
        password: password,
      });
      localStorage.setItem('user_id', response.data.user_id);
      localStorage.setItem('username', response.data.username);
      navigate('/lobby');
    } catch (err) {
      setError('Invalid email or password');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>

        {/* Logo */}
        <div style={styles.logo}>⚔️</div>
        <h1 style={styles.title}>Battle.py</h1>
        <p style={styles.subtitle}>Login to start battling</p>

        {/* Error */}
        {error && <p className="error-msg">{error}</p>}

        {/* Form */}
        <form onSubmit={handleLogin}>
          <input
            className="input-field"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="input-field"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button className="btn-primary" type="submit">
            Login ⚡
          </button>
        </form>

        {/* Register link */}
        <p style={styles.linkText}>
          Don't have an account?{' '}
          <Link to="/register" style={styles.link}>
            Register here
          </Link>
        </p>

      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0f0f1a',
  },
  card: {
    background: '#1a1a2e',
    borderRadius: '20px',
    padding: '40px',
    width: '100%',
    maxWidth: '420px',
    border: '1px solid #6c63ff55',
    textAlign: 'center',
  },
  logo: {
    fontSize: '60px',
    marginBottom: '10px',
  },
  title: {
    fontSize: '32px',
    fontWeight: '900',
    background: 'linear-gradient(135deg, #6c63ff, #00d4aa)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '5px',
  },
  subtitle: {
    color: '#aaaaaa',
    marginBottom: '25px',
    fontSize: '14px',
  },
  linkText: {
    marginTop: '20px',
    color: '#aaaaaa',
    fontSize: '14px',
  },
  link: {
    color: '#6c63ff',
    textDecoration: 'none',
    fontWeight: '600',
  },
};

export default Login;