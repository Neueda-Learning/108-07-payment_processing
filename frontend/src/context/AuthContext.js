import React, { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('jwt_token'));
  const [username, setUsername] = useState(() => localStorage.getItem('flashpay_username'));

  const login = useCallback((jwt, user) => {
    localStorage.setItem('jwt_token', jwt);
    setToken(jwt);
    if (user) {
      localStorage.setItem('flashpay_username', user);
      setUsername(user);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('flashpay_username');
    setToken(null);
    setUsername(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, username, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
