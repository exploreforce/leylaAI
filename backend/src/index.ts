import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';

import { errorHandler } from './middleware/errorHandler';
import { logger } from './middleware/logger';
import apiRoutes from './routes';
import webhookRoutes from './routes/webhooks';

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
// Keep raw body for webhook signature verification
app.use(express.json({
  limit: '10mb',
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  }
}));
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
app.use('/api/webhooks', webhookRoutes);

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

// Serve frontend static files in production
if (process.env.NODE_ENV === 'production') {
  const fs = require('fs');
  
  // Check for Next.js build first
  const nextBuildPath = path.join(__dirname, '../../frontend/.next');
  const nextOutPath = path.join(__dirname, '../../frontend/out');
  const reactBuildPath = path.join(__dirname, '../../frontend/build');
  
  if (fs.existsSync(nextOutPath)) {
    // Next.js static export (out directory)
    console.log(`📁 Serving Next.js static export from: ${nextOutPath}`);
    app.use(express.static(nextOutPath));
    
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api/') || req.path.startsWith('/socket.io/')) {
        return;
      }
      const indexPath = path.join(nextOutPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).json({ error: 'Next.js index.html not found', path: req.path });
      }
    });
  } else if (fs.existsSync(reactBuildPath)) {
    // Regular React build
    console.log(`📁 Serving React build from: ${reactBuildPath}`);
    app.use(express.static(reactBuildPath));
    
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api/') || req.path.startsWith('/socket.io/')) {
        return;
      }
      res.sendFile(path.join(reactBuildPath, 'index.html'));
    });
  } else {
    // Fallback: try to serve Next.js .next directory directly (not ideal)
    console.log(`⚠️ Trying to serve Next.js .next directory directly: ${nextBuildPath}`);
    const nextStaticPath = path.join(nextBuildPath, 'static');
    
    if (fs.existsSync(nextStaticPath)) {
      app.use('/_next/static', express.static(nextStaticPath));
    }
    
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api/') || req.path.startsWith('/socket.io/')) {
        return;
      }
      // For now, return a simple message that explains the issue
      res.status(503).json({ 
        error: 'Frontend needs static export', 
        message: 'Next.js needs to be built with static export for this deployment method',
        path: req.path,
        solution: 'Add "output: \'export\'" to next.config.js and rebuild'
      });
    });
  }
}

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.IO server ready`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  if (process.env.NODE_ENV === 'production') {
    console.log(`🎯 Frontend served from built files`);
  }
});

// No local WhatsApp Web client initialization. Incoming messages arrive via WasenderAPI webhooks.

export { io }; 