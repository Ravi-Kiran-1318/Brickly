const User = require('../models/User');
const JobPost = require('../models/JobPost');
const QuoteRequest = require('../models/QuoteRequest');
const Notification = require('../models/Notification');
const InterestRequest = require('../models/InterestRequest');
const Review = require('../models/Review');
const Contract = require('../models/Contract');

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
    User.countDocuments({ hiredBy: req.user.id })
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
  const team = await User.find({ hiredBy: req.user.id }).select('name phone email jobRole yearsOfExperience specialization');
  res.json(team);
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

