const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const roomRoutes = require('./routes/roomRoutes');
const aiRoutes = require('./routes/aiRoutes');          // <-- ADD AI ROUTES
const Room = require('./models/Room');
const Snippet = require('./models/Snippet');

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "http://localhost:5173", methods: ["GET", "POST"] }
});

app.use(cors());
app.use(express.json());

const testRoutes = require('./routes/testRoutes');
app.use('/api/test', testRoutes);

app.get('/');
// Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/ai', aiRoutes);                           // <-- ADD AI ENDPOINT

app.get('/', (req, res) => res.send('DevCollab API running'));

// Track which sockets are in which room
const userRooms = new Map(); // socketId -> roomId

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Join a room
  socket.on('join-room', async ({ roomId, userId, userName }) => {
    socket.join(roomId);
    userRooms.set(socket.id, roomId);
    
    // Add user to room members if not already
    try {
      const room = await Room.findById(roomId);
      if (room && !room.members.includes(userId)) {
        room.members.push(userId);
        await room.save();
      }
    } catch (err) { console.error(err); }

    // Notify others in room
    socket.to(roomId).emit('user-joined', { userId, userName });
    
    // Send current online users in this room
    const roomSockets = await io.in(roomId).fetchSockets();
    const onlineUsers = roomSockets.map(s => ({ id: s.id, userId: s.data?.userId }));
    io.to(roomId).emit('presence-update', onlineUsers);
    
    socket.data.userId = userId;
    socket.data.userName = userName;
    socket.data.roomId = roomId;
  });

  // New snippet (real-time)
  // New snippet (real-time) – broadcast populated snippet
socket.on('new-snippet', async (snippetData) => {
  const roomId = userRooms.get(socket.id);
  if (!roomId) return;
  
  // Save to DB
  const snippet = new Snippet({
    roomId: snippetData.roomId,
    authorId: snippetData.authorId,
    title: snippetData.title,
    code: snippetData.code,
    language: snippetData.language
  });
  await snippet.save();
  
  // Populate authorId before emitting
  const populated = await Snippet.findById(snippet._id).populate('authorId', 'name email');
  
  // Broadcast to everyone in the room including sender
 socket.broadcast.to(roomId).emit('snippet-added', populated);
});

// Update snippet (real-time) – broadcast populated snippet
socket.on('update-snippet', async ({ snippetId, title, code, language }) => {
  const roomId = userRooms.get(socket.id);
  if (!roomId) return;
  
  const snippet = await Snippet.findById(snippetId);
  if (!snippet) return;
  
  snippet.title = title || snippet.title;
  snippet.code = code || snippet.code;
  snippet.language = language || snippet.language;
  snippet.updatedAt = Date.now();
  await snippet.save();
  
  const populated = await Snippet.findById(snippetId).populate('authorId', 'name email');
  socket.broadcast.to(roomId).emit('snippet-updated', populated);
});
  // Delete snippet (real-time)
socket.on('delete-snippet', async ({ snippetId }) => {
  const roomId = userRooms.get(socket.id);
  if (!roomId) return;

  const snippet = await Snippet.findById(snippetId);
  if (!snippet) return;

  // Only author can delete
  if (snippet.authorId.toString() !== socket.data.userId) return;

  await snippet.deleteOne();
  io.to(roomId).emit('snippet-deleted', snippetId);
});

  // Leave room
  socket.on('leave-room', async () => {
    const roomId = userRooms.get(socket.id);
    if (roomId) {
      socket.leave(roomId);
      userRooms.delete(socket.id);
      io.to(roomId).emit('user-left', { userId: socket.data.userId });
    }
  });

  socket.on('disconnect', async () => {
    const roomId = userRooms.get(socket.id);
    if (roomId) {
      io.to(roomId).emit('user-left', { userId: socket.data.userId });
      userRooms.delete(socket.id);
    }
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server on port ${PORT}`));