const express = require('express');
const User = require('../models/User');
const OTP = require('../models/OTP');
const jwt = require('jsonwebtoken');
const { sendOTPEmail } = require('../utils/mailer');
const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { 
      name, email, password, phone, role, address,
      lat, lng, accuracy, displayName, city, state, country, pincode,
      companyName, yearsInBusiness, specialization,
      shopName, categories, gstNumber,
      jobRole, yearsOfExperience, qualification, locationPreference, about
    } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create location object if coords provided
    const location = (lat !== null && lng !== null) ? {
      type: 'Point',
      coordinates: [parseFloat(lng), parseFloat(lat)]
    } : undefined;

    const user = new User({
      name, email, password, phone, role, address,
      location,
      locationDetails: {
        displayName, city, state, country, pincode, 
        accuracy: accuracy ? parseFloat(accuracy) : undefined
      },
      companyName, 
      yearsInBusiness: yearsInBusiness ? parseInt(yearsInBusiness) : undefined, 
      specialization,
      shopName, categories, gstNumber,
      jobRole, 
      yearsOfExperience: yearsOfExperience ? parseInt(yearsOfExperience) : undefined, 
      qualification, locationPreference, about
    });

    console.log(`Attempting to register user: ${email} with role: ${role}`);
    await user.save();

    // Generate and send OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await OTP.deleteMany({ email });
    await new OTP({ email, otp }).save();
    
    try {
      await sendOTPEmail(email, otp, name);
      res.status(201).json({
        message: 'Registration successful! OTP sent to your email.',
        email: user.email
      });
    } catch (mailError) {
      console.error('Mail Send Error:', mailError);
      res.status(201).json({
        message: 'Registration successful but failed to send OTP. Please try resending from the verification screen.',
        email: user.email
      });
    }
  } catch (error) {
    console.error('CRITICAL SERVER ERROR:', error.stack || error);
    res.status(500).json({ 
      message: error.message || 'Server error during registration',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Verify Account (Post-Registration OTP)
router.post('/verify-account', async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const otpDoc = await OTP.findOne({ email, otp });
    if (!otpDoc) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Mark user as verified
    const user = await User.findOneAndUpdate({ email }, { isVerified: true }, { new: true });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Clean up used OTP
    await OTP.deleteMany({ email });

    // Issue Token
    const token = jwt.sign(
      { 
        id: user._id, 
        role: user.role,
        name: user.name,
        phoneVerified: user.phoneVerified,
        isVerified: user.isVerified
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phoneVerified: user.phoneVerified,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Verification error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate and send OTP for 2FA
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await OTP.deleteMany({ email });
    await new OTP({ email, otp }).save();
    
    try {
      await sendOTPEmail(email, otp, user.name);
      return res.status(200).json({ 
        requiresOTP: true, 
        message: 'Login verification code sent to your email.',
        email: user.email,
        name: user.name
      });
    } catch (mailError) {
      console.error('Login OTP Mail Error:', mailError);
      return res.status(500).json({ message: 'Failed to send verification code. Please try again.' });
    }
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: 'Login Error' });
  }
});

// Forgot Password - Step 1: Send OTP
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    console.log(`Password reset requested for: ${email}`);
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'No account found with this email address.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await OTP.deleteMany({ email });
    await new OTP({ email, otp }).save();

    try {
      await sendOTPEmail(email, otp, user.name);
      res.json({ requiresOTP: true, message: 'Password reset code sent to your email.' });
    } catch (mailError) {
      console.error('Forgot Password Mail Error:', mailError);
      res.status(500).json({ message: 'Failed to send reset code. Please try again later.' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Forgot Password - Step 2: Verify OTP
router.post('/verify-reset-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    const otpDoc = await OTP.findOne({ email, otp });

    if (!otpDoc) {
      return res.status(400).json({ message: 'Invalid or expired reset code.' });
    }

    await OTP.deleteMany({ email });
    res.json({ verified: true, message: 'Code verified successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Verification error' });
  }
});

// Forgot Password - Step 3: Reset Password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Hash is handled by the pre-save hook in User.js, but let's be explicit if needed
    // or just set and save.
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully. Please login with your new password.' });
  } catch (error) {
    console.error('Reset Password Error:', error);
    res.status(500).json({ message: 'Failed to reset password.' });
  }
});

// Get profile by ID
router.get('/profile/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -phoneOtp -phoneOtpExpiry');
    if (!user) return res.status(404).json({ message: 'Profile not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile' });
  }
});

// Get all contractors
router.get('/contractors', async (req, res) => {
  try {
    const contractors = await User.find({ role: 'contractor' })
      .select('name email phone role companyName specialization locationDetails isVerified phoneVerified createdAt')
      .sort({ phoneVerified: -1, createdAt: -1 });
    res.json(contractors);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching contractors' });
  }
});

module.exports = router;
