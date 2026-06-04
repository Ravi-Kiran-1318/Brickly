const User = require('../models/User');
const Product = require('../models/Product');
const QuoteRequest = require('../models/QuoteRequest');
const Order = require('../models/Order');
const Deal = require('../models/Deal');
const Notification = require('../models/Notification');
const { getIO } = require('../socket');

// --- Dealer Discovery ---
exports.getAllDealers = async (req, res) => {
  try {
    const { category, nearMe } = req.query;
    let query = { role: 'dealer' };

    if (category) query.categories = category;

    if (nearMe === 'true') {
      const user = await User.findById(req.user.id);
      if (user && user.location && user.location.coordinates) {
        query.location = {
          $near: {
            $geometry: user.location,
            $maxDistance: 15000 // 15km
          }
        };
      }
    }

    const dealers = await User.find(query).select('-password');
    res.json(dealers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getDealerProfile = async (req, res) => {
  try {
    const [dealer, products, deals] = await Promise.all([
      User.findOne({ _id: req.params.id, role: 'dealer' }).select('-password'),
      Product.find({ dealerId: req.params.id }),
      Deal.find({ dealerId: req.params.id, validUntil: { $gt: new Date() } })
    ]);
    if (!dealer) return res.status(404).json({ message: 'Dealer not found' });
    res.json({ dealer, products, deals });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- Quote System ---
exports.sendQuoteRequest = async (req, res) => {
  try {
    const quote = new QuoteRequest({
      ...req.body,
      contractorId: req.user.id,
      status: 'Sent'
    });
    await quote.save();

    // Create Notification for Dealer
    const notification = new Notification({
      userId: quote.dealerId,
      type: 'Quote',
      title: 'New Quote Request',
      message: 'A contractor has sent you a new quote request.',
      relatedId: quote._id
    });
    await notification.save();

    // Socket
    const io = req.app ? req.app.get('io') : null;
    if (io) {
      io.to(quote.dealerId.toString()).emit('dealer:newQuoteRequest', {
        quoteId: quote._id,
        title: 'New Quote Request'
      });
    }

    res.status(201).json(quote);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMyQuotes = async (req, res) => {
  try {
    const quotes = await QuoteRequest.find({ contractorId: req.user.id })
      .populate('dealerId', 'shopName')
      .sort({ createdAt: -1 });
    res.json(quotes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.acceptQuote = async (req, res) => {
  try {
    const quote = await QuoteRequest.findOne({ 
      _id: req.params.id, 
      contractorId: req.user.id 
    });

    if (!quote) return res.status(404).json({ message: 'Quote not found' });

    const QuoteResponse = require('../models/QuoteResponse');
    const quoteResponse = await QuoteResponse.findOne({ 
      quoteRequestId: quote._id 
    }).sort({ createdAt: -1 });

    if (!quoteResponse) {
      return res.status(400).json({ 
        message: 'No dealer response found. Cannot confirm order without dealer quote response.' 
      });
    }

    console.log('QuoteResponse found:', JSON.stringify(quoteResponse, null, 2));
    console.log('QuoteResponse customPrice:', quoteResponse.customPrice);
    console.log('QuoteResponse products:', JSON.stringify(quoteResponse.products, null, 2));

    // Build order products directly from quoteResponse products
    // Do NOT try to match with quote products — use quoteResponse directly
    const orderProducts = quoteResponse.products.map(p => ({
      productId: p.productId,
      productName: p.productName,
      productImage: p.productImage || '',
      quantity: Number(p.quantity),
      unit: p.unit,
      pricePerUnit: Number(p.pricePerUnit),
      subTotal: Number(p.pricePerUnit) * Number(p.quantity)
    }));

    const totalAmount = Number(quoteResponse.customPrice) || 
      orderProducts.reduce((sum, p) => sum + p.subTotal, 0);

    console.log('Order products to save:', JSON.stringify(orderProducts, null, 2));
    console.log('Total amount to save:', totalAmount);

    const order = new Order({
      quoteRequestId: quote._id,
      contractorId: req.user.id,
      dealerId: quote.dealerId,
      products: orderProducts,
      totalAmount: totalAmount,
      deliveryAddress: quote.deliveryAddress,
      status: 'Pending'
    });

    await order.save();

    // Update quote status
    await QuoteRequest.findByIdAndUpdate(quote._id, { status: 'Accepted' });

    console.log('Order saved successfully:', order._id);
    console.log('Saved dealerId:', order.dealerId);
    console.log('Saved totalAmount:', order.totalAmount);

    const contractor = await User.findById(req.user.id);
    const dealer = await User.findById(order.dealerId);

    const notification = new Notification({
      userId: order.dealerId,
      type: 'Order',
      title: 'New Order Received',
      message: `${contractor.companyName || contractor.name} has confirmed an order.`
    });
    await notification.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${order.dealerId}`).emit('notification', notification);
      io.to(`user:${order.dealerId}`).emit('newOrder', order);
    }

    const { sendMail } = require('../utils/mailer');
    if (dealer && dealer.email) {
      await sendMail({
        to: dealer.email,
        subject: 'New Order Confirmed',
        html: `
          <h3>New Order Confirmed!</h3>
          <p>Order ID: <strong>#${order._id.toString().slice(-8).toUpperCase()}</strong></p>
          <p>Contractor: <strong>${contractor.companyName || contractor.name}</strong></p>
          <p>Total Amount: <strong>₹${order.totalAmount.toLocaleString()}</strong></p>
          <hr />
          <h4>Products:</h4>
          <ul>
            ${order.products.map(p => `<li>${p.productName} — ${p.quantity} ${p.unit} @ ₹${p.pricePerUnit}/unit = ₹${p.subTotal}</li>`).join('')}
          </ul>
        `
      });
    }

    res.json({ quote, order });
  } catch (error) {
    console.error('acceptQuote error:', error);
    res.status(500).json({ message: error.message });
  }
};

// --- Orders ---
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ contractorId: req.user.id })
      .populate('dealerId', 'shopName')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- Deals ---
exports.getActiveDeals = async (req, res) => {
  try {
    const { category } = req.query;
    let query = { validUntil: { $gt: new Date() } };
    
    // In a real scenario, we might filter by category here too.
    const deals = await Deal.find(query).populate('dealerId', 'shopName location').sort({ createdAt: -1 });
    res.json(deals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
