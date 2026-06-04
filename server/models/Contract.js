const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema({
  title: { type: String, required: true },
  category: { type: String }, // e.g. Plumbing, Wiring, Painting
  description: { type: String },
  targetDate: { type: Date, required: true },
  status: { 
    type: String, 
    enum: ['Pending', 'In Progress', 'Done'], 
    default: 'Pending' 
  }
});

const contractSchema = new mongoose.Schema({
  contractorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  customerName: { type: String, required: true },
  projectType: { type: String, required: true },
  startDate: { type: Date, required: true },
  estimatedEndDate: { type: Date, required: true },
  actualEndDate: { type: Date },
  milestones: [milestoneSchema],
  progressPercent: { type: Number, default: 0 },
  status: { 
    type: String, 
    enum: ['Active', 'Completed', 'Cancelled'], 
    default: 'Active' 
  },
  createdAt: { type: Date, default: Date.now }
});

// Auto-compute progressPercent before saving
contractSchema.pre('save', function(next) {
  if (this.milestones && this.milestones.length > 0) {
    const doneCount = this.milestones.filter(m => m.status === 'Done').length;
    this.progressPercent = Math.round((doneCount / this.milestones.length) * 100);
  }
  next();
});

module.exports = mongoose.model('Contract', contractSchema);
