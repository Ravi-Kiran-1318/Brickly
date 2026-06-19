const mongoose = require('mongoose');

const directHireRequestSchema = new mongoose.Schema({
  contractorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  professionalId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  jobPostId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobPost', default: null },
  jobRole: { type: String, required: true },
  workSiteLocation: { type: String },
  salary: { type: String },
  duration: { type: String },
  status: { 
    type: String, 
    enum: ['Pending', 'Joined', 'Rejected', 'Resigned', 'Position Filled', 'Cancelled'], 
    default: 'Pending' 
  },
  rejectionReason: { type: String, default: '' },
  attemptNumber: { type: Number, default: 1 },
  rejectedAt: { type: Date },
  noticePeriodDays: { type: Number, default: 7, min: 0, max: 30 }
}, {
  timestamps: true
});

module.exports = mongoose.model('DirectHireRequest', directHireRequestSchema);
