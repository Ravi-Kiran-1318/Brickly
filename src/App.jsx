import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { motion } from 'framer-motion';
import { 
  IconHelmet, IconArrowRight, IconMail, IconSparkles, IconLogout
} from '@tabler/icons-react';
import toast, { Toaster } from 'react-hot-toast';

import LandingPage   from './pages/LandingPage';
import RegisterPage  from './pages/RegisterPage';
import LoginPage     from './pages/LoginPage';
import HomePage      from './pages/HomePage';
import ContractorDashboard from './pages/ContractorDashboard';
import DealerDashboard from './pages/DealerDashboard';
import ProfessionalDashboard from './pages/ProfessionalDashboard';
import ProtectedRoute from './components/ProtectedRoute';

// Placeholder pages — replace with real dashboards later
const ComingSoon = ({ role }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { logout } = useAuth();

  const handleNotify = (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success("Perfect! We will email you once the features go live.");
      setEmail('');
    }, 1200);
  };

  const upcomingFeatures = {
    Customer: [
      { title: "AI Exterior & Interior Design", desc: "Generate photorealistic renders of your dream home with custom material overlays." },
      { title: "Smart Cost Estimator", desc: "Instantly calculate structural, cement, brick, and painting estimates for your area." },
      { title: "Direct Matching Network", desc: "Instantly chat and hire verified contractor partners without middleman delays." },
    ],
  }[role] || [
    { title: "Interactive Management Suite", desc: "Advanced tools custom built to accelerate your construction business." },
    { title: "Smart Analytics Dashboard", desc: "Live graphs tracking materials usage, costs, and project milestones." },
    { title: "Instant Notification Center", desc: "Get real-time updates on quotes, bids, and material orders." }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-between py-12 px-6 relative overflow-hidden transition-colors duration-300">
      <Toaster position="top-right" />
      
      {/* Background blobs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-orange-200/20 dark:bg-orange-950/15 rounded-full blur-3xl -translate-x-12 -translate-y-12" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-200/20 dark:bg-blue-950/15 rounded-full blur-3xl translate-x-12 translate-y-12" />

      {/* Header */}
      <header className="max-w-6xl mx-auto w-full flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="bg-[#F97316] p-2 rounded-xl text-white">
            <IconHelmet size={24} />
          </div>
          <span className="text-xl font-black text-slate-800 dark:text-white">Brickly</span>
        </div>
        <button 
          onClick={() => { logout(); window.location.href = '/login'; }}
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-850 rounded-xl text-sm font-bold text-slate-500 hover:text-red-500 hover:border-red-100 transition-all bg-white dark:bg-slate-900"
        >
          <IconLogout size={16} />
          Sign Out
        </button>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto w-full text-center py-12 z-10 flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/50 rounded-full text-xs font-bold text-[#F97316] mb-6"
        >
          <IconSparkles size={14} className="animate-pulse" />
          <span>UNDER CONSTRUCTION</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="text-4xl md:text-5xl font-black tracking-tight text-slate-800 dark:text-white mb-4"
        >
          Your {role} Space is Building.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-slate-400 dark:text-slate-500 font-medium text-lg max-w-xl mb-8"
        >
          We are polishing the metrics and interfaces for the {role} view. You are invited to follow the release progress below.
        </motion.p>

        {/* Progress Tracker */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm mb-12"
        >
          <div className="flex items-center justify-between mb-3 text-sm font-bold text-slate-500 dark:text-slate-400">
            <span>Roadmap Completion</span>
            <span className="text-[#F97316]">75% Completed</span>
          </div>
          <div className="w-full h-3 bg-slate-105 dark:bg-slate-800 rounded-full overflow-hidden mb-6">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: "75%" }}
              transition={{ delay: 0.5, duration: 1.2, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-orange-500 to-[#F97316] rounded-full" 
            />
          </div>

          <form onSubmit={handleNotify} className="flex gap-2">
            <div className="relative flex-1 group">
              <IconMail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#F97316] transition-colors" size={20} />
              <input 
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email for early access"
                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-orange-100 focus:border-[#F97316] transition-all font-medium text-sm text-slate-700 dark:text-slate-200"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-[#F97316] hover:bg-orange-600 text-white font-bold rounded-2xl text-sm transition-all shadow-md shadow-orange-100 dark:shadow-none flex items-center justify-center gap-1.5 shrink-0"
            >
              {loading ? 'Submitting...' : 'Notify Me'}
              {!loading && <IconArrowRight size={18} />}
            </button>
          </form>
        </motion.div>

        {/* Feature showcase */}
        <div className="w-full max-w-4xl text-left">
          <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-6 text-center">UPCOMING FEATURES</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {upcomingFeatures.map((feat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + idx * 0.1, duration: 0.5 }}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm hover:border-orange-200 dark:hover:border-orange-950 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 bg-orange-50 dark:bg-orange-950/20 text-[#F97316] rounded-xl flex items-center justify-center mb-4">
                    <IconSparkles size={20} />
                  </div>
                  <h4 className="font-bold text-slate-800 dark:text-white text-base mb-2">{feat.title}</h4>
                  <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed font-medium">{feat.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto w-full text-center z-10 text-[10px] font-black uppercase tracking-widest text-slate-300 dark:text-slate-700">
        Brickly Construction Platform • Dev Space
      </footer>
    </div>
  );
};

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
