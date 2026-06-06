const mongoose = require('mongoose');
require('dotenv').config();

const uris = [
  process.env.MONGODB_URI,
  'mongodb://bricklyadmin:Brickly%402026@ac-shh4kiu-shard-00-00.ez2mxfm.mongodb.net:27017,ac-shh4kiu-shard-00-01.ez2mxfm.mongodb.net:27017,ac-shh4kiu-shard-00-02.ez2mxfm.mongodb.net:27017/test?ssl=true&replicaSet=atlas-ez2mxf-shard-0&authSource=admin&retryWrites=true&w=majority',
  // Try without srv or replica set, just direct host
  'mongodb://bricklyadmin:Brickly%402026@ac-shh4kiu-shard-00-00.ez2mxfm.mongodb.net:27017/test?ssl=true&authSource=admin'
];

async function test() {
  for (let i = 0; i < uris.length; i++) {
    const uri = uris[i];
    console.log(`Testing URI #${i + 1}: ${uri.replace(/:([^@]+)@/, ':****@')}`);
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      console.log(`✅ Success for URI #${i + 1}`);
      await mongoose.disconnect();
      return;
    } catch (err) {
      console.error(`❌ Failed for URI #${i + 1}:`, err.message);
    }
  }
}

test();
