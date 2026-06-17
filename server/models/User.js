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
    type: { type: String, default: 'Point' },
    coordinates: { type: [Number], index: '2dsphere' } // [longitude, latitude]
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
  jobAlerts: { type: Boolean, default: true },
  pendingJobAlertEmails: [{ type: Object }],
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

  createdAt: { type: Date, default: Date.now }
});

// Hash password before saving
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

// Compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Index for geo-spatial queries
userSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('User', userSchema);
