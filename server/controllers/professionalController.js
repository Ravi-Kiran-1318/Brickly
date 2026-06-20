const mongoose = require('mongoose');
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

    if (updates.location) {
      const { type, coordinates } = updates.location;
      if (type !== 'Point') {
        return res.status(400).json({ message: "Invalid location type. Must be 'Point'." });
      }
      if (!Array.isArray(coordinates) || coordinates.length !== 2) {
        return res.status(400).json({ message: "Coordinates must be an array of [longitude, latitude]." });
      }
      const [lng, lat] = coordinates;
      if (typeof lng !== 'number' || isNaN(lng) || typeof lat !== 'number' || isNaN(lat)) {
        return res.status(400).json({ message: "Coordinates must be valid numbers." });
      }
      if (lng < -180 || lng > 180) {
        return res.status(400).json({ message: "Longitude must be between -180 and 180 degrees." });
      }
      if (lat < -90 || lat > 90) {
        return res.status(400).json({ message: "Latitude must be between -90 and 90 degrees." });
      }
    }

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
        contractorId: null,
        status: null
      });
    }

    const contractor = hiredWorker.contractorId;

    if (hiredWorker.status === 'Active') {
      return res.json({
        isWorking: true,
        isInNoticePeriod: false,
        hiredWorkerId: hiredWorker._id,
        startDate: hiredWorker.startDate || hiredWorker.joinedAt || new Date(),
        endDate: hiredWorker.endDate || null,
        currentJob: {
          jobRole: hiredWorker.jobRole,
          joinDate: hiredWorker.joinedAt || hiredWorker.joinDate
        },
        lastWorkingDate: null,
        contractorName: contractor ? (contractor.companyName || contractor.name) : null,
        contractorId: contractor ? contractor._id : hiredWorker.contractorId,
        status: hiredWorker.status,
        noticePeriodDays: hiredWorker.noticePeriodDays !== undefined ? hiredWorker.noticePeriodDays : 7
      });
    } else {
      const lastWorkingDate = hiredWorker.lastWorkingDate;
      let daysRemaining = 0;
      let hoursRemaining = 0;
      if (lastWorkingDate) {
        const diffMs = new Date(lastWorkingDate).getTime() - new Date().getTime();
        daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        hoursRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60)));
      }

      const RetentionOffer = require('../models/RetentionOffer');
      const pendingOffer = await RetentionOffer.findOne({
        hiredWorkerId: hiredWorker._id,
        status: 'pending'
      }).populate('contractorId', 'name companyName');

      return res.json({
        isWorking: true,
        isInNoticePeriod: true,
        hiredWorkerId: hiredWorker._id,
        startDate: hiredWorker.startDate || hiredWorker.joinedAt || new Date(),
        endDate: hiredWorker.endDate || null,
        daysRemaining,
        hoursRemaining,
        resignationStatus: hiredWorker.status,
        currentJob: {
          jobRole: hiredWorker.jobRole,
          joinDate: hiredWorker.joinedAt || hiredWorker.joinDate
        },
        lastWorkingDate: lastWorkingDate ? new Date(lastWorkingDate).toISOString() : null,
        contractorName: contractor ? (contractor.companyName || contractor.name) : null,
        contractorId: contractor ? contractor._id : hiredWorker.contractorId,
        status: hiredWorker.status,
        noticePeriodDays: hiredWorker.noticePeriodDays !== undefined ? hiredWorker.noticePeriodDays : 7,
        pendingOffer: pendingOffer ? {
          _id: pendingOffer._id,
          contractorName: pendingOffer.contractorId?.companyName || pendingOffer.contractorId?.name || 'Contractor',
          offerType: pendingOffer.offerType,
          newSalary: pendingOffer.newSalary,
          newRole: pendingOffer.newRole,
          newSite: pendingOffer.newSite,
          message: pendingOffer.message
        } : null
      });
    }
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
        startDate: jobPost.startDate,
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
    const user = await User.findById(req.user.id);
    if (!user || !user.isVisible) {
      return res.json(null);
    }
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

    if (data.crewMembers && typeof data.crewMembers === 'string') {
      try {
        data.crewMembers = JSON.parse(data.crewMembers);
      } catch (e) {
        data.crewMembers = [];
      }
    }
    if (data.isCrewPost === 'true' || data.isCrewPost === true) {
      data.isCrewPost = true;
      data.crewSize = 1 + (data.crewMembers ? data.crewMembers.length : 0);
    } else {
      data.isCrewPost = false;
      data.crewMembers = [];
      data.crewSize = 1;
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

    if (data.crewMembers && typeof data.crewMembers === 'string') {
      try {
        data.crewMembers = JSON.parse(data.crewMembers);
      } catch (e) {
        data.crewMembers = [];
      }
    }
    if (data.isCrewPost === 'true' || data.isCrewPost === true) {
      data.isCrewPost = true;
      data.crewSize = 1 + (data.crewMembers ? data.crewMembers.length : 0);
    } else {
      data.isCrewPost = false;
      data.crewMembers = [];
      data.crewSize = 1;
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
    const user = await User.findById(req.user.id);
    if (!user || !user.isVisible) {
      return res.json({ success: true, data: [] });
    }
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
    const HiredWorker = require('../models/HiredWorker');
    const ContractorReview = require('../models/ContractorReview');

    const applications = await Application.find({ professionalId: req.user.id })
      .populate({
        path: 'jobPostId',
        select: 'jobRole workLocation salary salaryType duration facilities workSiteLocation isFilled startDate noticePeriodDays',
        populate: {
          path: 'contractorId',
          select: 'name companyName email phone'
        }
      })
      .populate('contractorId', 'name companyName email phone')
      .sort({ appliedAt: -1 });

    const formatted = await Promise.all(applications.map(async (app) => {
      // Lazy offer expiry check
      if (app.status === 'Hired' && app.jobPostId && app.jobPostId.startDate) {
        const jobStart = new Date(app.jobPostId.startDate);
        jobStart.setHours(23, 59, 59, 999);
        if (new Date() > jobStart) {
          app.status = 'Expired';
          await app.save();
        }
      }

      // Find matching HiredWorker
      const hw = await HiredWorker.findOne({ applicationId: app._id });
      let hiredWorkerId = null;
      let hasReviewed = false;

      if (hw) {
        hiredWorkerId = hw._id;
        const reviewExists = await ContractorReview.findOne({
          professionalId: req.user.id,
          contractorId: hw.contractorId,
          hiredWorkerId: hw._id
        });
        hasReviewed = !!reviewExists;
      }

      // Mock the populated structure using snapshot data if the original is deleted
      const mockJobPost = app.jobPostId || {
        _id: 'deleted',
        jobRole: app.jobSnapshot?.title || 'Position Filled',
        workLocation: app.jobSnapshot?.workLocation || 'Unknown',
        salary: app.jobSnapshot?.salary,
        salaryType: app.jobSnapshot?.salaryType,
        duration: app.jobSnapshot?.duration,
        facilities: app.jobSnapshot?.facilities,
        startDate: app.jobSnapshot?.startDate || null,
        isFilled: true
      };

      const mockContractor = (app.contractorId && app.contractorId.name) ? app.contractorId : {
        _id: app.contractorSnapshot?.contractorId || app.contractorId,
        name: app.contractorSnapshot?.name || 'Unknown',
        companyName: app.contractorSnapshot?.companyName || 'Unknown',
        email: app.contractorSnapshot?.email || 'N/A',
        phone: app.contractorSnapshot?.phone || 'N/A'
      };

      return {
        ...app.toObject(),
        jobPostId: mockJobPost,
        contractorId: mockContractor,
        jobPostExists: !!app.jobPostId,
        hiredWorkerId,
        hasReviewed
      };
    }));

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
    
    const DirectHireRequest = require('../models/DirectHireRequest');
    const pendingRequests = await DirectHireRequest.find({
      contractorId: req.user.id,
      status: 'Pending'
    });
    const pendingRequestUserIds = pendingRequests.map(r => r.professionalId);

    // Find all professional users who are visible and online, OR who have a pending direct hire request from this contractor
    const userQuery = {
      role: 'professional',
      $or: [
        { isVisible: true, availabilityStatus: 'Online' },
        { _id: { $in: pendingRequestUserIds } }
      ]
    };

    if (jobRole) userQuery.jobRole = { $regex: jobRole, $options: 'i' };
    if (minExp) userQuery.yearsOfExperience = { $gte: Number(minExp) };
    if (location) userQuery.locationPreference = { $regex: location, $options: 'i' };

    const professionals = await User.find(userQuery)
      .select('name email phone avatar about jobRole yearsOfExperience locationPreference isTrustedProfessional averageRating totalReviews isServingNotice noticeStartDate noticeEndDate currentContractorId isAvailable')
      .sort({ updatedAt: -1 });

    const HiredWorker = require('../models/HiredWorker');
    const postsWithStatus = await Promise.all(professionals.map(async (prof) => {
      // Find their actual availability post if it exists
      const post = await AvailabilityPost.findOne({ professionalId: prof._id });

      const activeWorker = await HiredWorker.findOne({
        professionalId: prof._id,
        status: { $in: ['Active', 'ResignationPending', 'ResignationAccepted'] }
      });

      const isServingNotice = prof.isServingNotice || (activeWorker ? ['ResignationPending', 'ResignationAccepted'].includes(activeWorker.status) : false);
      const noticeStartDate = prof.noticeStartDate || ((activeWorker && isServingNotice) ? activeWorker.resignationSubmittedDate : null);
      const noticeEndDate = prof.noticeEndDate || ((activeWorker && isServingNotice) ? activeWorker.lastWorkingDate : null);
      const isEmployed = activeWorker ? activeWorker.status === 'Active' : false;

      // Retrieve direct hire stats
      const allRequests = await DirectHireRequest.find({
        contractorId: req.user.id,
        professionalId: prof._id
      });
      const totalAttempts = allRequests.length;
      const lastRejected = allRequests.filter(r => r.status === 'Rejected').sort((a,b) => b.updatedAt - a.updatedAt)[0];
      let cooldownActive = false;
      let cooldownHoursLeft = 0;
      if (lastRejected) {
        const cooldownMs = 48 * 60 * 60 * 1000;
        const timeSinceRejection = Date.now() - new Date(lastRejected.rejectedAt || lastRejected.updatedAt).getTime();
        if (timeSinceRejection < cooldownMs) {
          cooldownActive = true;
          cooldownHoursLeft = Math.ceil((cooldownMs - timeSinceRejection) / (1000 * 60 * 60));
        }
      }

      const profObj = prof.toObject ? prof.toObject() : prof;
      profObj.isEmployed = isEmployed;
      profObj.isServingNotice = isServingNotice;
      profObj.noticeStartDate = noticeStartDate;
      profObj.noticeEndDate = noticeEndDate;
      profObj.directHireStats = {
        totalAttempts,
        cooldownActive,
        cooldownHoursLeft
      };

      return {
        _id: post ? post._id : prof._id, // fallback to user id if no post exists
        professionalId: profObj,
        jobRole: post ? post.jobRole : prof.jobRole,
        yearsOfExperience: post ? post.yearsOfExperience : prof.yearsOfExperience,
        locationPreference: post ? post.locationPreference : prof.locationPreference,
        expectedSalary: post ? post.expectedSalary : 'Negotiable',
        availableFrom: post ? post.availableFrom : new Date(),
        skillTags: post ? post.skillTags : [],
        isServingNotice,
        noticeStartDate,
        noticeEndDate,
        isEmployed,
        isCrewPost: post ? post.isCrewPost : false,
        crewMembers: post ? post.crewMembers : [],
        crewSize: post ? post.crewSize : 1
      };
    }));

    res.json(postsWithStatus);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.directHireRequest = async (req, res) => {
  try {
    const { jobRole, workSiteLocation, salary, duration, jobPostId, noticePeriodDays, includeSundays } = req.body;
    const { professionalId } = req.params;
    
    const contractor = await User.findById(req.user.id);
    const professional = await User.findById(professionalId);
    
    if (!professional) return res.status(404).json({ message: 'Professional not found' });

    // Enforce attempts limit and 48-hour retry cooldown
    const pastRequestsCount = await DirectHireRequest.countDocuments({
      contractorId: req.user.id,
      professionalId
    });
    const attemptNumber = pastRequestsCount + 1;
    if (attemptNumber > 3) {
      return res.status(403).json({ message: 'You have reached the maximum number of hire requests for this professional.' });
    }

    const lastRejected = await DirectHireRequest.findOne({
      contractorId: req.user.id,
      professionalId,
      status: 'Rejected'
    }).sort({ updatedAt: -1 });

    if (lastRejected) {
      const cooldownMs = 48 * 60 * 60 * 1000;
      const timeSinceRejection = Date.now() - new Date(lastRejected.rejectedAt || lastRejected.updatedAt).getTime();
      if (timeSinceRejection < cooldownMs) {
        const hoursLeft = Math.ceil((cooldownMs - timeSinceRejection) / (1000 * 60 * 60));
        return res.status(429).json({ message: `Please wait ${hoursLeft} more hour(s) before sending another request.` });
      }
    }

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

    // Create DirectHireRequest
    const request = new DirectHireRequest({
      contractorId: req.user.id,
      professionalId,
      jobPostId: jobPostId || null,
      jobRole,
      workSiteLocation,
      salary,
      duration,
      attemptNumber,
      noticePeriodDays: noticePeriodDays !== undefined ? Number(noticePeriodDays) : 7,
      includeSundays: includeSundays === true || includeSundays === 'true'
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
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const requestId = req.params.id;
    const professionalId = req.user.id;

    // Transactional block check for existing active join or notice period
    const existingJoin = await HiredWorker.findOne({ 
      professionalId, 
      status: { $in: ['Active', 'ResignationPending', 'ResignationAccepted'] } 
    }).session(session);
    
    if (existingJoin) {
      await session.abortTransaction();
      session.endSession();
      if (existingJoin.status === 'Active') {
        return res.status(400).json({ message: 'You are already working with a contractor.' });
      } else {
        return res.status(400).json({ message: 'You cannot join a new position while serving your notice period.' });
      }
    }

    const request = await DirectHireRequest.findOne({ _id: requestId, professionalId }).session(session);
    if (!request) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Request not found' });
    }
    if (request.status !== 'Pending') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: `Request is already ${request.status}` });
    }

    // Check max 2 joined
    const activeHires = await HiredWorker.countDocuments({ professionalId, status: 'Active' }).session(session);
    if (activeHires >= 2) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'You are already joined in 2 active positions.' });
    }

    request.status = 'Joined';
    await request.save({ session });

    const AvailabilityPost = require('../models/AvailabilityPost');
    const post = await AvailabilityPost.findOne({ professionalId }).session(session);
    const isCrewHire = post ? post.isCrewPost : false;
    const crewDetails = post ? post.crewMembers : [];
    const crewSize = post ? post.crewSize : 1;

    const JobPost = require('../models/JobPost');
    const linkedJob = request.jobPostId ? await JobPost.findById(request.jobPostId).session(session) : null;

    const { parseDurationToDays } = require('../utils/parseDuration');
    const now = new Date();
    const startDate = (linkedJob && linkedJob.startDate && new Date(linkedJob.startDate) > now)
      ? new Date(linkedJob.startDate)
      : now;
    const durationDays = parseDurationToDays(request.duration);
    const endDate = durationDays
      ? new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000)
      : null;

    const resolvedSalaryType = request.salaryType || (linkedJob ? (linkedJob.salaryType === 'contract' ? 'project_based' : 'monthly') : 'monthly');

    let workSiteLocationCoords = null;
    if (linkedJob && linkedJob.workSiteLocation && linkedJob.workSiteLocation.coordinates && linkedJob.workSiteLocation.coordinates.length === 2) {
      workSiteLocationCoords = {
        type: 'Point',
        coordinates: linkedJob.workSiteLocation.coordinates
      };
    } else if (request.workSiteLocation) {
      const { geocodeAddress } = require('../utils/geocoder');
      const geocoded = await geocodeAddress(request.workSiteLocation);
      if (geocoded && geocoded.coordinates && geocoded.coordinates.length === 2) {
        workSiteLocationCoords = geocoded;
      }
    }

    const hiredWorker = new HiredWorker({
      contractorId: request.contractorId,
      professionalId,
      directHireRequestId: request._id,
      hireSource: 'direct_hire',
      jobRole: request.jobRole,
      salary: request.salary ? parseFloat(request.salary.replace(/[^0-9.]/g, '')) : null,
      salaryType: resolvedSalaryType,
      duration: request.duration,
      startDate,
      endDate,
      workLocation: request.workSiteLocation,
      workSiteLocationCoords,
      status: 'Active',
      noticePeriodDays: request.noticePeriodDays !== undefined ? request.noticePeriodDays : 7,
      isCrewHire,
      crewDetails,
      crewSize,
      includeSundays: request.includeSundays || false
    });
    await hiredWorker.save({ session });

    const profUser = await User.findById(professionalId).session(session);
    profUser.currentContractorId = request.contractorId;
    profUser.currentJobRole = request.jobRole;
    profUser.isAvailable = false;
    await profUser.save({ session });

    const contractor = await User.findById(request.contractorId).session(session);
    if (contractor) {
      if (!contractor.hiredProfessionals) contractor.hiredProfessionals = [];
      contractor.hiredProfessionals.push(professionalId);
      await contractor.save({ session });
    }

    const io = getIO();
    
    // Auto-withdraw other pending requests (Applications & DirectHireRequests)
    await Application.updateMany(
      { professionalId, status: { $in: ['Applied', 'Viewed', 'Shortlisted', 'Hired'] } },
      { status: 'Withdrawn' },
      { session }
    );

    // Auto-withdraw pending direct hire requests from other contractors
    const otherDirectHiresPending = await DirectHireRequest.find({
      professionalId,
      _id: { $ne: requestId },
      status: 'Pending'
    }).session(session);

    for (const otherReq of otherDirectHiresPending) {
      otherReq.status = 'Position Filled';
      await otherReq.save({ session });

      const contractorNotif = new Notification({
        userId: otherReq.contractorId,
        title: 'Direct Hire Request Unavailable',
        message: `${profUser.name} is no longer available as they have accepted another position.`,
        type: 'General',
        actionTab: NOTIFICATION_TABS.CONTRACTOR_BROWSE_PROFESSIONALS || 'browse-professionals'
      });
      await contractorNotif.save({ session });

      if (io) {
        io.to(`user:${otherReq.contractorId}`).emit('notification', { notification: contractorNotif });
      }

      const otherContractor = await User.findById(otherReq.contractorId).session(session);
      if (otherContractor && otherContractor.email) {
        await sendMail({
          to: otherContractor.email,
          subject: 'Direct Hire Request Unavailable',
          html: `<p><strong>${profUser.name}</strong> is no longer available as they have accepted another position.</p>`
        });
      }
    }

    if (request.jobPostId) {
      const jobPost = await JobPost.findById(request.jobPostId).session(session);
      if (jobPost) {
        await JobPost.findByIdAndDelete(jobPost._id).session(session);
        console.log('Job post hard deleted after direct hire join:', jobPost._id);

        if (io) {
          io.to(`user:${jobPost.contractorId}`).emit('jobPostDeleted', { jobPostId: jobPost._id });
        }

        const otherJobApps = await Application.find({
          jobPostId: jobPost._id,
          status: { $in: ['Applied', 'Viewed', 'Shortlisted', 'Hired'] }
        }).session(session);

        for (const otherApp of otherJobApps) {
          otherApp.status = 'Position Filled';
          await otherApp.save({ session });

          const filledNotification = new Notification({
            userId: otherApp.professionalId,
            type: 'Job',
            title: 'Position Filled',
            message: 'This position has been filled by another candidate. Thank you for your interest.',
            actionTab: NOTIFICATION_TABS.PROFESSIONAL_MY_APPLICATIONS
          });
          await filledNotification.save({ session });

          if (io) {
            io.to(`user:${otherApp.professionalId}`).emit('notification', {
              notification: filledNotification
            });
          }
        }

        const otherDirectHires = await DirectHireRequest.find({
          jobPostId: jobPost._id,
          _id: { $ne: requestId },
          status: 'Pending'
        }).session(session);

        for (const otherReq of otherDirectHires) {
          otherReq.status = 'Position Filled';
          await otherReq.save({ session });

          const filledNotification = new Notification({
            userId: otherReq.professionalId,
            type: 'Job',
            title: 'Position Filled',
            message: 'This position has been filled by another candidate. Thank you for your interest.',
            actionTab: NOTIFICATION_TABS.PROFESSIONAL_MY_AVAILABILITY
          });
          await filledNotification.save({ session });

          if (io) {
            io.to(`user:${otherReq.professionalId}`).emit('notification', {
              notification: filledNotification
            });
          }
        }
      }
    }

    // Mark availability post as hired
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
      },
      { session }
    );

    // Notify Contractor
    const notification = new Notification({
      userId: request.contractorId,
      title: 'Professional Has Joined',
      message: `${profUser.name} has accepted your direct hire request and joined as the ${request.jobRole}.`,
      type: 'Job',
      actionTab: NOTIFICATION_TABS.CONTRACTOR_OVERVIEW
    });
    await notification.save({ session });

    if (io) {
      io.to(`user:${request.contractorId}`).emit('notification', { notification });
    }

    await session.commitTransaction();
    session.endSession();

    await sendMail({
      to: contractor.email,
      subject: 'Professional Joined',
      html: `<p><strong>${profUser.name}</strong> has joined as <strong>${request.jobRole}</strong>.</p>`
    });

    res.json({ message: 'Successfully joined position', request });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
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
    request.rejectedAt = new Date();
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

    const noticeDays = activeWorker.noticePeriodDays !== undefined ? activeWorker.noticePeriodDays : 7;
    const noticeEndDate = new Date(Date.now() + noticeDays * 24 * 60 * 60 * 1000);

    // Update HiredWorker
    activeWorker.status = 'ResignationPending';
    activeWorker.resignationReason = reason;
    activeWorker.resignationSubmittedDate = new Date();
    activeWorker.lastWorkingDate = noticeEndDate;
    await activeWorker.save();

    // Update User so frontend correctly disables Hire buttons
    professional.isServingNotice = true;
    professional.noticeStartDate = activeWorker.resignationSubmittedDate;
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
      message: `${professional.name} has resigned from ${professional.currentJobRole || 'their role'}. Reason: ${reason}. They will serve a ${noticeDays}-day notice period.`,
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
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const applicationId = req.params.id;
    const professionalId = req.user.id;

    // Transactional block check for existing active join or notice period
    const existingJoin = await HiredWorker.findOne({ 
      professionalId, 
      status: { $in: ['Active', 'ResignationPending', 'ResignationAccepted'] } 
    }).session(session);
    
    if (existingJoin) {
      await session.abortTransaction();
      session.endSession();
      if (existingJoin.status === 'Active') {
        return res.status(400).json({ message: 'You are already working with a contractor.' });
      } else {
        return res.status(400).json({ message: 'You cannot join a new position while serving your notice period.' });
      }
    }

    // 1. Fetch the application being joined
    const application = await Application.findOne({ _id: applicationId, professionalId }).session(session);
    if (!application) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Application not found' });
    }
    if (application.status !== 'Hired') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'You can only join a job you have been hired for' });
    }

    // 2. Fetch the job post
    const jobPost = await JobPost.findById(application.jobPostId).session(session);
    if (!jobPost) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Job post not found' });
    }

    if (jobPost.startDate) {
      const jobStart = new Date(jobPost.startDate);
      jobStart.setHours(23, 59, 59, 999);
      if (new Date() > jobStart) {
        application.status = 'Expired';
        await application.save({ session });
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ message: 'This job offer has expired as the start date has passed.' });
      }
    }

    const io = getIO();

    // 3. Update this application to 'Joined'
    application.status = 'Joined';
    await application.save({ session });

    // 4. Auto-withdraw all other pending/applied/shortlisted/hired applications by this professional
    await Application.updateMany(
      {
        professionalId,
        _id: { $ne: applicationId },
        status: { $in: ['Applied', 'Viewed', 'Shortlisted', 'Hired'] }
      },
      { status: 'Withdrawn' },
      { session }
    );

    // 5. Delete the job post
    await JobPost.findByIdAndDelete(jobPost._id).session(session);
    console.log('Job post hard deleted after professional joined:', jobPost._id);

    if (io) {
      io.to(`user:${jobPost.contractorId}`).emit('jobPostDeleted', { jobPostId: jobPost._id });
    }

    // 6. Create HiredWorker record
    const AvailabilityPost = require('../models/AvailabilityPost');
    const post = await AvailabilityPost.findOne({ professionalId }).session(session);
    const isCrewHire = post ? post.isCrewPost : false;
    const crewDetails = post ? post.crewMembers : [];
    const crewSize = post ? post.crewSize : 1;

    const { parseDurationToDays } = require('../utils/parseDuration');
    const now = new Date();
    const startDate = (jobPost.startDate && new Date(jobPost.startDate) > now)
      ? new Date(jobPost.startDate)
      : now;
    const durationDays = parseDurationToDays(jobPost.duration);
    const endDate = durationDays
      ? new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000)
      : null;

    const resolvedSalaryType = jobPost.salaryType === 'contract' ? 'project_based' : 'monthly';

    let workSiteLocationCoords = null;
    if (jobPost.workSiteLocation && jobPost.workSiteLocation.coordinates && jobPost.workSiteLocation.coordinates.length === 2) {
      workSiteLocationCoords = {
        type: 'Point',
        coordinates: jobPost.workSiteLocation.coordinates
      };
    }

    const hiredWorker = new HiredWorker({
      contractorId: application.contractorId,
      professionalId,
      jobPostId: jobPost._id,
      applicationId: application._id,
      hireSource: 'job_post',
      jobRole: jobPost.jobRole,
      salary: jobPost.salary,
      salaryType: resolvedSalaryType,
      duration: jobPost.duration,
      startDate,
      endDate,
      workLocation: jobPost.workLocation,
      workSiteLocationCoords,
      status: 'Active',
      noticePeriodDays: jobPost.noticePeriodDays !== undefined ? jobPost.noticePeriodDays : 7,
      isCrewHire,
      crewDetails,
      crewSize,
      includeSundays: jobPost.includeSundays || false
    });
    await hiredWorker.save({ session });

    // 7. Update Professional and Contractor User Models
    const professional = await User.findById(professionalId).session(session);
    professional.currentContractorId = application.contractorId;
    professional.currentJobRole = jobPost.jobRole;
    professional.isAvailable = false;
    await professional.save({ session });

    const contractor = await User.findById(application.contractorId).session(session);
    if (contractor) {
      if (!contractor.hiredProfessionals) contractor.hiredProfessionals = [];
      contractor.hiredProfessionals.push(professionalId);
      await contractor.save({ session });
    }

    // 8. Notify the contractor that the professional has joined
    const contractorNotification = new Notification({
      userId: application.contractorId,
      type: 'Hire',
      title: 'Professional Has Joined!',
      message: `${professional.name} has accepted the position and joined as ${jobPost.jobRole}!`,
      relatedId: jobPost._id,
      actionTab: NOTIFICATION_TABS.CONTRACTOR_OVERVIEW
    });
    await contractorNotification.save({ session });

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
    }).session(session);
    for (const otherApp of otherJobApps) {
      otherApp.status = 'Position Filled';
      await otherApp.save({ session });

      const filledNotification = new Notification({
        userId: otherApp.professionalId,
        type: 'Job',
        title: 'Position Filled',
        message: 'This position has been filled by another candidate. Thank you for your interest.',
        relatedId: jobPost._id,
        actionTab: NOTIFICATION_TABS.PROFESSIONAL_MY_APPLICATIONS
      });
      await filledNotification.save({ session });

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
    }).session(session);

    for (const otherReq of otherDirectHires) {
      otherReq.status = 'Position Filled';
      await otherReq.save({ session });

      const filledNotification = new Notification({
        userId: otherReq.professionalId,
        type: 'Job',
        title: 'Position Filled',
        message: 'This position has been filled by another candidate. Thank you for your interest.',
        actionTab: NOTIFICATION_TABS.PROFESSIONAL_MY_AVAILABILITY
      });
      await filledNotification.save({ session });

      if (io) {
        io.to(`user:${otherReq.professionalId}`).emit('notification', {
          notification: filledNotification
        });
      }
    }

    // Mark availability post as hired
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
      },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    await sendMail({
      to: contractor.email,
      subject: 'Professional Joined',
      html: `<p><strong>${professional.name}</strong> has joined as <strong>${jobPost.jobRole}</strong>.</p>`
    });

    res.json({ message: 'Successfully joined! Welcome aboard.', hiredWorker });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Join job error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Cancel resignation action
exports.cancelResignation = async (req, res) => {
  try {
    const professionalId = req.user.id;
    const hiredWorker = await HiredWorker.findOne({
      professionalId,
      status: 'ResignationPending'
    });

    if (!hiredWorker) {
      return res.status(404).json({ message: 'No pending resignation found.' });
    }

    hiredWorker.status = 'Active';
    hiredWorker.resignationReason = undefined;
    hiredWorker.additionalComments = undefined;
    hiredWorker.resignationSubmittedDate = undefined;
    hiredWorker.lastWorkingDate = undefined;
    await hiredWorker.save();

    // Reset Professional User model notice states
    const professional = await User.findById(professionalId);
    if (professional) {
      professional.isServingNotice = false;
      professional.noticeStartDate = null;
      professional.noticeEndDate = null;
      professional.resignationReason = null;
      await professional.save();
    }

    // Restore Application/Direct Hire status from Resigned to Joined
    const application = await Application.findOne({
      professionalId,
      status: 'Resigned'
    }).sort({ appliedAt: -1 });

    if (application) {
      application.status = 'Joined';
      await application.save();
    } else {
      const directHire = await DirectHireRequest.findOne({
        professionalId,
        status: 'Resigned'
      }).sort({ updatedAt: -1 });
      if (directHire) {
        directHire.status = 'Joined';
        await directHire.save();
      }
    }

    // Add professional back to contractor's hiredProfessionals
    const contractor = await User.findById(hiredWorker.contractorId);
    if (contractor) {
      if (!contractor.hiredProfessionals) contractor.hiredProfessionals = [];
      if (!contractor.hiredProfessionals.some(id => id.toString() === professionalId)) {
        contractor.hiredProfessionals.push(professionalId);
        await contractor.save();
      }
    }

    // Notify contractor
    const notification = new Notification({
      userId: hiredWorker.contractorId,
      title: 'Resignation Cancelled',
      message: `${professional.name} has cancelled their resignation and will continue working with you.`,
      type: 'General',
      actionTab: NOTIFICATION_TABS.CONTRACTOR_OVERVIEW || 'overview'
    });
    await notification.save();

    const io = getIO();
    if (io) {
      io.to(`user:${hiredWorker.contractorId}`).emit('notification', { notification });
      io.to(`user:${hiredWorker.contractorId}`).emit('contractor:resignationCancelled', { professionalId });
    }

    if (contractor && contractor.email) {
      await sendMail({
        to: contractor.email,
        subject: 'Resignation Cancelled',
        html: `
          <div style="font-family: Arial, sans-serif;">
            <h2 style="color: #1E3A5F; border-bottom: 2px solid #F97316; padding-bottom: 10px;">Resignation Cancelled</h2>
            <p><strong>${professional.name}</strong> has cancelled their resignation and will continue working with you as <strong>${hiredWorker.jobRole}</strong>.</p>
            <p>Their availability and active status have been restored.</p>
          </div>
        `
      });
    }

    res.json({ message: 'Resignation cancelled successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateVisibilityStatus = async (req, res) => {
  try {
    const { isVisible, availabilityStatus } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.isVisible = isVisible;
    user.availabilityStatus = availabilityStatus;
    user.visibilityUpdatedAt = Date.now();
    await user.save();

    if (isVisible && availabilityStatus === 'Online') {
      const availabilityPost = await AvailabilityPost.findOne({ professionalId: user._id });
      
      const HiredWorker = require('../models/HiredWorker');
      const activeWorker = await HiredWorker.findOne({
        professionalId: user._id,
        status: { $in: ['Active', 'ResignationPending', 'ResignationAccepted'] }
      });

      const isEmployed = activeWorker ? activeWorker.status === 'Active' : false;
      const isServingNotice = activeWorker ? ['ResignationPending', 'ResignationAccepted'].includes(activeWorker.status) : false;
      const noticeStartDate = (activeWorker && isServingNotice) ? activeWorker.resignationSubmittedDate : null;
      const noticeEndDate = (activeWorker && isServingNotice) ? activeWorker.lastWorkingDate : null;

      // Find all contractors
      const contractors = await User.find({ role: 'contractor' });
      const io = getIO();

      for (const contractor of contractors) {
        const notification = new Notification({
          userId: contractor._id,
          title: 'New Professional Available',
          message: `${user.name} is now available for hire as ${user.jobRole || 'Professional'} with ${user.yearsOfExperience || 0} years of experience and located at ${user.locationPreference || 'Not specified'}.`,
          type: 'Job',
          actionTab: NOTIFICATION_TABS.CONTRACTOR_BROWSE_PROFESSIONALS || 'browse-professionals'
        });
        await notification.save();

        if (io) {
          io.to(`user:${contractor._id}`).emit('newProfessionalAvailable', {
            notification,
            name: user.name,
            jobRole: user.jobRole,
            experience: user.yearsOfExperience,
            location: user.locationPreference,
            isVisible: user.isVisible,
            professionalId: user._id,
            avatar: user.avatar || null,
            post: availabilityPost,
            isEmployed,
            isServingNotice,
            noticeStartDate,
            noticeEndDate
          });
        }
      }
    } else if (!isVisible && availabilityStatus === 'Offline') {
      // Emit professionalWentOffline to all contractor rooms, EXCEPT the ones who have pending direct hire requests with this user
      const contractors = await User.find({ role: 'contractor' });
      const io = getIO();
      if (io) {
        const DirectHireRequest = require('../models/DirectHireRequest');
        for (const contractor of contractors) {
          const hasPending = await DirectHireRequest.findOne({
            contractorId: contractor._id,
            professionalId: user._id,
            status: 'Pending'
          });
          if (!hasPending) {
            io.to(`user:${contractor._id}`).emit('professionalWentOffline', {
              professionalId: user._id
            });
          }
        }
      }
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getProfessionalAvailability = async (req, res) => {
  try {
    const post = await AvailabilityPost.findOne({ professionalId: req.params.id });
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getEmploymentHistory = async (req, res) => {
  try {
    const history = await HiredWorker.find({
      professionalId: req.params.id,
      status: { $in: ['Completed', 'Resigned', 'Released'] }
    })
    .populate('contractorId', 'name companyName')
    .sort({ joinedAt: -1 });

    const formatted = history.map(h => {
      const start = h.joinedAt || h.createdAt;
      const end = h.lastWorkingDate || h.updatedAt;
      
      let duration = 'N/A';
      if (start && end) {
        const months = Math.round((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24 * 30));
        duration = months < 1 ? 'Less than a month' : months === 1 ? '1 month' : `${months} months`;
      }

      return {
        contractorName: h.contractorId?.companyName || h.contractorId?.name || 'Unknown Contractor',
        jobRole: h.jobRole,
        startDate: start,
        endDate: end,
        status: h.status,
        duration
      };
    });

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
