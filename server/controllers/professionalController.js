const User = require('../models/User');
const JobPost = require('../models/JobPost');
const AvailabilityPost = require('../models/AvailabilityPost');
const Application = require('../models/Application');
const Notification = require('../models/Notification');
const { sendMail } = require('../utils/mailer');
const { getIO } = require('../socket');

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

// --- Job Feed ---
exports.getJobs = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const { minSalary, maxSalary, duration, location } = req.query;

    const query = { 
      isFilled: false,
      jobRole: { $regex: user.jobRole, $options: 'i' }
    };

    if (minSalary) query.salary = { ...query.salary, $gte: minSalary };
    if (maxSalary) query.salary = { ...query.salary, $lte: maxSalary };
    if (duration) query.duration = duration;
    if (location) query.workLocation = { $regex: location, $options: 'i' };

    const jobs = await JobPost.find(query).sort({ createdAt: -1 });

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
    const jobPost = await JobPost.findById(req.params.id);
    if (!jobPost) return res.status(404).json({ message: 'Job not found' });

    const alreadyApplied = await Application.findOne({ professionalId: req.user.id, jobPostId: jobPost._id });
    if (alreadyApplied) return res.status(400).json({ message: 'Already applied' });

    const professional = await User.findById(req.user.id);

    const application = new Application({
      jobPostId: jobPost._id,
      professionalId: req.user.id,
      contractorId: jobPost.contractorId,
      status: 'Applied'
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
      type: 'General'
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

    res.status(201).json(application);
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
        relatedId: populatedPost._id
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
    const apps = await Application.find({ professionalId: req.user.id })
      .populate('jobPostId')
      .populate('contractorId', 'name companyName')
      .sort({ appliedAt: -1 });
    res.json(apps);
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

    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.hireDirectly = async (req, res) => {
  try {
    const { availabilityPostId } = req.params;
    const post = await AvailabilityPost.findById(availabilityPostId).populate('professionalId');
    if (!post) return res.status(404).json({ message: 'Availability post not found' });

    const contractor = await User.findById(req.user.id);
    const professional = post.professionalId;

    // Notify Professional
    const notification = new Notification({
      userId: professional._id,
      title: 'Direct Hire Request!',
      message: `${contractor.companyName || contractor.name} wants to hire you directly for "${post.jobRole}".`,
      type: 'General'
    });
    await notification.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${professional._id}`).emit('professional:hiredDirectly', {
        notification,
        contractorName: contractor.companyName || contractor.name
      });
    }

    // Email
    await sendMail({
      to: professional.email,
      subject: 'Direct Hire Request from Brickly',
      html: `
        <h2>Congratulations!</h2>
        <p>You have a direct hire request from <strong>${contractor.companyName || contractor.name}</strong>.</p>
        <p><strong>Role:</strong> ${post.jobRole}</p>
        <p>Log in to Brickly to contact them.</p>
      `
    });

    res.json({ message: 'Hire request sent to professional' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
