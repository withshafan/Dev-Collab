const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  accessCode: { type: String, default: '' },   // empty = no code required
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Room', roomSchema);