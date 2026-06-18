const ContractorReview = require('../models/ContractorReview');
const HiredWorker = require('../models/HiredWorker');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { sendMail } = require('../utils/mailer');
const { getIO } = require('../socket');
const NOTIFICATION_TABS = require('../../shared/notificationConstants.json');

// Helper to format date as "Day Month Year" e.g., "18 June 2026"
const formatDate = (date) => {
  const d = new Date(date);
  const day = d.getDate();
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
};

// Professional submits review for contractor
exports.createReview = async (req, res) => {
  try {
    const { rating, review, hiredWorkerId } = req.body;
    const professionalId = req.user.id;
    const contractorId = req.params.contractorId;

    if (!rating || !review) {
      return res.status(400).json({ message: 'Rating and review text are required.' });
    }

    if (review.length < 20 || review.length > 500) {
      return res.status(400).json({ message: 'Review must be between 20 and 500 characters.' });
    }

    // Check relationship
    const hasWorked = await HiredWorker.findOne({
      professionalId,
      contractorId
    });

    if (!hasWorked) {
      return res.status(403).json({ message: 'You can only review contractors you have worked with.' });
    }

    // Determine hiredWorkerId to save
    const hwId = hiredWorkerId || hasWorked._id;

    // Check unique compound index manually
    const existing = await ContractorReview.findOne({
      professionalId,
      contractorId,
      hiredWorkerId: hwId
    });
    if (existing) {
      return res.status(400).json({ message: 'You have already reviewed this contractor for this engagement.' });
    }

    const newReview = new ContractorReview({
      professionalId,
      contractorId,
      hiredWorkerId: hwId,
      rating: Math.min(5, Math.max(1, parseInt(rating))),
      review,
      jobPostId: hasWorked.jobPostId || null
    });

    await newReview.save();

    // Trigger average rating update on User model for Contractor
    const allReviews = await ContractorReview.find({ contractorId });
    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
    await User.findByIdAndUpdate(contractorId, {
      averageRating: parseFloat(avgRating.toFixed(1)),
      totalReviews: allReviews.length
    });

    const professional = await User.findById(professionalId);
    const contractor = await User.findById(contractorId);

    // Create Notification for contractor
    const notification = new Notification({
      userId: contractorId,
      title: 'New Review Received',
      message: `${professional.name} has left you a review with their star rating shown as ${rating} stars out of 5.`,
      type: 'General',
      actionTab: NOTIFICATION_TABS.CONTRACTOR_REVIEWS || 'reviews'
    });
    await notification.save();

    const io = getIO();
    if (io) {
      io.to(`user:${contractorId}`).emit('notification', { notification });
    }

    // Send styled email to contractor
    if (contractor.email) {
      await sendMail({
        to: contractor.email,
        subject: 'New Review on BuildR',
        html: `
          <div style="font-family: Arial, sans-serif;">
            <h2 style="color: #1E3A5F; border-bottom: 2px solid #F97316; padding-bottom: 10px;">New Review Received</h2>
            <p><strong>Professional:</strong> ${professional.name}</p>
            <p><strong>Rating:</strong> ${rating} / 5 Stars</p>
            <p style="background-color: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #F97316; font-style: italic;">
              "${review}"
            </p>
            <p style="margin-top: 25px;">
              <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard" 
                 style="background-color: #1E3A5F; color: white; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; display: inline-block;">
                View Reviews Dashboard
              </a>
            </p>
          </div>
        `
      });
    }

    res.status(201).json(newReview);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'You have already reviewed this contractor for this engagement.' });
    }
    res.status(500).json({ message: error.message });
  }
};

// Contractor fetches all reviews left on their profile
exports.getMyReviews = async (req, res) => {
  try {
    const contractorId = req.user.id;

    const reviews = await ContractorReview.find({ contractorId })
      .populate('professionalId', 'name jobRole')
      .sort({ createdAt: -1 });

    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(r => {
      const ratingKey = Math.round(r.rating);
      if (breakdown[ratingKey] !== undefined) {
        breakdown[ratingKey]++;
      }
    });

    const totalCount = reviews.length;
    const avgRating = totalCount > 0
      ? parseFloat((reviews.reduce((sum, r) => sum + r.rating, 0) / totalCount).toFixed(1))
      : 0;

    const formattedReviews = reviews.map(r => ({
      _id: r._id,
      professionalName: r.professionalId?.name || 'Anonymous',
      jobRole: r.professionalId?.jobRole || 'Professional',
      rating: r.rating,
      reviewText: r.review,
      date: formatDate(r.createdAt),
      contractorReply: r.contractorReply,
      isReported: r.isReported
    }));

    res.json({
      reviews: formattedReviews,
      averageRating: avgRating,
      totalReviewCount: totalCount,
      ratingBreakdown: breakdown
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Contractor submits a reply to a specific review left by a professional
exports.submitReply = async (req, res) => {
  try {
    const { reply } = req.body;
    const contractorId = req.user.id;
    const reviewId = req.params.reviewId;

    if (!reply || reply.trim().length === 0) {
      return res.status(400).json({ message: 'Reply text is required.' });
    }

    if (reply.length > 300) {
      return res.status(400).json({ message: 'Reply must be maximum 300 characters.' });
    }

    const review = await ContractorReview.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Review not found.' });
    }

    if (review.contractorId.toString() !== contractorId) {
      return res.status(403).json({ message: 'You are not the owner of this review.' });
    }

    if (review.contractorReply && review.contractorReply !== '') {
      return res.status(400).json({ message: 'You have already replied to this review.' });
    }

    review.contractorReply = reply;
    review.updatedAt = new Date();
    await review.save();

    const contractor = await User.findById(contractorId);

    // Create notification for professional
    const notification = new Notification({
      userId: review.professionalId,
      title: 'Contractor Replied to Your Review',
      message: `${contractor.companyName || contractor.name} has replied to your review.`,
      type: 'General',
      actionTab: NOTIFICATION_TABS.PROFESSIONAL_REVIEWS || 'reviews'
    });
    await notification.save();

    const io = getIO();
    if (io) {
      io.to(`user:${review.professionalId}`).emit('notification', { notification });
    }

    // Populate professionalId to match formatted output
    const populated = await ContractorReview.findById(reviewId).populate('professionalId', 'name jobRole');
    const formatted = {
      _id: populated._id,
      professionalName: populated.professionalId?.name || 'Anonymous',
      jobRole: populated.professionalId?.jobRole || 'Professional',
      rating: populated.rating,
      reviewText: populated.review,
      date: formatDate(populated.createdAt),
      contractorReply: populated.contractorReply,
      isReported: populated.isReported
    };

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Professional reports contractor's reply
exports.reportReview = async (req, res) => {
  try {
    const { reportReason } = req.body;
    const reviewId = req.params.reviewId;
    const professionalId = req.user.id;

    const review = await ContractorReview.findOne({ _id: reviewId, professionalId });
    if (!review) {
      return res.status(404).json({ message: 'Review not found.' });
    }

    review.isReported = true;
    review.reportReason = reportReason || 'Abusive reply';
    await review.save();

    res.json({ message: 'Report submitted successfully for admin moderation.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Public route to fetch reviews for a specific contractor
exports.getPublicReviews = async (req, res) => {
  try {
    const contractorId = req.params.contractorId;

    const reviews = await ContractorReview.find({ contractorId })
      .populate('professionalId', 'name jobRole')
      .sort({ createdAt: -1 });

    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(r => {
      const ratingKey = Math.round(r.rating);
      if (breakdown[ratingKey] !== undefined) {
        breakdown[ratingKey]++;
      }
    });

    const totalCount = reviews.length;
    const avgRating = totalCount > 0
      ? parseFloat((reviews.reduce((sum, r) => sum + r.rating, 0) / totalCount).toFixed(1))
      : 0;

    const recentReviews = reviews.slice(0, 5).map(r => ({
      _id: r._id,
      professionalName: r.professionalId?.name || 'Anonymous',
      jobRole: r.professionalId?.jobRole || 'Professional',
      rating: r.rating,
      reviewText: r.review,
      date: formatDate(r.createdAt)
    }));

    res.json({
      averageRating: avgRating,
      totalReviewCount: totalCount,
      ratingBreakdown: breakdown,
      reviews: recentReviews
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getReviewsLeft = async (req, res) => {
  try {
    const reviews = await ContractorReview.find({ professionalId: req.user.id })
      .populate('contractorId', 'name companyName')
      .sort({ createdAt: -1 });

    const formatted = reviews.map(r => ({
      _id: r._id,
      contractorName: r.contractorId?.companyName || r.contractorId?.name || 'Unknown',
      contractorId: r.contractorId?._id || r.contractorId,
      rating: r.rating,
      reviewText: r.review,
      date: formatDate(r.createdAt),
      contractorReply: r.contractorReply,
      isReported: r.isReported
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.reportProfessionalReview = async (req, res) => {
  try {
    const { reportReason } = req.body;
    const reviewId = req.params.reviewId;
    const contractorId = req.user.id;

    const review = await ContractorReview.findOne({ _id: reviewId, contractorId });
    if (!review) {
      return res.status(404).json({ message: 'Review not found.' });
    }

    review.isReported = true;
    review.reportReason = reportReason || 'Inappropriate review';
    await review.save();

    res.json({ message: 'Review reported successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
