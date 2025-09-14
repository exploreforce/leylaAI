import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import http from 'http';
import { Server } from 'socket.io';

import { errorHandler } from './middleware/errorHandler';
import { logger } from './middleware/logger';
import apiRoutes from './routes';
import { whatsappWebClient } from './services/whatsappWebClient';
import { whatsappService } from './services/whatsappService';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(logger);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api', apiRoutes);

// Socket.IO for real-time communication (test chat)
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('test-message', (data) => {
    console.log('Test message received:', data);
    // Echo back for testing
    socket.emit('test-response', {
      message: `Echo: ${data.message}`,
      timestamp: new Date().toISOString()
    });
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.IO server ready`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Initialize WhatsApp Web client
(async () => {
  try {
    await whatsappWebClient.init(async (msg) => {
      try {
        const from = (msg.from || '').split('@')[0];
        const body = msg.body || '';
        if (from && body) {
          await whatsappService.handleIncomingMessage(from, body);
        }
      } catch (e) {
        console.error('Error handling incoming WA message:', e);
      }
    });
    console.log('📲 WhatsApp Web client initialized');
  } catch (err) {
    console.error('❌ Failed to initialize WhatsApp Web client:', err);
  }
})();

export { io }; 