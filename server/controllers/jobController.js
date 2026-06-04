const User = require('../models/User');
const JobPost = require('../models/JobPost');
const AvailabilityPost = require('../models/AvailabilityPost');
const Notification = require('../models/Notification');
const { getIO } = require('../socket');
// const { sendEmail } = require('../utils/mailer'); // Assuming mailer exists

exports.createJob = async (req, res) => {
  const job = new JobPost({
    ...req.body,
    contractorId: req.user.id
  });
  await job.save();
  res.status(201).json(job);
};

exports.getMyJobs = async (req, res) => {
  const jobs = await JobPost.find({ contractorId: req.user.id }).sort({ createdAt: -1 });
  res.json(jobs);
};

exports.updateJob = async (req, res) => {
  const job = await JobPost.findOneAndUpdate(
    { _id: req.params.id, contractorId: req.user.id },
    { $set: req.body },
    { returnDocument: 'after' }
  );
  if (!job) return res.status(404).json({ message: 'Job not found' });
  res.json(job);
};

exports.deleteJob = async (req, res) => {
  const job = await JobPost.findOneAndDelete({ _id: req.params.id, contractorId: req.user.id });
  if (!job) return res.status(404).json({ message: 'Job not found' });
  res.json({ message: 'Job deleted' });
};

exports.getApplicants = async (req, res) => {
  const job = await JobPost.findOne({ _id: req.params.id, contractorId: req.user.id })
    .populate('applicants.professionalId', 'name phone email jobRole yearsOfExperience');
  if (!job) return res.status(404).json({ message: 'Job not found' });
  res.json(job.applicants);
};

exports.updateApplicantStatus = async (req, res) => {
  const { id, applicationId } = req.params;
  const { status } = req.body;

  const job = await JobPost.findOneAndUpdate(
    { _id: id, contractorId: req.user.id, 'applicants._id': applicationId },
    { $set: { 'applicants.$.status': status } },
    { returnDocument: 'after' }
  );

  if (!job) return res.status(404).json({ message: 'Job or application not found' });
  res.json(job);
};

exports.hireProfessional = async (req, res) => {
  const { id, professionalId } = req.params;

  const job = await JobPost.findOne({ _id: id, contractorId: req.user.id });
  if (!job) return res.status(404).json({ message: 'Job not found' });

  // 1. Update job status
  job.isFilled = true;
  await job.save();

  // 2. Update professional's hired status and link to contractor
  await User.findByIdAndUpdate(professionalId, { hiredBy: req.user.id });
  await AvailabilityPost.deleteOne({ professionalId });

  // 3. Create Notification
  const notification = new Notification({
    userId: professionalId,
    type: 'Hire',
    title: 'You are Hired!',
    message: `A contractor has hired you for the role of ${job.jobRole}.`,
    relatedId: job._id
  });
  await notification.save();

  // 4. Socket event
  try {
    getIO().to(professionalId.toString()).emit('professional:hired', {
      jobRole: job.jobRole,
      title: 'You are Hired!'
    });
  } catch (err) { console.error('Socket error:', err); }

  // 5. Send Email (Placeholder check if mailer exists)
  // await sendEmail(...)

  res.json({ message: 'Professional hired successfully' });
};
