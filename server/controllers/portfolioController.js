const ProjectShowcase = require('../models/ProjectShowcase');

exports.createPortfolio = async (req, res) => {
  const images = req.files ? req.files.map(file => file.path) : [];
  const portfolio = new ProjectShowcase({
    ...req.body,
    contractorId: req.user.id,
    images
  });
  await portfolio.save();
  res.status(201).json(portfolio);
};

exports.getMyPortfolio = async (req, res) => {
  const items = await ProjectShowcase.find({ contractorId: req.user.id }).sort({ createdAt: -1 });
  res.json(items);
};

exports.updatePortfolio = async (req, res) => {
  // If new images provided, we append or replace. Let's assume replace for simplicity.
  const updates = { ...req.body };
  if (req.files && req.files.length > 0) {
    updates.images = req.files.map(file => file.path);
  }

  const portfolio = await ProjectShowcase.findOneAndUpdate(
    { _id: req.params.id, contractorId: req.user.id },
    { $set: updates },
    { returnDocument: 'after' }
  );
  if (!portfolio) return res.status(404).json({ message: 'Portfolio item not found' });
  res.json(portfolio);
};

exports.deletePortfolio = async (req, res) => {
  const portfolio = await ProjectShowcase.findOneAndDelete({ _id: req.params.id, contractorId: req.user.id });
  if (!portfolio) return res.status(404).json({ message: 'Portfolio item not found' });
  res.json({ message: 'Portfolio item deleted' });
};
