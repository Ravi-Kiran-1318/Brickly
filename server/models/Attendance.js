const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  hiredWorkerId:  { type: mongoose.Schema.Types.ObjectId, ref: 'HiredWorker', required: true },
  contractorId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  professionalId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  date:      { type: String, required: true },  // 'YYYY-MM-DD'
  checkInAt: { type: Date },
  status:    { type: String, enum: ['present', 'absent'], default: 'present' },
  notes:     String,
}, { timestamps: true });

attendanceSchema.index({ hiredWorkerId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
