const User = require('../models/User');
const Product = require('../models/Product');
const QuoteRequest = require('../models/QuoteRequest');
const QuoteResponse = require('../models/QuoteResponse');
const Order = require('../models/Order');
const Deal = require('../models/Deal');
const Notification = require('../models/Notification');
const { sendMail } = require('../utils/mailer');

// --- Profile ---
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const updates = req.body;
    delete updates.role;
    delete updates.email;
    delete updates.password;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { returnDocument: 'after', runValidators: true }
    ).select('-password');

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getStats = async (req, res) => {
  try {
    const [totalProducts, totalQuoteRequests, totalActiveOrders, totalActiveDeals] = await Promise.all([
      Product.countDocuments({ dealerId: req.user.id }),
      QuoteRequest.countDocuments({ dealerId: req.user.id }),
      Order.countDocuments({ dealerId: req.user.id, status: { $ne: 'Delivered' } }),
      Deal.countDocuments({ dealerId: req.user.id, validUntil: { $gte: new Date() } })
    ]);

    res.json({
      totalProducts,
      totalQuoteRequests,
      totalActiveOrders,
      totalActiveDeals
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- Products ---
exports.createProduct = async (req, res) => {
  try {
    const productData = req.body;
    if (req.file) {
      productData.imageUrl = req.file.path;
    }
    const product = new Product({
      ...productData,
      dealerId: req.user.id
    });
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getProducts = async (req, res) => {
  try {
    const { search, category } = req.query;
    const query = { dealerId: req.user.id };
    if (search) query.name = { $regex: search, $options: 'i' };
    if (category && category !== 'All') query.category = category;

    const products = await Product.find(query).sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const productData = req.body;
    if (req.file) {
      productData.imageUrl = req.file.path;
    }
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, dealerId: req.user.id },
      { $set: productData },
      { returnDocument: 'after' }
    );

    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Low stock check
    if (product.stockQuantity <= product.lowStockThreshold) {
      const io = req.app.get('io');
      const notification = new Notification({
        userId: req.user.id,
        title: 'Low Stock Alert',
        message: `Product "${product.name}" is low on stock (${product.stockQuantity} remaining).`,
        type: 'General'
      });
      await notification.save();
      io.to(`user:${req.user.id}`).emit('dealer:lowStock', notification);
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({ _id: req.params.id, dealerId: req.user.id });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- Quote Requests ---
exports.getQuotes = async (req, res) => {
  try {
    const quotes = await QuoteRequest.find({ dealerId: req.user.id })
      .populate('contractorId', 'name companyName email phone')
      .populate({
        path: 'products.productId',
        select: 'name pricePerUnit unit imageUrl'
      })
      .sort({ createdAt: -1 });
    res.json(quotes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.markQuoteViewed = async (req, res) => {
  try {
    const quote = await QuoteRequest.findOneAndUpdate(
      { _id: req.params.id, dealerId: req.user.id, status: 'Sent' },
      { status: 'Viewed' },
      { returnDocument: 'after' }
    );
    if (quote) {
      const io = req.app.get('io');
      io.to(`user:${quote.contractorId}`).emit('contractor:quoteRequestViewed', { quoteRequestId: quote._id });
    }
    res.json(quote || { message: 'Already viewed or not found' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.respondToQuote = async (req, res) => {
  try {
    const { customPrice, products, deliveryTimeline, quoteExpiryDate, message } = req.body;
    const quoteRequest = await QuoteRequest.findOne({ _id: req.params.id, dealerId: req.user.id });
    if (!quoteRequest) return res.status(404).json({ message: 'Quote request not found' });

    // Auto-calculate pricing from inventory & active deals
    const enrichedProducts = [];
    let calculatedTotal = 0;

    for (const p of products) {
      // 1. Look up inventory product price
      const inventoryProduct = p.productId
        ? await Product.findOne({ _id: p.productId, dealerId: req.user.id })
        : null;

      const inventoryPrice = inventoryProduct ? Number(inventoryProduct.pricePerUnit) : 0;

      // 2. Check for active deal on this product (match by name, case-insensitive)
      const productName = p.productName || (inventoryProduct ? inventoryProduct.name : '');
      const activeDeal = await Deal.findOne({
        dealerId: req.user.id,
        productName: { $regex: new RegExp(`^${productName}$`, 'i') },
        validUntil: { $gt: new Date() }
      });

      // 3. Determine the best price per unit
      let finalPricePerUnit;
      let dealApplied = false;
      let dealDiscount = 0;
      const quantity = Number(p.quantity);

      if (activeDeal && quantity >= activeDeal.minimumQuantity) {
        // Deal applies — use discounted price
        finalPricePerUnit = Number(activeDeal.discountedPrice);
        dealApplied = true;
        dealDiscount = Number(activeDeal.originalPrice) - Number(activeDeal.discountedPrice);
      } else if (Number(p.pricePerUnit) > 0) {
        // Dealer manually entered a price → use it
        finalPricePerUnit = Number(p.pricePerUnit);
      } else {
        // Fall back to inventory price
        finalPricePerUnit = inventoryPrice;
      }

      const subTotal = finalPricePerUnit * quantity;
      calculatedTotal += subTotal;

      enrichedProducts.push({
        productId: p.productId,
        productName: productName,
        productImage: p.productImage || (inventoryProduct ? inventoryProduct.imageUrl : '') || '',
        quantity: quantity,
        unit: p.unit || (inventoryProduct ? inventoryProduct.unit : ''),
        pricePerUnit: finalPricePerUnit,
        subTotal: subTotal,
        originalPrice: inventoryPrice,
        dealApplied: dealApplied,
        dealDiscount: dealDiscount
      });
    }

    // Use the calculated total, or the dealer's custom override if explicitly provided
    const finalTotal = (customPrice && Number(customPrice) > 0) ? Number(customPrice) : calculatedTotal;

    const response = new QuoteResponse({
      quoteRequestId: quoteRequest._id,
      dealerId: req.user.id,
      contractorId: quoteRequest.contractorId,
      customPrice: finalTotal,
      products: enrichedProducts,
      deliveryTimeline,
      quoteExpiryDate,
      message
    });
    await response.save();

    quoteRequest.status = 'Responded';
    await quoteRequest.save();

    const contractor = await User.findById(quoteRequest.contractorId);
    const dealer = await User.findById(req.user.id);

    // Notification & Socket
    const notification = new Notification({
      userId: contractor._id,
      title: 'New Quote Response',
      message: `${dealer.shopName} has responded to your quote request for ${quoteRequest.projectType || 'materials'}.`,
      type: 'Quote'
    });
    await notification.save();

    const io = req.app.get('io');
    io.to(`user:${contractor._id}`).emit('contractor:newQuoteResponse', {
      notification,
      quoteRequestId: quoteRequest._id,
      responseId: response._id
    });

    // Email
    await sendMail({
      to: contractor.email,
      subject: `New Quote Response from ${dealer.shopName}`,
      html: `
        <h2>Hello ${contractor.name},</h2>
        <p>You have received a new quote response for your project.</p>
        <p><strong>Price:</strong> ₹${finalTotal.toLocaleString()}</p>
        <p><strong>Timeline:</strong> ${deliveryTimeline}</p>
        <h4>Product Breakdown:</h4>
        <ul>
          ${enrichedProducts.map(p => `
            <li>
              ${p.productName} — ${p.quantity} ${p.unit} @ ₹${p.pricePerUnit}/unit = ₹${p.subTotal.toLocaleString()}
              ${p.dealApplied ? ` <em>(Deal applied! Save ₹${p.dealDiscount}/unit)</em>` : ''}
            </li>
          `).join('')}
        </ul>
        <p>Log in to Brickly to view full details and accept the quote.</p>
      `
    });

    res.status(201).json(response);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- Orders ---
exports.getOrders = async (req, res) => {
  try {
    console.log('Fetching orders for dealerId:', req.user.id); // DEBUG LOG
    const orders = await Order.find({ dealerId: req.user.id })
      .populate('contractorId', 'name companyName phone')
      .sort({ createdAt: -1 });
    console.log(`Found ${orders.length} orders for dealer ${req.user.id}`); // DEBUG LOG
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status, expectedDeliveryDate } = req.body;
    const order = await Order.findOne({ _id: req.params.id, dealerId: req.user.id });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    order.status = status;
    if (status === 'Dispatched' && expectedDeliveryDate) {
      order.expectedDeliveryDate = expectedDeliveryDate;
    }
    await order.save();

    const contractor = await User.findById(order.contractorId);
    const dealer = await User.findById(req.user.id);

    // Notification, Socket, Email
    const notification = new Notification({
      userId: contractor._id,
      title: 'Order Status Updated',
      message: `Your order from ${dealer.shopName} is now ${status}.`,
      type: 'Order'
    });
    await notification.save();

    const io = req.app.get('io');
    io.to(`user:${contractor._id}`).emit('contractor:orderStatusUpdate', {
      orderId: order._id,
      status,
      notification
    });

    await sendMail({
      to: contractor.email,
      subject: `Order Status: ${status}`,
      html: `
        <h2>Order Update</h2>
        <p>Your order status has been updated to <strong>${status}</strong> by ${dealer.shopName}.</p>
        ${status === 'Dispatched' ? `<p>Expected Delivery: ${new Date(expectedDeliveryDate).toLocaleDateString()}</p>` : ''}
      `
    });

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- Deals ---
exports.createDeal = async (req, res) => {
  try {
    const { productName, originalPrice, discountedPrice, minimumQuantity, validUntil, description, scheduledStartDate } = req.body;
    const deal = new Deal({
      dealerId: req.user.id,
      productName,
      originalPrice,
      discountedPrice,
      minimumQuantity,
      validUntil,
      description,
      scheduledStartDate,
      expireAt: validUntil // TTL field
    });
    await deal.save();
    res.status(201).json(deal);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getDeals = async (req, res) => {
  try {
    const deals = await Deal.find({ dealerId: req.user.id }).sort({ createdAt: -1 });
    res.json(deals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateDeal = async (req, res) => {
  try {
    const deal = await Deal.findOneAndUpdate(
      { _id: req.params.id, dealerId: req.user.id },
      { $set: req.body, expireAt: req.body.validUntil },
      { returnDocument: 'after' }
    );
    if (!deal) return res.status(404).json({ message: 'Deal not found' });
    res.json(deal);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteDeal = async (req, res) => {
  try {
    const deal = await Deal.findOneAndDelete({ _id: req.params.id, dealerId: req.user.id });
    if (!deal) return res.status(404).json({ message: 'Deal not found' });
    res.json({ message: 'Deal deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.incrementDealView = async (req, res) => {
  try {
    const deal = await Deal.findByIdAndUpdate(req.params.id, { $inc: { viewCount: 1 } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- Notifications ---
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.readAllNotifications = async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user.id, isRead: false }, { isRead: true });
    res.json({ message: 'All marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.readNotification = async (req, res) => {
  try {
    await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { isRead: true });
    res.json({ message: 'Marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- Public ---
exports.getPublicDealerProfile = async (req, res) => {
  try {
    const dealer = await User.findById(req.params.id).select('shopName categories location locationDetails address phone email gstNumber isVerified phoneVerified');
    if (!dealer) return res.status(404).json({ message: 'Dealer not found' });
    
    const [products, activeDeals] = await Promise.all([
      Product.find({ dealerId: req.params.id }).sort({ createdAt: -1 }),
      Deal.find({ dealerId: req.params.id, validUntil: { $gte: new Date() } }).sort({ createdAt: -1 })
    ]);

    res.json({ dealer, products, activeDeals });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
