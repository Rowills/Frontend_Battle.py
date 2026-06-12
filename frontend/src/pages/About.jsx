import React, { useState, useEffect } from 'react';
import API from '../api/axios';
import { Link } from 'react-router-dom';

function About() {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const userId = parseInt(localStorage.getItem('user_id'));
  const username = localStorage.getItem('username');
  const isLoggedIn = !!userId;

  const fetchComments = async () => {
    try {
      const res = await API.get('/comments/');
      setComments(res.data);
    } catch (err) {
      console.error('Failed to fetch comments');
    }
  };

  useEffect(() => {
    fetchComments();
  }, []);

  const handlePost = async () => {
    if (!newComment.trim()) return;
    setLoading(true);
    setError('');
    try {
      await API.post('/comments/', {
        user_id: userId,
        username: username,
        content: newComment,
      });
      setNewComment('');
      fetchComments();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to post comment');
    }
    setLoading(false);
  };

  const handleDelete = async (commentId) => {
    try {
      await API.delete(`/comments/${commentId}?user_id=${userId}`);
      fetchComments();
    } catch (err) {
      alert('Could not delete comment');
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div style={styles.page}>
      {/* Navbar */}
      <nav style={styles.navbar}>
        <Link to="/" style={styles.navLogo}>⚔️ Battle.py</Link>
        <div style={styles.navLinks}>
          <Link to="/leaderboard" style={styles.navLink}>🏆 Leaderboard</Link>
          {isLoggedIn ? (
            <>
              <Link to="/profile" style={styles.navLink}>👤 {username}</Link>
              <button style={styles.logoutBtn} onClick={() => { localStorage.clear(); window.location.href = '/'; }}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" style={styles.navLink}>Login</Link>
              <Link to="/register" style={styles.registerBtn}>Register</Link>
            </>
          )}
        </div>
      </nav>

      <div style={styles.container}>

        {/* Hero */}
        <div style={styles.hero}>
          <div style={styles.heroEmoji}>⚔️</div>
          <h1 style={styles.heroTitle}>Battle.py</h1>
          <p style={styles.heroSub}>The real-time 1v1 Python coding battle platform for beginners</p>
        </div>

        {/* About Section */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>🎯 About Battle.py</h2>
          <p style={styles.text}>
            Battle.py is a free real-time coding platform where you can challenge friends to 1v1 Python coding battles.
            Solve problems, race against the clock, and climb the leaderboard. Built for beginners who want to sharpen
            their Python skills in a fun and competitive way!
          </p>
          <div style={styles.featureGrid}>
            <div style={styles.feature}>⚡ Real-time battles</div>
            <div style={styles.feature}>🏆 Leaderboard</div>
            <div style={styles.feature}>🔒 Anti-cheat system</div>
            <div style={styles.feature}>📱 Mobile friendly</div>
            <div style={styles.feature}>🆓 100% Free</div>
            <div style={styles.feature}>🎯 Beginner focused</div>
          </div>
        </div>

        {/* Creator Section */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>👨‍💻 Created By</h2>
          <div style={styles.creatorBox}>
            <div style={styles.avatar}>RF</div>
            <div>
              <p style={styles.creatorName}>Roy Fleming</p>
              <p style={styles.creatorBio}>Python developer & creator of Battle.py</p>
              <div style={styles.socials}>
                <a href="https://instagram.com/py.program2026" target="_blank" rel="noreferrer" style={styles.socialBtn}>
                  📸 @py.program2026
                </a>
                <a href="mailto:royfleming14@gmail.com" style={styles.socialBtn}>
                  📧 royfleming14@gmail.com
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Comments Section */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>💬 Community Comments</h2>
          <p style={styles.text}>Share your thoughts, feedback, or just say hi!</p>

          {/* Post Comment */}
          {isLoggedIn ? (
            <div style={styles.commentForm}>
              <textarea
                style={styles.textarea}
                placeholder="Write a comment... (max 300 characters)"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                maxLength={300}
              />
              <div style={styles.commentFormRow}>
                <span style={styles.charCount}>{newComment.length}/300</span>
                <button
                  style={styles.postBtn}
                  onClick={handlePost}
                  disabled={loading || !newComment.trim()}
                >
                  {loading ? 'Posting...' : '💬 Post Comment'}
                </button>
              </div>
              {error && <p style={styles.errorMsg}>{error}</p>}
            </div>
          ) : (
            <div style={styles.loginPrompt}>
              <Link to="/login" style={styles.loginLink}>Login</Link> or <Link to="/register" style={styles.loginLink}>Register</Link> to leave a comment!
            </div>
          )}

          {/* Comments List */}
          <div style={styles.commentsList}>
            {comments.length === 0 ? (
              <p style={styles.noComments}>No comments yet. Be the first to comment! 🎉</p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} style={styles.commentItem}>
                  <div style={styles.commentHeader}>
                    <div style={styles.commentAvatar}>{comment.username[0].toUpperCase()}</div>
                    <div>
                      <span style={styles.commentUsername}>{comment.username}</span>
                      <span style={styles.commentDate}>{formatDate(comment.created_at)}</span>
                    </div>
                    {comment.user_id === userId && (
                      <button
                        style={styles.deleteBtn}
                        onClick={() => handleDelete(comment.id)}
                        title="Delete your comment"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                  <p style={styles.commentContent}>{comment.content}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Copyright */}
        <div style={styles.footer}>
          <p style={styles.footerText}>© {new Date().getFullYear()} Battle.py — Made with ❤️ by Roy Fleming</p>
          <p style={styles.footerText}>
            <a href="https://instagram.com/py.program2026" target="_blank" rel="noreferrer" style={styles.footerLink}>Instagram</a>
            {' · '}
            <a href="mailto:royfleming14@gmail.com" style={styles.footerLink}>Contact</a>
            {' · '}
            <Link to="/" style={styles.footerLink}>Play Now</Link>
          </p>
        </div>

      </div>
    </div>
  );
}

const styles = {
  page: { background: '#0f0f1a', minHeight: '100vh', fontFamily: 'sans-serif' },
  navbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 30px', background: '#1a1a2e', borderBottom: '1px solid #6c63ff33' },
  navLogo: { color: '#6c63ff', textDecoration: 'none', fontWeight: '900', fontSize: '20px' },
  navLinks: { display: 'flex', alignItems: 'center', gap: '15px' },
  navLink: { color: '#aaaaaa', textDecoration: 'none', fontSize: '14px' },
  logoutBtn: { background: 'transparent', border: '1px solid #ff4757', color: '#ff4757', padding: '5px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' },
  registerBtn: { background: '#6c63ff', color: 'white', padding: '6px 14px', borderRadius: '8px', textDecoration: 'none', fontSize: '13px' },
  container: { maxWidth: '800px', margin: '0 auto', padding: '30px 20px' },
  hero: { textAlign: 'center', marginBottom: '40px' },
  heroEmoji: { fontSize: '60px', marginBottom: '10px' },
  heroTitle: { fontSize: '48px', fontWeight: '900', background: 'linear-gradient(135deg, #6c63ff, #00d4aa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: '0 0 10px' },
  heroSub: { color: '#aaaaaa', fontSize: '16px' },
  card: { background: '#1a1a2e', borderRadius: '16px', padding: '30px', marginBottom: '25px', border: '1px solid #6c63ff33' },
  cardTitle: { color: '#ffffff', fontSize: '22px', fontWeight: '700', marginBottom: '15px' },
  text: { color: '#cccccc', lineHeight: '1.7', marginBottom: '20px' },
  featureGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' },
  feature: { background: '#0f0f1a', color: '#00d4aa', padding: '10px', borderRadius: '8px', textAlign: 'center', fontSize: '13px', border: '1px solid #00d4aa33' },
  creatorBox: { display: 'flex', gap: '20px', alignItems: 'flex-start' },
  avatar: { width: '60px', height: '60px', borderRadius: '50%', background: 'linear-gradient(135deg, #6c63ff, #00d4aa)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '900', fontSize: '22px', flexShrink: 0 },
  creatorName: { color: '#ffffff', fontWeight: '700', fontSize: '18px', margin: '0 0 5px' },
  creatorBio: { color: '#aaaaaa', fontSize: '14px', margin: '0 0 12px' },
  socials: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  socialBtn: { background: '#0f0f1a', color: '#6c63ff', padding: '8px 14px', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', border: '1px solid #6c63ff55' },
  commentForm: { marginBottom: '25px' },
  textarea: { width: '100%', minHeight: '80px', background: '#0f0f1a', border: '1px solid #6c63ff55', borderRadius: '10px', color: '#ffffff', padding: '12px', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box' },
  commentFormRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' },
  charCount: { color: '#666', fontSize: '12px' },
  postBtn: { background: 'linear-gradient(135deg, #6c63ff, #00d4aa)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' },
  errorMsg: { color: '#ff4757', fontSize: '13px', marginTop: '8px' },
  loginPrompt: { background: '#0f0f1a', padding: '15px', borderRadius: '10px', textAlign: 'center', color: '#aaaaaa', marginBottom: '20px' },
  loginLink: { color: '#6c63ff', textDecoration: 'none', fontWeight: '600' },
  commentsList: { display: 'flex', flexDirection: 'column', gap: '15px' },
  noComments: { color: '#666', textAlign: 'center', padding: '20px' },
  commentItem: { background: '#0f0f1a', borderRadius: '10px', padding: '15px', border: '1px solid #ffffff11' },
  commentHeader: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' },
  commentAvatar: { width: '35px', height: '35px', borderRadius: '50%', background: 'linear-gradient(135deg, #6c63ff, #00d4aa)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '700', fontSize: '14px', flexShrink: 0 },
  commentUsername: { color: '#6c63ff', fontWeight: '600', fontSize: '14px', marginRight: '8px' },
  commentDate: { color: '#666', fontSize: '12px' },
  deleteBtn: { marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '16px', opacity: 0.7 },
  commentContent: { color: '#cccccc', fontSize: '14px', lineHeight: '1.6', margin: 0 },
  footer: { textAlign: 'center', padding: '30px 0', borderTop: '1px solid #ffffff11', marginTop: '20px' },
  footerText: { color: '#666', fontSize: '13px', margin: '5px 0' },
  footerLink: { color: '#6c63ff', textDecoration: 'none' },
};

export default About;
