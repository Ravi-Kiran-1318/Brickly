const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { auth } = require('../middleware/auth');

router.get('/dealer/:dealerId', reviewController.getDealerReviews);

router.use(auth);
router.post('/', reviewController.submitReview);
router.post('/:reviewId/reply', reviewController.replyToReview);
router.get('/contractor/my-reviews', reviewController.getMyReviews);

module.exports = router;
