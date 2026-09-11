import { Router } from 'express';
import {
  login,
  registerStudent,
  registerIndustry,
  registerFaculty,
  registerInstitution,
  forgotPassword,
  resetPassword,
  getCurrentUser
} from '../controllers/auth.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/login', login);
router.post('/register/student', registerStudent);
router.post('/register/industry', registerIndustry);
router.post('/register/faculty', registerFaculty);
router.post('/register/institution', registerInstitution);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', requireAuth, getCurrentUser);

export default router;
