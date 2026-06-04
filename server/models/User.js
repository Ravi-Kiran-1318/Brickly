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

  // Dealer specific
  shopName: { type: String },
  categories: [{ type: String }],
  gstNumber: { type: String },

  // Professional specific
  jobRole: { type: String },
  yearsOfExperience: { type: Number },
  qualification: { type: String },
  locationPreference: { type: String },
  about: { type: String },

  // Tracking
  hiredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isVerified: { type: Boolean, default: false },
  phoneVerified: { type: Boolean, default: false },
  phoneOtp: { type: String },
  phoneOtpExpiry: { type: Date },
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

module.exports = mongoose.model('User', userSchema);
