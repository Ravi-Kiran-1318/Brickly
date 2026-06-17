const User = require('../models/User');

// Blocks professional from applying or accepting jobs during notice period
exports.checkNoticeBlock = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id); // req.user.id usually
    if (user.isServingNotice) {
      const daysRemaining = Math.ceil(
        (new Date(user.noticeEndDate) - new Date()) / (1000 * 60 * 60 * 24)
      );
      return res.status(403).json({
        message: `You are serving a notice period. ${daysRemaining} day(s) remaining before you can join a new role.`
      });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error checking notice status' });
  }
};
