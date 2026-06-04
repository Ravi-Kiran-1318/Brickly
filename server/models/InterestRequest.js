const mongoose = require('mongoose');

const interestRequestSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  contractorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  projectType: { type: String, required: true },
  customerName: { type: String, required: true },
  customerMobile: { type: String, required: true },
  customerAddress: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['Interested', 'Viewed', 'Responded'], 
    default: 'Interested' 
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('InterestRequest', interestRequestSchema);
