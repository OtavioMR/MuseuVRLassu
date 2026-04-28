import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
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

  socket.on('join', (name) => {
    // Generate a random color value when a new player joins
    const randomColor = Math.floor(Math.random() * 16777215);

    players[socket.id] = {
      x: 1, y: 8, z: -12,
      rotationY: 0,
      isMoving: false,
      name: name,
      color: randomColor
    };

    socket.emit('currentPlayers', players);

    socket.broadcast.emit('newPlayer', { id: socket.id, player: players[socket.id] });
  });

  socket.on('playerMovement', (movementData) => {
    if (players[socket.id]) {
      players[socket.id] = { ...players[socket.id], ...movementData };
      socket.broadcast.emit('playerMoved', { id: socket.id, player: players[socket.id] });
    }
  });

  socket.on('chatMessage', (msg) => {
    if (players[socket.id]) {
      io.emit('chatMessage', `${players[socket.id].name}: ${msg}`);
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