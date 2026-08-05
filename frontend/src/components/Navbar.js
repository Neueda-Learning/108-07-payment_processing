import React, { useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/dashboard',      icon: '📊', label: 'Dashboard'     },
  { to: '/audit-history',  icon: '🕘', label: 'Audit History' },
  { to: '/payments',       icon: '📋', label: 'All Payments'  },
  { to: '/payments/new',   icon: '➕', label: 'New Payment'   },
  { to: '/add-bank-account', icon: '🏦', label: 'Add Accounts' },
];

const MIN_WIDTH = 180;
const MAX_WIDTH = 520;

export default function Navbar({ width = 360, onWidthChange }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const dragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);
  const handleRef = useRef(null);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  function onMouseDown(e) {
    dragging.current = true;
    startX.current = e.clientX;
    startWidth.current = width;
    if (handleRef.current) handleRef.current.classList.add('dragging');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    e.preventDefault();
  }

  function onMouseMove(e) {
    if (!dragging.current) return;
    const delta = e.clientX - startX.current;
    const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + delta));
    onWidthChange(newWidth);
  }

  function onMouseUp() {
    dragging.current = false;
    if (handleRef.current) handleRef.current.classList.remove('dragging');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }

  return (
    <nav className="navbar" style={{ width }}>
      <div className="navbar-brand">
        <h2>💳 FlashPay</h2>
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

      {/* Drag handle */}
      <div
        ref={handleRef}
        className="navbar-drag-handle"
        onMouseDown={onMouseDown}
        title="Drag to resize sidebar"
      />
    </nav>
  );
}
