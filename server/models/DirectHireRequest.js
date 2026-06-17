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
    enum: ['Pending', 'Joined', 'Rejected', 'Resigned'], 
    default: 'Pending' 
  },
  rejectionReason: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('DirectHireRequest', directHireRequestSchema);
