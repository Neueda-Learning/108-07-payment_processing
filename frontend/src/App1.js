import React, { useState, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { hasBankAccount } from './services/localBankAccounts';
import Login from './components/Login';
import Signup from './components/Signup';
import Navbar from './components/Navbar';
import UserMenu from './components/UserMenu';
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
  const { username } = useAuth();
  return hasBankAccount(username) ? children : <Navigate to="/add-bank-account" replace />;
}

function AppRoutes() {
  const [sidebarWidth, setSidebarWidth] = useState(() =>
    parseInt(localStorage.getItem('pps_sidebar_width') || '360', 10)
  );

  const handleWidthChange = useCallback((w) => {
    setSidebarWidth(w);
    localStorage.setItem('pps_sidebar_width', String(w));
  }, []);

  return (
    <Router>
      <AppShell sidebarWidth={sidebarWidth} onWidthChange={handleWidthChange} />
    </Router>
  );
}

// Rendered inside <Router> so it can react to route changes (e.g. sidebar
// should reappear immediately once the user's first bank account is added).
function AppShell({ sidebarWidth, onWidthChange }) {
  const { token, username } = useAuth();
  useLocation(); // subscribe to navigation so this re-renders on route change

  const showSidebar = !!(token && username && hasBankAccount(username));

  return (
    <>
      {token && <UserMenu />}
      {showSidebar && <Navbar width={sidebarWidth} onWidthChange={onWidthChange} />}
      <div
        className={token ? 'main-content' : ''}
        style={showSidebar ? { marginLeft: sidebarWidth } : token ? { marginLeft: 0 } : {}}
      >
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
    </>
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
