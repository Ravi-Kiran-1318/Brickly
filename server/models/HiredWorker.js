const mongoose = require('mongoose');

const hiredWorkerSchema = new mongoose.Schema({
  contractorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  professionalId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  jobPostId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobPost' },
  applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application' },
  directHireRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'DirectHireRequest' },
  jobRole: { type: String, required: true },
  salary: { type: Number },
  salaryType: { type: String },
  workLocation: { type: String },
  status: { type: String, enum: ['Active', 'Completed', 'Released', 'ResignationPending', 'ResignationAccepted', 'Resigned'], default: 'Active' },
  resignationReason: { type: String },
  additionalComments: { type: String },
  resignationSubmittedDate: { type: Date },
  lastWorkingDate: { type: Date },
  joinedAt: { type: Date, default: Date.now }
});

hiredWorkerSchema.index({ contractorId: 1, status: 1 });
hiredWorkerSchema.index({ professionalId: 1 });

module.exports = mongoose.model('HiredWorker', hiredWorkerSchema);
