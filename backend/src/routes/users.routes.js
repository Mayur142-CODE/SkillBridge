import { Router } from 'express';
import { users } from '../data/mockDatabase.js';

const router = Router();

// GET /api/users/portfolio/:username
router.get('/portfolio/:username', (req, res) => {
  const { username } = req.params;

  // Search by name match or return default verified demo profile
  const user =
    users.find((u) => u.name && u.name.toLowerCase().replace(/\s+/g, '') === username.toLowerCase()) ||
    users.find((u) => u.role === 'student');

  if (!user) {
    return res.status(404).json({ success: false, message: 'Portfolio not found' });
  }

  res.status(200).json({
    success: true,
    data: {
      name: user.name,
      avatar: user.name.charAt(0),
      university: user.university,
      branch: user.branch,
      year: user.year,
      cgpa: user.cgpa,
      verified: user.verified,
      skills: user.skills || [],
      projects: user.projects || []
    }
  });
});

export default router;
