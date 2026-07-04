const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { initiatePayment, handleNotify } = require('../controllers/paymentsController');

router.post('/initiate', authMiddleware, initiatePayment);
router.post('/notify', handleNotify);

module.exports = router;