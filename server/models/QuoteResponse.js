const mongoose = require('mongoose');

const quoteResponseSchema = new mongoose.Schema({
  quoteRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'QuoteRequest', required: true },
  dealerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  contractorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  customPrice: { type: Number, required: true },
  products: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    productName: { type: String },
    productImage: { type: String },
    quantity: { type: Number },
    unit: { type: String },
    pricePerUnit: { type: Number },
    subTotal: { type: Number }
  }],
  deliveryTimeline: { type: String },
  quoteExpiryDate: { type: Date },
  message: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('QuoteResponse', quoteResponseSchema);
