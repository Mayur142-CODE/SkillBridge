import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'skillbridge_super_secret_jwt_key_2026';

/**
 * Authenticate incoming request via HttpOnly cookie or Bearer Authorization header
 */
export const authenticateToken = async (req, res, next) => {
  try {
    let token = null;

    // 1. Check HttpOnly cookie
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    // 2. Check Authorization header
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Please log in to continue.',
      });
    }

    // 3. Verify JWT
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Your session has expired. Please log in again.',
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token.',
      });
    }

    // 4. Fetch user from MongoDB
    const userId = decoded.userId || decoded.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User account not found. Please log in again.',
      });
    }

    // 5. Check account status
    if (user.status === 'suspended' || user.status === 'deactivated') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended or deactivated. Please contact support.',
      });
    }

    if (user.status === 'rejected') {
      return res.status(403).json({
        success: false,
        message: 'Your account registration was rejected.',
      });
    }

    // Attach authenticated user to request
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Require specific role(s) to access route
 */
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. This action requires the '${roles.join(' or ')}' role.`,
      });
    }

    next();
  };
};

// Backwards compatibility alias
export const requireAuth = authenticateToken;
