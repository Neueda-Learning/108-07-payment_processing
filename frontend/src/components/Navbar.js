import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/dashboard',    icon: '📊', label: 'Dashboard'       },
  { to: '/payments',     icon: '📋', label: 'All Payments'    },
  { to: '/payments/new', icon: '➕', label: 'New Payment'     },
];

export default function Navbar() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <h2>💳 PaySystem</h2>
        <span>Payment Processing</span>
      </div>

      <ul className="navbar-nav">
        {NAV_ITEMS.map(({ to, icon, label }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) => (isActive ? 'active' : '')}
              end={to === '/payments'}
            >
              <span className="nav-icon">{icon}</span>
              {label}
            </NavLink>
          </li>
        ))}
      </ul>

      <div className="navbar-footer">
        <button className="logout-btn" onClick={handleLogout}>
          <span>🚪</span> Sign Out
        </button>
      </div>
    </nav>
  );
}
