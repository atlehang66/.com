// backend/routes/me.js
//
// A minimal protected route to PROVE the auth middleware works before
// building anything more complex (like checkout) on top of it.
//
// Wire it into your main server file (app.js / server.js / index.js):
//
//   const meRoutes = require('./routes/me');
//   app.use('/api', meRoutes);
//
// Make sure CORS is enabled so your frontend (a different port) can
// call this:
//
//   npm install cors
//   const cors = require('cors');
//   app.use(cors());

const express = require('express');
const requireAuth = require('../middleware/auth');

const router = express.Router();

// GET /api/me — returns whichever user's token was sent, or 401 if none/invalid
router.get('/me', requireAuth, (req, res) => {
  res.json({
    id: req.user.id,
    email: req.user.email,
  });
});

module.exports = router;