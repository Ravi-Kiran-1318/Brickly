const mongoose = require('mongoose');

const hiredWorkerSchema = new mongoose.Schema({
  contractorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  professionalId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  jobPostId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobPost', required: true },
  applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true },
  jobRole: { type: String, required: true },
  salary: { type: Number },
  salaryType: { type: String },
  workLocation: { type: String },
  status: { type: String, enum: ['Active', 'Completed', 'Released'], default: 'Active' },
  joinedAt: { type: Date, default: Date.now }
});

hiredWorkerSchema.index({ contractorId: 1, status: 1 });
hiredWorkerSchema.index({ professionalId: 1 });

module.exports = mongoose.model('HiredWorker', hiredWorkerSchema);
