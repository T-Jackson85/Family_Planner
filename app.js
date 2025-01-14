require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

// Importing Routes
const userRoutes = require('./routes/userRoutes');
const eventRoutes = require('./routes/eventRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const taskRoutes = require('./routes/taskRoutes');
const groupRoutes = require('./routes/groupRoutes');
const authUser = require("./api/auth/login");
const register = require("./api/auth/register");
const authRoutes = require('./api/auth/me');
const messageRoutes = require("./routes/messages");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // React development server
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

// Attach Socket.IO to request object
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Middleware
app.use(cors({
  origin: "http://localhost:3000", // React development server
  methods: ["GET", "POST", "PUT", "DELETE"],
}));
app.use(express.json());

// API Routes
app.use('/api', userRoutes);
app.use('/api', eventRoutes);
app.use('/api', expenseRoutes);
app.use('/api', taskRoutes);
app.use('/api', groupRoutes);
app.use('/api', authUser);
app.use('/api', register);
app.use('/api/auth', authRoutes);
app.use('/api', messageRoutes);

// Static Files for React Frontend
app.use(express.static(path.join(__dirname, 'build')));

// Catch-All Route for React Frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Socket.IO Events
io.on('connection', (socket) => {
  // Retrieve userId from the connection query
  const userId = socket.handshake.query.userId;

  if (userId) {
    // Join a room specific to the user
    socket.join(`user-${userId}`);
    console.log(`User ${userId} connected and joined room user-${userId}`);
  }

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User ${userId} disconnected.`);
  });

  // Handle direct messages
  socket.on('sendMessage', (data) => {
    const { receiverId, content } = data;

    if (receiverId && content) {
      // Emit message to the specific room for the receiver
      io.to(`user-${receiverId}`).emit('receiveMessage', {
        senderId: userId,
        content,
        createdAt: new Date(),
      });
      console.log(`Message sent from user ${userId} to user ${receiverId}`);
    }
  });

  // Handle group invitations
  socket.on('sendGroupInvite', (data) => {
    const { groupName, groupId, email } = data;
    console.log(`Invite sent for group: ${groupName} to ${email}`);

    // Optionally emit notifications to specific user rooms
    // Example: Notify specific user room if their userId is known
    // socket.to(`user-${userId}`).emit('group-invite', { message: `You have been invited to join ${groupName}`, groupId });
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;

