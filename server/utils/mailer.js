const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  pool: true, // Use a pool of connections
  maxConnections: 5,
  maxMessages: 100,
  connectionTimeout: 10000, // 10 seconds
  greetingTimeout: 5000,
  socketTimeout: 30000,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendOTPEmail = async (toEmail, otp, userName) => {
  const mailOptions = {
    from: `"Brickly Verification" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Your Brickly Verification Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e1e8f0; border-radius: 10px; overflow: hidden;">
        <div style="background-color: #1E3A5F; color: #ffffff; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 800;">Brickly</h1>
        </div>
        <div style="padding: 30px; color: #0F172A;">
          <h2 style="margin-top: 0;">Hello, ${userName}!</h2>
          <p style="font-size: 16px; color: #64748B;">Please use the following 6-digit verification code to complete your registration or login.</p>
          <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-radius: 8px; margin: 30px 0;">
            <span style="font-size: 42px; font-weight: 800; color: #F97316; letter-spacing: 12px;">${otp}</span>
          </div>
          <p style="font-size: 14px; color: #64748B; margin-bottom: 5px;">This code <strong>expires in 10 minutes</strong>.</p>
          <p style="font-size: 14px; color: #ef4444;">For security reasons, do not share this code with anyone.</p>
        </div>
        <div style="background-color: #f8fafc; color: #94a3b8; padding: 15px; text-align: center; font-size: 12px; border-top: 1px solid #e1e8f0;">
          © 2025 Brickly Construction Marketplace. All rights reserved.
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`OTP email sent to ${toEmail}`);
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw new Error('Failed to send verification email');
  }
};

const sendMail = async ({ to, subject, html }) => {
  const mailOptions = {
    from: `"Brickly" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e1e8f0; border-radius: 10px; overflow: hidden;">
        <div style="background-color: #1E3A5F; color: #ffffff; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 800;">Brickly Marketplace</h1>
        </div>
        <div style="padding: 30px; color: #0F172A;">
          ${html}
        </div>
        <div style="background-color: #f8fafc; color: #94a3b8; padding: 15px; text-align: center; font-size: 12px; border-top: 1px solid #e1e8f0;">
          © 2026 Brickly Construction Marketplace. All rights reserved.
        </div>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

module.exports = { sendOTPEmail, sendMail };
