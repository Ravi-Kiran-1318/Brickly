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
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('JobPost', jobPostSchema);
