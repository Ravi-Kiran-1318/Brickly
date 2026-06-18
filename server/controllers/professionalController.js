const User = require('../models/User');
const JobPost = require('../models/JobPost');
const AvailabilityPost = require('../models/AvailabilityPost');
const Application = require('../models/Application');
const Notification = require('../models/Notification');
const { sendMail } = require('../utils/mailer');
const { getIO } = require('../socket');
const { ROLE_HIERARCHY, getTradeForRole } = require('../utils/roleHierarchy');
const HiredWorker = require('../models/HiredWorker');
const DirectHireRequest = require('../models/DirectHireRequest');
const NOTIFICATION_TABS = require('../../shared/notificationConstants');



// --- Profile ---
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const updates = req.body;
    delete updates.role;
    delete updates.email;
    delete updates.password;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { returnDocument: 'after', runValidators: true }
    ).select('-password');

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getStats = async (req, res) => {
  try {
    const [totalApplied, availabilityPost, hiredCount, unreadNotifications] = await Promise.all([
      Application.countDocuments({ professionalId: req.user.id }),
      AvailabilityPost.findOne({ professionalId: req.user.id }),
      Application.countDocuments({ professionalId: req.user.id, status: 'Hired' }),
      Notification.countDocuments({ userId: req.user.id, isRead: false })
    ]);

    res.json({
      totalApplied,
      hasAvailabilityPost: !!availabilityPost,
      hiredCount,
      unreadNotifications
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getWorkingStatus = async (req, res) => {
  try {
    const hiredWorker = await HiredWorker.findOne({
      professionalId: req.user.id,
      status: { $in: ['Active', 'ResignationPending', 'ResignationAccepted'] }
    }).populate('contractorId');

    if (!hiredWorker) {
      return res.json({
        isWorking: false,
        isInNoticePeriod: false,
        currentJob: null,
        lastWorkingDate: null,
        contractorName: null,
        contractorId: null
      });
    }

    const contractor = hiredWorker.contractorId;
    const isNotice = ['ResignationPending', 'ResignationAccepted'].includes(hiredWorker.status);

    res.json({
      isWorking: true,
      isInNoticePeriod: isNotice,
      currentJob: {
        jobRole: hiredWorker.jobRole,
        joinDate: hiredWorker.joinDate,
        salary: hiredWorker.salary,
        duration: hiredWorker.duration
      },
      lastWorkingDate: isNotice ? hiredWorker.lastWorkingDate : null,
      contractorName: contractor ? (contractor.companyName || contractor.name) : null,
      contractorId: hiredWorker.contractorId._id || hiredWorker.contractorId
    });
  } catch (error) {
    console.error('getWorkingStatus error:', error);
    res.status(500).json({ message: error.message });
  }
};

// --- Job Feed ---
exports.getJobs = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const { minSalary, maxSalary, duration, location, maxDistance, professionalLat, professionalLng } = req.query;

    const tradeGroup = getTradeForRole(user.jobRole) || user.jobRole;
    const validRoles = ROLE_HIERARCHY[tradeGroup] || [user.jobRole];

    const query = { 
      isFilled: false,
      status: 'Active',
      jobRole: { $in: validRoles }
    };

    if (maxDistance && maxDistance !== 'Any Distance' && professionalLat && professionalLng) {
      // maxDistance comes in as "Within 10 km", "Within 25 km", etc. We need to extract the number.
      let distanceInKm = 0;
      if (maxDistance === 'Within 10 km') distanceInKm = 10;
      else if (maxDistance === 'Within 25 km') distanceInKm = 25;
      else if (maxDistance === 'Within 50 km') distanceInKm = 50;
      else distanceInKm = parseFloat(maxDistance);

      if (distanceInKm > 0) {
        query.workSiteLocation = {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [parseFloat(professionalLng), parseFloat(professionalLat)]
            },
            $maxDistance: distanceInKm * 1000 // convert km to metres
          }
        };
      }
    }

    if (minSalary) query.salary = { ...query.salary, $gte: minSalary };
    if (maxSalary) query.salary = { ...query.salary, $lte: maxSalary };
    if (duration) query.duration = duration;
    if (location) query.workLocation = { $regex: location, $options: 'i' };

    const jobs = await JobPost.find(query)
      .populate('contractorId', 'name companyName phone email')
      .sort({ createdAt: -1 });

    // Check if professional has already applied to these jobs
    const applications = await Application.find({ professionalId: req.user.id });
    const appliedJobIds = applications.map(a => a.jobPostId.toString());

    const jobsWithStatus = jobs.map(job => ({
      ...job._doc,
      hasApplied: appliedJobIds.includes(job._id.toString())
    }));

    res.json(jobsWithStatus);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.applyToJob = async (req, res) => {
  try {
    const activeEmployment = await HiredWorker.findOne({
      professionalId: req.user.id,
      status: 'Active'
    });

    if (activeEmployment) {
      return res.status(400).json({ 
        message: 'You are currently working with a contractor. You must resign before applying to new positions.' 
      });
    }

    const noticeEmployment = await HiredWorker.findOne({
      professionalId: req.user.id,
      status: { $in: ['ResignationPending', 'ResignationAccepted'] }
    });

    const jobPost = await JobPost.findById(req.params.id);
    if (!jobPost) return res.status(404).json({ message: 'Job not found' });

    const alreadyApplied = await Application.findOne({ professionalId: req.user.id, jobPostId: jobPost._id });
    if (alreadyApplied) return res.status(400).json({ message: 'Already applied' });

    const DirectHireRequest = require('../models/DirectHireRequest');
    const alreadyDirectHired = await DirectHireRequest.findOne({ professionalId: req.user.id, jobPostId: jobPost._id, status: 'Pending' });
    if (alreadyDirectHired) return res.status(400).json({ message: 'You have a pending direct hire request for this job post. Please respond to it instead.' });

    const professional = await User.findById(req.user.id);

    const jobPostPopulated = await JobPost.findById(req.params.id).populate('contractorId', 'name companyName phone email');
    const application = new Application({
      jobPostId: jobPost._id,
      professionalId: req.user.id,
      contractorId: jobPost.contractorId,
      status: 'Applied',
      jobSnapshot: {
        title: jobPost.jobRole,
        workLocation: jobPost.workLocation,
        salary: jobPost.salary,
        salaryType: jobPost.salaryType,
        duration: jobPost.duration,
        facilities: jobPost.facilities,
      },
      contractorSnapshot: {
        contractorId: jobPostPopulated.contractorId._id,
        name: jobPostPopulated.contractorId.name,
        companyName: jobPostPopulated.contractorId.companyName,
        phone: jobPostPopulated.contractorId.phone,
        email: jobPostPopulated.contractorId.email,
      }
    });
    await application.save();

    // Update JobPost applicants array
    jobPost.applicants.push({
        professionalId: req.user.id,
        status: 'Applied'
    });
    await jobPost.save();

    // Notifications & Email
    const notification = new Notification({
      userId: jobPost.contractorId,
      title: 'New Job Application',
      message: `${professional.name} applied for "${jobPost.jobRole}" position.`,
      type: 'General',
      actionTab: NOTIFICATION_TABS.CONTRACTOR_JOB_POSTS
    });
    await notification.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${jobPost.contractorId}`).emit('contractor:newApplication', {
        jobId: jobPost._id,
        professionalId: professional._id,
        notification
      });
    }

    await sendMail({
      to: (await User.findById(jobPost.contractorId)).email,
      subject: `New Application for ${jobPost.jobRole}`,
      html: `
        <h2>New Application Received</h2>
        <p><strong>Professional:</strong> ${professional.name}</p>
        <p><strong>Role:</strong> ${professional.jobRole}</p>
        <p><strong>Experience:</strong> ${professional.yearsOfExperience} years</p>
        <p>Log in to Brickly to review the profile.</p>
      `
    });

    res.status(201).json({
      ...application.toObject(),
      isNoticePeriod: !!noticeEmployment
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- Availability ---
exports.getAvailability = async (req, res) => {
  try {
    const post = await AvailabilityPost.findOne({ professionalId: req.user.id });
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createAvailability = async (req, res) => {
  try {
    const data = req.body;
    data.professionalId = req.user.id;
    
    // Backend validation for jobRole based on registered trade
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const userTrade = user.jobRole || '';
    const validRoles = ROLE_HIERARCHY[userTrade];
    if (validRoles && !validRoles.includes(data.jobRole)) {
      return res.status(400).json({ message: 'Invalid job role for your registered trade' });
    }

    if (req.files) {
      if (req.files.resume) data.resumeUrl = req.files.resume[0].path;
      if (req.files.certificates) data.certificateUrls = req.files.certificates.map(f => f.path);
    }

    const post = new AvailabilityPost(data);
    await post.save();
    
    // Set user as available
    await User.findByIdAndUpdate(req.user.id, { isAvailable: true });

    // Populate professional's details so front-end has all info
    const populatedPost = await AvailabilityPost.findById(post._id).populate(
      'professionalId',
      'name email phone avatar about jobRole yearsOfExperience'
    );

    // Notify all contractors
    const contractors = await User.find({ role: 'contractor' });
    const professional = await User.findById(req.user.id);
    const io = getIO();

    for (const contractor of contractors) {
      // 1. Save Notification
      const notification = new Notification({
        userId: contractor._id,
        type: 'General',
        title: 'New Professional Available!',
        message: `${professional.name} is now available as a ${populatedPost.jobRole || professional.jobRole || 'Professional'}!`,
        relatedId: populatedPost._id,
        actionTab: NOTIFICATION_TABS.CONTRACTOR_BROWSE_PROFESSIONALS
      });
      await notification.save();

      // 2. Emit Socket Event
      if (io) {
        io.to(`user:${contractor._id}`).emit('contractor:newAvailability', {
          post: populatedPost,
          notification
        });
      }
    }

    res.status(201).json(populatedPost);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateAvailability = async (req, res) => {
  try {
    const data = req.body;
    
    // Backend validation for jobRole based on registered trade
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const userTrade = user.jobRole || '';
    const validRoles = ROLE_HIERARCHY[userTrade];
    if (data.jobRole && validRoles && !validRoles.includes(data.jobRole)) {
      return res.status(400).json({ message: 'Invalid job role for your registered trade' });
    }

    if (req.files) {
      if (req.files.resume) data.resumeUrl = req.files.resume[0].path;
      if (req.files.certificates) data.certificateUrls = req.files.certificates.map(f => f.path);
    }

    const post = await AvailabilityPost.findOneAndUpdate(
      { professionalId: req.user.id },
      { $set: data },
      { returnDocument: 'after' }
    );
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMyAvailabilityPosts = async (req, res) => {
  try {
    const posts = await AvailabilityPost.find({
      professionalId: req.user.id
    }).sort({ createdAt: -1 });

    res.json({ success: true, data: posts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteAvailability = async (req, res) => {
  try {
    await AvailabilityPost.findOneAndDelete({ professionalId: req.user.id });
    await User.findByIdAndUpdate(req.user.id, { isAvailable: false });
    res.json({ message: 'Availability post removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.toggleVisibility = async (req, res) => {
  try {
    const { isAvailable } = req.body;
    const user = await User.findByIdAndUpdate(req.user.id, { isAvailable }, { returnDocument: 'after' });
    res.json({ isAvailable: user.isAvailable });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- Applications ---
exports.getMyApplications = async (req, res) => {
  try {
    const applications = await Application.find({ professionalId: req.user.id })
      .populate({
        path: 'jobPostId',
        select: 'jobRole workLocation salary salaryType duration facilities workSiteLocation isFilled',
        populate: {
          path: 'contractorId',
          select: 'name companyName email phone'
        }
      })
      .sort({ appliedAt: -1 });

    const formatted = applications.map(app => {
      // Mock the populated structure using snapshot data if the original is deleted
      const mockJobPost = app.jobPostId || {
        _id: 'deleted',
        jobRole: app.jobSnapshot?.title || 'Position Filled',
        workLocation: app.jobSnapshot?.workLocation || 'Unknown',
        salary: app.jobSnapshot?.salary,
        salaryType: app.jobSnapshot?.salaryType,
        duration: app.jobSnapshot?.duration,
        facilities: app.jobSnapshot?.facilities,
        isFilled: true
      };

      const mockContractor = app.contractorId || {
        _id: app.contractorSnapshot?.contractorId,
        name: app.contractorSnapshot?.name || 'Unknown',
        companyName: app.contractorSnapshot?.companyName || 'Unknown',
        email: app.contractorSnapshot?.email,
        phone: app.contractorSnapshot?.phone
      };

      return {
        ...app.toObject(),
        jobPostId: mockJobPost,
        contractorId: mockContractor,
        jobPostExists: !!app.jobPostId
      };
    });

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- Notifications ---
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.readAllNotifications = async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user.id, isRead: false }, { isRead: true });
    res.json({ message: 'All marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.readNotification = async (req, res) => {
  try {
    await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { isRead: true });
    res.json({ message: 'Marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteAllNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({ userId: req.user.id });
    res.json({ message: 'All notifications deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- Contractor-Side Professional Search ---
exports.getAllAvailability = async (req, res) => {
  try {
    const { jobRole, minExp, location } = req.query;
    const query = {};
    
    // Only show people who are "Available"
    const availableUsers = await User.find({ isAvailable: true, role: 'professional' }).select('_id');
    const availableIds = availableUsers.map(u => u._id);
    query.professionalId = { $in: availableIds };

    if (jobRole) query.jobRole = { $regex: jobRole, $options: 'i' };
    if (minExp) query.yearsOfExperience = { $gte: Number(minExp) };
    if (location) query.locationPreference = { $regex: location, $options: 'i' };

    const posts = await AvailabilityPost.find(query)
      .populate('professionalId', 'name email phone avatar about jobRole yearsOfExperience')
      .sort({ createdAt: -1 });

    const HiredWorker = require('../models/HiredWorker');
    const postsWithStatus = await Promise.all(posts.map(async (post) => {
      const pObj = post.toObject();
      if (pObj.professionalId) {
        const activeWorker = await HiredWorker.findOne({
          professionalId: pObj.professionalId._id,
          status: { $in: ['Active', 'ResignationPending', 'ResignationAccepted'] }
        });
        
        if (activeWorker) {
          pObj.professionalId.isServingNotice = ['ResignationPending', 'ResignationAccepted'].includes(activeWorker.status);
          if (pObj.professionalId.isServingNotice) {
            pObj.professionalId.noticeEndDate = activeWorker.lastWorkingDate;
          }
        } else {
          pObj.professionalId.isServingNotice = false;
        }
      }
      return pObj;
    }));

    res.json(postsWithStatus);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.directHireRequest = async (req, res) => {
  try {
    const professionalId = req.params.professionalId;
    const { jobRole, workSiteLocation, salary, duration, jobPostId } = req.body;
    
    const contractor = await User.findById(req.user.id);
    const professional = await User.findById(professionalId);
    
    if (!professional) return res.status(404).json({ message: 'Professional not found' });

    const HiredWorker = require('../models/HiredWorker');
    const activeWorker = await HiredWorker.findOne({
      professionalId,
      status: { $in: ['Active', 'ResignationPending', 'ResignationAccepted'] }
    });

    if (activeWorker) {
      return res.status(400).json({ message: 'Cannot hire candidate. They are currently employed or serving a notice period.' });
    }

    // Create DirectHireRequest
    const request = new DirectHireRequest({
      contractorId: req.user.id,
      professionalId,
      jobPostId: jobPostId || null,
      jobRole,
      workSiteLocation,
      salary,
      duration
    });
    await request.save();

    // Notify Professional
    const notification = new Notification({
      userId: professional._id,
      title: 'Direct Hire Request',
      message: `${contractor.companyName || contractor.name} wants to hire you directly for the ${jobRole} role.`,
      type: 'Job',
      actionTab: NOTIFICATION_TABS.PROFESSIONAL_MY_AVAILABILITY,
      relatedId: request._id
    });
    await notification.save();

    const io = req.app.get('io') || getIO();
    if (io) {
      const populatedRequest = await DirectHireRequest.findById(request._id)
        .populate('contractorId', 'name companyName email phone address workSiteLocation')
        .populate('jobPostId', 'jobRole workLocation salary duration');
      io.to(`user:${professional._id}`).emit('notification', { notification });
      io.to(`user:${professional._id}`).emit('newDirectHireRequest', { directHireRequest: populatedRequest });
    }

    // Email
    await sendMail({
      to: professional.email,
      subject: 'Direct Hire Request on BuildR',
      html: `
        <h2>Congratulations!</h2>
        <p>You have a direct hire request from <strong>${contractor.companyName || contractor.name}</strong>.</p>
        <p><strong>Role:</strong> ${jobRole}</p>
        ${workSiteLocation ? `<p><strong>Location:</strong> ${workSiteLocation}</p>` : ''}
        ${salary ? `<p><strong>Salary:</strong> ${salary}</p>` : ''}
        ${duration ? `<p><strong>Duration:</strong> ${duration}</p>` : ''}
        <br/>
        <p>Log in to BuildR to accept or reject this request.</p>
      `
    });

    res.json({ message: 'Hire request sent to professional', request });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getDirectHireRequests = async (req, res) => {
  try {
    console.log('Fetching direct hire requests for professional:', req.user.id);
    const requests = await DirectHireRequest.find({ professionalId: req.user.id })
      .populate('contractorId', 'name companyName email phone address workSiteLocation')
      .populate('jobPostId', 'jobRole workLocation salary duration')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.joinDirectHire = async (req, res) => {
  try {
    const requestId = req.params.id;
    const professionalId = req.user.id;

    const request = await DirectHireRequest.findOne({ _id: requestId, professionalId });
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (request.status !== 'Pending') return res.status(400).json({ message: `Request is already ${request.status}` });

    // Check max 2 joined
    const activeHires = await HiredWorker.countDocuments({ professionalId, status: 'Active' });
    if (activeHires >= 2) return res.status(400).json({ message: 'You are already joined in 2 active positions.' });

    request.status = 'Joined';
    await request.save();

    const hiredWorker = new HiredWorker({
      contractorId: request.contractorId,
      professionalId,
      directHireRequestId: request._id,
      jobRole: request.jobRole,
      salary: request.salary ? parseFloat(request.salary.replace(/[^0-9.]/g, '')) : null,
      workLocation: request.workSiteLocation,
      status: 'Active'
    });
    await hiredWorker.save();

    const profUser = await User.findById(professionalId);
    profUser.currentContractorId = request.contractorId;
    profUser.currentJobRole = request.jobRole;
    profUser.isAvailable = false;
    await profUser.save();

    const contractor = await User.findById(request.contractorId);
    if (contractor) {
      if (!contractor.hiredProfessionals) contractor.hiredProfessionals = [];
      contractor.hiredProfessionals.push(professionalId);
      await contractor.save();
    }

    const io = getIO();
    
    // Auto-withdraw other pending requests (Applications & DirectHireRequests)
    await Application.updateMany(
      { professionalId, status: { $in: ['Applied', 'Viewed', 'Shortlisted', 'Hired'] } },
      { status: 'Withdrawn' }
    );
    await DirectHireRequest.updateMany(
      { professionalId, _id: { $ne: requestId }, status: 'Pending' },
      { status: 'Withdrawn' }
    );

    if (request.jobPostId) {
      const jobPost = await JobPost.findById(request.jobPostId);
      if (jobPost) {
        await JobPost.findByIdAndDelete(jobPost._id);
        console.log('Job post hard deleted after direct hire join:', jobPost._id);

        if (io) {
          io.to(`user:${jobPost.contractorId}`).emit('jobPostDeleted', { jobPostId: jobPost._id });
        }

        const otherJobApps = await Application.find({
          jobPostId: jobPost._id,
          status: { $in: ['Applied', 'Viewed', 'Shortlisted'] }
        });

        for (const otherApp of otherJobApps) {
          otherApp.status = 'Position Filled';
          await otherApp.save();

          const filledNotification = new Notification({
            userId: otherApp.professionalId,
            type: 'Job',
            title: 'Position Filled',
            message: 'This position has been filled by another candidate. Thank you for your interest.',
            actionTab: NOTIFICATION_TABS.PROFESSIONAL_MY_APPLICATIONS
          });
          await filledNotification.save();

          if (io) {
            io.to(`user:${otherApp.professionalId}`).emit('notification', {
              notification: filledNotification
            });
          }
        }

        const otherDirectHires = await DirectHireRequest.find({
          jobPostId: jobPost._id,
          status: 'Pending'
        });

        for (const otherReq of otherDirectHires) {
          otherReq.status = 'Position Filled';
          await otherReq.save();

          const filledNotification = new Notification({
            userId: otherReq.professionalId,
            type: 'Job',
            title: 'Position Filled',
            message: 'This position has been filled by another candidate. Thank you for your interest.',
            actionTab: NOTIFICATION_TABS.PROFESSIONAL_MY_AVAILABILITY
          });
          await filledNotification.save();

          if (io) {
            io.to(`user:${otherReq.professionalId}`).emit('notification', {
              notification: filledNotification
            });
          }
        }
      }
    }

    // Mark availability post as hired instead of deleting
    await AvailabilityPost.updateMany(
      { professionalId },
      { 
        isHired: true,
        hiredSnapshot: {
          contractorId: contractor._id,
          contractorName: contractor.name,
          companyName: contractor.companyName,
          phone: contractor.phone,
          email: contractor.email,
          hireDate: new Date()
        }
      }
    );

    // Notify Contractor
    const notification = new Notification({
      userId: request.contractorId,
      title: 'Professional Has Joined',
      message: `${profUser.name} has accepted your direct hire request and joined as the ${request.jobRole}.`,
      type: 'Job',
      actionTab: NOTIFICATION_TABS.CONTRACTOR_OVERVIEW // Used to be browse-professionals, but overview has the team list
    });
    await notification.save();

    if (io) {
      io.to(`user:${request.contractorId}`).emit('notification', { notification });
    }

    await sendMail({
      to: (await User.findById(request.contractorId)).email,
      subject: 'Professional Joined',
      html: `<p><strong>${profUser.name}</strong> has joined as <strong>${request.jobRole}</strong>.</p>`
    });

    res.json({ message: 'Successfully joined position', request });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.rejectDirectHire = async (req, res) => {
  try {
    const requestId = req.params.id;
    const { rejectionReason } = req.body;
    const professionalId = req.user.id;

    const request = await DirectHireRequest.findOne({ _id: requestId, professionalId });
    if (!request) return res.status(404).json({ message: 'Request not found' });

    request.status = 'Rejected';
    request.rejectionReason = rejectionReason;
    await request.save();

    const profUser = await User.findById(professionalId);
    
    const notification = new Notification({
      userId: request.contractorId,
      title: 'Direct Hire Request Declined',
      message: `${profUser.name} has declined your hire request for the ${request.jobRole} role. Reason: ${rejectionReason}`,
      type: 'Job',
      actionTab: NOTIFICATION_TABS.CONTRACTOR_BROWSE_PROFESSIONALS
    });
    await notification.save();

    const io = getIO();
    io.to(`user:${request.contractorId}`).emit('notification', { notification });

    await sendMail({
      to: (await User.findById(request.contractorId)).email,
      subject: 'Direct Hire Request Declined',
      html: `<p><strong>${profUser.name}</strong> has declined your hire request for the <strong>${request.jobRole}</strong> role.</p><p><strong>Reason:</strong> ${rejectionReason}</p>`
    });

    res.json({ message: 'Request rejected', request });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.rejectApplication = async (req, res) => {
  try {
    const applicationId = req.params.id;
    const { rejectionReason } = req.body;
    const professionalId = req.user.id;

    const application = await Application.findOne({ _id: applicationId, professionalId }).populate('jobPostId');
    if (!application) return res.status(404).json({ message: 'Application not found' });

    application.status = 'Rejected';
    // Mongoose application schema might not have rejectionReason yet. We should add it or just save to DB dynamically.
    // For now we will assume the schema allows it, or we just notify. Wait, let's update application schema if needed later.
    application.set('rejectionReason', rejectionReason, { strict: false });
    await application.save();

    // Update job post applicant status
    if (application.jobPostId) {
      const job = await JobPost.findById(application.jobPostId._id);
      if (job) {
        const applicantEntry = job.applicants.find(a => a.professionalId?.toString() === professionalId);
        if (applicantEntry) {
          applicantEntry.status = 'Rejected';
          await job.save();
        }
      }
    }

    const profUser = await User.findById(professionalId);
    
    const notification = new Notification({
      userId: application.contractorId,
      title: 'Application Rejected',
      message: `${profUser.name} has rejected your hire offer for the ${application.jobPostId.jobRole}. Reason: ${rejectionReason}`,
      type: 'Job',
      actionTab: NOTIFICATION_TABS.CONTRACTOR_JOB_POSTS
    });
    await notification.save();

    const io = getIO();
    io.to(`user:${application.contractorId}`).emit('notification', { notification });

    await sendMail({
      to: (await User.findById(application.contractorId)).email,
      subject: 'Application Rejected',
      html: `<p><strong>${profUser.name}</strong> has rejected your offer for the <strong>${application.jobPostId.jobRole}</strong> role.</p><p><strong>Reason:</strong> ${rejectionReason}</p>`
    });

    res.json({ message: 'Application rejected', application });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.submitResignation = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason || reason.length < 20 || reason.length > 300) {
      return res.status(400).json({ message: 'Reason must be between 20 and 300 characters' });
    }

    const professional = await User.findById(req.user.id);
    const activeWorker = await HiredWorker.findOne({ professionalId: req.user.id, status: 'Active' });

    if (!activeWorker) {
      return res.status(400).json({ message: 'You are not currently hired or already serving notice.' });
    }

    const contractorId = activeWorker.contractorId;
    const jobRole = activeWorker.jobRole;

    const noticeEndDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Update HiredWorker
    activeWorker.status = 'ResignationPending';
    activeWorker.resignationReason = reason;
    activeWorker.resignationSubmittedDate = new Date();
    activeWorker.lastWorkingDate = noticeEndDate;
    await activeWorker.save();

    // Update User so frontend correctly disables Hire buttons
    professional.isServingNotice = true;
    professional.noticeEndDate = noticeEndDate;
    await professional.save();

    const application = await Application.findOne({
      professionalId: req.user.id,
      status: { $in: ['Joined', 'Hired'] }
    }).sort({ appliedAt: -1 });

    if (application) {
      application.status = 'Resigned';
      application.resignedAt = new Date();
      application.resignationReason = reason;
      await application.save();
    } else {
      const directHire = await DirectHireRequest.findOne({
        professionalId: req.user.id,
        status: 'Joined'
      }).sort({ updatedAt: -1 });
      if (directHire) {
        directHire.status = 'Resigned';
        await directHire.save();
      }
    }

    const contractor = await User.findById(contractorId);
    if (contractor) {
      contractor.hiredProfessionals = contractor.hiredProfessionals.filter(id => id.toString() !== req.user.id);
      await contractor.save();
    }

    const notification = new Notification({
      userId: contractorId,
      title: 'Team Member Resigned',
      message: `${professional.name} has resigned from ${professional.currentJobRole || 'their role'}. Reason: ${reason}. They will serve a 7-day notice period.`,
      type: 'Hire',
      actionTab: NOTIFICATION_TABS.CONTRACTOR_MY_TEAM
    });
    await notification.save();

    const io = getIO();
    io.to(`user:${contractorId}`).emit('contractor:teamMemberResigned', {
      professionalId: req.user.id,
      professionalName: professional.name,
      jobRole: professional.currentJobRole,
      reason,
      noticeEndDate
    });

    if (contractor && contractor.email) {
      await sendMail({
        to: contractor.email,
        subject: `${professional.name} has submitted their resignation`,
        html: `
          <p><strong>${professional.name}</strong> has submitted a resignation from the <strong>${professional.currentJobRole || 'their role'}</strong> role.</p>
          <p><strong>Reason:</strong> ${reason}</p>
          <p><strong>Notice End Date:</strong> ${noticeEndDate.toLocaleDateString()}</p>
          <p>You can send a Request to Stay from your My Team tab if you wish to retain them.</p>
        `
      });
    }

    res.json({ message: 'Resignation submitted successfully', noticeEndDate });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.respondToStayRequest = async (req, res) => {
  try {
    const { response } = req.body;
    if (!['accept', 'decline'].includes(response)) {
      return res.status(400).json({ message: 'Invalid response' });
    }

    const professional = await User.findById(req.user.id);
    const activeWorker = await HiredWorker.findOne({ 
      professionalId: req.user.id, 
      status: { $in: ['ResignationPending', 'ResignationAccepted'] } 
    });

    if (!activeWorker) {
      return res.status(400).json({ message: 'You are not currently serving a notice period' });
    }

    const contractorId = activeWorker.contractorId;
    const contractor = await User.findById(contractorId);

    if (response === 'accept') {
      activeWorker.status = 'Active';
      activeWorker.resignationReason = null;
      activeWorker.resignationSubmittedDate = null;
      activeWorker.lastWorkingDate = null;
      await activeWorker.save();
      
      const application = await Application.findOne({
        professionalId: req.user.id,
        status: 'Resigned'
      }).sort({ appliedAt: -1 });

      if (application) {
        application.status = 'Hired';
        await application.save();
      }

      if (contractor && !contractor.hiredProfessionals.includes(req.user.id)) {
        contractor.hiredProfessionals.push(req.user.id);
        await contractor.save();
      }

      const notification = new Notification({
        userId: contractorId,
        title: 'Request to Stay Accepted',
        message: `${professional.name} has accepted your Request to Stay and will continue working.`,
        type: 'Hire',
        actionTab: NOTIFICATION_TABS.CONTRACTOR_MY_TEAM
      });
      await notification.save();

      const io = getIO();
      io.to(`user:${contractorId}`).emit('contractor:requestToStayAccepted', { professionalId: req.user.id });

      if (contractor && contractor.email) {
        await sendMail({
          to: contractor.email,
          subject: `${professional.name} has accepted your Request to Stay`,
          html: `<p>Great news! <strong>${professional.name}</strong> has accepted your request and will continue working with you.</p>`
        });
      }
    } else {
      const notification = new Notification({
        userId: contractorId,
        title: 'Request to Stay Declined',
        message: `${professional.name} has declined your Request to Stay. Notice period continues until ${new Date(activeWorker.lastWorkingDate).toLocaleDateString()}.`,
        type: 'Hire',
        actionTab: NOTIFICATION_TABS.CONTRACTOR_MY_TEAM
      });
      await notification.save();

      const io = getIO();
      io.to(`user:${contractorId}`).emit('contractor:requestToStayDeclined', { professionalId: req.user.id });

      if (contractor && contractor.email) {
        await sendMail({
          to: contractor.email,
          subject: `${professional.name} has declined your Request to Stay`,
          html: `<p><strong>${professional.name}</strong> has declined your request to stay. Their notice period will continue until ${new Date(activeWorker.lastWorkingDate).toLocaleDateString()}.</p>`
        });
      }
    }

    res.json({ message: 'Response recorded successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getNoticeStatus = async (req, res) => {
  try {
    const professional = await User.findById(req.user.id);
    let daysRemaining = 0;
    if (professional.isServingNotice) {
      daysRemaining = Math.ceil(
        (new Date(professional.noticeEndDate) - new Date()) / (1000 * 60 * 60 * 24)
      );
    }
    res.json({
      isServingNotice: professional.isServingNotice,
      noticeStartDate: professional.noticeStartDate,
      noticeEndDate: professional.noticeEndDate,
      daysRemaining,
      currentContractorId: professional.currentContractorId
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- Join Job (Professional accepts a Hired status) ---
exports.joinJob = async (req, res) => {
  try {
    const applicationId = req.params.id;
    const professionalId = req.user.id;

    // 1. Fetch the application being joined
    const application = await Application.findOne({ _id: applicationId, professionalId });
    if (!application) return res.status(404).json({ message: 'Application not found' });
    if (application.status !== 'Hired') return res.status(400).json({ message: 'You can only join a job you have been hired for' });

    // 2. Fetch the job post
    const jobPost = await JobPost.findById(application.jobPostId);
    if (!jobPost) return res.status(404).json({ message: 'Job post not found' });

    const io = getIO();

    // 3. Update this application to 'Joined'
    application.status = 'Joined';
    await application.save();

    // 4. Auto-withdraw all other pending/applied/shortlisted applications by this professional
    const otherApps = await Application.find({
      professionalId,
      _id: { $ne: applicationId },
      status: { $in: ['Applied', 'Viewed', 'Shortlisted'] }
    });
    for (const otherApp of otherApps) {
      otherApp.status = 'Withdrawn';
      await otherApp.save();
    }

    // 5. Delete the job post
    await JobPost.findByIdAndDelete(jobPost._id);
    console.log('Job post hard deleted after professional joined:', jobPost._id);

    if (io) {
      io.to(`user:${jobPost.contractorId}`).emit('jobPostDeleted', { jobPostId: jobPost._id });
    }

    // 6. Create HiredWorker record
    const hiredWorker = new HiredWorker({
      contractorId: application.contractorId,
      professionalId,
      jobPostId: jobPost._id,
      applicationId: application._id,
      jobRole: jobPost.jobRole,
      salary: jobPost.salary,
      salaryType: jobPost.salaryType,
      workLocation: jobPost.workLocation,
      status: 'Active'
    });
    await hiredWorker.save();

    // 7. Update Professional and Contractor User Models
    const professional = await User.findById(professionalId);
    professional.currentContractorId = application.contractorId;
    professional.currentJobRole = jobPost.jobRole;
    professional.isAvailable = false;
    await professional.save();

    const contractor = await User.findById(application.contractorId);
    if (contractor) {
      if (!contractor.hiredProfessionals) contractor.hiredProfessionals = [];
      contractor.hiredProfessionals.push(professionalId);
      await contractor.save();
    }

    // 8. Notify the contractor that the professional has joined
    const contractorNotification = new Notification({
      userId: application.contractorId,
      type: 'Hire',
      title: 'Professional Has Joined!',
      message: `${professional.name} has accepted the position and joined as ${jobPost.jobRole}!`,
      relatedId: jobPost._id,
      actionTab: NOTIFICATION_TABS.CONTRACTOR_JOB_POSTS
    });
    await contractorNotification.save();

    if (io) {
      io.to(`user:${application.contractorId}`).emit('notification', {
        notification: contractorNotification
      });
    }

    // 8. Notify all other applicants for this job that the position is filled
    const otherJobApps = await Application.find({
      jobPostId: jobPost._id,
      professionalId: { $ne: professionalId },
      status: { $in: ['Applied', 'Viewed', 'Shortlisted', 'Hired'] }
    });
    for (const otherApp of otherJobApps) {
      otherApp.status = 'Position Filled';
      await otherApp.save();

      const filledNotification = new Notification({
        userId: otherApp.professionalId,
        type: 'Job',
        title: 'Position Filled',
        message: 'This position has been filled by another candidate. Thank you for your interest.',
        relatedId: jobPost._id,
        actionTab: NOTIFICATION_TABS.PROFESSIONAL_MY_APPLICATIONS
      });
      await filledNotification.save();

      if (io) {
        io.to(`user:${otherApp.professionalId}`).emit('notification', {
          notification: filledNotification
        });
      }
    }

    const otherDirectHires = await DirectHireRequest.find({
      jobPostId: jobPost._id,
      professionalId: { $ne: professionalId },
      status: 'Pending'
    });

    for (const otherReq of otherDirectHires) {
      otherReq.status = 'Position Filled';
      await otherReq.save();

      const filledNotification = new Notification({
        userId: otherReq.professionalId,
        type: 'Job',
        title: 'Position Filled',
        message: 'This position has been filled by another candidate. Thank you for your interest.',
        actionTab: NOTIFICATION_TABS.PROFESSIONAL_MY_AVAILABILITY
      });
      await filledNotification.save();

      if (io) {
        io.to(`user:${otherReq.professionalId}`).emit('notification', {
          notification: filledNotification
        });
      }
    }


    res.json({ message: 'Successfully joined! Welcome aboard.', hiredWorker });
  } catch (error) {
    console.error('Join job error:', error);
    res.status(500).json({ message: error.message });
  }
};
