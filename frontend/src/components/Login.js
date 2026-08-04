import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { localLogin } from '../services/localAuth';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const justRegistered = location.state?.registered;

  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.username.trim() || !form.password.trim()) {
      setError('Username and password are required.');
      return;
    }

    setLoading(true);
    try {
      const token = await localLogin(form.username.trim(), form.password);
      login(token);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(
        err.code === 'INVALID_CREDENTIALS'
          ? 'Invalid username or password.'
          : err.message || 'Login failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-logo">💳</div>
        <h1>FlashPay</h1>
        <p className="subtitle">Sign in to your account to continue</p>

        {justRegistered && (
          <div className="alert alert-success">Account created! Please sign in.</div>
        )}
        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              type="text"
              className={`form-control ${error ? 'error' : ''}`}
              value={form.username}
              onChange={handleChange}
              autoComplete="username"
              autoFocus
              disabled={loading}
              placeholder="Enter your username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              className={`form-control ${error ? 'error' : ''}`}
              value={form.password}
              onChange={handleChange}
              autoComplete="current-password"
              disabled={loading}
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}
            disabled={loading}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#5f6368' }}>
          Don't have an account?{' '}
          <Link to="/signup" style={{ color: '#1a73e8', fontWeight: 600, textDecoration: 'none' }}>
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
