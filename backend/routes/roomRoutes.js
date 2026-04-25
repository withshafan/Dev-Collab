const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const roomController = require('../controllers/roomController');

// Public route (no auth) – verify access code
router.post('/verify-access', roomController.verifyAccessCode);

// All routes below require authentication
router.use(authMiddleware);

router.post('/', roomController.createRoom);
router.get('/', roomController.getRooms);
router.get('/:id', roomController.getRoomById);
router.put('/:id', roomController.updateRoom);
router.delete('/:id', roomController.deleteRoom);
router.post('/:id/snippets', roomController.addSnippet);
router.put('/snippets/:snippetId', roomController.updateSnippet);
router.delete('/snippets/:snippetId', roomController.deleteSnippet);

module.exports = router;