import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';

import authRoutes from './routes/auth.routes.js';
import opportunitiesRoutes from './routes/opportunities.routes.js';
import skillsRoutes from './routes/skills.routes.js';
import usersRoutes from './routes/users.routes.js';
import { notFound, errorHandler } from './middlewares/errorHandler.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// ── Middlewares ──
app.use(
  cors({
    origin: [CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// ── Healthcheck & Meta ──
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    platform: 'SkillBridge API',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// ── API Routes ──
app.use('/api/auth', authRoutes);
app.use('/api/opportunities', opportunitiesRoutes);
app.use('/api/skills', skillsRoutes);
app.use('/api/users', usersRoutes);

// ── Error Handling ──
app.use(notFound);
app.use(errorHandler);

// ── Start Server ──
app.listen(PORT, () => {
  console.log(`
  ═══════════════════════════════════════════════════
  🚀 SkillBridge Node.js Backend API running!
  📡 Port:        ${PORT}
  🌍 Mode:        ${process.env.NODE_ENV || 'development'}
  🔗 Healthcheck: http://localhost:${PORT}/api/health
  ═══════════════════════════════════════════════════
  `);
});

export default app;
