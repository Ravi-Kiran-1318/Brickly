require('dotenv').config();
const mongoose = require('mongoose');

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    const user = await db.collection('users').findOne({ _id: new mongoose.Types.ObjectId("6a1e797c95da744f8e477574") });
    console.log("Dealer User:", JSON.stringify(user, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}
check();
