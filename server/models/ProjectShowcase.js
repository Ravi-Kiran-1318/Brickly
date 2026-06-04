const mongoose = require('mongoose');

const projectShowcaseSchema = new mongoose.Schema({
  contractorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  projectType: { 
    type: String, 
    enum: ['House', 'Villa', 'Mall', 'Apartment', 'Other'], 
    required: true 
  },
  images: [{ type: String }], // Cloudinary URLs
  description: { type: String, required: true },
  duration: { type: String },
  location: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ProjectShowcase', projectShowcaseSchema);
