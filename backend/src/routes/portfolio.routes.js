import { Router } from 'express';
import {
  getPublicPortfolio,
  getPublicAvatar,
  getPublicResume,
} from '../controllers/portfolio.controller.js';

const router = Router();

/**
 * Public Portfolio Routes
 * Base path: /api/portfolio
 * No authentication required. Only public portfolios with safe fields are exposed.
 */
router.get('/:slug', getPublicPortfolio);
router.get('/:slug/avatar', getPublicAvatar);
router.get('/:slug/resume', getPublicResume);

export default router;
