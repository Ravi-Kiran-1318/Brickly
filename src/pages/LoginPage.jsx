import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../api';
import toast, { Toaster } from 'react-hot-toast';
import {
  IconHelmet, IconMail, IconLock, IconEye,
  IconEyeOff, IconArrowRight, IconShieldCheck,
  IconLayoutDashboard, IconLogout
} from '@tabler/icons-react';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(600);
  const [canResend, setCanResend] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [pendingName, setPendingName] = useState('');
  const [forgotStep, setForgotStep] = useState('login'); // login, email, otp, reset
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  React.useEffect(() => {
    let interval;
    if (otpStep && timer > 0) {
      interval = setInterval(() => {
        setTimer(t => t - 1);
      }, 1000);
    } else if (timer === 0) {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [otpStep, timer]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/api/auth/login', formData, { timeout: 60000 });

      if (res.data.requiresOTP) {
        setPendingEmail(res.data.email);
        setPendingName(res.data.name || 'User');
        setOtpStep(true);
        setTimer(600);
        setCanResend(false);
        toast.success(res.data.message);
        return;
      }

      // NO early redirect here. Ensure we only get here if requiresOTP is NOT present.
      if (res.data.token) {
        toast.success('Welcome back to Brickly!');
        login(res.data.token, res.data.user);
        const role = res.data.user.role;
        const target = role === 'contractor' ? '/contractor' : `/${role}`;
        setTimeout(() => navigate(target, { replace: true }), 1500);
      }
    } catch (err) {
      const msg = err.code === 'ECONNABORTED'
        ? "The server is taking too long to respond. Please check your connection."
        : err.response?.data?.message || 'Login failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);

    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`).focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`).focus();
    }
  };

  const handleVerifyOTP = async () => {
    const otp = otpDigits.join('');
    if (otp.length < 6) {
      toast.error("Please enter all 6 digits");
      return;
    }

    setIsVerifying(true);
    try {
      const endpoint = forgotStep === 'otp' ? '/api/auth/verify-reset-otp' : '/api/auth/verify-account';
      const res = await api.post(endpoint, {
        email: pendingEmail,
        otp
      }, { timeout: 60000 });

      if (forgotStep === 'otp') {
        toast.success("Code verified! Set your new password.");
        setForgotStep('reset');
        setOtpDigits(['', '', '', '', '', '']);
      } else {
        toast.success("Login successful!");
        login(res.data.token, res.data.user);
        const role = res.data.user.role;
        const target = role === 'contractor' ? '/contractor' : `/${role}`;
        setTimeout(() => navigate(target, { replace: true }), 1500);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Verification failed");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOTP = async () => {
    setCanResend(false);
    setTimer(600);
    try {
      const endpoint = forgotStep === 'otp' ? '/api/auth/forgot-password' : '/api/otp/send-otp';
      await api.post(endpoint, {
        email: pendingEmail,
        name: pendingName
      }, { timeout: 60000 });
      toast.success("New code sent!");
      setOtpDigits(['', '', '', '', '', '']);
    } catch (err) {
      toast.error("Failed to resend code");
      setCanResend(true);
    }
  };

  const handleForgotPasswordRequest = async (e) => {
    e.preventDefault();
    if (!pendingEmail) {
      toast.error("Please enter your email");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/api/auth/forgot-password', { email: pendingEmail }, { timeout: 60000 });
      toast.success(res.data.message);
      setForgotStep('otp');
      setTimer(600);
      setCanResend(false);
    } catch (err) {
      console.error("Forgot Password Error:", err);
      const msg = err.response?.data?.message || err.message || "Failed to initiate reset";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsResetting(true);
    try {
      const res = await api.post('/api/auth/reset-password', {
        email: pendingEmail,
        newPassword
      }, { timeout: 60000 });
      toast.success(res.data.message);
      setForgotStep('login');
      setNewPassword('');
      setConfirmPassword('');
      setPendingEmail('');
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reset password");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      <Toaster position="top-right" />

      {/* Branding Panel */}
      <div className="hidden lg:flex lg:w-[38%] bg-primary text-white p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-accent/20 rounded-full blur-3xl" />

        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-2 mb-16">
            <div className="bg-accent p-2 rounded-xl">
              <IconHelmet size={32} className="text-white" />
            </div>
            <span className="text-3xl font-black tracking-tight">Brickly</span>
          </Link>

          <div className="mb-8">
            <h2 className="text-5xl font-black mb-6 leading-tight">
              Build smarter,<br />Grow faster.
            </h2>
            <p className="text-blue-100 text-lg leading-relaxed max-w-md">
              Access India's largest network of verified contractors, material dealers, and skilled professionals.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="p-1 rounded-full bg-accent/20"><IconShieldCheck size={18} className="text-accent" /></div>
              <p className="text-sm font-medium text-blue-100">AI-verified profiles for complete trust</p>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-1 rounded-full bg-accent/20"><IconLayoutDashboard size={18} className="text-accent" /></div>
              <p className="text-sm font-medium text-blue-100">Centralized dashboard for all your projects</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-blue-200 text-xs font-medium">
          &copy; 2026 Brickly Technologies Pvt Ltd.
        </div>
      </div>

      {/* Login Form Panel */}
      <div className="flex-1 flex flex-col p-6 lg:p-20 justify-center items-center">
        <Link to="/" className="lg:hidden flex items-center gap-2 mb-12">
          <div className="bg-accent p-1.5 rounded-lg">
            <IconHelmet size={24} className="text-white" />
          </div>
          <span className="text-2xl font-black tracking-tight text-primary">Brickly</span>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-3xl border border-gray-100 shadow-2xl shadow-slate-200/50 p-8 md:p-12"
        >
          <div className="mb-10 text-center lg:text-left">
            <h1 className="text-3xl font-black text-primary mb-2">
              {forgotStep === 'email' ? 'Reset Password' :
                forgotStep === 'otp' || otpStep ? 'Verify Identity' :
                  forgotStep === 'reset' ? 'New Password' : 'Welcome Back'}
            </h1>
            <p className="text-gray-400 font-medium tracking-tight">
              {forgotStep === 'email' ? 'Enter your email to receive a reset code' :
                forgotStep === 'otp' || otpStep
                  ? `Enter the 6-digit code sent to ${pendingEmail}`
                  : forgotStep === 'reset' ? 'Create a secure new password' : 'Enter your credentials to access your account'}
            </p>
          </div>

          {user && forgotStep === 'login' && !otpStep && (
            <div className="mb-6 p-4 bg-orange-50/50 border border-orange-100 rounded-2xl text-left space-y-3">
              <div className="flex items-center justify-between">
                <div className="overflow-hidden mr-2">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Signed in as</p>
                  <p className="text-sm font-black text-primary truncate">{user.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const role = user.role;
                    const target = role === 'contractor' ? '/contractor' : `/${role}`;
                    navigate(target, { replace: true });
                  }}
                  className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-slate-905 transition-all shrink-0"
                >
                  Go to Dashboard
                </button>
              </div>
              <div className="pt-2 border-t border-orange-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    logout();
                  }}
                  className="text-xs font-bold text-[#F97316] hover:text-orange-600 transition-colors"
                >
                  Not you? Sign Out
                </button>
              </div>
            </div>
          )}

          {forgotStep === 'email' ? (
            <form onSubmit={handleForgotPasswordRequest} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-black text-primary ml-1">Email Address</label>
                <div className="relative group">
                  <IconMail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-accent transition-colors" size={20} />
                  <input
                    required
                    type="email"
                    value={pendingEmail}
                    onChange={(e) => setPendingEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-4 focus:ring-orange-100 focus:border-accent transition-all font-medium"
                    placeholder="name@company.com"
                  />
                </div>
              </div>
              <button
                disabled={loading}
                type="submit"
                className="w-full py-4 rounded-2xl bg-accent text-white font-black text-lg shadow-xl shadow-orange-100 hover:bg-orange-600 transition-all flex items-center justify-center gap-2"
              >
                {loading ? 'Sending Code...' : 'Send Reset Code'}
                <IconArrowRight size={22} />
              </button>
              <button type="button" onClick={() => setForgotStep('login')} className="w-full text-xs font-bold text-gray-400 hover:text-primary transition-colors text-center">
                Back to Login
              </button>
            </form>
          ) : forgotStep === 'reset' ? (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-black text-primary ml-1">New Password</label>
                <div className="relative group">
                  <IconLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-accent transition-colors" size={20} />
                  <input
                    required
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-4 focus:ring-orange-100 focus:border-accent transition-all font-medium"
                    placeholder="••••••••"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-black text-primary ml-1">Confirm New Password</label>
                <div className="relative group">
                  <IconLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-accent transition-colors" size={20} />
                  <input
                    required
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-4 focus:ring-orange-100 focus:border-accent transition-all font-medium"
                    placeholder="••••••••"
                  />
                </div>
              </div>
              <button
                disabled={isResetting}
                type="submit"
                className="w-full py-4 rounded-2xl bg-accent text-white font-black text-lg shadow-xl shadow-orange-100 hover:bg-orange-600 transition-all flex items-center justify-center gap-2"
              >
                {isResetting ? 'Updating...' : 'Reset Password'}
                <IconShieldCheck size={22} />
              </button>
            </form>
          ) : forgotStep === 'otp' || otpStep ? (
            <div className="space-y-8">
              <div className="flex justify-between gap-2">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`otp-${idx}`}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="w-12 h-14 text-center text-2xl font-black rounded-xl border-2 border-gray-100 focus:border-accent focus:ring-4 focus:ring-orange-500/10 outline-none transition-all bg-gray-50"
                  />
                ))}
              </div>

              <div className="text-center">
                <p className="text-sm font-medium text-gray-400 mb-2">
                  Code expires in: <span className="font-bold text-primary">{Math.floor(timer / 60)}:{String(timer % 60).padStart(2, '0')}</span>
                </p>
                <button
                  type="button"
                  disabled={!canResend}
                  onClick={handleResendOTP}
                  className={`text-sm font-bold transition-colors ${canResend ? 'text-accent hover:text-orange-600 underline' : 'text-gray-300 cursor-not-allowed'
                    }`}
                >
                  Resend OTP
                </button>
              </div>

              <button
                disabled={isVerifying}
                onClick={handleVerifyOTP}
                className={`w-full py-4 rounded-2xl font-black text-lg shadow-xl shadow-orange-100 transition-all flex items-center justify-center gap-2 ${isVerifying ? 'bg-accent/70 cursor-not-allowed text-white' : 'bg-accent text-white hover:bg-orange-600 hover:scale-[1.02] active:scale-[0.98]'
                  }`}
              >
                {isVerifying ? 'Verifying...' : 'Verify & Sign In'}
                {!isVerifying && <IconShieldCheck size={22} />}
              </button>

              <button
                type="button"
                onClick={() => { setOtpStep(false); setForgotStep('login'); }}
                className="w-full text-xs font-bold text-gray-400 hover:text-primary transition-colors text-center"
              >
                Back to Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-black text-primary ml-1">Email Address</label>
                <div className="relative group">
                  <IconMail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-accent transition-colors" size={20} />
                  <input
                    required
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-4 focus:ring-orange-100 focus:border-accent transition-all font-medium"
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-sm font-black text-primary">Password</label>
                  <button
                    type="button"
                    onClick={() => setForgotStep('email')}
                    className="text-xs font-bold text-accent hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative group">
                  <IconLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-accent transition-colors" size={20} />
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-12 pr-12 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-4 focus:ring-orange-100 focus:border-accent transition-all font-medium"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <IconEyeOff size={20} /> : <IconEye size={20} />}
                  </button>
                </div>
              </div>

              <button
                disabled={loading}
                type="submit"
                className={`w-full py-4 rounded-2xl font-black text-lg shadow-xl shadow-orange-100 transition-all flex items-center justify-center gap-2 ${loading
                    ? 'bg-accent/70 cursor-not-allowed text-white'
                    : 'bg-accent text-white hover:bg-orange-600 hover:scale-[1.02] active:scale-[0.98]'
                  }`}
              >
                {loading ? 'Signing in...' : 'Sign In'}
                {!loading && <IconArrowRight size={22} />}
              </button>

              <div className="pt-6 text-center border-t border-gray-100">
                <p className="text-sm font-medium text-gray-400">
                  New to Brickly? {' '}
                  <Link to="/register" className="text-primary font-black hover:text-accent transition-colors underline decoration-2 underline-offset-4 decoration-accent/20 hover:decoration-accent">Create account &rarr;</Link>
                </p>
              </div>
            </form>
          )}
        </motion.div>

        <p className="mt-12 text-gray-300 text-[10px] font-black uppercase tracking-[0.2em] text-center max-w-xs">
          Built for the future of Indian Construction. Verified & Secure.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
