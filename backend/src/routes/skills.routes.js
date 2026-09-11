import { Router } from 'express';
import { skillsCatalog } from '../data/mockDatabase.js';

const router = Router();

// GET /api/skills
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    data: skillsCatalog
  });
});

// POST /api/skills/assess
router.post('/assess', (req, res) => {
  const { skills } = req.body;
  if (!skills || !Array.isArray(skills)) {
    return res.status(400).json({ success: false, message: 'Skills array required for assessment' });
  }

  // Calculate simulated readiness score
  const score = Math.min(100, Math.round(skills.length * 14 + 30));

  res.status(200).json({
    success: true,
    data: {
      assessedSkillsCount: skills.length,
      industryReadinessScore: score,
      recommendedNextSteps: [
        'Complete verified project milestone',
        'Request academician peer evaluation',
        'Apply for skill-matched internships'
      ]
    }
  });
});

export default router;
