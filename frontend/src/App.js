import React, { useState, useCallback, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { accountsApi } from './services/api';
import Login from './components/Login';
import Signup from './components/Signup';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import AuditHistory from './components/AuditHistory';
import AddBankAccount from './components/AddBankAccount';
import CreatePayment from './components/CreatePayment';
import PaymentList from './components/PaymentList';
import PaymentDetails from './components/PaymentDetails';
import './App.css';

function ProtectedRoute({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}

// Blocks dashboard/payment pages until the user has added at least one bank account.
function RequireBankAccount({ children }) {
  const [status, setStatus] = useState('loading'); // 'loading' | 'has-account' | 'no-account'

  useEffect(() => {
    let cancelled = false;
    accountsApi.getAll()
      .then((response) => {
        if (!cancelled) setStatus(response.data.length > 0 ? 'has-account' : 'no-account');
      })
      .catch(() => {
        if (!cancelled) setStatus('no-account');
      });
    return () => { cancelled = true; };
  }, []);

  if (status === 'loading') {
    return (
      <div className="loading-wrapper">
        <div className="spinner" />
        <span>Loading…</span>
      </div>
    );
  }

  return status === 'has-account' ? children : <Navigate to="/add-bank-account" replace />;
}

function AppRoutes() {
  const { token } = useAuth();
  const [sidebarWidth, setSidebarWidth] = useState(() =>
    parseInt(localStorage.getItem('pps_sidebar_width') || '360', 10)
  );

  const handleWidthChange = useCallback((w) => {
    setSidebarWidth(w);
    localStorage.setItem('pps_sidebar_width', String(w));
  }, []);

  return (
    <Router>
      {token && <Navbar width={sidebarWidth} onWidthChange={handleWidthChange} />}
      <div className={token ? 'main-content' : ''} style={token ? { marginLeft: sidebarWidth } : {}}>
        <Routes>
          <Route
            path="/login"
            element={token ? <Navigate to="/dashboard" replace /> : <Login />}
          />
          <Route
            path="/signup"
            element={token ? <Navigate to="/dashboard" replace /> : <Signup />}
          />
          <Route
            path="/add-bank-account"
            element={
              <ProtectedRoute>
                <AddBankAccount />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <RequireBankAccount>
                  <Dashboard />
                </RequireBankAccount>
              </ProtectedRoute>
            }
          />
          <Route
            path="/audit-history"
            element={
              <ProtectedRoute>
                <RequireBankAccount>
                  <AuditHistory />
                </RequireBankAccount>
              </ProtectedRoute>
            }
          />
          <Route
            path="/payments"
            element={
              <ProtectedRoute>
                <RequireBankAccount>
                  <PaymentList />
                </RequireBankAccount>
              </ProtectedRoute>
            }
          />
          <Route
            path="/payments/new"
            element={
              <ProtectedRoute>
                <RequireBankAccount>
                  <CreatePayment />
                </RequireBankAccount>
              </ProtectedRoute>
            }
          />
          <Route
            path="/payments/:id"
            element={
              <ProtectedRoute>
                <RequireBankAccount>
                  <PaymentDetails />
                </RequireBankAccount>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to={token ? '/dashboard' : '/signup'} replace />} />
        </Routes>
      </div>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
