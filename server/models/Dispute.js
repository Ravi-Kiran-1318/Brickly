const mongoose = require('mongoose');

const disputeSchema = new mongoose.Schema({
  initiatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  hiredWorkerId: { type: mongoose.Schema.Types.ObjectId, ref: 'HiredWorker', required: true },
  
  category: { 
    type: String, 
    enum: ['unpaid_wages', 'unsafe_site', 'abandonment', 'misconduct', 'property_damage', 'other'], 
    required: true 
  },
  description: { type: String, required: true },
  evidenceUrl: { type: String }, // Optional file attachment URL
  status: { 
    type: String, 
    enum: ['open', 'under_review', 'resolved'], 
    default: 'open' 
  }
}, { timestamps: true });

module.exports = mongoose.model('Dispute', disputeSchema);
