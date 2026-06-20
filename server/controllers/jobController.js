const User = require('../models/User');
const JobPost = require('../models/JobPost');
const AvailabilityPost = require('../models/AvailabilityPost');
const Application = require('../models/Application');
const Notification = require('../models/Notification');
const { getIO } = require('../socket');
const { ROLE_HIERARCHY, getTradeForRole } = require('../utils/roleHierarchy');
const { geocodeAddress } = require('../utils/geocoder');
const NOTIFICATION_TABS = require('../../shared/notificationConstants');

exports.createJob = async (req, res) => {
  try {
    const includeSundays = req.body.includeSundays === true || req.body.includeSundays === 'true';
    if (req.body.startDate && !includeSundays) {
      const startDateVal = new Date(req.body.startDate);
      if (!isNaN(startDateVal.getTime()) && startDateVal.getDay() === 0) {
        return res.status(400).json({ message: 'Job cannot start on a Sunday unless Sunday work is enabled.' });
      }
    }

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
        actionTab: NOTIFICATION_TABS.PROFESSIONAL_JOB_FEED
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
  const HiredWorker = require('../models/HiredWorker');
  const jobs = await JobPost.find({ contractorId: req.user.id })
    .populate('applicants.professionalId', 'name phone email jobRole yearsOfExperience locationPreference qualification about isServingNotice noticeStartDate noticeEndDate isTrustedProfessional averageRating totalReviews')
    .sort({ createdAt: -1 });

  // Map over applicants and append active notice status from HiredWorker dynamically
  const jobsWithStatus = await Promise.all(jobs.map(async (job) => {
    const jobObj = job.toObject();
    jobObj.applicants = await Promise.all(jobObj.applicants.map(async (applicant) => {
      if (applicant.professionalId) {
        const activeWorker = await HiredWorker.findOne({ 
          professionalId: applicant.professionalId._id,
          status: { $in: ['Active', 'ResignationPending', 'ResignationAccepted'] }
        });
        
        if (activeWorker) {
          applicant.professionalId.isEmployed = activeWorker.status === 'Active';
          applicant.professionalId.isServingNotice = ['ResignationPending', 'ResignationAccepted'].includes(activeWorker.status);
          if (applicant.professionalId.isServingNotice) {
            applicant.professionalId.noticeStartDate = activeWorker.resignationSubmittedDate;
            applicant.professionalId.noticeEndDate = activeWorker.lastWorkingDate;
          }
        }
      }
      return applicant;
    }));
    return jobObj;
  }));

  res.json(jobsWithStatus);
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
  try {
    const job = await JobPost.findOneAndDelete({ _id: req.params.id, contractorId: req.user.id });
    if (!job) return res.status(404).json({ message: 'Job not found' });

    // Find all applications for this job
    const apps = await Application.find({ jobPostId: req.params.id });

    // Update application status to 'Job Deleted' for all non-final statuses
    await Application.updateMany(
      { jobPostId: req.params.id, status: { $in: ['Applied', 'Viewed', 'Shortlisted', 'Hired'] } },
      { status: 'Job Deleted' }
    );

    const contractor = await User.findById(req.user.id);
    const contractorName = contractor.companyName || contractor.name;
    const io = getIO();

    for (const app of apps) {
      if (['Applied', 'Viewed', 'Shortlisted', 'Hired'].includes(app.status)) {
        // Create a notification for the professional
        const notification = new Notification({
          userId: app.professionalId,
          type: 'Job',
          title: 'Job Post Deleted',
          message: `The job post for "${job.jobRole}" that you applied to has been deleted by ${contractorName}.`,
          relatedId: job._id,
          actionTab: NOTIFICATION_TABS.PROFESSIONAL_MY_APPLICATIONS
        });
        await notification.save();

        if (io) {
          // Emit socket notifications
          io.to(`user:${app.professionalId}`).emit('notification', { notification });
          io.to(`user:${app.professionalId}`).emit('applicationStatusUpdate', {
            applicationId: app._id,
            newStatus: 'Job Deleted',
            jobPostId: job._id
          });
        }
      }
    }

    res.json({ message: 'Job deleted' });
  } catch (error) {
    console.error('deleteJob error:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.getApplicants = async (req, res) => {
  const HiredWorker = require('../models/HiredWorker');
  const job = await JobPost.findOne({ _id: req.params.id, contractorId: req.user.id })
    .populate('applicants.professionalId', 'name phone email jobRole yearsOfExperience locationPreference qualification about isServingNotice noticeStartDate noticeEndDate isTrustedProfessional averageRating totalReviews');
  if (!job) return res.status(404).json({ message: 'Job not found' });

  // Map over applicants and append active notice status
  const applicantsWithStatus = await Promise.all(job.applicants.map(async (applicant) => {
    const appObj = applicant.toObject();
      if (appObj.professionalId) {
        const activeWorker = await HiredWorker.findOne({ 
          professionalId: appObj.professionalId._id,
          status: { $in: ['Active', 'ResignationPending', 'ResignationAccepted'] }
        });
        
        if (activeWorker) {
          appObj.professionalId.isEmployed = activeWorker.status === 'Active';
          appObj.professionalId.isServingNotice = ['ResignationPending', 'ResignationAccepted'].includes(activeWorker.status);
          if (appObj.professionalId.isServingNotice) {
            appObj.professionalId.noticeStartDate = activeWorker.resignationSubmittedDate;
            appObj.professionalId.noticeEndDate = activeWorker.lastWorkingDate;
          }
        } else {
          appObj.professionalId.isEmployed = false;
          appObj.professionalId.isServingNotice = false;
        }
      }
    return appObj;
  }));

  const { status, sortBy = 'recent' } = req.query;
  let filtered = applicantsWithStatus;
  if (status && status !== 'all' && status !== 'All') {
    filtered = filtered.filter(a => a.status.toLowerCase() === status.toLowerCase());
  }

  switch (sortBy) {
    case 'experience_desc':
      filtered.sort((a, b) => (b.professionalId?.yearsOfExperience || 0) - (a.professionalId?.yearsOfExperience || 0));
      break;
    case 'experience_asc':
      filtered.sort((a, b) => (a.professionalId?.yearsOfExperience || 0) - (b.professionalId?.yearsOfExperience || 0));
      break;
    case 'rating_desc':
      filtered.sort((a, b) => (b.professionalId?.averageRating || 0) - (a.professionalId?.averageRating || 0));
      break;
    case 'recent':
    default:
      filtered.sort((a, b) => new Date(b.appliedAt || 0) - new Date(a.appliedAt || 0));
      break;
  }

  res.json(filtered);
};

exports.updateApplicantStatus = async (req, res) => {
  try {
    const { id, applicationId } = req.params;
    const { status } = req.body;

    const job = await JobPost.findOneAndUpdate(
      { _id: id, contractorId: req.user.id, 'applicants._id': applicationId },
      { $set: { 'applicants.$.status': status } },
      { returnDocument: 'after' }
    );

    if (!job) return res.status(404).json({ message: 'Job or application not found' });

    const applicant = job.applicants.find(a => a._id.toString() === applicationId);
    if (applicant) {
      // Sync with Application model
      const applicationDoc = await Application.findOne({ jobPostId: job._id, professionalId: applicant.professionalId });
      if (applicationDoc) {
        applicationDoc.status = status;
        await applicationDoc.save();
      }

      if (status === 'Shortlisted') {
        const User = require('../models/User');
        const Notification = require('../models/Notification');
        const NOTIFICATION_TABS = require('../../shared/notificationConstants');
        const { getIO } = require('../socket');

        const contractor = await User.findById(req.user.id);
        const notification = new Notification({
          userId: applicant.professionalId,
          type: 'Job',
          title: 'You have been Shortlisted',
          message: `${contractor.companyName || contractor.name} has shortlisted your application for ${job.jobRole}.`,
          relatedId: job._id,
          actionTab: NOTIFICATION_TABS.PROFESSIONAL_MY_APPLICATIONS
        });
        await notification.save();

        try {
          const io = getIO();
          if (io) {
            io.to(`user:${applicant.professionalId}`).emit('notification', { notification });
            io.to(`user:${applicant.professionalId}`).emit('applicationStatusUpdate', {
              applicationId: applicationDoc ? applicationDoc._id : null,
              newStatus: status,
              jobPostId: job._id
            });
          }
        } catch (err) { console.error('Socket err:', err); }
      }
    }

    res.json(job);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.hireProfessional = async (req, res) => {
  try {
    const { id, professionalId } = req.params;

    const job = await JobPost.findOne({ _id: id, contractorId: req.user.id });
    if (!job) return res.status(404).json({ message: 'Job not found' });

    const professional = await User.findById(professionalId);
    if (!professional) return res.status(404).json({ message: 'Professional not found' });

    if (professional.isServingNotice) {
      return res.status(400).json({ message: 'Cannot hire candidate. They are currently serving a notice period.' });
    }

    const HiredWorker = require('../models/HiredWorker');
    const activeWorker = await HiredWorker.findOne({
      professionalId,
      status: { $in: ['Active', 'ResignationPending', 'ResignationAccepted'] }
    });

    if (activeWorker) {
      return res.status(400).json({ message: 'Cannot hire candidate. They are currently employed or serving a notice period.' });
    }

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
      actionTab: NOTIFICATION_TABS.PROFESSIONAL_MY_APPLICATIONS
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
