const express = require('express');
const router = express.Router();

router.get('/ping', (req, res) => res.json({ message: 'pong' }));
router.post('/echo', (req, res) => res.json({ body: req.body }));

module.exports = router;