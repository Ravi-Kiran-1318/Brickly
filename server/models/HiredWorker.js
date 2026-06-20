const mongoose = require('mongoose');

const hiredWorkerSchema = new mongoose.Schema({
  contractorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  professionalId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  jobPostId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobPost' },
  applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application' },
  directHireRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'DirectHireRequest' },
  
  hireSource: { 
    type: String, 
    enum: ['job_post', 'direct_hire'], 
    required: true, 
    default: 'job_post' 
  },
  jobRole: { type: String, required: true },
  salary: { type: Number },
  salaryType: { type: String, enum: ['monthly', 'project_based'] },
  duration: { type: String },
  startDate: { type: Date, required: true, default: Date.now },
  endDate: { type: Date },
  
  workLocation: { type: String },
  workSiteLocationCoords: {
    type: { type: String },
    coordinates: { type: [Number] }
  },
  status: { type: String, enum: ['Active', 'Completed', 'Released', 'ResignationPending', 'ResignationAccepted', 'Resigned'], default: 'Active' },
  resignationReason: { type: String },
  additionalComments: { type: String },
  resignationSubmittedDate: { type: Date },
  lastWorkingDate: { type: Date },
  noticePeriodDays: { type: Number, default: 7, min: 0, max: 30 },
  isCrewHire: { type: Boolean, default: false },
  crewDetails: [{
    name: { type: String },
    role: { type: String },
    yearsOfExperience: { type: Number }
  }],
  crewSize: { type: Number, default: 1 },
  joinedAt: { type: Date, default: Date.now }
});

hiredWorkerSchema.index({ contractorId: 1, status: 1 });
hiredWorkerSchema.index({ professionalId: 1 });
hiredWorkerSchema.index({ workSiteLocationCoords: '2dsphere' });

module.exports = mongoose.model('HiredWorker', hiredWorkerSchema);
