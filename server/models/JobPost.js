const mongoose = require('mongoose');

const jobPostSchema = new mongoose.Schema({
  contractorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  jobRole: { type: String, required: true },
  requiredSkills: [{ type: String }],
  workLocation: { type: String, required: true },
  salary: { type: Number, required: true },
  salaryType: { type: String, enum: ['monthly', 'contract'], required: true },
  duration: { type: String, required: true },
  facilities: { type: String },
  applicants: [{
    professionalId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { 
      type: String, 
      enum: ['Applied', 'Reviewed', 'Shortlisted', 'Hired', 'Rejected'], 
      default: 'Applied' 
    },
    appliedAt: { type: Date, default: Date.now }
  }],
  isFilled: { type: Boolean, default: false },
  status: { type: String, enum: ['Active', 'Filled', 'Expired'], default: 'Active' },
  filledAt: { type: Date },
  workSiteLocation: {
    type: { type: String, default: 'Point' },
    coordinates: { type: [Number], index: '2dsphere' } // [longitude, latitude]
  },
  createdAt: { type: Date, default: Date.now }
});

jobPostSchema.index({ workSiteLocation: '2dsphere' });

module.exports = mongoose.model('JobPost', jobPostSchema);
