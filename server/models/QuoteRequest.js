const mongoose = require('mongoose');

const quoteRequestSchema = new mongoose.Schema({
  contractorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  dealerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  products: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    productName: String,
    quantity: Number,
    unit: String
  }],
  deliveryAddress: { type: String, required: true },
  projectTimeline: { type: String },
  message: { type: String },
  status: { 
    type: String, 
    enum: ['Sent', 'Viewed', 'Responded', 'Accepted', 'Rejected'], 
    default: 'Sent' 
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('QuoteRequest', quoteRequestSchema);
