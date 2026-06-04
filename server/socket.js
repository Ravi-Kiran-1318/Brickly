const { Server } = require('socket.io');

let io;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: [
        'http://localhost:5173',
        'http://localhost:3000',
        process.env.CLIENT_URL,
      ].filter(Boolean),
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    // Each user joins their own private room on login
    // Frontend emits: socket.emit('join', userId)
    socket.on('join', (userId) => {
      socket.join(`user:${userId}`);
      console.log(`User ${userId} joined room user:${userId}`);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected:', socket.id);
    });
  });

  return io;
};

// Use this in any route handler to emit events
// Import: const { getIO } = require('../socket');
// Usage:  getIO().to(`user:${userId}`).emit('event', data);
const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized. Call initSocket first.');
  return io;
};

module.exports = {
  initSocket,
  getIO
};
