const express = require('express');
const router = express.Router();
const professionalController = require('../controllers/professionalController');
const { auth, requireRole } = require('../middleware/auth');
const { checkNoticeBlock } = require('../middleware/noticeBlock');
const upload = require('../middleware/upload');

// All routes require professional role
router.use(auth);

// Shared authenticated routes (accessible by contractors as well)
router.get('/:id/employment-history', professionalController.getEmploymentHistory);

router.use(requireRole('professional'));

// Profile
router.get('/profile', professionalController.getProfile);
router.put('/profile', professionalController.updateProfile);
router.put('/visibility', professionalController.updateVisibilityStatus);
router.get('/stats', professionalController.getStats);
router.get('/working-status', professionalController.getWorkingStatus);

// Job Feed
router.get('/jobs', professionalController.getJobs);
router.post('/jobs/:id/apply', professionalController.applyToJob);

// Availability
router.get('/my-availability', professionalController.getMyAvailabilityPosts);
router.get('/availability', professionalController.getAvailability);
router.post('/availability',
  (req, res, next) => { req.uploadFolder = 'resumes'; next(); },
  upload.fields([
    { name: 'resume', maxCount: 1 },
    { name: 'certificates', maxCount: 5 }
  ]), 
  professionalController.createAvailability
);
router.put('/availability', 
  (req, res, next) => { req.uploadFolder = 'resumes'; next(); },
  upload.fields([
    { name: 'resume', maxCount: 1 },
    { name: 'certificates', maxCount: 5 }
  ]), 
  professionalController.updateAvailability
);
router.delete('/availability', professionalController.deleteAvailability);
router.put('/availability/toggle', professionalController.toggleVisibility);

// Applications
router.get('/applications', professionalController.getMyApplications);
router.post('/applications/:id/join', professionalController.joinJob);
router.put('/applications/:id/reject', professionalController.rejectApplication);

// Direct Hire Requests
router.get('/direct-hire-requests', professionalController.getDirectHireRequests);
router.put('/direct-hire-requests/:id/join', checkNoticeBlock, professionalController.joinDirectHire);
router.put('/direct-hire-requests/:id/reject', professionalController.rejectDirectHire);

// Resignation & Notice Period
router.post('/resign', professionalController.submitResignation);
router.post('/resign/cancel', professionalController.cancelResignation);
// router.post('/request-to-stay/respond', professionalController.respondToStayRequest);
router.get('/notice-status', professionalController.getNoticeStatus);

const RetentionOffer = require('../models/RetentionOffer');
const HiredWorker = require('../models/HiredWorker');
const Application = require('../models/Application');
const AvailabilityPost = require('../models/AvailabilityPost');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { getIO } = require('../socket');
const { sendMail } = require('../utils/mailer');
const NOTIFICATION_TABS = require('../../shared/notificationConstants.json');

router.post('/retention-offer/:id/respond', async (req, res) => {
  try {
    const { accept } = req.body;

    const offer = await RetentionOffer.findOne({
      _id: req.params.id, 
      professionalId: req.user.id, 
      status: 'pending',
    });

    if (!offer) {
      return res.status(404).json({ success: false, message: 'This offer is no longer available.' });
    }

    offer.status = accept ? 'accepted' : 'rejected';
    await offer.save();

    const io = req.app.get('io') || getIO();

    if (accept) {
      const record = await HiredWorker.findById(offer.hiredWorkerId);
      if (!record) {
        return res.status(404).json({ success: false, message: 'Active worker record not found.' });
      }
      
      record.status = 'Active';
      record.resignationReason  = undefined;
      record.lastWorkingDate    = undefined;
      record.resignationSubmittedDate = undefined;

      if (offer.offerType === 'salary_raise' && offer.newSalary) record.salary = offer.newSalary;
      if (offer.offerType === 'role_change' && offer.newRole)    record.jobRole = offer.newRole;
      if (offer.offerType === 'site_change' && offer.newSite)    record.workLocation = offer.newSite;
      await record.save();

      const professional = await User.findById(req.user.id);
      if (professional) {
        professional.isServingNotice = false;
        professional.noticeStartDate = null;
        professional.noticeEndDate = null;
        await professional.save();
      }

      const application = await Application.findOne({
        professionalId: req.user.id,
        status: 'Resigned'
      }).sort({ appliedAt: -1 });

      if (application) {
        application.status = 'Joined';
        await application.save();
      } else {
        const DirectHireRequest = require('../models/DirectHireRequest');
        const directHire = await DirectHireRequest.findOne({
          professionalId: req.user.id,
          status: 'Resigned'
        }).sort({ updatedAt: -1 });
        if (directHire) {
          directHire.status = 'Joined';
          await directHire.save();
        }
      }

      await Application.updateMany(
        { professionalId: req.user.id, status: { $in: ['Applied', 'Viewed', 'Shortlisted', 'Hired'] } },
        { status: 'Withdrawn' }
      );
      await AvailabilityPost.deleteMany({ professionalId: req.user.id, isHired: false });

      if (io) {
        io.to(`user:${offer.contractorId}`).emit('retention-offer:accepted', { professionalName: req.user.name });
      }

      const notif = new Notification({
        userId: offer.contractorId,
        type: 'Hire',
        title: 'Retention Offer Accepted',
        message: `${req.user.name} accepted your retention offer and will continue working.`,
        actionTab: NOTIFICATION_TABS.CONTRACTOR_MY_TEAM || 'overview'
      });
      await notif.save();

      if (io) {
        io.to(`user:${offer.contractorId}`).emit('notification', { notification: notif });
      }

      const contractor = await User.findById(offer.contractorId);
      if (contractor && contractor.email) {
        await sendMail({
          to: contractor.email,
          subject: 'Retention Offer Accepted',
          html: `<p>Great news! <strong>${req.user.name}</strong> has accepted your retention offer and will continue working with you.</p>`
        }).catch(err => console.error('Failed to send retention accept email:', err));
      }
    } else {
      if (io) {
        io.to(`user:${offer.contractorId}`).emit('retention-offer:rejected', { professionalName: req.user.name });
      }

      const notif = new Notification({
        userId: offer.contractorId,
        type: 'Hire',
        title: 'Retention Offer Declined',
        message: `${req.user.name} declined your retention offer. Resignation will proceed.`,
        actionTab: NOTIFICATION_TABS.CONTRACTOR_MY_TEAM || 'overview'
      });
      await notif.save();

      if (io) {
        io.to(`user:${offer.contractorId}`).emit('notification', { notification: notif });
      }

      const contractor = await User.findById(offer.contractorId);
      if (contractor && contractor.email) {
        await sendMail({
          to: contractor.email,
          subject: 'Retention Offer Declined',
          html: `<p><strong>${req.user.name}</strong> declined your retention offer. Their resignation notice period will continue as scheduled.</p>`
        }).catch(err => console.error('Failed to send retention decline email:', err));
      }
    }

    res.json({
      success: true,
      message: accept ? 'Offer accepted! You are back to active status.' : 'Offer declined.'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Reviews
const profReviewController = require('../controllers/professionalReviewController');
const contractorReviewController = require('../controllers/contractorReviewController');
router.get('/my-reviews', profReviewController.getMyReviews);
router.put('/reviews/:id/reply', profReviewController.replyToReview);
router.put('/reviews/:id/report', profReviewController.reportReview);
router.post('/contractors/:contractorId/review', contractorReviewController.createReview);
router.get('/contractors/reviews/left', contractorReviewController.getReviewsLeft);
router.put('/contractor-reviews/:reviewId/report', contractorReviewController.reportReview);

// Notifications
router.get('/notifications', professionalController.getNotifications);
router.put('/notifications/read-all', professionalController.readAllNotifications);
router.put('/notifications/:id/read', professionalController.readNotification);
router.delete('/notifications/delete-all', professionalController.deleteAllNotifications);
router.delete('/notifications/:id', professionalController.deleteNotification);

// Attendance Routes
const Attendance = require('../models/Attendance');

router.post('/hired-worker/:id/check-in', async (req, res) => {
  try {
    const record = await HiredWorker.findOne({
      _id: req.params.id,
      professionalId: req.user.id,
      status: { $in: ['Active', 'ResignationPending', 'ResignationAccepted'] }
    });

    if (!record) {
      return res.status(404).json({ success: false, message: 'Active employment record not found.' });
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // Check if already checked in today
    const existing = await Attendance.findOne({
      hiredWorkerId: record._id,
      date: todayStr
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'You have already checked in today.' });
    }

    const attendance = await Attendance.create({
      hiredWorkerId: record._id,
      contractorId: record.contractorId,
      professionalId: req.user.id,
      date: todayStr,
      checkInAt: new Date(),
      status: 'present'
    });

    // Notify contractor via notification
    const contractor = await User.findById(record.contractorId);
    const professional = await User.findById(req.user.id);
    const io = req.app.get('io') || getIO();

    const notif = new Notification({
      userId: record.contractorId,
      type: 'General',
      title: 'Worker Checked In',
      message: `${professional ? professional.name : 'A worker'} has marked check-in for today.`,
      actionTab: NOTIFICATION_TABS.CONTRACTOR_MY_TEAM || 'overview'
    });
    await notif.save();

    if (io) {
      io.to(`user:${record.contractorId}`).emit('notification', { notification: notif });
      io.to(`user:${record.contractorId}`).emit('attendance:check-in', {
        hiredWorkerId: record._id,
        date: todayStr,
        professionalName: professional ? professional.name : 'A worker'
      });
    }

    res.status(201).json({ success: true, message: 'Checked in successfully.', data: attendance });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/hired-worker/:id/attendance/today', async (req, res) => {
  try {
    const record = await HiredWorker.findOne({
      _id: req.params.id,
      professionalId: req.user.id
    });

    if (!record) {
      return res.status(404).json({ success: false, message: 'Employment record not found.' });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const attendance = await Attendance.findOne({
      hiredWorkerId: record._id,
      date: todayStr
    });

    res.json({
      success: true,
      checkedIn: !!attendance,
      attendance: attendance || null
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
