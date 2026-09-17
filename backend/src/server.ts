import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

import authRoutes from './routes/authRoutes';
import squadRoutes from './routes/squadRoutes';
import achievementRoutes from './routes/achievementRoutes';
import chatRoutes from './routes/chatRoutes';
import insightRoutes from './routes/insightRoutes';
import { initSocketIO } from './sockets/chatSocket';

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
initSocketIO(server);

// Middlewares
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded photos and videos statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/squads', squadRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/insights', insightRoutes);

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'AI Accountability Squad Backend',
    timestamp: new Date().toISOString(),
  });
});

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`🚀 AI Accountability Squad Backend running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket ready for live squad chat`);
});
