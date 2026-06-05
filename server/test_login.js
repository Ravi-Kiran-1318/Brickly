const mongoose = require('mongoose');
require('dotenv').config({ path: '/home/ravikiran/Desktop/Brickly/server/.env' });
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/brickly').then(async () => {
  const User = require('/home/ravikiran/Desktop/Brickly/server/models/User.js');
  const Product = require('/home/ravikiran/Desktop/Brickly/server/models/Product.js');
  
  const dealer = await User.findOne({ role: 'dealer' });
  if (dealer) {
    console.log('Found dealer:', dealer.email);
    const product = await Product.findOne({ dealerId: dealer._id });
    if (product) {
       console.log('Found product:', product._id);
       
       // Try updating directly with Mongoose to see if there's a validation error
       try {
         const res = await Product.findOneAndUpdate(
           { _id: product._id, dealerId: dealer._id },
           { $set: { size: "10mm" } },
           { returnDocument: 'after', runValidators: true }
         );
         console.log('Mongoose update success');
       } catch (e) {
         console.error('Mongoose error:', e);
       }
    } else {
       console.log('No product found');
    }
  } else {
    console.log('No dealer found');
  }
  process.exit(0);
});
