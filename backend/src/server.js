import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import morgan from 'morgan';

import connectDB from './config/db.js';
import authRoutes from './routes/auth.routes.js';
import { getVerifiedInstitutions } from './controllers/auth.controller.js';
import opportunitiesRoutes from './routes/opportunities.routes.js';
import skillsRoutes from './routes/skills.routes.js';
import usersRoutes from './routes/users.routes.js';
import studentRoutes from './routes/student.routes.js';
import facultyRoutes from './routes/faculty.routes.js';
import industryRoutes from './routes/industry.routes.js';
import institutionRoutes from './routes/institution.routes.js';
import portfolioRoutes from './routes/portfolio.routes.js';
import { verifyPublicCertificate } from './controllers/certificate.controller.js';
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
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// ── Healthcheck & Meta ──
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    platform: 'SkillBridge API',
    database: 'MongoDB Atlas',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

// ── API Routes ──
app.get('/api/institutions', getVerifiedInstitutions);
app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoutes);       // Student Panel — auth+role guarded inside routes file
app.use('/api/faculty', facultyRoutes);       // Academician / Faculty Panel — auth+role guarded inside routes file
app.use('/api/industry', industryRoutes);     // Industry Panel — auth+role guarded inside routes file
app.use('/api/institution', institutionRoutes); // Institution Panel — auth+role guarded inside routes file
app.use('/api/portfolio', portfolioRoutes);   // Public Student Portfolio (sanitized, public only)
app.get('/api/certificates/verify/:verificationCode', verifyPublicCertificate); // Public Certificate Verification
app.get('/api/certificate/verify/:verificationCode', verifyPublicCertificate);  // Singular alias
app.use('/api/opportunities', opportunitiesRoutes);
app.use('/api/skills', skillsRoutes);
app.use('/api/users', usersRoutes);

// ── Error Handling ──
app.use(notFound);
app.use(errorHandler);

// ── Start Server after connecting to Database ──
const startServer = async () => {
  try {
    await connectDB();

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
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();

export default app;
