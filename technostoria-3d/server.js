import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*", // Allow all origins for development
    methods: ["GET", "POST"]
  }
});

const players = {};
const MAX_PLAYERS = 10;

io.on('connection', (socket) => {
  if (Object.keys(players).length >= MAX_PLAYERS) {
    socket.emit('serverFull');
    socket.disconnect();
    return;
  }

  console.log(`User connected: ${socket.id}`);

  // Initialize the new player with the default spawn coordinates
  players[socket.id] = {
    x: 1, y: 10, z: -10,
    rotationY: 0,
    isMoving: false
  };

  // Send the existing players to the new player
  socket.emit('currentPlayers', players);

  // Broadcast the new player to all other existing players
  socket.broadcast.emit('newPlayer', { id: socket.id, player: players[socket.id] });

  // Handle player movement broadcast
  socket.on('playerMovement', (movementData) => {
    if (players[socket.id]) {
      players[socket.id] = { ...players[socket.id], ...movementData };
      socket.broadcast.emit('playerMoved', { id: socket.id, player: players[socket.id] });
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    delete players[socket.id];
    io.emit('playerDisconnected', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Socket.IO Server listening on port ${PORT}`);
});