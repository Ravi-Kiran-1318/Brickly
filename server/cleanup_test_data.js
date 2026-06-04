require('dotenv').config();
const mongoose = require('mongoose');

async function cleanup() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    
    const collectionsToWipe = ['orders', 'quoteresponses'];
    for (const coll of collectionsToWipe) {
      const result = await db.collection(coll).deleteMany({});
      console.log(`Deleted ${result.deletedCount} documents from ${coll}`);
    }
    
    // Also reset any accepted quotes to 'Responded' if needed, 
    // or just leave them if they don't interfere. 
    // Let's reset all quotes to 'Sent' for a truly fresh start.
    const qResult = await db.collection('quoterequests').updateMany({}, { $set: { status: 'Sent' } });
    console.log(`Reset ${qResult.modifiedCount} quote requests to 'Sent'`);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}
cleanup();
