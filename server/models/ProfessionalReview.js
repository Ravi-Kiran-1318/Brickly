const mongoose = require('mongoose');

const professionalReviewSchema = new mongoose.Schema({
  contractorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  professionalId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  title: { type: String, required: true, maxlength: 100 },
  comment: { type: String, required: true, maxlength: 1000 },
  
  // Professional reply
  reply: { type: String, maxlength: 500 },
  repliedAt: { type: Date },

  // Reporting
  isReported: { type: Boolean, default: false },
  reportReason: { type: String },
  reportedAt: { type: Date },

  createdAt: { type: Date, default: Date.now }
});

// Unique index: one review per contractor per professional
professionalReviewSchema.index({ contractorId: 1, professionalId: 1 }, { unique: true });
professionalReviewSchema.index({ professionalId: 1, createdAt: -1 });

module.exports = mongoose.model('ProfessionalReview', professionalReviewSchema);
