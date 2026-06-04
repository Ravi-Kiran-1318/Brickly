const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  jobPostId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobPost', required: true },
  professionalId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  contractorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { 
    type: String, 
    enum: ['Applied', 'Viewed', 'Shortlisted', 'Hired', 'Rejected'], 
    default: 'Applied' 
  },
  appliedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Application', applicationSchema);
