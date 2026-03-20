import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import './index.css';

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', background: '#220000', color: '#ffaaaa', minHeight: '100vh', fontFamily: 'monospace' }}>
          <h2>💥 Fatal React Crash</h2>
          <p>{this.state.error?.toString()}</p>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#000', padding: '1rem', marginTop: '1rem' }}>{this.state.error?.stack}</pre>
          <button onClick={() => window.location.href = '/'} style={{ marginTop: '2rem', padding: '1rem', background: '#fff', color: '#000', border: 'none', cursor: 'pointer' }}>Reload App</button>
        </div>
      );
    }
    return this.props.children;
  }
}

import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ScoreEntry from './pages/ScoreEntry';
import Leaderboard from './pages/Leaderboard';
import DrawPage from './pages/DrawPage';
import Charities from './pages/Charities';
import Pricing from './pages/Pricing';
import Admin from './pages/Admin';
import Checkout from './pages/Checkout';
import Profile from './pages/Profile';

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
}

function SubscribedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  // Admins bypass subscription checks for management access
  if (user.role === 'admin') return children;

  if (user.subscriptionStatus !== 'active') {
    return <Navigate to="/pricing" state={{ from: location }} replace />;
  }

  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={user ? <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} /> : <Register />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/scores/new" element={<SubscribedRoute><ScoreEntry /></SubscribedRoute>} />
        <Route path="/leaderboard" element={<SubscribedRoute><Leaderboard /></SubscribedRoute>} />
        <Route path="/draw" element={<SubscribedRoute><DrawPage /></SubscribedRoute>} />
        <Route path="/charities" element={<Charities />} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ErrorBoundary>
          <AppRoutes />
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  );
}
