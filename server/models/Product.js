const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  dealerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  category: { type: String, required: true },
  brand: { type: String },
  unit: { type: String, required: true }, // e.g. bags, tons, sqft
  pricePerUnit: { type: Number, required: true },
  minimumOrderQuantity: { type: Number, default: 1 },
  inStock: { type: Boolean, default: true },
  imageUrl: { type: String },
  description: { type: String },
  size: { type: String },
  stockQuantity: { type: Number },
  lowStockThreshold: { type: Number, default: 10 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Product', productSchema);
