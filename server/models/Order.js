const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  quoteRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'QuoteRequest' },
  contractorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  dealerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  products: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    productName: String,
    productImage: String,
    quantity: Number,
    unit: String,
    pricePerUnit: Number,
    subTotal: Number
  }],
  totalAmount: { type: Number, required: true },
  deliveryAddress: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['Pending', 'Confirmed', 'Dispatched', 'Delivered'], 
    default: 'Pending' 
  },
  expectedDeliveryDate: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);
