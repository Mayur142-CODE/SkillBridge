import { Router } from 'express';
import { opportunities } from '../data/mockDatabase.js';

const router = Router();

// GET /api/opportunities
router.get('/', (req, res) => {
  const { type, search } = req.query;
  let filtered = [...opportunities];

  if (type) {
    filtered = filtered.filter((o) => o.type.toLowerCase() === type.toLowerCase());
  }

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (o) =>
        o.role.toLowerCase().includes(q) ||
        o.company.toLowerCase().includes(q) ||
        o.skills.some((s) => s.toLowerCase().includes(q))
    );
  }

  res.status(200).json({
    success: true,
    count: filtered.length,
    data: filtered
  });
});

// GET /api/opportunities/:id
router.get('/:id', (req, res) => {
  const opp = opportunities.find((o) => o.id === req.params.id);
  if (!opp) {
    return res.status(404).json({ success: false, message: 'Opportunity not found' });
  }
  res.status(200).json({ success: true, data: opp });
});

// POST /api/opportunities
router.post('/', (req, res) => {
  const { role, company, type, location, duration, deadline, skills, eligibility } = req.body;

  if (!role || !company || !type) {
    return res.status(400).json({ success: false, message: 'Role, company, and type are required' });
  }

  const newOpp = {
    id: `opp_${Date.now()}`,
    role,
    company,
    type,
    skillMatch: 85,
    location: location || 'Remote',
    duration: duration || '3 Months',
    deadline: deadline || 'Open',
    skills: Array.isArray(skills) ? skills : [],
    eligibility: eligibility || 'All enrolled students'
  };

  opportunities.unshift(newOpp);
  res.status(201).json({ success: true, message: 'Opportunity created successfully', data: newOpp });
});

export default router;
