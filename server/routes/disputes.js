const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Dispute = require('../models/Dispute');
const HiredWorker = require('../models/HiredWorker');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { getIO } = require('../socket');
const { checkAndAwardTrustedBadge } = require('../utils/badgeHelper');

// File a dispute
router.post('/', auth, async (req, res) => {
  try {
    const { hiredWorkerId, category, description, evidenceUrl } = req.body;
    if (!hiredWorkerId || !category || !description) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const record = await HiredWorker.findById(hiredWorkerId);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Employment record not found' });
    }

    let recipientId;
    if (req.user.id === record.contractorId.toString()) {
      recipientId = record.professionalId;
    } else if (req.user.id === record.professionalId.toString()) {
      recipientId = record.contractorId;
    } else {
      return res.status(403).json({ success: false, message: 'Unauthorized to file dispute for this employment' });
    }

    const dispute = await Dispute.create({
      initiatorId: req.user.id,
      recipientId,
      hiredWorkerId,
      category,
      description,
      evidenceUrl,
      status: 'open'
    });

    // Notify recipient
    const initiatorUser = await User.findById(req.user.id);
    const initiatorName = initiatorUser ? (initiatorUser.companyName || initiatorUser.name) : 'Someone';
    
    const notif = new Notification({
      userId: recipientId,
      type: 'General',
      title: 'Dispute Filed',
      message: `A dispute has been filed against you by ${initiatorName} under category: ${category.replace('_', ' ')}.`,
      actionTab: 'disputes'
    });
    await notif.save();

    const io = req.app.get('io') || getIO();
    if (io) {
      io.to(`user:${recipientId}`).emit('notification', { notification: notif });
      io.to(`user:${recipientId}`).emit('dispute:filed', { disputeId: dispute._id });
    }

    // Trigger badge evaluation if recipient is professional
    const recipientUser = await User.findById(recipientId);
    if (recipientUser && recipientUser.role === 'professional') {
      await checkAndAwardTrustedBadge(recipientId);
    }

    res.status(201).json({ success: true, data: dispute });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get my disputes
router.get('/', auth, async (req, res) => {
  try {
    const disputes = await Dispute.find({
      $or: [
        { initiatorId: req.user.id },
        { recipientId: req.user.id }
      ]
    })
    .populate('initiatorId', 'name companyName email')
    .populate('recipientId', 'name companyName email')
    .populate('hiredWorkerId', 'jobRole status')
    .sort({ createdAt: -1 });

    res.json({ success: true, data: disputes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Resolve a dispute
router.put('/:id/resolve', auth, async (req, res) => {
  try {
    const dispute = await Dispute.findById(req.params.id);
    if (!dispute) return res.status(404).json({ success: false, message: 'Dispute not found' });

    if (dispute.initiatorId.toString() !== req.user.id && dispute.recipientId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized to resolve this dispute' });
    }

    dispute.status = 'resolved';
    await dispute.save();

    // Notify the other party
    const otherUserId = dispute.initiatorId.toString() === req.user.id ? dispute.recipientId : dispute.initiatorId;
    const resolverUser = await User.findById(req.user.id);
    const resolverName = resolverUser ? (resolverUser.companyName || resolverUser.name) : 'Someone';

    const notif = new Notification({
      userId: otherUserId,
      type: 'General',
      title: 'Dispute Resolved',
      message: `The dispute under category: ${dispute.category.replace('_', ' ')} has been marked as resolved by ${resolverName}.`,
      actionTab: 'disputes'
    });
    await notif.save();

    const io = req.app.get('io') || getIO();
    if (io) {
      io.to(`user:${otherUserId}`).emit('notification', { notification: notif });
      io.to(`user:${otherUserId}`).emit('dispute:resolved', { disputeId: dispute._id });
    }

    // Trigger badge evaluation again if recipient is professional
    const record = await HiredWorker.findById(dispute.hiredWorkerId);
    if (record && record.professionalId) {
      await checkAndAwardTrustedBadge(record.professionalId);
    }

    res.json({ success: true, data: dispute });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
