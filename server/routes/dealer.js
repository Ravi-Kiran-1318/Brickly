const express = require('express');
const router = express.Router();
const dealerController = require('../controllers/dealerController');
const { auth, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

// All routes require dealer role
router.use(auth);
router.use(requireRole('dealer'));

// Profile
router.get('/profile', dealerController.getProfile);
router.put('/profile', dealerController.updateProfile);
router.get('/stats', dealerController.getStats);

// Products
router.get('/products', dealerController.getProducts);
router.post('/products', 
  (req, res, next) => { req.uploadFolder = 'products'; next(); }, 
  upload.single('image'), 
  dealerController.createProduct
);
router.put('/products/:id', 
  (req, res, next) => { req.uploadFolder = 'products'; next(); }, 
  upload.single('image'), 
  dealerController.updateProduct
);
router.delete('/products/:id', dealerController.deleteProduct);

// Quotes
router.get('/quotes', dealerController.getQuotes);
router.put('/quotes/:id/viewed', dealerController.markQuoteViewed);
router.post('/quotes/:id/respond', dealerController.respondToQuote);

// Orders
router.get('/orders', dealerController.getOrders);
router.put('/orders/:id/status', dealerController.updateOrderStatus);

// Deals 
router.get('/deals', dealerController.getDeals);
router.post('/deals', dealerController.createDeal);
router.put('/deals/:id', dealerController.updateDeal);
router.delete('/deals/:id', dealerController.deleteDeal);
router.put('/deals/:id/view', dealerController.incrementDealView);

// Notifications
router.get('/notifications', dealerController.getNotifications);
router.put('/notifications/read-all', dealerController.readAllNotifications);
router.put('/notifications/:id/read', dealerController.readNotification);
router.delete('/notifications/:id', dealerController.deleteNotification);

module.exports = router;
