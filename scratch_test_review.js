const mongoose = require('mongoose');
require('dotenv').config({ path: './server/.env' });

const Order = require('./server/models/Order');
const DealerReview = require('./server/models/DealerReview');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected');
  const order = await Order.findOne({ status: 'Delivered' });
  if (order) {
    console.log('Order deadline:', order.reviewDeadline);
    if (!order.reviewDeadline) {
      console.log('NO REVIEW DEADLINE ON THIS ORDER!');
    }
  }
  process.exit(0);
}
test();
