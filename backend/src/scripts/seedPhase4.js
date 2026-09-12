import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import Skill from '../models/Skill.js';
import JobRole from '../models/JobRole.js';
import Industry from '../models/Industry.js';
import Company from '../models/Company.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const seedPhase4Data = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) throw new Error('MONGODB_URI missing in .env');

    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB Atlas');

    // ── 1. Fetch Existing Skills to map references ──
    const allSkills = await Skill.find({ active: true });
    const skillMap = new Map();
    allSkills.forEach((s) => {
      skillMap.set(s.slug.toLowerCase(), s);
      skillMap.set(s.name.toLowerCase(), s);
    });

    const getSkill = (nameOrSlug) => {
      const s = skillMap.get(nameOrSlug.toLowerCase());
      if (!s) {
        console.warn(`Warning: Skill "${nameOrSlug}" not found in DB!`);
      }
      return s;
    };

    // Helper to build required/preferred skills
    const buildSkillReqs = (list) => {
      return list
        .map(({ name, targetScore, importance }) => {
          const s = getSkill(name);
          if (!s) return null;
          return {
            skill: s._id,
            skillName: s.name,
            targetScore: targetScore || 70,
            importance: importance || 'Core',
          };
        })
        .filter(Boolean);
    };

    // ── 2. Seed 16 Job Roles ──
    console.log('Seeding 16 Job Roles...');
    const rolesData = [
      {
        name: 'Full Stack Developer',
        slug: 'full-stack-developer',
        description:
          'Designs and implements end-to-end web applications, encompassing responsive frontends, scalable RESTful backend services, and database persistence.',
        sector: 'Software Product',
        requiredSkills: [
          { name: 'JavaScript', targetScore: 75, importance: 'Core' },
          { name: 'React', targetScore: 70, importance: 'Core' },
          { name: 'Node.js', targetScore: 70, importance: 'Core' },
          { name: 'MongoDB', targetScore: 65, importance: 'Core' },
          { name: 'Git', targetScore: 60, importance: 'Essential' },
        ],
        preferredSkills: [
          { name: 'Docker', targetScore: 60 },
          { name: 'Redis', targetScore: 55 },
          { name: 'Communication', targetScore: 65 },
        ],
        minimumCgpa: 6.5,
        eligibleBranches: ['Computer Science', 'Information Technology', 'Software Engineering', 'Electronics'],
        eligibleAcademicYears: ['3rd Year', '4th Year'],
        demandLevel: 'Critical',
        averageStartingSalary: '₹10–18 LPA',
      },
      {
        name: 'Frontend Developer',
        slug: 'frontend-developer',
        description:
          'Architects intuitive, accessible, and high-performance client-side user interfaces with React, state management, and modern CSS workflows.',
        sector: 'Software Product',
        requiredSkills: [
          { name: 'JavaScript', targetScore: 80, importance: 'Core' },
          { name: 'React', targetScore: 75, importance: 'Core' },
          { name: 'Git', targetScore: 60, importance: 'Core' },
          { name: 'Problem Solving', targetScore: 65, importance: 'Essential' },
        ],
        preferredSkills: [
          { name: 'TypeScript', targetScore: 65 },
          { name: 'Communication', targetScore: 70 },
        ],
        minimumCgpa: 6.0,
        eligibleBranches: ['Computer Science', 'Information Technology', 'Electronics', 'Electrical'],
        eligibleAcademicYears: ['2nd Year', '3rd Year', '4th Year'],
        demandLevel: 'High',
        averageStartingSalary: '₹8–14 LPA',
      },
      {
        name: 'Backend Developer',
        slug: 'backend-developer',
        description:
          'Constructs fault-tolerant server-side APIs, database schemas, authentication middleware, and caching layers with high throughput.',
        sector: 'Software Product',
        requiredSkills: [
          { name: 'Node.js', targetScore: 75, importance: 'Core' },
          { name: 'Express', targetScore: 70, importance: 'Core' },
          { name: 'PostgreSQL', targetScore: 70, importance: 'Core' },
          { name: 'RESTful APIs', targetScore: 75, importance: 'Core' },
          { name: 'Git', targetScore: 60, importance: 'Essential' },
        ],
        preferredSkills: [
          { name: 'Docker', targetScore: 65 },
          { name: 'Redis', targetScore: 60 },
          { name: 'System Design', targetScore: 60 },
        ],
        minimumCgpa: 6.5,
        eligibleBranches: ['Computer Science', 'Information Technology', 'Software Engineering'],
        eligibleAcademicYears: ['3rd Year', '4th Year'],
        demandLevel: 'Critical',
        averageStartingSalary: '₹9–16 LPA',
      },
      {
        name: 'Software Developer',
        slug: 'software-developer',
        description:
          'Applies rigorous computer science fundamentals, data structures, algorithms, and object-oriented design to build robust multi-tier software.',
        sector: 'IT Services',
        requiredSkills: [
          { name: 'Python', targetScore: 75, importance: 'Core' },
          { name: 'Problem Solving', targetScore: 75, importance: 'Core' },
          { name: 'Git', targetScore: 65, importance: 'Core' },
          { name: 'Teamwork', targetScore: 65, importance: 'Essential' },
        ],
        preferredSkills: [
          { name: 'PostgreSQL', targetScore: 60 },
          { name: 'Communication', targetScore: 65 },
        ],
        minimumCgpa: 6.0,
        eligibleBranches: ['Computer Science', 'Information Technology', 'Electronics', 'Mechanical', 'Civil'],
        eligibleAcademicYears: ['3rd Year', '4th Year'],
        demandLevel: 'High',
        averageStartingSalary: '₹7–12 LPA',
      },
      {
        name: 'DevOps Engineer',
        slug: 'devops-engineer',
        description:
          'Automates deployment pipelines (CI/CD), infrastructure orchestration, container lifecycles, and cloud monitoring across distributed systems.',
        sector: 'Cloud & Infrastructure',
        requiredSkills: [
          { name: 'Docker', targetScore: 75, importance: 'Core' },
          { name: 'Git', targetScore: 75, importance: 'Core' },
          { name: 'System Design', targetScore: 65, importance: 'Core' },
          { name: 'Problem Solving', targetScore: 70, importance: 'Essential' },
        ],
        preferredSkills: [
          { name: 'Python', targetScore: 65 },
          { name: 'Node.js', targetScore: 55 },
        ],
        minimumCgpa: 6.5,
        eligibleBranches: ['Computer Science', 'Information Technology', 'Software Engineering'],
        eligibleAcademicYears: ['3rd Year', '4th Year'],
        demandLevel: 'Critical',
        averageStartingSalary: '₹10–18 LPA',
      },
      {
        name: 'Cloud Engineer',
        slug: 'cloud-engineer',
        description:
          'Implements scalable, highly available cloud infrastructures, virtual networks, compute clusters, and serverless architectures.',
        sector: 'Cloud & Infrastructure',
        requiredSkills: [
          { name: 'System Design', targetScore: 70, importance: 'Core' },
          { name: 'Docker', targetScore: 70, importance: 'Core' },
          { name: 'PostgreSQL', targetScore: 65, importance: 'Essential' },
          { name: 'Adaptability', targetScore: 70, importance: 'Core' },
        ],
        preferredSkills: [
          { name: 'Python', targetScore: 60 },
          { name: 'Git', targetScore: 65 },
        ],
        minimumCgpa: 6.5,
        eligibleBranches: ['Computer Science', 'Information Technology', 'Electronics'],
        eligibleAcademicYears: ['3rd Year', '4th Year'],
        demandLevel: 'High',
        averageStartingSalary: '₹9–17 LPA',
      },
      {
        name: 'Data Analyst',
        slug: 'data-analyst',
        description:
          'Extracts, transforms, and analyzes complex corporate datasets to synthesize actionable operational intelligence and strategic dashboards.',
        sector: 'AI & Data Analytics',
        requiredSkills: [
          { name: 'Python', targetScore: 70, importance: 'Core' },
          { name: 'PostgreSQL', targetScore: 75, importance: 'Core' },
          { name: 'Problem Solving', targetScore: 70, importance: 'Core' },
          { name: 'Communication', targetScore: 70, importance: 'Essential' },
        ],
        preferredSkills: [
          { name: 'MongoDB', targetScore: 55 },
          { name: 'Time Management', targetScore: 65 },
        ],
        minimumCgpa: 6.0,
        eligibleBranches: ['Computer Science', 'Information Technology', 'Mathematics', 'Electronics'],
        eligibleAcademicYears: ['2nd Year', '3rd Year', '4th Year'],
        demandLevel: 'High',
        averageStartingSalary: '₹7–13 LPA',
      },
      {
        name: 'Data Scientist',
        slug: 'data-scientist',
        description:
          'Formulates statistical models, predictive algorithms, and experimental hypotheses to solve complex unstructured business challenges.',
        sector: 'AI & Data Analytics',
        requiredSkills: [
          { name: 'Python', targetScore: 85, importance: 'Core' },
          { name: 'Problem Solving', targetScore: 80, importance: 'Core' },
          { name: 'Logical Reasoning', targetScore: 80, importance: 'Core' },
          { name: 'PostgreSQL', targetScore: 70, importance: 'Essential' },
        ],
        preferredSkills: [
          { name: 'System Design', targetScore: 60 },
          { name: 'Communication', targetScore: 70 },
        ],
        minimumCgpa: 7.0,
        eligibleBranches: ['Computer Science', 'Information Technology', 'Data Science', 'Mathematics'],
        eligibleAcademicYears: ['3rd Year', '4th Year'],
        demandLevel: 'Critical',
        averageStartingSalary: '₹12–22 LPA',
      },
      {
        name: 'Machine Learning Engineer',
        slug: 'machine-learning-engineer',
        description:
          'Builds, trains, evaluates, and deploys scalable machine learning models into production inference pipelines.',
        sector: 'AI & Data Analytics',
        requiredSkills: [
          { name: 'Python', targetScore: 85, importance: 'Core' },
          { name: 'Docker', targetScore: 70, importance: 'Core' },
          { name: 'Problem Solving', targetScore: 80, importance: 'Core' },
          { name: 'System Design', targetScore: 65, importance: 'Essential' },
        ],
        preferredSkills: [
          { name: 'PostgreSQL', targetScore: 65 },
          { name: 'Git', targetScore: 70 },
        ],
        minimumCgpa: 7.0,
        eligibleBranches: ['Computer Science', 'Information Technology', 'Artificial Intelligence'],
        eligibleAcademicYears: ['3rd Year', '4th Year'],
        demandLevel: 'Critical',
        averageStartingSalary: '₹14–24 LPA',
      },
      {
        name: 'AI Engineer',
        slug: 'ai-engineer',
        description:
          'Develops cutting-edge generative AI, large language model (LLM) workflows, cognitive agent pipelines, and automated reasoning tools.',
        sector: 'AI & Data Analytics',
        requiredSkills: [
          { name: 'Python', targetScore: 85, importance: 'Core' },
          { name: 'RESTful APIs', targetScore: 75, importance: 'Core' },
          { name: 'Problem Solving', targetScore: 80, importance: 'Core' },
          { name: 'Adaptability', targetScore: 75, importance: 'Essential' },
        ],
        preferredSkills: [
          { name: 'System Design', targetScore: 70 },
          { name: 'Node.js', targetScore: 60 },
        ],
        minimumCgpa: 7.2,
        eligibleBranches: ['Computer Science', 'Artificial Intelligence', 'Data Science'],
        eligibleAcademicYears: ['3rd Year', '4th Year'],
        demandLevel: 'Critical',
        averageStartingSalary: '₹15–26 LPA',
      },
      {
        name: 'Cybersecurity Analyst',
        slug: 'cybersecurity-analyst',
        description:
          'Safeguards enterprise assets by identifying vulnerabilities, conducting penetration assessments, and establishing threat mitigation protocols.',
        sector: 'Cybersecurity',
        requiredSkills: [
          { name: 'Problem Solving', targetScore: 80, importance: 'Core' },
          { name: 'Logical Reasoning', targetScore: 75, importance: 'Core' },
          { name: 'System Design', targetScore: 70, importance: 'Core' },
          { name: 'Communication', targetScore: 70, importance: 'Essential' },
        ],
        preferredSkills: [
          { name: 'Python', targetScore: 65 },
          { name: 'Docker', targetScore: 60 },
        ],
        minimumCgpa: 6.5,
        eligibleBranches: ['Computer Science', 'Cybersecurity', 'Information Technology'],
        eligibleAcademicYears: ['3rd Year', '4th Year'],
        demandLevel: 'Critical',
        averageStartingSalary: '₹10–18 LPA',
      },
      {
        name: 'Database Developer',
        slug: 'database-developer',
        description:
          'Specializes in schema normalization, query optimization, indexing strategies, transaction reliability, and high-volume data storage.',
        sector: 'Software Product',
        requiredSkills: [
          { name: 'PostgreSQL', targetScore: 85, importance: 'Core' },
          { name: 'MongoDB', targetScore: 75, importance: 'Core' },
          { name: 'Redis', targetScore: 70, importance: 'Core' },
          { name: 'System Design', targetScore: 65, importance: 'Essential' },
        ],
        preferredSkills: [
          { name: 'Node.js', targetScore: 60 },
          { name: 'Docker', targetScore: 60 },
        ],
        minimumCgpa: 6.0,
        eligibleBranches: ['Computer Science', 'Information Technology'],
        eligibleAcademicYears: ['3rd Year', '4th Year'],
        demandLevel: 'Medium',
        averageStartingSalary: '₹8–15 LPA',
      },
      {
        name: 'UI/UX Designer',
        slug: 'ui-ux-designer',
        description:
          'Translates complex human workflows into elegant, intuitive wireframes, responsive design systems, and delightful digital user journeys.',
        sector: 'Software Product',
        requiredSkills: [
          { name: 'Communication', targetScore: 80, importance: 'Core' },
          { name: 'Teamwork', targetScore: 75, importance: 'Core' },
          { name: 'Adaptability', targetScore: 75, importance: 'Core' },
          { name: 'Problem Solving', targetScore: 70, importance: 'Essential' },
        ],
        preferredSkills: [
          { name: 'React', targetScore: 50 },
          { name: 'JavaScript', targetScore: 50 },
        ],
        minimumCgpa: 6.0,
        eligibleBranches: ['Computer Science', 'Information Technology', 'Design', 'Any Engineering Branch'],
        eligibleAcademicYears: ['2nd Year', '3rd Year', '4th Year'],
        demandLevel: 'High',
        averageStartingSalary: '₹8–15 LPA',
      },
      {
        name: 'QA Engineer',
        slug: 'qa-engineer',
        description:
          'Constructs automated test suites, executes regression testing, validates edge conditions, and enforces software quality standards.',
        sector: 'IT Services',
        requiredSkills: [
          { name: 'JavaScript', targetScore: 70, importance: 'Core' },
          { name: 'Problem Solving', targetScore: 70, importance: 'Core' },
          { name: 'Git', targetScore: 65, importance: 'Core' },
          { name: 'Logical Reasoning', targetScore: 70, importance: 'Essential' },
        ],
        preferredSkills: [
          { name: 'Python', targetScore: 60 },
          { name: 'RESTful APIs', targetScore: 65 },
        ],
        minimumCgpa: 6.0,
        eligibleBranches: ['Computer Science', 'Information Technology', 'Electronics'],
        eligibleAcademicYears: ['2nd Year', '3rd Year', '4th Year'],
        demandLevel: 'Medium',
        averageStartingSalary: '₹6–11 LPA',
      },
      {
        name: 'Business Analyst',
        slug: 'business-analyst',
        description:
          'Bridges commercial objectives with technical engineering teams, eliciting user requirements, process modeling, and KPIs.',
        sector: 'Consulting & Analytics',
        requiredSkills: [
          { name: 'Communication', targetScore: 85, importance: 'Core' },
          { name: 'Leadership', targetScore: 75, importance: 'Core' },
          { name: 'Problem Solving', targetScore: 75, importance: 'Core' },
          { name: 'Logical Reasoning', targetScore: 70, importance: 'Essential' },
        ],
        preferredSkills: [
          { name: 'PostgreSQL', targetScore: 60 },
          { name: 'Time Management', targetScore: 75 },
        ],
        minimumCgpa: 6.5,
        eligibleBranches: ['Computer Science', 'Information Technology', 'Management', 'Any Engineering Branch'],
        eligibleAcademicYears: ['3rd Year', '4th Year'],
        demandLevel: 'High',
        averageStartingSalary: '₹8–14 LPA',
      },
      {
        name: 'Mobile Application Developer',
        slug: 'mobile-app-developer',
        description:
          'Builds dynamic, responsive cross-platform and native mobile applications with modern asynchronous architectures.',
        sector: 'Software Product',
        requiredSkills: [
          { name: 'JavaScript', targetScore: 75, importance: 'Core' },
          { name: 'React', targetScore: 75, importance: 'Core' },
          { name: 'RESTful APIs', targetScore: 70, importance: 'Core' },
          { name: 'Git', targetScore: 65, importance: 'Essential' },
        ],
        preferredSkills: [
          { name: 'Node.js', targetScore: 60 },
          { name: 'System Design', targetScore: 55 },
        ],
        minimumCgpa: 6.0,
        eligibleBranches: ['Computer Science', 'Information Technology', 'Electronics'],
        eligibleAcademicYears: ['2nd Year', '3rd Year', '4th Year'],
        demandLevel: 'High',
        averageStartingSalary: '₹8–15 LPA',
      },
    ];

    for (const r of rolesData) {
      await JobRole.findOneAndUpdate(
        { slug: r.slug },
        {
          $set: {
            ...r,
            requiredSkills: buildSkillReqs(r.requiredSkills),
            preferredSkills: buildSkillReqs(r.preferredSkills),
            active: true,
          },
        },
        { upsert: true, returnDocument: 'after' }
      );
    }
    console.log('✅ Seeded 16 Job Roles');

    // ── 3. Seed 12 Industries ──
    console.log('Seeding 12 Industries...');
    const industriesData = [
      {
        name: 'Software Product',
        slug: 'software-product',
        description: 'Pioneering SaaS, developer tools, consumer applications, and cloud-native digital platforms.',
        requiredSkills: [
          { name: 'JavaScript', importance: 'Core' },
          { name: 'React', importance: 'Core' },
          { name: 'Node.js', importance: 'Core' },
          { name: 'Git', importance: 'Core' },
        ],
        demandLevel: 'Critical',
        growthRate: '+24% YoY',
      },
      {
        name: 'FinTech',
        slug: 'fintech',
        description: 'High-frequency transactional systems, algorithmic payment rails, lending engines, and decentralized ledgers.',
        requiredSkills: [
          { name: 'Python', importance: 'Core' },
          { name: 'PostgreSQL', importance: 'Core' },
          { name: 'Redis', importance: 'Core' },
          { name: 'System Design', importance: 'Essential' },
        ],
        demandLevel: 'Critical',
        growthRate: '+28% YoY',
      },
      {
        name: 'IT Services',
        slug: 'it-services',
        description: 'Global enterprise consulting, system integration, digital transformation, and legacy modernization.',
        requiredSkills: [
          { name: 'Problem Solving', importance: 'Core' },
          { name: 'JavaScript', importance: 'Core' },
          { name: 'Teamwork', importance: 'Core' },
          { name: 'Communication', importance: 'Core' },
        ],
        demandLevel: 'High',
        growthRate: '+14% YoY',
      },
      {
        name: 'Cloud & Infrastructure',
        slug: 'cloud-infrastructure',
        description: 'Hyper-scale compute platforms, virtualization fabrics, distributed caching, and microservice meshes.',
        requiredSkills: [
          { name: 'Docker', importance: 'Core' },
          { name: 'System Design', importance: 'Core' },
          { name: 'Git', importance: 'Core' },
        ],
        demandLevel: 'Critical',
        growthRate: '+26% YoY',
      },
      {
        name: 'Cybersecurity',
        slug: 'cybersecurity',
        description: 'Proactive penetration defense, cryptographic protocols, endpoint detection, and identity access governance.',
        requiredSkills: [
          { name: 'Problem Solving', importance: 'Core' },
          { name: 'System Design', importance: 'Core' },
          { name: 'Logical Reasoning', importance: 'Core' },
        ],
        demandLevel: 'Critical',
        growthRate: '+31% YoY',
      },
      {
        name: 'AI & Data Analytics',
        slug: 'ai-data-analytics',
        description: 'Deep neural networks, LLM agent ecosystems, automated feature stores, and high-throughput data processing.',
        requiredSkills: [
          { name: 'Python', importance: 'Core' },
          { name: 'Problem Solving', importance: 'Core' },
          { name: 'PostgreSQL', importance: 'Core' },
          { name: 'Logical Reasoning', importance: 'Core' },
        ],
        demandLevel: 'Critical',
        growthRate: '+38% YoY',
      },
      {
        name: 'HealthTech',
        slug: 'healthtech',
        description: 'Compliant clinical records, telemetry analytics, telemedicine platforms, and diagnostic machine vision.',
        requiredSkills: [
          { name: 'Python', importance: 'Core' },
          { name: 'RESTful APIs', importance: 'Core' },
          { name: 'Problem Solving', importance: 'Core' },
        ],
        demandLevel: 'High',
        growthRate: '+22% YoY',
      },
      {
        name: 'EdTech',
        slug: 'edtech',
        description: 'Adaptive learning environments, proctored assessment frameworks, collaborative interactive classrooms, and LMS.',
        requiredSkills: [
          { name: 'JavaScript', importance: 'Core' },
          { name: 'React', importance: 'Core' },
          { name: 'Node.js', importance: 'Core' },
          { name: 'MongoDB', importance: 'Core' },
        ],
        demandLevel: 'Medium',
        growthRate: '+16% YoY',
      },
      {
        name: 'E-Commerce',
        slug: 'e-commerce',
        description: 'High-concurrency digital storefronts, supply chain logistics, inventory indexing, and recommendation engines.',
        requiredSkills: [
          { name: 'React', importance: 'Core' },
          { name: 'Node.js', importance: 'Core' },
          { name: 'Redis', importance: 'Core' },
          { name: 'PostgreSQL', importance: 'Core' },
        ],
        demandLevel: 'High',
        growthRate: '+19% YoY',
      },
      {
        name: 'Automotive Technology',
        slug: 'automotive-tech',
        description: 'Connected vehicle telemetry, autonomous perception stacks, embedded software, and EV power management.',
        requiredSkills: [
          { name: 'Python', importance: 'Core' },
          { name: 'Problem Solving', importance: 'Core' },
          { name: 'System Design', importance: 'Core' },
        ],
        demandLevel: 'High',
        growthRate: '+20% YoY',
      },
      {
        name: 'Consulting & Analytics',
        slug: 'consulting-analytics',
        description: 'Management strategy advisory, market due diligence, econometric modeling, and enterprise roadmaps.',
        requiredSkills: [
          { name: 'Communication', importance: 'Core' },
          { name: 'Leadership', importance: 'Core' },
          { name: 'Problem Solving', importance: 'Core' },
        ],
        demandLevel: 'Medium',
        growthRate: '+12% YoY',
      },
      {
        name: 'Telecommunications',
        slug: 'telecommunications',
        description: 'Next-generation 5G/6G protocols, distributed packet switching, optical network backbones, and IoT mesh systems.',
        requiredSkills: [
          { name: 'System Design', importance: 'Core' },
          { name: 'Docker', importance: 'Core' },
          { name: 'Problem Solving', importance: 'Core' },
        ],
        demandLevel: 'Medium',
        growthRate: '+10% YoY',
      },
    ];

    for (const ind of industriesData) {
      await Industry.findOneAndUpdate(
        { slug: ind.slug },
        {
          $set: {
            ...ind,
            requiredSkills: buildSkillReqs(ind.requiredSkills),
            active: true,
          },
        },
        { upsert: true, returnDocument: 'after' }
      );
    }
    console.log('✅ Seeded 12 Industries');

    // ── 4. Seed 5 Development Companies ──
    console.log('Seeding 5 Development Companies...');
    const companiesData = [
      {
        name: 'TechNova Systems',
        slug: 'technova-systems',
        sector: 'Software Product',
        description:
          'Engineering modern enterprise microservices, real-time collaboration platforms, and developer tooling ecosystems.',
        locations: ['Bengaluru', 'Pune', 'Remote'],
        website: 'https://technova.example.com',
        preferredSkills: [
          { name: 'JavaScript', targetScore: 70 },
          { name: 'React', targetScore: 70 },
          { name: 'Node.js', targetScore: 65 },
          { name: 'Docker', targetScore: 60 },
        ],
        hiringPreferences: {
          minimumCgpa: 6.5,
          eligibleBranches: ['Computer Science', 'Information Technology'],
          remoteFriendly: true,
        },
        verified: true,
        active: true,
      },
      {
        name: 'NexusFin Cloud',
        slug: 'nexusfin-cloud',
        sector: 'FinTech',
        description:
          'Building ultra-low-latency transactional routing, high-volume ledger platforms, and automated credit scoring.',
        locations: ['Mumbai', 'Bengaluru'],
        website: 'https://nexusfin.example.com',
        preferredSkills: [
          { name: 'Python', targetScore: 75 },
          { name: 'PostgreSQL', targetScore: 75 },
          { name: 'Redis', targetScore: 65 },
          { name: 'Problem Solving', targetScore: 75 },
        ],
        hiringPreferences: {
          minimumCgpa: 7.0,
          eligibleBranches: ['Computer Science', 'Information Technology', 'Mathematics'],
          remoteFriendly: false,
        },
        verified: true,
        active: true,
      },
      {
        name: 'AeroCyber Dynamics',
        slug: 'aerocyber-dynamics',
        sector: 'Cybersecurity',
        description:
          'Specialized zero-trust infrastructure protection, vulnerability discovery, automated defense orchestration.',
        locations: ['Hyderabad', 'Delhi NCR'],
        website: 'https://aerocyber.example.com',
        preferredSkills: [
          { name: 'Problem Solving', targetScore: 80 },
          { name: 'System Design', targetScore: 70 },
          { name: 'Docker', targetScore: 65 },
          { name: 'Communication', targetScore: 70 },
        ],
        hiringPreferences: {
          minimumCgpa: 6.5,
          eligibleBranches: ['Computer Science', 'Cybersecurity', 'Information Technology'],
          remoteFriendly: true,
        },
        verified: true,
        active: true,
      },
      {
        name: 'HealthPulse Analytics',
        slug: 'healthpulse-analytics',
        sector: 'HealthTech',
        description:
          'Transforming patient diagnostic workflows with predictive biomedical telemetry and scalable cloud telemetry.',
        locations: ['Pune', 'Bengaluru'],
        website: 'https://healthpulse.example.com',
        preferredSkills: [
          { name: 'Python', targetScore: 75 },
          { name: 'PostgreSQL', targetScore: 70 },
          { name: 'RESTful APIs', targetScore: 70 },
          { name: 'Adaptability', targetScore: 65 },
        ],
        hiringPreferences: {
          minimumCgpa: 6.0,
          eligibleBranches: ['Computer Science', 'Information Technology', 'Biotechnology', 'Electronics'],
          remoteFriendly: true,
        },
        verified: true,
        active: true,
      },
      {
        name: 'EduSphere Learning',
        slug: 'edusphere-learning',
        sector: 'EdTech',
        description:
          'Creating accessible educational technology platforms, automated skill verification, and interactive cohort curricula.',
        locations: ['Delhi NCR', 'Remote'],
        website: 'https://edusphere.example.com',
        preferredSkills: [
          { name: 'JavaScript', targetScore: 70 },
          { name: 'React', targetScore: 70 },
          { name: 'MongoDB', targetScore: 65 },
          { name: 'Teamwork', targetScore: 70 },
        ],
        hiringPreferences: {
          minimumCgpa: 6.0,
          eligibleBranches: ['Computer Science', 'Information Technology', 'Any Engineering Branch'],
          remoteFriendly: true,
        },
        verified: true,
        active: true,
      },
    ];

    for (const comp of companiesData) {
      await Company.findOneAndUpdate(
        { slug: comp.slug },
        {
          $set: {
            ...comp,
            preferredSkills: buildSkillReqs(comp.preferredSkills).map((s) => ({
              skill: s.skill,
              skillName: s.skillName,
              minScore: s.targetScore,
            })),
            active: true,
            verified: true,
          },
        },
        { upsert: true, returnDocument: 'after' }
      );
    }
    console.log('✅ Seeded 5 Development Companies');

    console.log('\n=======================================================');
    console.log('🎉 Phase 4 Seeding Completed Successfully!');
    console.log('=======================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Phase 4 seeding failed:', error);
    process.exit(1);
  }
};

seedPhase4Data();
