const axios = require('axios');

/**
 * Simplified MSG91 OTP integration.
 * Set MSG91_AUTH_KEY in .env.
 */

// LOCAL DEVELOPMENT MODE TOGGLE
const IS_DEV = true; 

const sendOTPviaMSG91 = async (phone, otp) => {
  if (IS_DEV) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`[DEV OTP] Phone: ${phone} -> Code: ${otp}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    return { success: true };
  }

  try {
    const mobile = phone.startsWith('91') ? phone : `91${phone}`;
    
    await axios.get('https://api.msg91.com/api/v5/otp', {
      params: {
        authkey: process.env.MSG91_AUTH_KEY,
        mobile,
        otp,
        otp_expiry: 10, // 10 minutes
        otp_length: 6,
      },
    });

    return { success: true };
  } catch (err) {
    console.error('MSG91 send error:', err?.response?.data || err.message);
    return {
      success: false,
      error: err.message
    };
  }
};

const verifyOTPviaMSG91 = async (phone, otp) => {
  if (IS_DEV) {
    return { success: true };
  }

  try {
    const mobile = phone.startsWith('91') ? phone : `91${phone}`;

    const res = await axios.get('https://api.msg91.com/api/v5/otp/verify', {
      params: {
        authkey: process.env.MSG91_AUTH_KEY,
        mobile,
        otp,
      },
    });

    if (res.data?.type === 'success') {
      return { success: true };
    }

    return {
      success: false,
      message: res.data?.message || 'OTP mismatch'
    };
  } catch (err) {
    console.error('MSG91 verify error:', err?.response?.data || err.message);
    return {
      success: false,
      error: err.message
    };
  }
};

module.exports = {
  sendOTPviaMSG91,
  verifyOTPviaMSG91
};
