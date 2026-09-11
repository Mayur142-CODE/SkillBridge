// In-memory data store with initial seed data
export const users = [
  {
    id: 'usr_student_01',
    role: 'student',
    name: 'Ananya Sharma',
    email: 'ananya@university.edu',
    phone: '+91 98765 43210',
    university: 'Indian Institute of Technology, Delhi',
    rollNumber: '2021CSE1042',
    branch: 'Computer Science',
    year: '3',
    cgpa: '8.7',
    verified: true,
    skills: [
      { name: 'React', level: 88, verified: true },
      { name: 'JavaScript', level: 92, verified: true },
      { name: 'Node.js', level: 75, verified: false },
      { name: 'Python', level: 68, verified: true },
      { name: 'REST APIs', level: 82, verified: true }
    ],
    projects: [
      { name: 'E-commerce Dashboard', tags: ['React', 'Node.js'] },
      { name: 'ML Sentiment Analyzer', tags: ['Python', 'NLP'] }
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'usr_industry_01',
    role: 'industry',
    name: 'Priya Mehta',
    companyName: 'Nexora Technologies Pvt. Ltd.',
    email: 'hr@nexora.com',
    sector: 'Information Technology',
    phone: '+91 98765 43210',
    website: 'https://nexora.com',
    verified: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'usr_faculty_01',
    role: 'faculty',
    name: 'Dr. Rajesh Kumar',
    email: 'rajesh.kumar@university.edu',
    university: 'Indian Institute of Technology, Bombay',
    department: 'Computer Science',
    designation: 'Professor',
    expertise: ['Machine Learning', 'NLP', 'Computer Vision'],
    verified: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'usr_institution_01',
    role: 'institution',
    institutionName: 'Delhi Technological University',
    aisheCode: 'U-0456',
    email: 'registrar@dtu.ac.in',
    contactPerson: 'Dr. Anil Gupta',
    phone: '+91 11 2787 1234',
    address: 'Shahbad Daulatpur, Main Bawana Road, Delhi 110042',
    verified: false,
    createdAt: new Date().toISOString()
  }
];

export const opportunities = [
  {
    id: 'opp_01',
    role: 'Frontend Engineering Intern',
    company: 'Nexora Technologies',
    type: 'Internship',
    skillMatch: 92,
    location: 'Bangalore / Remote',
    duration: '6 Months',
    deadline: 'Oct 15, 2026',
    skills: ['React', 'TypeScript', 'CSS/Design Systems'],
    eligibility: '3rd / 4th Year B.Tech • Min 7.5 CGPA'
  },
  {
    id: 'opp_02',
    role: 'AI / ML Research Associate',
    company: 'Cognitive Labs',
    type: 'Project',
    skillMatch: 78,
    location: 'Hyderabad',
    duration: '3 Months',
    deadline: 'Oct 22, 2026',
    skills: ['Python', 'PyTorch', 'Data Analysis'],
    eligibility: 'Pre-final / Final Year • Prior ML coursework'
  },
  {
    id: 'opp_03',
    role: 'Backend Systems Developer',
    company: 'Veridian Systems',
    type: 'Full-time',
    skillMatch: 64,
    location: 'Pune / Hybrid',
    duration: 'Permanent',
    deadline: 'Nov 05, 2026',
    skills: ['Node.js', 'PostgreSQL', 'Docker'],
    eligibility: 'Graduating 2027 • Hands-on project portfolio'
  }
];

export const skillsCatalog = [
  {
    category: 'Frontend & UI',
    skills: ['React', 'Vue.js', 'TypeScript', 'CSS Systems', 'HTML5', 'Next.js']
  },
  {
    category: 'Backend & APIs',
    skills: ['Node.js', 'Express', 'Python', 'Django', 'REST APIs', 'GraphQL', 'PostgreSQL']
  },
  {
    category: 'AI & Data',
    skills: ['Machine Learning', 'Deep Learning', 'PyTorch', 'TensorFlow', 'Data Analysis', 'NLP']
  },
  {
    category: 'DevOps & Cloud',
    skills: ['Docker', 'Kubernetes', 'AWS', 'CI/CD Pipelines', 'Linux']
  }
];
