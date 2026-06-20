const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['customer', 'contractor', 'dealer', 'professional'], 
    required: true 
  },
  address: { type: String },
  
  // Location details from MapPicker
  location: {
    type: { type: String },
    coordinates: { type: [Number] } // [longitude, latitude]
  },
  locationDetails: {
    displayName: String,
    city: String,
    state: String,
    country: String,
    pincode: String,
    accuracy: Number
  },

  // Contractor specific
  companyName: { type: String },
  yearsInBusiness: { type: Number },
  specialization: { type: String },
  hiredProfessionals: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // Dealer specific
  shopName: { type: String },
  categories: [{ type: String }],
  gstNumber: { type: String },
  averageRating: { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 },
  averageProductQuality: { type: Number, default: 0 },
  averageDeliverySpeed: { type: Number, default: 0 },
  averageCommunication: { type: Number, default: 0 },

  // Professional specific
  jobRole: { type: String },
  yearsOfExperience: { type: Number },
  qualification: { type: String },
  locationPreference: { type: String },
  about: { type: String },

  // Tracking
  hiredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isAvailable: { type: Boolean, default: false },
  isVisible: { type: Boolean, default: false },
  visibilityUpdatedAt: { type: Date, default: null },
  availabilityStatus: { type: String, enum: ['Online', 'Offline'], default: 'Offline' },
  jobAlerts: { type: Boolean, default: true },
  pendingJobAlertEmails: [{ type: Object }],
  notificationPreferences: {
    jobDigestFrequency: { type: String, enum: ['daily', 'weekly', 'off'], default: 'daily' }
  },
  isVerified: { type: Boolean, default: false },
  phoneVerified: { type: Boolean, default: false },
  phoneOtp: { type: String },
  phoneOtpExpiry: { type: Date },
  
  // Resignation & Notice Period fields
  isServingNotice: { type: Boolean, default: false },
  noticeStartDate: { type: Date, default: null },
  noticeEndDate: { type: Date, default: null },
  currentContractorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  currentJobRole: { type: String, default: null },
  resignationReason: { type: String, default: null },
  isTrustedProfessional: { type: Boolean, default: false },
  trustedSince: { type: Date, default: null },

  createdAt: { type: Date, default: Date.now }
});

// Helper for contractor account deletion cascade
const handleContractorDeletion = async (contractorId) => {
  try {
    const HiredWorker = mongoose.model('HiredWorker');
    const Notification = mongoose.model('Notification');
    const DirectHireRequest = mongoose.model('DirectHireRequest');
    const JobPost = mongoose.model('JobPost');
    const Application = mongoose.model('Application');
    const { getIO } = require('../socket');
    let io;
    try {
      io = getIO();
    } catch (e) {
      console.warn('Socket not initialized yet during deletion:', e.message);
    }

    // 1. Find all active/pending HiredWorker records
    const activeWorkers = await HiredWorker.find({
      contractorId,
      status: { $in: ['Active', 'ResignationPending', 'ResignationAccepted'] }
    });

    for (const hw of activeWorkers) {
      hw.status = 'ContractorDeleted';
      await hw.save();

      const notif = new Notification({
        userId: hw.professionalId,
        title: 'Contractor Account Closed',
        message: 'The contractor you were working with has closed their account. Your employment record has been updated. You are now free to seek new opportunities.',
        type: 'General',
        actionTab: 'my-availability'
      });
      await notif.save();

      if (io) {
        io.to(`user:${hw.professionalId}`).emit('notification', { notification: notif });
      }
    }

    // 2. Direct hire requests to Cancelled
    const pendingRequests = await DirectHireRequest.find({
      contractorId,
      status: 'Pending'
    });

    for (const dhr of pendingRequests) {
      dhr.status = 'Cancelled';
      await dhr.save();

      const notif = new Notification({
        userId: dhr.professionalId,
        title: 'Direct Hire Request Cancelled',
        message: 'The contractor who sent you a direct hire request has closed their account.',
        type: 'General',
        actionTab: 'my-availability'
      });
      await notif.save();

      if (io) {
        io.to(`user:${dhr.professionalId}`).emit('notification', { notification: notif });
      }
    }

    // 3. JobPosts delete
    const jobs = await JobPost.find({ contractorId, status: 'Active' });
    for (const job of jobs) {
      await JobPost.findByIdAndDelete(job._id);
      if (io) {
        io.emit('jobPostDeleted', { jobPostId: job._id });
      }
    }

    // 4. Applications to Position Cancelled
    const apps = await Application.find({
      contractorId,
      status: { $in: ['Applied', 'Viewed', 'Shortlisted', 'Hired'] }
    });

    for (const app of apps) {
      app.status = 'Position Cancelled';
      await app.save();

      const notif = new Notification({
        userId: app.professionalId,
        title: 'Position Cancelled',
        message: 'A position you applied for has been cancelled because the contractor closed their account.',
        type: 'General',
        actionTab: 'my-applications'
      });
      await notif.save();

      if (io) {
        io.to(`user:${app.professionalId}`).emit('notification', { notification: notif });
      }
    }
  } catch (err) {
    console.error('Error in contractor deletion cascade:', err);
  }
};

// Hash password before saving
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

// Compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Cascade delete contractor data on User deletion
userSchema.pre('remove', async function(next) {
  if (this.role === 'contractor') {
    await handleContractorDeletion(this._id);
  }
  next();
});

userSchema.pre('deleteOne', { document: true, query: false }, async function(next) {
  if (this.role === 'contractor') {
    await handleContractorDeletion(this._id);
  }
  next();
});

userSchema.pre('findOneAndDelete', async function(next) {
  const query = this.getQuery();
  const user = await this.model.findOne(query);
  if (user && user.role === 'contractor') {
    await handleContractorDeletion(user._id);
  }
  next();
});

// Index for geo-spatial queries
userSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('User', userSchema);
