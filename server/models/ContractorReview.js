const mongoose = require('mongoose');

const contractorReviewSchema = new mongoose.Schema({
  professionalId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  contractorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  jobPostId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobPost' },
  hiredWorkerId: { type: mongoose.Schema.Types.ObjectId, ref: 'HiredWorker' },
  rating: { type: Number, required: true, min: 1, max: 5 },
  review: { type: String, required: true, minlength: 20, maxlength: 500 },
  contractorReply: { type: String, default: '' },
  isReported: { type: Boolean, default: false },
  reportReason: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// A professional can only leave one review per contractor per job engagement
contractorReviewSchema.index({ professionalId: 1, contractorId: 1, hiredWorkerId: 1 }, { unique: true });
contractorReviewSchema.index({ contractorId: 1, createdAt: -1 });

module.exports = mongoose.model('ContractorReview', contractorReviewSchema);
