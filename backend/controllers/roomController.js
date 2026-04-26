const Room = require('../models/Room');
const Snippet = require('../models/Snippet');

// Create room
const createRoom = async (req, res) => {
  try {
    const { title, description, accessCode } = req.body;
    if (!title || title.trim() === '') {
      return res.status(400).json({ message: 'Room title is required' });
    }
    const room = new Room({
      title: title.trim(),
      description: description || '',
      ownerId: req.userId,
      members: [req.userId],
      accessCode: accessCode || ''
    });
    await room.save();
    res.status(201).json(room);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all rooms where user is a member
const getRooms = async (req, res) => {
  try {
    const rooms = await Room.find({ members: req.userId })
      .populate('ownerId', 'name email');
    const publicRooms = rooms.map(room => {
      const obj = room.toObject();
      delete obj.accessCode;
      return obj;
    });
    res.json(publicRooms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single room with snippets
const getRoomById = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id)
      .populate('ownerId', 'name email')
      .populate('members', 'name email');
    if (!room) return res.status(404).json({ message: 'Room not found' });
    const snippets = await Snippet.find({ roomId: room._id })
      .populate('authorId', 'name email');

    const roomData = room.toObject();
    const hasAccessCode = !!room.accessCode;
    if (room.ownerId._id.toString() !== req.userId) {
      delete roomData.accessCode;
    }
    roomData.hasAccessCode = hasAccessCode;
    res.json({ room: roomData, snippets });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add snippet
const addSnippet = async (req, res) => {
  try {
    const { title, code, language } = req.body;
    const snippet = new Snippet({
      roomId: req.params.id,
      authorId: req.userId,
      title,
      code,
      language
    });
    await snippet.save();
    const populated = await Snippet.findById(snippet._id).populate('authorId', 'name email');
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update snippet
const updateSnippet = async (req, res) => {
  try {
    const { title, code, language } = req.body;
    const snippetId = req.params.snippetId;
    const snippet = await Snippet.findById(snippetId);
    if (!snippet) return res.status(404).json({ message: 'Snippet not found' });
    if (snippet.authorId.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    snippet.title = title || snippet.title;
    snippet.code = code || snippet.code;
    snippet.language = language || snippet.language;
    snippet.updatedAt = Date.now();
    await snippet.save();
    const populated = await Snippet.findById(snippetId).populate('authorId', 'name email');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete snippet
const deleteSnippet = async (req, res) => {
  try {
    const snippet = await Snippet.findById(req.params.snippetId);
    if (!snippet) return res.status(404).json({ message: 'Snippet not found' });
    if (snippet.authorId.toString() !== req.userId) return res.status(403).json({ message: 'Not authorized' });
    await snippet.deleteOne();
    res.json({ message: 'Snippet deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update room
const updateRoom = async (req, res) => {
  try {
    const { title, description, accessCode } = req.body;
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room not found' });
    if (room.ownerId.toString() !== req.userId) {
      return res.status(403).json({ message: 'Only owner can edit room' });
    }
    if (title) room.title = title;
    if (description !== undefined) room.description = description;
    if (accessCode !== undefined) room.accessCode = accessCode;
    await room.save();
    res.json(room);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete room
const deleteRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room not found' });
    if (room.ownerId.toString() !== req.userId) {
      return res.status(403).json({ message: 'Only owner can delete room' });
    }
    await Snippet.deleteMany({ roomId: room._id });
    await room.deleteOne();
    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Verify access code (public)
const verifyAccessCode = async (req, res) => {
  try {
    const { roomId, code } = req.body;
    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: 'Room not found' });
    if (!room.accessCode) return res.json({ valid: true });
    if (room.accessCode === code) return res.json({ valid: true });
    res.json({ valid: false });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createRoom,
  getRooms,
  getRoomById,
  addSnippet,
  updateSnippet,
  deleteSnippet,
  updateRoom,
  deleteRoom,
  verifyAccessCode
};