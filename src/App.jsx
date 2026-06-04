import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

import LandingPage   from './pages/LandingPage';
import RegisterPage  from './pages/RegisterPage';
import LoginPage     from './pages/LoginPage';
import HomePage      from './pages/HomePage';
import ContractorDashboard from './pages/ContractorDashboard';
import DealerDashboard from './pages/DealerDashboard';
import ProfessionalDashboard from './pages/ProfessionalDashboard';
import ProtectedRoute from './components/ProtectedRoute';

// Placeholder pages — replace with real dashboards later
const ComingSoon = ({ role }) => (
  <div className="p-20 text-center min-h-screen transition-colors duration-300" style={{ backgroundColor: 'var(--bg-secondary)' }}>
    <h1 className="text-4xl font-black mb-4" style={{ color: 'var(--text-primary)' }}>{role} Dashboard</h1>
    <p style={{ color: 'var(--text-secondary)' }}>Coming Soon — Implementation in progress.</p>
  </div>
);

export default function App() {
  const { user } = useAuth();

  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
        
        {/* Protected common home — shown after login until dashboards are built */}
        <Route path="/home" element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        } />

        {/* Role dashboards — protected */}
        <Route path="/contractor" element={
          <ProtectedRoute allowedRole="contractor">
            <ContractorDashboard />
          </ProtectedRoute>
        } />
        
        <Route path="/customer" element={
          <ProtectedRoute allowedRole="customer">
            <ComingSoon role="Customer" />
          </ProtectedRoute>
        } />
        
        <Route path="/dealer/*" element={
          <ProtectedRoute allowedRole="dealer">
            <DealerDashboard />
          </ProtectedRoute>
        } />
        <Route path="/dealer/dashboard" element={
          <ProtectedRoute allowedRole="dealer">
            <DealerDashboard />
          </ProtectedRoute>
        } />
        
        <Route path="/professional/*" element={
          <ProtectedRoute allowedRole="professional">
            <ProfessionalDashboard />
          </ProtectedRoute>
        } />
        <Route path="/professional/dashboard" element={
          <ProtectedRoute allowedRole="professional">
            <ProfessionalDashboard />
          </ProtectedRoute>
        } />

        {/* Catch-all 404 */}
        <Route path="*" element={
          <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
            <h1 className="text-9xl font-black text-slate-200">404</h1>
            <p className="text-xl font-bold text-slate-400 mt-4">Page not found.</p>
            <button 
              onClick={() => window.location.href = '/'}
              className="mt-8 px-8 py-3 bg-primary text-white font-bold rounded-xl"
            >
              Go back home
            </button>
          </div>
        } />
      </Routes>
    </Router>
  );
}
