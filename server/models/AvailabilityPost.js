const mongoose = require('mongoose');

const availabilityPostSchema = new mongoose.Schema({
  professionalId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  jobRole: { type: String, required: true },
  yearsOfExperience: { type: Number, required: true },
  expectedSalary: { type: String, required: true },
  availableFrom: { type: Date, required: true },
  locationPreference: { type: String, required: true },
  skillTags: [{ type: String }],
  resumeUrl: { type: String },
  certificateUrls: [{ type: String }],
  isHired: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AvailabilityPost', availabilityPostSchema);
