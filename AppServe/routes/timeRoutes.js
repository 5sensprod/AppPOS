// routes/timeRoutes.js
const express = require('express');
const router = express.Router();

router.get('/current', (req, res) => {
  const serverTime = {
    timestamp: Date.now(),
    iso: new Date().toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };

  res.json({
    success: true,
    data: serverTime,
  });
});

module.exports = router;
