const DealerReview = require('../models/DealerReview');
const Order = require('../models/Order');
const User = require('../models/User');
const Notification = require('../models/Notification');
const NOTIFICATION_TABS = require('../../shared/notificationConstants');

// --- Helper to update dealer stats ---
const updateDealerRatingStats = async (dealerId) => {
  const reviews = await DealerReview.find({ dealerId });
  if (reviews.length === 0) return;

  const totalReviews = reviews.length;
  let sumProduct = 0, sumDelivery = 0, sumComm = 0, sumOverall = 0;

  reviews.forEach(r => {
    sumProduct += r.productQualityRating;
    sumDelivery += r.deliverySpeedRating;
    sumComm += r.communicationRating;
    sumOverall += r.overallRating;
  });

  await User.findByIdAndUpdate(dealerId, {
    totalReviews,
    averageProductQuality: Number((sumProduct / totalReviews).toFixed(1)),
    averageDeliverySpeed: Number((sumDelivery / totalReviews).toFixed(1)),
    averageCommunication: Number((sumComm / totalReviews).toFixed(1)),
    averageRating: Number((sumOverall / totalReviews).toFixed(1)),
  });
};

exports.submitReview = async (req, res) => {
  try {
    if (req.user.role !== 'contractor') return res.status(403).json({ message: 'Only contractors can submit reviews' });

    const { orderId, productQualityRating, deliverySpeedRating, communicationRating, reviewText } = req.body;

    const order = await Order.findById(orderId).populate('contractorId dealerId');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.contractorId._id.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized for this order' });
    if (order.status !== 'Delivered') return res.status(400).json({ message: 'Order must be delivered to leave a review' });
    if (order.isReviewed) return res.status(400).json({ message: 'You have already reviewed this order' });
    const deadline = order.reviewDeadline ? new Date(order.reviewDeadline) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    if (new Date() > deadline) {
      return res.status(400).json({ message: 'Review window has closed for this order' });
    }

    const overallRating = Number(((productQualityRating + deliverySpeedRating + communicationRating) / 3).toFixed(1));

    const review = new DealerReview({
      contractorId: req.user.id,
      dealerId: order.dealerId._id,
      orderId,
      productQualityRating,
      deliverySpeedRating,
      communicationRating,
      overallRating,
      reviewText,
      reviewDeadline: deadline
    });

    await review.save();

    order.isReviewed = true;
    await order.save();

    await updateDealerRatingStats(order.dealerId._id);

    // Notifications
    const io = req.app.get('io');
    const notification = new Notification({
      userId: order.dealerId._id,
      title: 'New Review Received',
      message: `You received a new verified review from ${order.contractorId.companyName || order.contractorId.name}.`,
      type: 'General',
      actionTab: NOTIFICATION_TABS.DEALER_OVERVIEW
    });
    await notification.save();
    if (io) {
      io.to(`user:${order.dealerId._id}`).emit('dealer:newReview', notification);
    }

    res.status(201).json(review);
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ message: 'You have already reviewed this order' });
    res.status(500).json({ message: error.message });
  }
};

exports.getDealerReviews = async (req, res) => {
  try {
    const reviews = await DealerReview.find({ dealerId: req.params.dealerId })
      .populate('contractorId', 'name companyName')
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.replyToReview = async (req, res) => {
  try {
    if (req.user.role !== 'dealer') return res.status(403).json({ message: 'Only dealers can reply to reviews' });

    const review = await DealerReview.findById(req.params.reviewId).populate('dealerId');
    if (!review) return res.status(404).json({ message: 'Review not found' });
    if (review.dealerId._id.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized for this review' });
    if (review.dealerReply) return res.status(400).json({ message: 'You have already replied to this review' });

    review.dealerReply = req.body.replyText;
    review.dealerRepliedAt = new Date();
    await review.save();

    // Notifications
    const io = req.app.get('io');
    const notification = new Notification({
      userId: review.contractorId,
      title: 'Dealer Replied to Your Review',
      message: `${review.dealerId.shopName} replied to your review.`,
      type: 'General',
      actionTab: NOTIFICATION_TABS.CONTRACTOR_ORDERS
    });
    await notification.save();
    io.to(`user:${review.contractorId}`).emit('contractor:reviewReplyReceived', notification);

    res.json(review);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMyReviews = async (req, res) => {
  try {
    const reviews = await DealerReview.find({ contractorId: req.user.id })
      .populate('dealerId', 'shopName')
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
