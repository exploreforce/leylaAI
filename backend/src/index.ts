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

// Render.com and load balancers often probe HEAD /
app.head('/', (_req, res) => {
  res.status(200).end();
});

// API Routes
app.use('/api', apiRoutes);
app.use('/api/webhooks', webhookRoutes);

// Serve frontend static files in production BEFORE 404 handler
if (process.env.NODE_ENV === 'production') {
  const fs = require('fs');
  const publicPath = path.join(__dirname, '../public');

  if (fs.existsSync(publicPath)) {
    console.log(`📁 Serving Next.js standalone from: ${publicPath}`);

    // Serve static files
    app.use(express.static(publicPath));
    app.use('/_next/static', express.static(path.join(publicPath, '_next/static')));

    // Catch-all handler for client-side routing (non-API routes)
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/') || req.path.startsWith('/socket.io/')) {
        return next();
      }

      const indexPath = path.join(publicPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).json({ 
          error: 'Frontend index.html not found', 
          path: req.path,
          publicPath: publicPath
        });
      }
    });
  } else {
    console.log(`❌ Frontend public directory not found: ${publicPath}`);
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/') || req.path.startsWith('/socket.io/')) {
        return next();
      }
      res.status(503).json({ 
        error: 'Frontend not available', 
        message: 'Frontend build not found in public directory',
        path: req.path,
        expectedPath: publicPath
      });
    });
  }
}

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

// 404 handler (after static/frontend handlers)
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Serve frontend static files in production
if (process.env.NODE_ENV === 'production') {
  const fs = require('fs');
  
  // Look for frontend build in backend/public (copied from Next.js standalone)
  const publicPath = path.join(__dirname, '../public');
  
  if (fs.existsSync(publicPath)) {
    console.log(`📁 Serving Next.js standalone from: ${publicPath}`);
    
    // Serve static files
    app.use(express.static(publicPath));
    app.use('/_next/static', express.static(path.join(publicPath, '.next/static')));
    
    // Catch-all handler for client-side routing
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api/') || req.path.startsWith('/socket.io/')) {
        return;
      }
      
      const indexPath = path.join(publicPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).json({ 
          error: 'Frontend index.html not found', 
          path: req.path,
          publicPath: publicPath
        });
      }
    });
  } else {
    console.log(`❌ Frontend public directory not found: ${publicPath}`);
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api/') || req.path.startsWith('/socket.io/')) {
        return;
      }
      res.status(503).json({ 
        error: 'Frontend not available', 
        message: 'Frontend build not found in public directory',
        path: req.path,
        expectedPath: publicPath
      });
    });
  }
}

// Error handling middleware (must be last)
app.use(errorHandler);

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