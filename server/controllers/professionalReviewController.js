const ProfessionalReview = require('../models/ProfessionalReview');
const HiredWorker = require('../models/HiredWorker');
const { checkAndAwardTrustedBadge } = require('../utils/badgeHelper');
const Application = require('../models/Application');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { getIO } = require('../socket');
const NOTIFICATION_TABS = require('../../shared/notificationConstants');

// Contractor leaves a review for a professional
exports.createReview = async (req, res) => {
  try {
    const { rating, title, comment } = req.body;
    const contractorId = req.user.id;
    const professionalId = req.params.id;

    if (!rating || !title || !comment) {
      return res.status(400).json({ message: 'Rating, title, and comment are required' });
    }

    // Check if contractor has a relationship with this professional
    const hasRelationship = await HiredWorker.findOne({ contractorId, professionalId });
    const hasJoinedApp = await Application.findOne({ 
      contractorId, 
      professionalId, 
      status: 'Joined' 
    });

    if (!hasRelationship && !hasJoinedApp) {
      return res.status(403).json({ message: 'You can only review professionals who have worked with you' });
    }

    // Check for existing review
    const existing = await ProfessionalReview.findOne({ contractorId, professionalId });
    if (existing) {
      return res.status(400).json({ message: 'You have already reviewed this professional' });
    }

    const review = new ProfessionalReview({
      contractorId,
      professionalId,
      rating: Math.min(5, Math.max(1, parseInt(rating))),
      title,
      comment
    });
    await review.save();

    // Update professional's average rating
    const allReviews = await ProfessionalReview.find({ professionalId });
    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
    await User.findByIdAndUpdate(professionalId, { 
      averageRating: avgRating.toFixed(1),
      totalReviews: allReviews.length 
    });

    // Check if professional qualifies for trusted badge
    await checkAndAwardTrustedBadge(professionalId);

    const populated = await ProfessionalReview.findById(review._id)
      .populate('contractorId', 'name companyName');

    const contractorName = populated.contractorId.companyName || populated.contractorId.name;

    const notification = new Notification({
      userId: professionalId,
      title: 'New Review Received',
      message: `${contractorName} has left you a ${rating}-star review: "${title}"`,
      type: 'General',
      actionTab: NOTIFICATION_TABS.PROFESSIONAL_MY_REVIEWS || 'reviews'
    });
    await notification.save();

    const io = getIO();
    io.to(`user:${professionalId}`).emit('professional:newReview', populated);

    res.status(201).json(populated);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'You have already reviewed this professional' });
    }
    res.status(500).json({ message: error.message });
  }
};

// Get reviews for a specific professional (public)
exports.getReviewsForProfessional = async (req, res) => {
  try {
    const reviews = await ProfessionalReview.find({ professionalId: req.params.id })
      .populate('contractorId', 'name companyName')
      .sort({ createdAt: -1 });

    // Calculate breakdown
    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(r => { breakdown[r.rating] = (breakdown[r.rating] || 0) + 1; });
    const avgRating = reviews.length > 0 
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) 
      : 0;

    res.json({ reviews, breakdown, avgRating, totalReviews: reviews.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Professional gets their own reviews
exports.getMyReviews = async (req, res) => {
  try {
    const reviews = await ProfessionalReview.find({ professionalId: req.user.id })
      .populate('contractorId', 'name companyName')
      .sort({ createdAt: -1 });

    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(r => { breakdown[r.rating] = (breakdown[r.rating] || 0) + 1; });
    const avgRating = reviews.length > 0 
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) 
      : 0;

    res.json({ reviews, breakdown, avgRating, totalReviews: reviews.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Professional replies to a review
exports.replyToReview = async (req, res) => {
  try {
    const { reply } = req.body;
    if (!reply) return res.status(400).json({ message: 'Reply text is required' });

    const review = await ProfessionalReview.findOneAndUpdate(
      { _id: req.params.id, professionalId: req.user.id },
      { reply, repliedAt: new Date() },
      { returnDocument: 'after' }
    ).populate('contractorId', 'name companyName');

    if (!review) return res.status(404).json({ message: 'Review not found' });
    res.json(review);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Professional reports a review
exports.reportReview = async (req, res) => {
  try {
    const { reason } = req.body;
    const review = await ProfessionalReview.findOneAndUpdate(
      { _id: req.params.id, professionalId: req.user.id },
      { isReported: true, reportReason: reason || 'Inappropriate content', reportedAt: new Date() },
      { returnDocument: 'after' }
    );

    if (!review) return res.status(404).json({ message: 'Review not found' });
    res.json({ message: 'Review reported successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
