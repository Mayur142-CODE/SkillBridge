// ============================================
// SkillBridge — Design Tokens & Constants
// ============================================

export const BRAND = {
  name: 'SkillBridge',
  tagline: 'Where Skills Meet Opportunity',
  description:
    'One connected ecosystem for students, institutions, faculty and industry — from skill assessment and gap analysis to internships, placements and long-term collaboration.',
};

// Color Palette
export const COLORS = {
  obsidian: '#211A2C',
  plum: '#352044',
  ember: '#D85C3F',
  saffron: '#F2B84B',
  ivory: '#F7F3EA',
  sage: '#B8D8C0',
  charcoal: '#29252B',
};

// Role definitions
export const ROLES = [
  {
    id: 'student',
    label: 'Student',
    color: 'ember',
    hex: COLORS.ember,
    icon: 'GraduationCap',
    description: 'Build skills, discover opportunities and create your verified portfolio.',
    capabilities: [
      'Assess skills',
      'Discover opportunities',
      'Build portfolio',
      'Track applications',
    ],
    route: '/register/student',
  },
  {
    id: 'industry',
    label: 'Industry',
    color: 'saffron',
    hex: COLORS.saffron,
    icon: 'Building2',
    description: 'Discover talent, post opportunities and collaborate with institutions.',
    capabilities: [
      'Find talent',
      'Post opportunities',
      'Run programs',
      'Collaborate with universities',
    ],
    route: '/register/industry',
  },
  {
    id: 'faculty',
    label: 'Academician',
    color: 'sage',
    hex: COLORS.sage,
    icon: 'BookOpen',
    description: 'Mentor students and connect with industry.',
    capabilities: [
      'Mentor students',
      'Join FDPs',
      'Research collaboration',
      'Industry exposure',
    ],
    route: '/register/faculty',
  },
  {
    id: 'institution',
    label: 'Institution',
    color: 'ember',
    hex: '#C4705A',
    icon: 'Landmark',
    description: 'Manage students, faculty, placements and industry partnerships.',
    capabilities: [
      'Verify users',
      'Monitor students',
      'Manage placements',
      'Analyze outcomes',
    ],
    route: '/register/institution',
  },
];

// Navigation links
export const NAV_LINKS = [
  { label: 'Platform', href: '#platform' },
  { label: 'For Students', href: '#students' },
  { label: 'For Institutions', href: '#institutions' },
  { label: 'For Industry', href: '#industry' },
  { label: 'For Faculty', href: '#faculty' },
  { label: 'About', href: '#about' },
];

// Trust strip items (no fake numbers)
export const TRUST_ITEMS = [
  { label: '5 Ecosystem Roles', icon: 'Users' },
  { label: 'Skill Intelligence', icon: 'Brain' },
  { label: 'Verified Opportunities', icon: 'BadgeCheck' },
  { label: 'Industry Collaboration', icon: 'Handshake' },
  { label: 'Digital Portfolios', icon: 'FolderOpen' },
];

// Skill journey steps
export const SKILL_JOURNEY = [
  {
    step: '01',
    title: 'Assess',
    description: 'Take structured skill assessments aligned with industry standards.',
  },
  {
    step: '02',
    title: 'Understand',
    description: 'Get a clear picture of your strengths and the gaps that matter.',
  },
  {
    step: '03',
    title: 'Learn',
    description: 'Follow curated learning paths to close identified skill gaps.',
  },
  {
    step: '04',
    title: 'Apply',
    description: 'Work on live projects, internships and real industry challenges.',
  },
  {
    step: '05',
    title: 'Get Selected',
    description: 'Match with opportunities based on verified skills, not just grades.',
  },
  {
    step: '06',
    title: 'Grow',
    description: 'Build a verified portfolio and continue professional development.',
  },
];

// Collaboration types
export const COLLABORATION_TYPES = [
  'Campus Drives',
  'Internships',
  'Live Projects',
  'FDPs',
  'Guest Lectures',
  'Research',
  'Industrial Training',
];

// Footer links
export const FOOTER_SECTIONS = [
  {
    title: 'Platform',
    links: ['Students', 'Industry', 'Faculty', 'Institutions'],
  },
  {
    title: 'Resources',
    links: ['About', 'How it works', 'Contact'],
  },
  {
    title: 'Account',
    links: [
      { label: 'Sign In', href: '/login' },
      { label: 'Create Account', href: '/register' },
    ],
  },
];

// Mock opportunities for the discovery section
export const MOCK_OPPORTUNITIES = [
  {
    company: 'Nexora Technologies',
    role: 'Frontend Engineering Intern',
    location: 'Bengaluru, India',
    skills: ['React', 'JavaScript', 'REST APIs'],
    duration: '6 months',
    eligibility: 'B.Tech CSE — 3rd / 4th Year',
    skillMatch: 87,
    deadline: '30 Nov 2026',
    type: 'Internship',
  },
  {
    company: 'Verdant Analytics',
    role: 'Data Science Trainee',
    location: 'Hyderabad, India',
    skills: ['Python', 'Pandas', 'Machine Learning'],
    duration: '4 months',
    eligibility: 'B.Tech / M.Tech — Any Year',
    skillMatch: 72,
    deadline: '15 Dec 2026',
    type: 'Internship',
  },
  {
    company: 'Stratos Infra',
    role: 'Cloud Engineering Intern',
    location: 'Remote',
    skills: ['AWS', 'Docker', 'Linux'],
    duration: '3 months',
    eligibility: 'B.Tech IT / CSE — Final Year',
    skillMatch: 64,
    deadline: '10 Jan 2027',
    type: 'Internship',
  },
];
