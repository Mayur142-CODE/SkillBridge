import mongoose from 'mongoose';
import { ensureNodeDns } from '../config/dns.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import Skill from '../models/Skill.js';
import Company from '../models/Company.js';
import Opportunity from '../models/Opportunity.js';
import User from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const seedPhase6Data = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) throw new Error('MONGODB_URI missing in .env');

    console.log('Connecting to MongoDB Atlas...');
    await ensureNodeDns();
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB Atlas');

    // ── 1. Fetch Skills Map ──
    const allSkills = await Skill.find({});
    const skillMap = new Map();
    allSkills.forEach((s) => {
      skillMap.set(s.slug.toLowerCase(), s);
      skillMap.set(s.name.toLowerCase(), s);
    });

    const getSkill = (nameOrSlug) => {
      return skillMap.get(nameOrSlug.toLowerCase()) || null;
    };

    const buildSkillList = (list) => {
      return list
        .map(({ name, targetScore, importance }) => {
          const s = getSkill(name);
          return {
            skill: s ? s._id : new mongoose.Types.ObjectId(),
            skillName: s ? s.name : name,
            targetScore: targetScore || 70,
            importance: importance || 'Core',
          };
        });
    };

    const buildPrefSkillList = (list) => {
      return list
        .map(({ name, minScore }) => {
          const s = getSkill(name);
          return {
            skill: s ? s._id : new mongoose.Types.ObjectId(),
            skillName: s ? s.name : name,
            minScore: minScore || 60,
          };
        });
    };

    // ── 2. Fetch Companies ──
    const companies = await Company.find({});
    const companyMap = new Map();
    companies.forEach((c) => {
      companyMap.set(c.slug.toLowerCase(), c);
      companyMap.set(c.name.toLowerCase(), c);
    });

    const getCompany = (nameOrSlug) => {
      return companyMap.get(nameOrSlug.toLowerCase()) || null;
    };

    // Ensure SkillBridge Technologies exists
    let skillbridgeComp = getCompany('skillbridge-technologies') || getCompany('SkillBridge Technologies');
    if (!skillbridgeComp) {
      skillbridgeComp = await Company.findOneAndUpdate(
        { slug: 'skillbridge-technologies' },
        {
          $set: {
            name: 'SkillBridge Technologies',
            slug: 'skillbridge-technologies',
            sector: 'Information Technology',
            description: 'Premier national EdTech and industry bridge network powering academia-industry collaborations.',
            locations: ['Mumbai', 'Bengaluru', 'Remote'],
            website: 'https://skillbridge.dev',
            active: true,
            verified: true,
          },
        },
        { upsert: true, new: true }
      );
      companyMap.set('skillbridge-technologies', skillbridgeComp);
      companyMap.set('skillbridge technologies', skillbridgeComp);
    }

    // Link the SkillBridge Technologies partner profile to the seeded industry user
    // so the Industry Panel dashboard can scope opportunities/applications to that account.
    const industryUser = await User.findOne({ email: 'industry@skillbridge.dev' }).lean();
    if (industryUser && skillbridgeComp) {
      await Company.updateOne({ _id: skillbridgeComp._id }, { $set: { user: industryUser._id } });
    }

    const now = new Date();
    const addDays = (d) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000);
    const subDays = (d) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

    // ── 3. Define Opportunities ──
    const opportunitiesData = [
      // ── Internship: Open to All ──
      {
        title: 'Full Stack Developer Intern',
        slug: 'full-stack-developer-intern-skillbridge',
        companySlug: 'skillbridge-technologies',
        companyName: 'SkillBridge Technologies',
        type: 'Internship',
        description:
          'Join our core platform engineering team building scalable microservices and dynamic React interfaces for higher education portals across India.',
        responsibilities: [
          'Design and maintain RESTful API endpoints using Node.js and Express',
          'Implement accessible, responsive UI components with React',
          'Write automated unit and integration tests',
          'Collaborate with product designers on user experience improvements',
        ],
        requiredSkills: buildSkillList([
          { name: 'JavaScript', targetScore: 75, importance: 'Core' },
          { name: 'React', targetScore: 70, importance: 'Core' },
          { name: 'Node.js', targetScore: 65, importance: 'Core' },
          { name: 'MongoDB', targetScore: 60, importance: 'Core' },
        ]),
        preferredSkills: buildPrefSkillList([
          { name: 'Docker', minScore: 55 },
          { name: 'RESTful APIs', minScore: 65 },
        ]),
        minimumCgpa: 7.0,
        eligibleBranches: ['Computer Science & Engineering', 'Computer Science', 'Information Technology'],
        eligibleAcademicYears: ['3rd Year', '4th Year'],
        duration: '6 Months',
        stipend: '₹25,000 / month',
        salary: '',
        location: 'Remote',
        workMode: 'Remote',
        applicationDeadline: addDays(45),
        visibility: 'Open to All',
        status: 'Published',
        openings: 5,
      },

      // ── Internship: Selected Universities ──
      {
        title: 'Cloud Infrastructure Intern',
        slug: 'cloud-infrastructure-intern-cloudcore',
        companySlug: 'cloudcore-technologies',
        companyName: 'CloudCore Technologies',
        type: 'Internship',
        description:
          'Assist our site reliability and cloud architecture team in provisioning Kubernetes clusters, managing CI/CD pipelines, and monitoring AWS workloads.',
        responsibilities: [
          'Configure Terraform templates for AWS VPC and ECS provisioning',
          'Maintain Docker container registries and security vulnerability scans',
          'Setup Prometheus metrics and Grafana observability dashboards',
        ],
        requiredSkills: buildSkillList([
          { name: 'Docker', targetScore: 75, importance: 'Core' },
          { name: 'Linux System Administration', targetScore: 70, importance: 'Core' },
          { name: 'Computer Networks', targetScore: 65, importance: 'Core' },
        ]),
        preferredSkills: buildPrefSkillList([
          { name: 'Python', minScore: 60 },
          { name: 'Problem Solving', minScore: 65 },
        ]),
        minimumCgpa: 7.5,
        eligibleBranches: ['Computer Science & Engineering', 'Computer Science', 'Information Technology', 'Electronics & Telecommunication'],
        eligibleAcademicYears: ['3rd Year', '4th Year'],
        duration: '3 Months',
        stipend: '₹30,000 / month',
        salary: '',
        location: 'Mumbai, Maharashtra',
        workMode: 'Hybrid',
        applicationDeadline: addDays(30),
        visibility: 'Selected Universities',
        selectedUniversities: ['IIT Bombay', 'Veermata Jijabai Technological Institute (VJTI)', 'BITS Pilani'],
        status: 'Published',
        openings: 3,
      },

      // ── Internship: Campus Drive (IIT Bombay) ──
      {
        title: 'Cybersecurity Analyst Intern (Campus Drive)',
        slug: 'cybersecurity-analyst-intern-aerocyber-iitb',
        companySlug: 'aerocyber-dynamics',
        companyName: 'AeroCyber Dynamics',
        type: 'Internship',
        description:
          'Exclusive on-campus placement drive for IIT Bombay students. Analyze attack vectors, conduct automated penetration tests, and audit identity access policies.',
        responsibilities: [
          'Perform automated vulnerability assessments using industry standard scanners',
          'Analyze web application security flaws following OWASP Top 10 guidelines',
          'Participate in incident response drills and log forensics',
        ],
        requiredSkills: buildSkillList([
          { name: 'Computer Networks', targetScore: 75, importance: 'Core' },
          { name: 'Operating Systems', targetScore: 70, importance: 'Core' },
          { name: 'Problem Solving', targetScore: 70, importance: 'Core' },
        ]),
        preferredSkills: buildPrefSkillList([
          { name: 'Python', minScore: 65 },
          { name: 'Communication', minScore: 60 },
        ]),
        minimumCgpa: 8.0,
        eligibleBranches: ['Computer Science & Engineering', 'Computer Science', 'Information Technology'],
        eligibleAcademicYears: ['4th Year'],
        duration: '6 Months',
        stipend: '₹35,000 / month',
        salary: '',
        location: 'Mumbai, Maharashtra',
        workMode: 'Hybrid',
        applicationDeadline: addDays(25),
        visibility: 'Campus Drive',
        campusUniversity: 'IIT Bombay',
        collaborationRequired: true,
        collaborationStatus: 'Active',
        status: 'Published',
        openings: 4,
      },

      // ── Internship: Open to All (FinTech) ──
      {
        title: 'FinTech Backend Engineering Intern',
        slug: 'fintech-backend-intern-nexusfin',
        companySlug: 'nexusfin-cloud',
        companyName: 'NexusFin Cloud',
        type: 'Internship',
        description:
          'Work on high-throughput financial transactions processing, ledger reconciliation, and secure payment integrations.',
        responsibilities: [
          'Build scalable microservices with Python or Node.js',
          'Optimize PostgreSQL database queries and connection pooling',
          'Implement idempotent transaction webhooks with Redis caching',
        ],
        requiredSkills: buildSkillList([
          { name: 'Python', targetScore: 75, importance: 'Core' },
          { name: 'PostgreSQL', targetScore: 70, importance: 'Core' },
          { name: 'RESTful APIs', targetScore: 65, importance: 'Core' },
        ]),
        preferredSkills: buildPrefSkillList([
          { name: 'Docker', minScore: 60 },
          { name: 'Problem Solving', minScore: 70 },
        ]),
        minimumCgpa: 7.5,
        eligibleBranches: ['Computer Science & Engineering', 'Computer Science', 'Information Technology'],
        eligibleAcademicYears: ['3rd Year', '4th Year'],
        duration: '6 Months',
        stipend: '₹40,000 / month',
        salary: '',
        location: 'Mumbai, Maharashtra',
        workMode: 'Hybrid',
        applicationDeadline: addDays(40),
        visibility: 'Open to All',
        status: 'Published',
        openings: 2,
      },

      // ── Apprenticeship: Open to All ──
      {
        title: 'Graduate Engineering Apprentice - Cloud Systems',
        slug: 'graduate-engineering-apprentice-cloudcore',
        companySlug: 'cloudcore-technologies',
        companyName: 'CloudCore Technologies',
        type: 'Apprenticeship',
        description:
          '1-year Government of India NATS-recognized apprenticeship with deep hands-on mentoring in enterprise cloud architectures and DevOps practices.',
        responsibilities: [
          'Support DevOps engineering in continuous deployment pipelines',
          'Provision cloud infrastructure with automated IaC blueprints',
          'Conduct weekly system health checks and SLA verification',
        ],
        requiredSkills: buildSkillList([
          { name: 'Linux System Administration', targetScore: 70, importance: 'Core' },
          { name: 'Computer Networks', targetScore: 65, importance: 'Core' },
          { name: 'Docker', targetScore: 65, importance: 'Core' },
        ]),
        preferredSkills: buildPrefSkillList([
          { name: 'Python', minScore: 60 },
          { name: 'Teamwork', minScore: 65 },
        ]),
        minimumCgpa: 6.5,
        eligibleBranches: ['Computer Science & Engineering', 'Information Technology', 'Electronics & Telecommunication'],
        eligibleAcademicYears: ['4th Year'],
        duration: '12 Months',
        stipend: '₹28,000 / month',
        salary: '',
        location: 'Bengaluru, Karnataka',
        workMode: 'On-site',
        applicationDeadline: addDays(60),
        visibility: 'Open to All',
        status: 'Published',
        openings: 6,
      },

      // ── Apprenticeship: Selected Universities ──
      {
        title: 'Data Engineering Apprentice',
        slug: 'data-engineering-apprentice-healthpulse',
        companySlug: 'healthpulse-analytics',
        companyName: 'HealthPulse Analytics',
        type: 'Apprenticeship',
        description:
          'Structured industrial apprenticeship developing biomedical telemetry pipelines and large-scale data warehouses.',
        responsibilities: [
          'Design ETL pipelines using Python and SQL',
          'Validate clinical data streams against compliance frameworks',
          'Optimize analytical data queries for predictive dashboards',
        ],
        requiredSkills: buildSkillList([
          { name: 'Python', targetScore: 75, importance: 'Core' },
          { name: 'PostgreSQL', targetScore: 70, importance: 'Core' },
          { name: 'Problem Solving', targetScore: 70, importance: 'Core' },
        ]),
        preferredSkills: buildPrefSkillList([
          { name: 'Docker', minScore: 60 },
          { name: 'RESTful APIs', minScore: 65 },
        ]),
        minimumCgpa: 7.0,
        eligibleBranches: ['Computer Science & Engineering', 'Information Technology', 'Biotechnology'],
        eligibleAcademicYears: ['4th Year'],
        duration: '12 Months',
        stipend: '₹32,000 / month',
        salary: '',
        location: 'Pune, Maharashtra',
        workMode: 'Hybrid',
        applicationDeadline: addDays(50),
        visibility: 'Selected Universities',
        selectedUniversities: ['IIT Bombay', 'COEP Pune', 'BITS Pilani'],
        status: 'Published',
        openings: 3,
      },

      // ── Live Project: Campus Drive (IIT Bombay) ──
      {
        title: 'Industry Capstone: AI-Powered Vulnerability Scanner',
        slug: 'capstone-ai-vulnerability-scanner-aerocyber',
        companySlug: 'aerocyber-dynamics',
        companyName: 'AeroCyber Dynamics',
        type: 'Live Project',
        description:
          'Exclusive live industry capstone project sponsored by AeroCyber Dynamics. Students implement machine-learning heuristics for zero-day CVE detection.',
        responsibilities: [
          'Train transformer models on open vulnerability database datasets',
          'Package model inference as a low-latency gRPC service',
          'Present bi-weekly project milestone demos to senior engineering directors',
        ],
        requiredSkills: buildSkillList([
          { name: 'Python', targetScore: 80, importance: 'Core' },
          { name: 'Problem Solving', targetScore: 75, importance: 'Core' },
          { name: 'Computer Networks', targetScore: 70, importance: 'Core' },
        ]),
        preferredSkills: buildPrefSkillList([
          { name: 'Docker', minScore: 65 },
          { name: 'Communication', minScore: 70 },
        ]),
        minimumCgpa: 8.0,
        eligibleBranches: ['Computer Science & Engineering'],
        eligibleAcademicYears: ['4th Year'],
        duration: '4 Months',
        stipend: '₹20,000 Total Stipend + Certificate',
        salary: '',
        location: 'Remote',
        workMode: 'Remote',
        applicationDeadline: addDays(20),
        visibility: 'Campus Drive',
        campusUniversity: 'IIT Bombay',
        collaborationRequired: true,
        collaborationStatus: 'Active',
        status: 'Published',
        openings: 4,
      },

      // ── Live Project: Open to All ──
      {
        title: 'Interactive Assessment Engine Live Project',
        slug: 'interactive-assessment-engine-edusphere',
        companySlug: 'edusphere-learning',
        companyName: 'EduSphere Learning',
        type: 'Live Project',
        description:
          'Collaborate directly with product leads to build code-execution sandboxes and gamified skill verification flows.',
        responsibilities: [
          'Develop interactive code execution runner in isolated containers',
          'Build dynamic test results visualizer in React',
          'Benchmark execution throughput under concurrent loads',
        ],
        requiredSkills: buildSkillList([
          { name: 'JavaScript', targetScore: 75, importance: 'Core' },
          { name: 'React', targetScore: 70, importance: 'Core' },
          { name: 'Node.js', targetScore: 70, importance: 'Core' },
        ]),
        preferredSkills: buildPrefSkillList([
          { name: 'Docker', minScore: 65 },
          { name: 'Teamwork', minScore: 65 },
        ]),
        minimumCgpa: 6.5,
        eligibleBranches: [],
        eligibleAcademicYears: ['3rd Year', '4th Year'],
        duration: '3 Months',
        stipend: '₹18,000 Total Stipend',
        salary: '',
        location: 'Remote',
        workMode: 'Remote',
        applicationDeadline: addDays(35),
        visibility: 'Open to All',
        status: 'Published',
        openings: 5,
      },

      // ── Entry-level Job: Open to All ──
      {
        title: 'Associate Software Engineer - Full Stack',
        slug: 'associate-software-engineer-fullstack-skillbridge',
        companySlug: 'skillbridge-technologies',
        companyName: 'SkillBridge Technologies',
        type: 'Entry-level Job',
        description:
          'Permanent entry-level full-stack engineering role. Architect core modules for SkillBridge education network, mentor interns, and ship production releases.',
        responsibilities: [
          'Develop full-stack web applications with React, Node.js, Express, and MongoDB',
          'Architect robust schema migrations and Redis caching tiers',
          'Participate in code reviews, CI/CD automated deployments, and sprints',
        ],
        requiredSkills: buildSkillList([
          { name: 'JavaScript', targetScore: 80, importance: 'Core' },
          { name: 'React', targetScore: 75, importance: 'Core' },
          { name: 'Node.js', targetScore: 75, importance: 'Core' },
          { name: 'MongoDB', targetScore: 70, importance: 'Core' },
        ]),
        preferredSkills: buildPrefSkillList([
          { name: 'Docker', minScore: 65 },
          { name: 'RESTful APIs', minScore: 75 },
          { name: 'Problem Solving', minScore: 75 },
        ]),
        minimumCgpa: 7.5,
        eligibleBranches: ['Computer Science & Engineering', 'Computer Science', 'Information Technology'],
        eligibleAcademicYears: ['4th Year'],
        duration: 'Full-time',
        stipend: '',
        salary: '₹8,50,000 - ₹12,00,000 LPA',
        location: 'Mumbai, Maharashtra',
        workMode: 'Hybrid',
        applicationDeadline: addDays(45),
        visibility: 'Open to All',
        status: 'Published',
        openings: 8,
      },

      // ── Entry-level Job: Campus Drive (IIT Bombay) ──
      {
        title: 'Junior Security Operations Engineer (Campus Drive)',
        slug: 'junior-secops-engineer-aerocyber-iitb',
        companySlug: 'aerocyber-dynamics',
        companyName: 'AeroCyber Dynamics',
        type: 'Entry-level Job',
        description:
          'Campus recruitment drive for final-year IIT Bombay graduates. Build and maintain enterprise SOC defense infrastructure and automate threat response playbooks.',
        responsibilities: [
          'Monitor SIEM alerts and execute automated triage workflows',
          'Develop custom Python detection rules for network anomaly discovery',
          'Collaborate with cloud infrastructure teams to patch vulnerabilities',
        ],
        requiredSkills: buildSkillList([
          { name: 'Computer Networks', targetScore: 80, importance: 'Core' },
          { name: 'Linux System Administration', targetScore: 75, importance: 'Core' },
          { name: 'Problem Solving', targetScore: 75, importance: 'Core' },
        ]),
        preferredSkills: buildPrefSkillList([
          { name: 'Python', minScore: 70 },
          { name: 'Docker', minScore: 65 },
        ]),
        minimumCgpa: 8.5,
        eligibleBranches: ['Computer Science & Engineering', 'Information Technology'],
        eligibleAcademicYears: ['4th Year'],
        duration: 'Full-time',
        stipend: '',
        salary: '₹12,00,000 - ₹16,00,000 LPA',
        location: 'Hyderabad, Telangana',
        workMode: 'On-site',
        applicationDeadline: addDays(25),
        visibility: 'Campus Drive',
        campusUniversity: 'IIT Bombay',
        collaborationRequired: true,
        collaborationStatus: 'Active',
        status: 'Published',
        openings: 3,
      },

      // ── Entry-level Job: Selected Universities ──
      {
        title: 'Junior Cloud Systems Engineer',
        slug: 'junior-cloud-systems-engineer-cloudcore',
        companySlug: 'cloudcore-technologies',
        companyName: 'CloudCore Technologies',
        type: 'Entry-level Job',
        description:
          'Full-time opportunity for select premier university graduates to engineer enterprise cloud solutions, serverless clusters, and high-performance databases.',
        responsibilities: [
          'Deploy infrastructure across multi-region AWS and GCP setups',
          'Automate CI/CD pipelines with GitHub Actions and ArgoCD',
          'Optimize database queries and storage caching',
        ],
        requiredSkills: buildSkillList([
          { name: 'Docker', targetScore: 75, importance: 'Core' },
          { name: 'Linux System Administration', targetScore: 75, importance: 'Core' },
          { name: 'Computer Networks', targetScore: 70, importance: 'Core' },
        ]),
        preferredSkills: buildPrefSkillList([
          { name: 'PostgreSQL', minScore: 70 },
          { name: 'Python', minScore: 65 },
        ]),
        minimumCgpa: 8.0,
        eligibleBranches: ['Computer Science & Engineering', 'Information Technology'],
        eligibleAcademicYears: ['4th Year'],
        duration: 'Full-time',
        stipend: '',
        salary: '₹9,50,000 - ₹13,50,000 LPA',
        location: 'Bengaluru, Karnataka',
        workMode: 'Hybrid',
        applicationDeadline: addDays(40),
        visibility: 'Selected Universities',
        selectedUniversities: ['IIT Bombay', 'BITS Pilani', 'IIT Delhi'],
        status: 'Published',
        openings: 4,
      },

      // ── Restricted Campus Drive: VJTI Only (Tests that IIT Bombay student CANNOT see it) ──
      {
        title: 'Embedded Firmware Engineering Intern (VJTI Campus Drive)',
        slug: 'embedded-firmware-intern-vjti-nexusfin',
        companySlug: 'nexusfin-cloud',
        companyName: 'NexusFin Cloud',
        type: 'Internship',
        description:
          'Restricted campus recruitment drive for VJTI students only.',
        responsibilities: ['Develop embedded C routines', 'Hardware validation'],
        requiredSkills: buildSkillList([
          { name: 'Problem Solving', targetScore: 75, importance: 'Core' },
        ]),
        preferredSkills: [],
        minimumCgpa: 7.0,
        eligibleBranches: ['Computer Science & Engineering'],
        eligibleAcademicYears: ['4th Year'],
        duration: '6 Months',
        stipend: '₹30,000 / month',
        salary: '',
        location: 'Mumbai, Maharashtra',
        workMode: 'On-site',
        applicationDeadline: addDays(30),
        visibility: 'Campus Drive',
        campusUniversity: 'Veermata Jijabai Technological Institute (VJTI)',
        collaborationRequired: true,
        collaborationStatus: 'Active',
        status: 'Published',
        openings: 2,
      },

      // ── Restricted Selected Universities: Delhi University Only (Tests that IIT Bombay student CANNOT see it) ──
      {
        title: 'Instructional Design Intern (DU Selected Drive)',
        slug: 'instructional-design-intern-du-edusphere',
        companySlug: 'edusphere-learning',
        companyName: 'EduSphere Learning',
        type: 'Internship',
        description: 'Restricted drive for Delhi University students only.',
        responsibilities: ['Curriculum research', 'Content design'],
        requiredSkills: buildSkillList([
          { name: 'Communication', targetScore: 75, importance: 'Core' },
        ]),
        preferredSkills: [],
        minimumCgpa: 6.0,
        eligibleBranches: [],
        eligibleAcademicYears: ['3rd Year', '4th Year'],
        duration: '3 Months',
        stipend: '₹15,000 / month',
        salary: '',
        location: 'Delhi NCR',
        workMode: 'Remote',
        applicationDeadline: addDays(30),
        visibility: 'Selected Universities',
        selectedUniversities: ['Delhi University', 'Amity University'],
        status: 'Published',
        openings: 2,
      },

      // ── High CGPA Restriction (Visible, but Rahul CGPA 9.1 is ineligible because min is 9.5) ──
      {
        title: 'Distinguished Research Fellow - Distributed Systems',
        slug: 'distinguished-research-fellow-nexusfin',
        companySlug: 'nexusfin-cloud',
        companyName: 'NexusFin Cloud',
        type: 'Live Project',
        description:
          'Advanced algorithmic research on consensus algorithms. Requires exceptional academic standing of CGPA 9.5 or above.',
        responsibilities: ['Formal verification of consensus state machines', 'Latency benchmarking'],
        requiredSkills: buildSkillList([
          { name: 'Computer Networks', targetScore: 85, importance: 'Core' },
          { name: 'Operating Systems', targetScore: 85, importance: 'Core' },
        ]),
        preferredSkills: [],
        minimumCgpa: 9.5,
        eligibleBranches: ['Computer Science & Engineering'],
        eligibleAcademicYears: ['4th Year'],
        duration: '6 Months',
        stipend: '₹60,000 / month',
        salary: '',
        location: 'Remote',
        workMode: 'Remote',
        applicationDeadline: addDays(30),
        visibility: 'Open to All',
        status: 'Published',
        openings: 1,
      },

      // ── Expired Deadline Opportunity (Tests that backend rejects application) ──
      {
        title: 'Legacy Web Development Intern (Expired Deadline)',
        slug: 'legacy-web-dev-intern-skillbridge-expired',
        companySlug: 'skillbridge-technologies',
        companyName: 'SkillBridge Technologies',
        type: 'Internship',
        description:
          'Archived opportunity with an expired deadline to verify backend deadline validation enforcement.',
        responsibilities: ['Legacy bug fixes'],
        requiredSkills: buildSkillList([
          { name: 'JavaScript', targetScore: 60, importance: 'Core' },
        ]),
        preferredSkills: [],
        minimumCgpa: 6.0,
        eligibleBranches: [],
        eligibleAcademicYears: [],
        duration: '3 Months',
        stipend: '₹15,000 / month',
        salary: '',
        location: 'Remote',
        workMode: 'Remote',
        applicationDeadline: subDays(10), // Expired 10 days ago!
        visibility: 'Open to All',
        status: 'Published',
        openings: 1,
      },

      // ── Draft Opportunity (Should never appear in student catalog) ──
      {
        title: 'Unpublished Draft Placement Posting',
        slug: 'unpublished-draft-placement-posting',
        companySlug: 'cloudcore-technologies',
        companyName: 'CloudCore Technologies',
        type: 'Entry-level Job',
        description: 'Internal draft not yet approved for public viewing.',
        responsibilities: ['Draft responsibilities'],
        requiredSkills: buildSkillList([{ name: 'Docker', targetScore: 60, importance: 'Core' }]),
        preferredSkills: [],
        minimumCgpa: 6.0,
        eligibleBranches: [],
        eligibleAcademicYears: [],
        duration: 'Full-time',
        stipend: '',
        salary: '₹8,00,000 LPA',
        location: 'Remote',
        workMode: 'Remote',
        applicationDeadline: addDays(40),
        visibility: 'Open to All',
        status: 'Draft',
        openings: 1,
      },
    ];

    console.log(`Seeding ${opportunitiesData.length} Opportunities...`);
    let seededCount = 0;

    for (const oppData of opportunitiesData) {
      const comp = getCompany(oppData.companySlug) || getCompany(oppData.companyName);
      const companyId = comp ? comp._id : null;

      await Opportunity.findOneAndUpdate(
        { slug: oppData.slug },
        {
          $set: {
            ...oppData,
            company: companyId,
          },
        },
        { upsert: true, returnDocument: 'after' }
      );
      seededCount++;
    }

    console.log(`✅ Successfully seeded ${seededCount} opportunities across Internship, Apprenticeship, Live Project, and Entry-level Job.`);
    console.log('\n=======================================================');
    console.log('🎉 Phase 6 Seeding Completed Successfully!');
    console.log('=======================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding Phase 6 data:', error);
    process.exit(1);
  }
};

seedPhase6Data();
