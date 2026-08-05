import React from 'react';
import { useAuth } from '../context/AuthContext';

// Fixed top-right user icon button. Hovering it reveals the username.
// Rendered for every logged-in page (with or without the sidebar visible).
export default function UserMenu() {
  const { username } = useAuth();
  if (!username) return null;

  const initial = username.trim().charAt(0).toUpperCase();

  return (
    <div className="user-menu">
      <button type="button" className="user-menu-btn" aria-label="Account">
        {initial || '👤'}
      </button>
      <div className="user-menu-tooltip">{username}</div>
    </div>
  );
}
