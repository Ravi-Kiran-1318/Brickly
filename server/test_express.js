const express = require('express');
const app = express();
const router = express.Router();
router.post('/test', async (req, res) => {
  res.send('ok');
});
app.use('/api', router);
console.log('App middleware stack initialized');
