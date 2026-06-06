const express = require('express');
const router = express.Router();
const professionalController = require('../controllers/professionalController');
const { auth, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

// All routes require professional role
router.use(auth);
router.use(requireRole('professional'));

// Profile
router.get('/profile', professionalController.getProfile);
router.put('/profile', professionalController.updateProfile);
router.get('/stats', professionalController.getStats);

// Job Feed
router.get('/jobs', professionalController.getJobs);
router.post('/jobs/:id/apply', professionalController.applyToJob);

// Availability
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

// Notifications
router.get('/notifications', professionalController.getNotifications);
router.put('/notifications/read-all', professionalController.readAllNotifications);
router.put('/notifications/:id/read', professionalController.readNotification);
router.delete('/notifications/delete-all', professionalController.deleteAllNotifications);
router.delete('/notifications/:id', professionalController.deleteNotification);

module.exports = router;
