const express = require('express');
const router = express.Router();
const contractController = require('../controllers/contractController');
const { auth } = require('../middleware/auth');

// All contract routes require authentication
router.use(auth);

router.post('/', contractController.createContract);
router.get('/my-contracts', contractController.getContractorContracts);
router.get('/:id', contractController.getContractDetails);
router.patch('/:contractId/milestones/:milestoneId', contractController.updateMilestone);
router.post('/:id/complete', contractController.completeProject);

module.exports = router;
