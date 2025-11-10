const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ 
    status: 'ok', 
    message: 'Silhouette Test Server',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      framework: '/framework-v4/status',
      chat: 'POST /chat'
    }
  }));
});

server.listen(3001, () => {
  console.log('🟢 Silhouette Test Server running on port 3001');
  console.log('🔗 Health: http://localhost:3001/health');
  console.log('🔗 Framework: http://localhost:3001/framework-v4/status');
  console.log('🔗 Chat: POST http://localhost:3001/chat');
});