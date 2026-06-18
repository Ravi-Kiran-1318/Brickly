const User = require('../models/User');
const JobPost = require('../models/JobPost');
const QuoteRequest = require('../models/QuoteRequest');
const Notification = require('../models/Notification');
const InterestRequest = require('../models/InterestRequest');
const Review = require('../models/Review');
const Contract = require('../models/Contract');
const HiredWorker = require('../models/HiredWorker');
const DirectHireRequest = require('../models/DirectHireRequest');
const { sendMail } = require('../utils/mailer');
const { getIO } = require('../socket');
const NOTIFICATION_TABS = require('../../shared/notificationConstants');

exports.getProfile = async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
};

exports.updateProfile = async (req, res) => {
  const updates = req.body;
  // Prevent role or email update via this route for security
  delete updates.role;
  delete updates.email;
  delete updates.password;

  const user = await User.findByIdAndUpdate(
    req.user.id,
    { $set: updates },
    { returnDocument: 'after', runValidators: true }
  ).select('-password');

  res.json(user);
};

exports.getStats = async (req, res) => {
  const [activeJobs, pendingQuotes, unreadNotifications, activeProjects, hiredCount] = await Promise.all([
    JobPost.countDocuments({ contractorId: req.user.id, isFilled: false }),
    QuoteRequest.countDocuments({ contractorId: req.user.id, status: 'Sent' }),
    Notification.countDocuments({ userId: req.user.id, isRead: false }),
    Contract.countDocuments({ contractorId: req.user.id, status: 'Active' }),
    HiredWorker.countDocuments({ contractorId: req.user.id, status: 'Active' })
  ]);

  res.json({
    activeJobs,
    activeProjects,
    pendingQuotes,
    unreadNotifications,
    hiredCount
  });
};

exports.getTeam = async (req, res) => {
  try {
    const workers = await HiredWorker.find({ 
      contractorId: req.user.id, 
      status: { $in: ['Active', 'ResignationPending', 'ResignationAccepted'] } 
    }).populate('professionalId', 'name phone email jobRole yearsOfExperience locationPreference about isAvailable');
    
    // Map to array of User objects so frontend logic works seamlessly
    const team = workers.filter(w => w.professionalId).map(w => {
      const user = w.professionalId.toObject();
      user.hiredWorkerId = w._id;
      user.isServingNotice = ['ResignationPending', 'ResignationAccepted'].includes(w.status);
      user.resignationReason = w.resignationReason;
      user.noticeEndDate = w.lastWorkingDate;
      return user;
    });

    res.json(team);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- Notifications ---
exports.getNotifications = async (req, res) => {
  const notifications = await Notification.find({ userId: req.user.id }).sort({ createdAt: -1 });
  res.json(notifications);
};

exports.readAllNotifications = async (req, res) => {
  await Notification.updateMany({ userId: req.user.id, isRead: false }, { isRead: true });
  res.json({ message: 'All notifications marked as read' });
};

exports.readNotification = async (req, res) => {
  await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { isRead: true });
  res.json({ message: 'Notification marked as read' });
};

exports.deleteNotification = async (req, res) => {
  await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
  res.json({ message: 'Notification deleted' });
};

exports.deleteAllNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({ userId: req.user.id });
    res.json({ message: 'All notifications deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- Interest Requests ---
exports.getInterests = async (req, res) => {
  const interests = await InterestRequest.find({ contractorId: req.user.id }).sort({ createdAt: -1 });
  res.json(interests);
};

exports.viewInterest = async (req, res) => {
  await InterestRequest.findOneAndUpdate({ _id: req.params.id, contractorId: req.user.id }, { status: 'Viewed' });
  res.json({ message: 'Interest request marked as viewed' });
};

// --- Reviews ---
exports.getMyReviews = async (req, res) => {
  const reviews = await Review.find({ targetId: req.user.id }).populate('reviewerId', 'name');
  res.json(reviews);
};

// --- Direct Hire Requests ---
exports.getSentDirectHireRequests = async (req, res) => {
  try {
    const requests = await DirectHireRequest.find({ contractorId: req.user.id })
      .populate('professionalId', 'name jobRole profilePhoto')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.requestToStay = async (req, res) => {
  try {
    const { professionalId } = req.params;
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }

    const professional = await User.findById(professionalId);
    if (!professional) return res.status(404).json({ message: 'Professional not found' });
    if (!professional.isServingNotice) return res.status(400).json({ message: 'Professional is not serving notice' });

    const contractor = await User.findById(req.user.id);
    
    const notification = new Notification({
      userId: professionalId,
      title: 'Your Contractor Wants You to Stay',
      message: `${contractor.companyName || contractor.name} has sent you a Request to Stay: ${message}`,
      type: 'Hire',
      actionTab: NOTIFICATION_TABS.PROFESSIONAL_MY_AVAILABILITY
    });
    await notification.save();

    const io = getIO();
    io.to(`user:${professionalId}`).emit('professional:requestToStay', {
      contractorName: contractor.companyName || contractor.name,
      message
    });

    if (professional.email) {
      await sendMail({
        to: professional.email,
        subject: 'Contractor Wants You to Stay',
        html: `
          <p><strong>${contractor.companyName || contractor.name}</strong> has sent you a Request to Stay:</p>
          <p><em>"${message}"</em></p>
          <p>Log in to BuildR to accept or decline this request.</p>
        `
      });
    }

    res.json({ message: 'Request to stay sent' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getPastTeam = async (req, res) => {
  try {
    const workers = await HiredWorker.find({
      contractorId: req.user.id,
      status: { $in: ['Resigned', 'Completed', 'Released'] }
    }).populate('professionalId', 'name phone email jobRole yearsOfExperience locationPreference about isAvailable profilePhoto');

    const pastTeam = workers.filter(w => w.professionalId).map(w => {
      const user = w.professionalId.toObject();
      user.hiredWorkerId = w._id;
      user.jobRole = w.jobRole;
      user.salary = w.salary;
      user.workLocation = w.workLocation;
      user.status = w.status;
      user.joinedAt = w.joinedAt;
      return user;
    });

    const uniquePast = [];
    const seen = new Set();
    for (const member of pastTeam) {
      if (!seen.has(member._id.toString())) {
        seen.add(member._id.toString());
        uniquePast.push(member);
      }
    }

    res.json(uniquePast);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
