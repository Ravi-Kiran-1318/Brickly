const mongoose = require('mongoose');

const dealSchema = new mongoose.Schema({
  dealerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  productName: { type: String, required: true },
  originalPrice: { type: Number, required: true },
  discountedPrice: { type: Number, required: true },
  minimumQuantity: { type: Number, required: true },
  validUntil: { type: Date, required: true },
  description: { type: String },
  viewCount: { type: Number, default: 0 },
  quoteRequestCount: { type: Number, default: 0 },
  scheduledStartDate: { type: Date },
  createdAt: { type: Date, default: Date.now },
  expireAt: { type: Date } // TTL Index field
});

// Set TTL index
dealSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Deal', dealSchema);
