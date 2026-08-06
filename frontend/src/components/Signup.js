import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { localRegister } from '../services/localAuth';

const PASSWORD_RULES = [
  { key: 'length', label: '8 to 20 characters', test: (pw) => /^\S{8,20}$/.test(pw) },
  { key: 'lowercase', label: 'One lowercase letter', test: (pw) => /[a-z]/.test(pw) },
  { key: 'uppercase', label: 'One capital letter', test: (pw) => /[A-Z]/.test(pw) },
  { key: 'number', label: 'One number', test: (pw) => /\d/.test(pw) },
  { key: 'special', label: 'One special character', test: (pw) => /[^A-Za-z0-9\s]/.test(pw) },
];

export default function Signup() {
  const navigate = useNavigate();

  const [form, setForm] = useState({ username: '', password: '', confirmPassword: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setFieldErrors((prev) => ({ ...prev, [e.target.name]: '' }));
    setServerError('');
  }

  function validate() {
    const errors = {};

    if (!form.username.trim()) {
      errors.username = 'Username is required.';
    } else if (form.username.trim().length < 3) {
      errors.username = 'Username must be at least 3 characters.';
    } else if (form.username.trim().length > 50) {
      errors.username = 'Username must not exceed 50 characters.';
    } else if (!/^[a-zA-Z0-9_.-]+$/.test(form.username.trim())) {
      errors.username = 'Username may only contain letters, numbers, _ . -';
    }

    if (!form.password) {
      errors.password = 'Password is required.';
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])\S{8,20}$/.test(form.password)) {
      errors.password =
        'Password must be 8-20 characters with at least 1 lowercase letter, 1 capital letter, 1 number, and 1 special character (no spaces).';
    }

    if (!form.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password.';
    } else if (form.password !== form.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    return errors;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      await localRegister(form.username.trim(), form.password);
      // Account created — redirect to login with success message
      navigate('/login', { state: { registered: true }, replace: true });
    } catch (err) {
      setServerError(
        err.code === 'USERNAME_ALREADY_EXISTS'
          ? 'Username already taken. Please choose a different one.'
          : err.message || 'Registration failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <img src="/logo.jpg" alt="FlashPay logo" className="brand-logo brand-logo-login" />
          </div>
          <h1>Create Account</h1>
        </div>
        <p className="subtitle">Sign up to start using FlashPay</p>

        {serverError && <div className="alert alert-error">{serverError}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              type="text"
              className={`form-control ${fieldErrors.username ? 'error' : ''}`}
              value={form.username}
              onChange={handleChange}
              autoComplete="username"
              autoFocus
              disabled={loading}
              placeholder="Choose a username"
              maxLength={50}
            />
            {fieldErrors.username && (
              <div className="form-error">{fieldErrors.username}</div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              className={`form-control ${fieldErrors.password ? 'error' : ''}`}
              value={form.password}
              onChange={handleChange}
              autoComplete="new-password"
              disabled={loading}
              placeholder="Create your password"
            />
            <ul className="password-checklist">
              {PASSWORD_RULES.map((rule) => {
                const met = rule.test(form.password);
                return (
                  <li key={rule.key} className={met ? 'met' : ''}>
                    <span className="check-icon">{met ? '✓' : '○'}</span>
                    {rule.label}
                  </li>
                );
              })}
            </ul>
            {fieldErrors.password && (
              <div className="form-error">{fieldErrors.password}</div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              className={`form-control ${fieldErrors.confirmPassword ? 'error' : ''}`}
              value={form.confirmPassword}
              onChange={handleChange}
              autoComplete="new-password"
              disabled={loading}
              placeholder="Re-enter your password"
            />
            {fieldErrors.confirmPassword && (
              <div className="form-error">{fieldErrors.confirmPassword}</div>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}
            disabled={loading}
          >
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#5f6368' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#1a73e8', fontWeight: 600, textDecoration: 'none' }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
