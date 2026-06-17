const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  jobPostId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobPost', required: true },
  professionalId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  contractorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { 
    type: String, 
    enum: ['Applied', 'Viewed', 'Shortlisted', 'Hired', 'Rejected', 'Joined', 'Withdrawn', 'Position Filled', 'Resigned'], 
    default: 'Applied' 
  },
  appliedAt: { type: Date, default: Date.now },
  resignedAt: { type: Date, default: null },
  resignationReason: { type: String, default: null },
  jobSnapshot: {
    title: String,
    workLocation: String,
    salary: Number,
    salaryType: String,
    duration: String,
    facilities: String,
  },
  contractorSnapshot: {
    contractorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String,
    companyName: String,
    phone: String,
    email: String,
  }
});

module.exports = mongoose.model('Application', applicationSchema);
