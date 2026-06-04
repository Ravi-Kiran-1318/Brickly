const Contract = require('../models/Contract');
const InterestRequest = require('../models/InterestRequest');

exports.createContract = async (req, res) => {
  try {
    const { 
      customerId, 
      customerName, 
      projectType, 
      startDate, 
      estimatedEndDate, 
      milestones,
      interestRequestId 
    } = req.body;

    const contract = new Contract({
      contractorId: req.user.id,
      customerId,
      customerName,
      projectType,
      startDate,
      estimatedEndDate,
      milestones
    });

    await contract.save();

    // If linked to an interest request, update its status
    if (interestRequestId) {
      await InterestRequest.findByIdAndUpdate(interestRequestId, { status: 'Responded' });
    }

    res.status(201).json(contract);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getContractorContracts = async (req, res) => {
  try {
    const contracts = await Contract.find({ contractorId: req.user.id }).sort({ createdAt: -1 });
    res.json(contracts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getContractDetails = async (req, res) => {
  try {
    const contract = await Contract.findOne({ _id: req.params.id, contractorId: req.user.id });
    if (!contract) return res.status(404).json({ message: 'Contract not found' });
    res.json(contract);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateMilestone = async (req, res) => {
  try {
    const { contractId, milestoneId } = req.params;
    const { status } = req.body;

    const contract = await Contract.findOne({ _id: contractId, contractorId: req.user.id });
    if (!contract) return res.status(404).json({ message: 'Contract not found' });

    const milestone = contract.milestones.id(milestoneId);
    if (!milestone) return res.status(404).json({ message: 'Milestone not found' });

    milestone.status = status;
    await contract.save();

    // Emit socket event to customer if customerId exists
    if (contract.customerId) {
        const io = req.app.get('io');
        io.to(`user:${contract.customerId}`).emit('contract:milestoneUpdate', {
            contractId: contract._id,
            milestoneId,
            status,
            progressPercent: contract.progressPercent
        });
    }

    res.json(contract);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.completeProject = async (req, res) => {
  try {
    const contract = await Contract.findOne({ _id: req.params.id, contractorId: req.user.id });
    if (!contract) return res.status(404).json({ message: 'Contract not found' });

    contract.status = 'Completed';
    contract.actualEndDate = new Date();
    
    // Mark all milestones as Done if they aren't already? 
    // Or just check if they are done? Usually completing means everything is done.
    contract.milestones.forEach(m => {
        if (m.status !== 'Done') m.status = 'Done';
    });

    await contract.save();

    // Emit socket event
    if (contract.customerId) {
        const io = req.app.get('io');
        io.to(`user:${contract.customerId}`).emit('contract:projectCompleted', {
            contractId: contract._id,
            actualEndDate: contract.actualEndDate
        });
    }

    res.json(contract);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
