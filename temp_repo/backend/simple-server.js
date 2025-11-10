const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Basic routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Silhouette Backend Running' });
});

app.get('/api/framework-v4/status', (req, res) => {
  res.json({ 
    status: 'active', 
    version: '4.0',
    teams: 45,
    workflows: 127,
    tasks: 1543
  });
});

// Silhouette Chat endpoint
app.post('/api/silhouette/chat', (req, res) => {
  const { message } = req.body;
  console.log('Silhouette received message:', message);
  
  // Simulate Silhouette processing
  setTimeout(() => {
    res.json({
      response: `Entendido. He recibido tu mensaje: "${message}". Estoy procesando tu solicitud...`,
      timestamp: new Date().toISOString()
    });
  }, 1000);
});

// Socket.io for real-time chat
io.on('connection', (socket) => {
  console.log('User connected to Silhouette Chat');
  
  socket.on('chat-message', (data) => {
    console.log('Chat message received:', data);
    
    // Simulate Silhouette response
    setTimeout(() => {
      socket.emit('silhouette-response', {
        message: `Silhouette: He procesado "${data.message}". ¿En qué más puedo ayudarte?`,
        timestamp: new Date().toISOString()
      });
    }, 500);
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected from Silhouette Chat');
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`🟢 Silhouette Backend running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔗 Framework V4 Status: http://localhost:${PORT}/api/framework-v4/status`);
  console.log(`🤖 Silhouette Chat: POST http://localhost:${PORT}/api/silhouette/chat`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
});