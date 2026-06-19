const mongoose = require('mongoose');
const { sendMail } = require('./mailer');
const { getIO } = require('../socket');

const checkAndAwardTrustedBadge = async (professionalId) => {
  try {
    const HiredWorker = mongoose.model('HiredWorker');
    const ProfessionalReview = mongoose.model('ProfessionalReview');
    const User = mongoose.model('User');
    const Notification = mongoose.model('Notification');
    const Dispute = mongoose.model('Dispute');

    // Count open/under_review disputes where the professional is the recipient
    const openDisputesCount = await Dispute.countDocuments({
      recipientId: professionalId,
      status: { $in: ['open', 'under_review'] }
    });

    const completedJobs = await HiredWorker.countDocuments({
      professionalId,
      status: 'Resigned'
    });

    const reviews = await ProfessionalReview.find({ professionalId });
    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    const avgRating = reviews.length > 0 ? (totalRating / reviews.length) : 0;

    const professional = await User.findById(professionalId);
    if (!professional) return;

    // If professional has open disputes, revoke the badge if they have it
    if (openDisputesCount > 0 && professional.isTrustedProfessional) {
      professional.isTrustedProfessional = false;
      await professional.save();

      const notification = new Notification({
        userId: professionalId,
        title: 'Trusted Professional Badge Suspended',
        message: 'Your Trusted Professional badge has been suspended due to an open dispute.',
        type: 'General',
        actionTab: 'my-availability'
      });
      await notification.save();

      const io = getIO();
      if (io) {
        io.to(`user:${professionalId}`).emit('notification', { notification });
        io.to(`user:${professionalId}`).emit('professional:badgeLost', { professionalId });
      }
      return;
    }

    if (completedJobs >= 3 && avgRating >= 4.0 && !professional.isTrustedProfessional && openDisputesCount === 0) {
      professional.isTrustedProfessional = true;
      professional.trustedSince = new Date();
      await professional.save();

      const notification = new Notification({
        userId: professionalId,
        title: 'Trusted Professional Badge Earned',
        message: 'Congratulations! You have earned the Trusted Professional badge for completing 3 or more jobs with excellent ratings.',
        type: 'General',
        actionTab: 'my-availability'
      });
      await notification.save();

      const io = getIO();
      if (io) {
        io.to(`user:${professionalId}`).emit('notification', { notification });
        io.to(`user:${professionalId}`).emit('professional:badgeEarned', { professionalId });
      }

      if (professional.email) {
        await sendMail({
          to: professional.email,
          subject: 'Trusted Professional Badge Earned!',
          html: `
            <div style="font-family: Arial, sans-serif;">
              <h2 style="color: #1E3A5F; border-bottom: 2px solid #F97316; padding-bottom: 10px;">Trusted Professional Badge Earned!</h2>
              <p>Congratulations! You have earned the <strong>Trusted Professional</strong> badge on Brickly!</p>
              <p>This badge is awarded to professionals who have completed 3 or more job engagements with an average rating of 4.0 stars or above.</p>
              <p>Log in to view your badge on your profile.</p>
            </div>
          `
        });
      }
    }
  } catch (error) {
    console.error('Error checking/awarding trusted badge:', error);
  }
};

module.exports = { checkAndAwardTrustedBadge };
