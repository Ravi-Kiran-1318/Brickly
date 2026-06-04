const express = require('express');
const router = express.Router();
const User = require('../models/User');
const ProjectShowcase = require('../models/ProjectShowcase');
const Review = require('../models/Review');
const dealerController = require('../controllers/dealerController');

router.get('/contractors/:id', async (req, res) => {
  const [contractor, portfolio, reviews] = await Promise.all([
    User.findOne({ _id: req.params.id, role: 'contractor' }).select('-password'),
    ProjectShowcase.find({ contractorId: req.params.id }),
    Review.find({ targetId: req.params.id }).populate('reviewerId', 'name')
  ]);

  if (!contractor) return res.status(404).json({ message: 'Contractor not found' });

  // Calculate avg rating
  const avgRating = reviews.length > 0 
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
    : 0;

  res.json({
    contractor,
    portfolio,
    reviews,
    avgRating
  });
});

router.get('/dealers/:id', dealerController.getPublicDealerProfile);

module.exports = router;
