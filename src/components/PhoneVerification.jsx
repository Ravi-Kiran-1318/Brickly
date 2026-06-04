import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { IconDeviceMobileCode, IconCheck, IconRefresh, IconArrowRight } from '@tabler/icons-react';

const PhoneVerification = ({ onVerified }) => {
  const [step, setStep] = useState('idle'); // idle, sent, verified
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleSendOTP = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('http://localhost:5000/api/otp/send', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setStep('sent');
        setTimer(60);
        toast.success('Verification code sent to your phone');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    const code = otp.join('');
    if (code.length < 6) {
      toast.error('Please enter the 6-digit code');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('http://localhost:5000/api/otp/verify', { otp: code }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.success) {
        setStep('verified');
        // Update local storage
        localStorage.setItem('token', res.data.token);
        const user = JSON.parse(localStorage.getItem('user'));
        localStorage.setItem('user', JSON.stringify({ ...user, phoneVerified: true }));
        
        toast.success('Phone verified successfully!');
        if (onVerified) onVerified();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (index, value) => {
    if (isNaN(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      document.getElementById(`otp-input-${index + 1}`).focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      document.getElementById(`otp-input-${index - 1}`).focus();
    }
  };

  const handlePaste = (e) => {
    const data = e.clipboardData.getData('text').slice(0, 6).split('');
    if (data.every(char => !isNaN(char))) {
      const newOtp = [...otp];
      data.forEach((char, i) => {
        if (i < 6) newOtp[i] = char;
      });
      setOtp(newOtp);
      document.getElementById(`otp-input-${Math.min(data.length, 5)}`).focus();
    }
  };

  return (
    <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden relative">
      <AnimatePresence mode="wait">
        {step === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="flex flex-col items-center text-center"
          >
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
              <IconDeviceMobileCode size={32} />
            </div>
            <h3 className="text-lg font-black text-primary mb-2">Verify Phone Number</h3>
            <p className="text-sm text-gray-500 mb-6 max-w-xs">
              Secure your account and gain "Verified" status by verifying your mobile number.
            </p>
            <button
              onClick={handleSendOTP}
              disabled={loading}
              className="w-full py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
            >
              {loading ? 'Sending...' : 'Send OTP Code'}
              <IconArrowRight size={20} />
            </button>
          </motion.div>
        )}

        {step === 'sent' && (
          <motion.div
            key="sent"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col items-center text-center"
          >
            <h3 className="text-lg font-black text-primary mb-1">Enter Code</h3>
            <p className="text-xs text-gray-400 mb-6">We've sent a 6-digit code to your phone.</p>
            
            <div className="flex gap-2 mb-6" onPaste={handlePaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  id={`otp-input-${i}`}
                  type="text"
                  maxLength="1"
                  value={digit}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className="w-10 h-12 text-center text-xl font-black border-2 border-gray-100 rounded-xl focus:border-accent focus:ring-4 focus:ring-accent/10 outline-none transition-all"
                />
              ))}
            </div>

            <button
              onClick={handleVerifyOTP}
              disabled={loading}
              className="w-full py-3 bg-accent text-white rounded-xl font-bold hover:bg-accent/90 transition-all flex items-center justify-center gap-2 mb-4"
            >
              {loading ? 'Verifying...' : 'Verify Number'}
            </button>

            <button
              onClick={handleSendOTP}
              disabled={timer > 0 || loading}
              className={`text-sm font-bold flex items-center gap-1 ${timer > 0 ? 'text-gray-300' : 'text-primary'}`}
            >
              <IconRefresh size={16} />
              {timer > 0 ? `Resend in ${timer}s` : 'Resend Code'}
            </button>
          </motion.div>
        )}

        {step === 'verified' && (
          <motion.div
            key="verified"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center text-center"
          >
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
              <IconCheck size={32} stroke={4} />
            </div>
            <h3 className="text-xl font-black text-green-700">✓ Phone number verified</h3>
            <p className="text-sm text-gray-500 mt-2">Your profile is now more trustworthy.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PhoneVerification;
