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
router.post('/direct-hire/:professionalId', professionalController.directHireRequest);
router.get('/direct-hire-requests/sent', contractorController.getSentDirectHireRequests);

// Resignation Routes
router.post('/team/request-to-stay/:professionalId', contractorController.requestToStay);

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
router.put('/interests/:id/viewed', contractorController.viewInterest);

module.exports = router;
