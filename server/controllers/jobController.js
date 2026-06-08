const User = require('../models/User');
const JobPost = require('../models/JobPost');
const AvailabilityPost = require('../models/AvailabilityPost');
const Application = require('../models/Application');
const Notification = require('../models/Notification');
const { getIO } = require('../socket');
const { ROLE_HIERARCHY, getTradeForRole } = require('../utils/roleHierarchy');
const { geocodeAddress } = require('../utils/geocoder');

exports.createJob = async (req, res) => {
  try {
    let workSiteLocation = null;
    if (req.body.workLocation) {
      workSiteLocation = await geocodeAddress(req.body.workLocation);
    }

    const job = new JobPost({
      ...req.body,
      contractorId: req.user.id,
      workSiteLocation
    });
    await job.save();

    // Determine trade group for the posted job role
    const tradeGroup = getTradeForRole(job.jobRole);

    let matchingProfessionals = [];
    
    if (tradeGroup) {
      // Find all valid roles for this trade
      const validRoles = ROLE_HIERARCHY[tradeGroup];
      
      // Find professionals whose jobRole is in validRoles AND who have jobAlerts enabled
      matchingProfessionals = await User.find({
        role: 'professional',
        jobRole: { $in: validRoles },
        jobAlerts: { $ne: false } // match true or where it doesn't exist
      });
    }

    const io = getIO();
    const contractor = await User.findById(req.user.id);

    const jobSummary = {
      jobId: job._id,
      jobRole: job.jobRole,
      salary: job.salary || 'Not specified',
      workLocation: job.workLocation,
      contractorName: contractor.companyName || contractor.name,
      postedAt: new Date()
    };

    for (const prof of matchingProfessionals) {
      // 1. Save Notification
      const notification = new Notification({
        userId: prof._id,
        type: 'Job',
        title: 'New Job Available',
        message: `${contractor.companyName || contractor.name} has posted a new job for your trade. Role: ${job.jobRole}, Salary: ${jobSummary.salary}, Location: ${job.workLocation}.`,
        relatedId: job._id,
        actionTab: 'job-feed'
      });
      await notification.save();

      // 2. Emit Socket event
      if (io) {
        io.to(`user:${prof._id}`).emit('notification', {
          notification
        });
      }

      // 3. Push to pendingJobAlertEmails array
      await User.findByIdAndUpdate(prof._id, {
        $push: { pendingJobAlertEmails: jobSummary }
      });
    }

    res.status(201).json(job);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMyJobs = async (req, res) => {
  const jobs = await JobPost.find({ contractorId: req.user.id })
    .populate('applicants.professionalId', 'name phone email jobRole yearsOfExperience locationPreference qualification about')
    .sort({ createdAt: -1 });
  res.json(jobs);
};

exports.updateJob = async (req, res) => {
  const updates = { ...req.body };
  if (updates.workLocation) {
    updates.workSiteLocation = await geocodeAddress(updates.workLocation);
  }

  const job = await JobPost.findOneAndUpdate(
    { _id: req.params.id, contractorId: req.user.id },
    { $set: updates },
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
    .populate('applicants.professionalId', 'name phone email jobRole yearsOfExperience locationPreference qualification about');
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
  try {
    const { id, professionalId } = req.params;

    const job = await JobPost.findOne({ _id: id, contractorId: req.user.id });
    if (!job) return res.status(404).json({ message: 'Job not found' });

    // 1. Update application status to Hired
    const application = await Application.findOne({ jobPostId: job._id, professionalId });
    if (application) {
      console.log('Application before update:', application.status);
      application.status = 'Hired';
      await application.save();
      console.log('Application after update:', application.status);
    } else {
      console.log('WARNING: No application found for jobPostId:', job._id, 'professionalId:', professionalId);
    }

    // 2. Also update the applicant status inside the JobPost's embedded applicants array
    const applicantEntry = job.applicants.find(a => a.professionalId?.toString() === professionalId);
    if (applicantEntry) {
      applicantEntry.status = 'Hired';
      await job.save();
    }

    // 3. Update professional's hired status and clean up availability
    await User.findByIdAndUpdate(professionalId, { hiredBy: req.user.id });
    await AvailabilityPost.deleteOne({ professionalId });

    // 4. Create Notification
    const contractor = await User.findById(req.user.id);
    const notification = new Notification({
      userId: professionalId,
      type: 'Job',
      title: 'You Have Been Hired',
      message: `${contractor.companyName || contractor.name} has hired you for the ${job.jobRole} position.`,
      relatedId: job._id,
      actionTab: 'Applications'
    });
    await notification.save();

    // 5. Socket events — real-time update
    try {
      const io = getIO();
      io.to(`user:${professionalId}`).emit('notification', { notification });

      if (application) {
        io.to(`user:${professionalId}`).emit('applicationStatusUpdate', {
          applicationId: application._id,
          newStatus: 'Hired',
          jobPostId: job._id
        });
      }

      io.to(`user:${professionalId}`).emit('professional:hired', {
        jobRole: job.jobRole,
        title: 'You Have Been Hired'
      });
    } catch (socketErr) { console.error('Socket error:', socketErr); }

    // 6. Send Email
    try {
      const { sendMail } = require('../utils/mailer');
      const profUser = await User.findById(professionalId);
      if (profUser && profUser.email) {
        await sendMail({
          to: profUser.email,
          subject: 'You Have Been Hired on BuildR',
          html: `
            <h2>Congratulations!</h2>
            <p><strong>${contractor.companyName || contractor.name}</strong> has hired you.</p>
            <p><strong>Role:</strong> ${job.jobRole}</p>
            <p><strong>Location:</strong> ${job.workLocation}</p>
            <p><strong>Salary:</strong> ₹${job.salary}</p>
            <br>
            <p>Please log in to BuildR and go to your Applications tab to confirm your joining.</p>
          `
        });
      }
    } catch (emailErr) { console.error('Email send error:', emailErr); }

    res.json({ message: 'Professional hired successfully', application });
  } catch (error) {
    console.error('hireProfessional error:', error);
    res.status(500).json({ message: error.message });
  }
};
