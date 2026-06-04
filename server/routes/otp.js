const express = require('express');
const router = express.Router();
const User = require('../models/User');
const OTP = require('../models/OTP'); // For Email OTP
const jwt = require('jsonwebtoken');
const { auth } = require('../middleware/auth');
const { generateOTP } = require('../utils/otpUtils');
const { sendOTPviaMSG91, verifyOTPviaMSG91 } = require('../utils/sendSMS');
const { sendOTPEmail } = require('../utils/mailer');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EMAIL OTP ROUTES (Existing compatibility)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.post('/send-otp', async (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });
    const otp = generateOTP();
    await OTP.deleteMany({ email });
    await new OTP({ email, otp }).save();
    await sendOTPEmail(email, otp, name || 'User');
    res.status(200).json({ message: 'OTP sent successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send OTP' });
  }
});

router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: 'Email and OTP required' });
    const otpDoc = await OTP.findOne({ email, otp });
    if (!otpDoc) return res.status(400).json({ message: 'Invalid or expired OTP' });
    await OTP.deleteMany({ email });
    res.status(200).json({ verified: true, message: 'OTP verified successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PHONE OTP ROUTES (New MSG91 Integration)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// @route   POST /api/otp/send
router.post('/send', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user.phoneVerified) {
      return res.status(400).json({ message: 'Phone already verified' });
    }

    const otp = generateOTP();
    const expiry = new Date(Date.now() + 10 * 60000);

    user.phoneOtp = otp;
    user.phoneOtpExpiry = expiry;
    await user.save();

    await sendOTPviaMSG91(user.phone, otp);

    res.json({ success: true, message: 'OTP sent to your phone' });
  } catch (error) {
    console.error('Phone OTP Send Error:', error);
    res.status(500).json({ message: 'Failed to send SMS' });
  }
});

// @route   POST /api/otp/verify
router.post('/verify', auth, async (req, res) => {
  try {
    const { otp } = req.body;
    const user = await User.findById(req.user._id);

    if (user.phoneVerified) {
      return res.status(400).json({ message: 'Phone already verified' });
    }

    if (!user.phoneOtp || !user.phoneOtpExpiry || user.phoneOtpExpiry < Date.now()) {
      return res.status(400).json({ message: 'OTP expired or not sent' });
    }

    // Verify
    const smsRes = await verifyOTPviaMSG91(user.phone, otp);
    if (!smsRes.success && user.phoneOtp !== otp) {
      return res.status(400).json({ message: smsRes.message || 'OTP mismatch' });
    }

    user.phoneVerified = true;
    user.phoneOtp = undefined;
    user.phoneOtpExpiry = undefined;
    await user.save();

    // Re-issue JWT with phoneVerified: true
    const token = jwt.sign(
      { 
        id: user._id, 
        role: user.role, 
        name: user.name,
        phoneVerified: true 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      phoneVerified: true,
      token
    });
  } catch (error) {
    console.error('Phone OTP Verify Error:', error);
    res.status(500).json({ message: 'Verification error' });
  }
});

// @route   POST /api/otp/resend
router.post('/resend', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user.phoneVerified) {
      return res.status(400).json({ message: 'Phone already verified' });
    }

    const otp = generateOTP();
    user.phoneOtp = otp;
    user.phoneOtpExpiry = new Date(Date.now() + 10 * 60000);
    await user.save();

    await sendOTPviaMSG91(user.phone, otp);
    res.json({ success: true, message: 'OTP resent successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to resend OTP' });
  }
});

module.exports = router;
