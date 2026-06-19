require('dotenv').config();
const { webcrypto } = require('crypto');
global.crypto = webcrypto;
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const { initSocket } = require('./socket');

const authRoutes = require('./routes/auth');
const otpRoutes = require('./routes/otp');
const contractorRoutes = require('./routes/contractor');
const publicRoutes = require('./routes/public');
const contractRoutes = require('./routes/contract');
const reviewRoutes = require('./routes/reviewRoutes');
const dealerRoutes = require('./routes/dealer');
const professionalRoutes = require('./routes/professional');
const disputeRoutes = require('./routes/disputes');

const app = express();
const httpServer = http.createServer(app);

// ── CORS ──────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.CLIENT_URL,
].filter(Boolean);

console.log('Allowed CORS origins:', allowedOrigins);

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return cb(null, true);
    
    // Check if the origin matches our allowed list or is any localhost port (for dev convenience)
    const isAllowed = allowedOrigins.includes(origin) || origin.startsWith('http://localhost:');
    
    if (isAllowed) {
      cb(null, origin); // Reflect the actual request origin explicitly
    } else {
      console.warn(`[CORS] Blocked request from: ${origin}`);
      cb(new Error(`CORS blocked: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma'],
  maxAge: 0 // Disable preflight caching to prevent stale CORS headers across sessions
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ── Request Logger ───────────────────────────
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url} - Origin: ${req.get('origin') || 'Unknown'}`);
  next();
});

// Prevent API caching
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// ── Init Socket.io ────────────────────────────
const io = initSocket(httpServer);
app.set('io', io); // available in routes via req.app.get('io')

// ── Routes ────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/otp', otpRoutes);
app.use('/api/contractor', contractorRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/dealer', dealerRoutes);
app.use('/api/professional', professionalRoutes);
app.use('/api/disputes', disputeRoutes);

// ── Database Connection ──────────────────────
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
})
  .then(async () => {
    console.log('Connected to MongoDB Successfully');
    try {
      const User = require('./models/User');
      await User.createIndexes();
      console.log('User model indexes built successfully');
    } catch (err) {
      console.error('Failed to build User model indexes:', err.message);
    }
  })
  .catch((err) => {
    console.error('❌ MongoDB Connection Error:', err.message);
  });

// ── Global Error Handler ──────────────────────
app.use((err, req, res, next) => {
  console.error('GLOBAL ERROR:', err.stack || err);
  res.status(500).json({ 
    message: 'Internal Server Error (Global Handler)',
    error: err.message
  });
});

const { initCronJobs } = require('./cron');
initCronJobs();

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
