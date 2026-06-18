const User = require('../models/User');

// Blocks professional from applying or accepting jobs during notice period
exports.checkNoticeBlock = async (req, res, next) => {
  try {
    const HiredWorker = require('../models/HiredWorker');
    const activeWorker = await HiredWorker.findOne({
      professionalId: req.user.id,
      status: { $in: ['ResignationPending', 'ResignationAccepted'] }
    });
    
    if (activeWorker) {
      const daysRemaining = Math.ceil(
        (new Date(activeWorker.lastWorkingDate) - new Date()) / (1000 * 60 * 60 * 24)
      );
      return res.status(403).json({
        message: `You are serving a notice period. ${Math.max(0, daysRemaining)} day(s) remaining before you can join a new role.`
      });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error checking notice status' });
  }
};
