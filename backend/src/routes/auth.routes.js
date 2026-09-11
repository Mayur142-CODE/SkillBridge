import { Router } from 'express';
import {
  login,
  register,
  logout,
  getCurrentUser,
  forgotPassword,
  resetPassword,
} from '../controllers/auth.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

// Authentication
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', authenticateToken, getCurrentUser);

// Registration (Supports both unified /register and role-specific endpoints)
router.post('/register', register);
router.post('/register/:role', register);

// Password recovery
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.post('/reset-password', resetPassword);

export default router;
