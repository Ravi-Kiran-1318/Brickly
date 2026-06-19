const mongoose = require('mongoose');

const retentionOfferSchema = new mongoose.Schema({
  hiredWorkerId:  { type: mongoose.Schema.Types.ObjectId, ref: 'HiredWorker', required: true },
  contractorId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  professionalId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  offerType: {
    type: String,
    enum: ['salary_raise', 'role_change', 'site_change', 'custom'],
    required: true,
  },
  newSalary: { type: Number },
  newRole:   { type: String },
  newSite:   { type: String },
  message:   { type: String, maxlength: 500 },

  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'expired'],
    default: 'pending',
  },
}, { timestamps: true });

module.exports = mongoose.model('RetentionOffer', retentionOfferSchema);
