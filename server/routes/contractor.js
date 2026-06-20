const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../middleware/auth');
const contractorController = require('../controllers/contractor');
const jobController = require('../controllers/jobController');
const professionalController = require('../controllers/professionalController');
const portfolioController = require('../controllers/portfolioController');
const procurementController = require('../controllers/procurementController');
const upload = require('../middleware/upload');

const contractorReviewController = require('../controllers/contractorReviewController');

// Public route for contractor reviews left by professionals
router.get('/:contractorId/public-reviews', contractorReviewController.getPublicReviews);

router.use(auth);
router.use(requireRole('contractor'));

router.get('/profile', contractorController.getProfile);
router.put('/profile', contractorController.updateProfile);
router.get('/stats', contractorController.getStats);
router.get('/team', contractorController.getTeam);
router.get('/past-team', contractorController.getPastTeam);

// Job Post Routes
router.post('/jobs', jobController.createJob);
router.get('/jobs', jobController.getMyJobs);
router.put('/jobs/:id', jobController.updateJob);
router.delete('/jobs/:id', jobController.deleteJob);
router.get('/jobs/:id/applicants', jobController.getApplicants);
router.put('/jobs/:id/applicants/:applicationId/status', jobController.updateApplicantStatus);
router.post('/jobs/:id/hire/:professionalId', jobController.hireProfessional);

// Availability Post & Direct Hire Routes
router.get('/professionals', professionalController.getAllAvailability);
router.get('/professionals/:id/availability', professionalController.getProfessionalAvailability);
router.post('/direct-hire/:professionalId', professionalController.directHireRequest);
router.get('/direct-hire-requests/sent', contractorController.getSentDirectHireRequests);

// Resignation Routes
// router.post('/team/request-to-stay/:professionalId', contractorController.requestToStay);

const HiredWorker = require('../models/HiredWorker');
const RetentionOffer = require('../models/RetentionOffer');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendMail } = require('../utils/mailer');
const { getIO } = require('../socket');
const NOTIFICATION_TABS = require('../../shared/notificationConstants.json');

router.post('/hired-worker/:id/retention-offer', async (req, res) => {
  try {
    const { offerType, newSalary, newRole, newSite, message } = req.body;

    const record = await HiredWorker.findOne({
      _id: req.params.id,
      contractorId: req.user.id,
      status: { $in: ['ResignationPending', 'ResignationAccepted'] },
    });

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'No active notice period found for this employment.'
      });
    }

    const existingOffer = await RetentionOffer.findOne({
      hiredWorkerId: record._id, 
      status: 'pending',
    });
    if (existingOffer) {
      return res.status(409).json({
        success: false,
        message: 'You already have a pending retention offer for this employee.'
      });
    }

    const offer = await RetentionOffer.create({
      hiredWorkerId: record._id,
      contractorId:   req.user.id,
      professionalId: record.professionalId,
      offerType, 
      newSalary: newSalary ? parseFloat(newSalary) : undefined, 
      newRole, 
      newSite, 
      message,
    });

    const profUser = await User.findById(record.professionalId);

    const io = req.app.get('io') || getIO();
    if (io) {
      io.to(`user:${record.professionalId}`).emit('retention-offer:new', {
        offerId: offer._id, 
        contractorName: req.user.companyName || req.user.name, 
        offerType,
      });
    }

    const newNotif = new Notification({
      userId: record.professionalId,
      type: 'Hire',
      title: 'Retention Offer Received',
      message: `${req.user.companyName || req.user.name} sent you a retention offer to reconsider your resignation.`,
      actionTab: NOTIFICATION_TABS.PROFESSIONAL_MY_AVAILABILITY || 'my-availability'
    });
    await newNotif.save();

    if (io) {
      io.to(`user:${record.professionalId}`).emit('notification', { notification: newNotif });
    }

    if (profUser && profUser.email) {
      await sendMail({
        to: profUser.email,
        subject: 'Retention Offer Received',
        html: `
          <div style="font-family: Arial, sans-serif;">
            <h2 style="color: #1E3A5F; border-bottom: 2px solid #F97316; padding-bottom: 10px;">Retention Offer Received</h2>
            <p><strong>${req.user.companyName || req.user.name}</strong> has sent you a retention offer to stay on the team!</p>
            <p><strong>Offer Type:</strong> ${offerType.replace('_', ' ')}</p>
            ${message ? `<p style="font-style: italic;">"${message}"</p>` : ''}
            <p>Log in to your BuildR dashboard to respond to this offer.</p>
          </div>
        `
      }).catch(err => console.error('Failed to send retention offer email:', err));
    }

    res.status(201).json({ success: true, data: offer });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Portfolio Routes
router.post('/portfolio', (req, res, next) => { req.uploadFolder = 'portfolio'; next(); }, upload.array('images', 5), portfolioController.createPortfolio);
router.get('/portfolio', portfolioController.getMyPortfolio);
router.put('/portfolio/:id', (req, res, next) => { req.uploadFolder = 'portfolio'; next(); }, upload.array('images', 5), portfolioController.updatePortfolio);
router.delete('/portfolio/:id', portfolioController.deletePortfolio);

// Procurement & Dealer Routes
router.get('/dealers', procurementController.getAllDealers);
router.get('/dealers/:id', procurementController.getDealerProfile);
router.post('/quotes', procurementController.sendQuoteRequest);
router.get('/quotes', procurementController.getMyQuotes);
router.put('/quotes/:id/accept', procurementController.acceptQuote);
router.get('/orders', procurementController.getMyOrders);
router.get('/deals', procurementController.getActiveDeals);

// Review Routes
router.get('/reviews', contractorController.getMyReviews);
router.post('/professionals/:id/review', require('../controllers/professionalReviewController').createReview);
router.get('/professionals/:id/reviews', require('../controllers/professionalReviewController').getReviewsForProfessional);
router.get('/reviews/left', require('../controllers/professionalReviewController').getReviewsLeft);

// Professional to Contractor Reviews (left by professionals)
router.get('/my-reviews', contractorReviewController.getMyReviews);
router.put('/reviews/:reviewId/reply', contractorReviewController.submitReply);
router.put('/reviews/:reviewId/report', contractorReviewController.reportProfessionalReview);

// Notification Routes
router.get('/notifications', contractorController.getNotifications);
router.put('/notifications/read-all', contractorController.readAllNotifications);
router.put('/notifications/:id/read', contractorController.readNotification);
router.delete('/notifications/delete-all', contractorController.deleteAllNotifications);
router.delete('/notifications/:id', contractorController.deleteNotification);

// Interest Request Routes
router.get('/interests', contractorController.getInterests);
// Attendance Log Route
const Attendance = require('../models/Attendance');

router.get('/attendance-overview', async (req, res) => {
  try {
    const team = await HiredWorker.find({
      contractorId: req.user.id,
      status: { $in: ['Active', 'ResignationPending', 'ResignationAccepted', 'Completed'] }
    }).populate('professionalId', 'name phone');

    const overview = await Promise.all(team.map(async (member) => {
      const start = member.startDate || member.joinedAt || new Date();
      const end = member.endDate || null;

      const countExpectedDaysExcludingSundays = (startDate, endDate) => {
        let count = 0;
        const curDate = new Date(startDate.getTime());
        curDate.setHours(0, 0, 0, 0);
        const limitDate = new Date(endDate.getTime());
        limitDate.setHours(0, 0, 0, 0);

        while (curDate <= limitDate) {
          if (curDate.getDay() !== 0) { // 0 is Sunday
            count++;
          }
          curDate.setDate(curDate.getDate() + 1);
        }
        return count;
      };

      const countExpectedDaysIncludingSundays = (startDate, endDate) => {
        let count = 0;
        const curDate = new Date(startDate.getTime());
        curDate.setHours(0, 0, 0, 0);
        const limitDate = new Date(endDate.getTime());
        limitDate.setHours(0, 0, 0, 0);

        while (curDate <= limitDate) {
          count++;
          curDate.setDate(curDate.getDate() + 1);
        }
        return count;
      };

      let totalExpectedDays = 0;
      const sDate = new Date(start);
      sDate.setHours(0, 0, 0, 0);

      const minDate = end 
        ? (new Date() < new Date(end) ? new Date() : new Date(end))
        : new Date();
      minDate.setHours(0, 0, 0, 0);

      if (minDate >= sDate) {
        if (member.includeSundays) {
          totalExpectedDays = countExpectedDaysIncludingSundays(sDate, minDate);
        } else {
          totalExpectedDays = countExpectedDaysExcludingSundays(sDate, minDate);
        }
      }

      const presentCount = await Attendance.countDocuments({
        hiredWorkerId: member._id,
        status: 'present'
      });

      return {
        hiredWorkerId:  member._id,
        name:           member.professionalId?.name || 'Unknown',
        jobRole:        member.jobRole,
        startDate:      start,
        endDate:        end,
        duration:       member.duration,
        includeSundays: member.includeSundays || false,
        totalExpectedDays: Math.max(totalExpectedDays, 0),
        presentDays:    presentCount,
        attendanceRate: totalExpectedDays > 0
          ? Math.round((presentCount / totalExpectedDays) * 100)
          : 0,
        status: ['ResignationPending', 'ResignationAccepted'].includes(member.status) ? 'notice_period' : (member.status === 'Completed' ? 'completed' : 'active'),
      };
    }));

    res.json({ success: true, data: overview });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/hired-worker/:id/attendance-log', async (req, res) => {
  try {
    const record = await HiredWorker.findOne({
      _id: req.params.id,
      contractorId: req.user.id
    });

    if (!record) {
      return res.status(404).json({ success: false, message: 'Hired worker record not found.' });
    }

    const monthQuery = req.query.month || new Date().toISOString().slice(0, 7); // 'YYYY-MM'
    const [yearStr, monthStr] = monthQuery.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const daysInMonth = new Date(year, month, 0).getDate();

    const records = await Attendance.find({
      hiredWorkerId: record._id,
      contractorId: req.user.id,
      date: { $regex: '^' + monthQuery }
    }).sort({ date: 1 });

    const presentCount = records.filter(r => r.status === 'present').length;

    res.json({
      success: true,
      records,
      presentCount,
      totalDays: daysInMonth,
      month: monthQuery
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
