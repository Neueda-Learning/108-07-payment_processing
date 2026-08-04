import React, { useState, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import Signup from './components/Signup';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import CreatePayment from './components/CreatePayment';
import PaymentList from './components/PaymentList';
import PaymentDetails from './components/PaymentDetails';
import './App.css';

function ProtectedRoute({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
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
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payments"
            element={
              <ProtectedRoute>
                <PaymentList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payments/new"
            element={
              <ProtectedRoute>
                <CreatePayment />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payments/:id"
            element={
              <ProtectedRoute>
                <PaymentDetails />
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
