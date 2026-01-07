const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Adjust for production
    methods: ["GET", "POST"]
  }
});

// Store rooms and basic history in memory for now
// In a real app, use Redis or SQL
const rooms = {}; 

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join_room', ({ room, username }) => {
    socket.join(room);
    console.log(`User ${username} joined room ${room}`);

    // Initialize room if not exists
    if (!rooms[room]) {
      rooms[room] = []; 
    }

    // Send history
    socket.emit('room_history', rooms[room]);

    // Notify others
    const systemMsg = {
      id: Date.now(),
      text: `${username} joined the chat`,
      source: 'system',
      timestamp: Date.now()
    };
    io.to(room).emit('receive_message', systemMsg);
  });

  socket.on('send_message', (data) => {
    // data: { room, text, username, source ('user'|'transcription'), isFinal }
    const { room, text, username, source, isFinal, timestamp } = data;
    
    const message = {
        id: Date.now() + Math.random(),
        text,
        username,
        source,
        timestamp: timestamp || Date.now(),
        isFinal: isFinal !== undefined ? isFinal : true, 
        color: getUserColor(username) // Assign color based on username hash
    };

    if (source === 'transcription' && !isFinal) {
        // Pending transcriptions are volatile, just emit, don't save to history yet
        socket.to(room).emit('receive_message', message);
    } else {
        // Final messages or chats get saved
        if (!rooms[room]) rooms[room] = [];
        rooms[room].push(message);
        
        // Limit history size
        if (rooms[room].length > 100) rooms[room].shift();

        io.to(room).emit('receive_message', message);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

function getUserColor(username) {
    if (!username) return '#ccc';
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
}

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
