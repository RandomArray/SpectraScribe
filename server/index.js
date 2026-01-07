const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// --- Persistence Setup ---
// In Docker, we will mount a volume to /app/data
// For local dev, we just create a local data folder
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Serve uploaded files statically
app.use('/uploads', express.static(UPLOADS_DIR));

// --- Database Setup ---
const db = new sqlite3.Database(path.join(DATA_DIR, 'chat.db'));

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      room TEXT,
      username TEXT,
      text TEXT,
      source TEXT,
      isFinal INTEGER,
      timestamp INTEGER,
      type TEXT,
      mediaUrl TEXT,
      color TEXT
    )
  `);
});

// --- Upload Configuration ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR)
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({ storage: storage });

// --- HTTP Routes ---
app.post('/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }
    // Return the URL relative to the backend. 
    // The frontend shouldn't assume generic root unless proxied.
    // We return /uploads/filename. 
    res.json({ url: `/uploads/${req.file.filename}` });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join_room', ({ room, username }) => {
    socket.join(room);
    console.log(`User ${username} joined room ${room}`);

    // Fetch history from DB (Limit 100)
    db.all(
        `SELECT * FROM messages WHERE room = ? ORDER BY timestamp ASC LIMIT 100`, 
        [room], 
        (err, rows) => {
            if (err) {
                console.error("Error fetching history:", err);
                return;
            }
            // Convert isFinal from 0/1 to boolean
            const history = rows.map(r => ({
                ...r,
                isFinal: !!r.isFinal
            }));
            socket.emit('room_history', history);
        }
    );

    // Notify others
    const systemMsg = {
      id: Date.now().toString(),
      text: `${username} joined the chat`,
      source: 'system',
      timestamp: Date.now(),
      isFinal: true,
      type: 'text'
    };
    io.to(room).emit('receive_message', systemMsg);
  });

  socket.on('send_message', (data) => {
    // data: { room, text, username, source, isFinal, id, type, mediaUrl }
    const { room, text, username, source, isFinal, timestamp, id, type, mediaUrl } = data;
    const msgId = id ? String(id) : String(Date.now() + Math.random());
    const msgType = type || 'text';
    const msgIsFinal = isFinal !== undefined ? isFinal : true;
    const msgTimestamp = timestamp || Date.now();
    const color = getUserColor(username);

    const message = {
        id: msgId,
        room,
        text,
        username,
        source,
        timestamp: msgTimestamp,
        isFinal: msgIsFinal,
        type: msgType,
        mediaUrl: mediaUrl || null,
        color
    };

    if (source === 'transcription' && !msgIsFinal) {
        // Volatile pending message - do NOT save to DB
        io.to(room).emit('receive_message', message);
    } else {
        // Save to DB
        const stmt = db.prepare(`
            INSERT OR REPLACE INTO messages (id, room, username, text, source, isFinal, timestamp, type, mediaUrl, color)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run(
            message.id, 
            message.room, 
            message.username, 
            message.text, 
            message.source, 
            message.isFinal ? 1 : 0, 
            message.timestamp, 
            message.type, 
            message.mediaUrl, 
            message.color,
            (err) => {
                if (err) console.error("Error saving message:", err);
            }
        );
        stmt.finalize();

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
