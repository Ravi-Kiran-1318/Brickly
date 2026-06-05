const mongoose = require('mongoose');

const dealerReviewSchema = new mongoose.Schema({
  contractorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  dealerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
  productQualityRating: { type: Number, required: true, min: 1, max: 5 },
  deliverySpeedRating: { type: Number, required: true, min: 1, max: 5 },
  communicationRating: { type: Number, required: true, min: 1, max: 5 },
  overallRating: { type: Number, required: true },
  reviewText: { type: String, required: true },
  isVerified: { type: Boolean, default: true },
  dealerReply: { type: String },
  dealerRepliedAt: { type: Date },
  reviewDeadline: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('DealerReview', dealerReviewSchema);
