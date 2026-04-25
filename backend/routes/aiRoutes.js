const express = require('express');
const { reviewCode } = require('../controllers/aiController');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

router.post('/review', authMiddleware, reviewCode);

module.exports = router;