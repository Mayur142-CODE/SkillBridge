import mongoose from 'mongoose';
import { ensureNodeDns } from '../config/dns.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import User from '../models/User.js';
import StudentProfile from '../models/StudentProfile.js';
import Project from '../models/Project.js';
import Certification from '../models/Certification.js';
import Achievement from '../models/Achievement.js';
import InternshipRecord from '../models/InternshipRecord.js';
import StudentDocument from '../models/StudentDocument.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const seedPhase2Data = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is missing.');
    }

    console.log('Connecting to MongoDB...');
    await ensureNodeDns();
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB Atlas');

    // 1. Find target student account
    const student = await User.findOne({ email: 'student@skillbridge.dev' });
    if (!student) {
      console.error('❌ student@skillbridge.dev not found. Run seedUsers.js first.');
      process.exit(1);
    }
    console.log(`Found student: ${student.name} (${student._id})`);

    // 2. Upsert StudentProfile (idempotent)
    const profileData = {
      user: student._id,
      phone: student.phone || '+91 98765 43210',
      education: 'Bachelor of Technology',
      branch: student.studentProfile?.branch || 'Computer Science & Engineering',
      academicYear: student.studentProfile?.academicYear || '3rd Year',
      cgpa: student.studentProfile?.cgpa || '8.85',
      rollNumber: student.studentProfile?.rollNumber || '21BCE1042',
      bio: 'Passionate Full-Stack Developer & AI Enthusiast. Dedicated to building scalable distributed systems, intuitive user experiences, and cloud-native solutions.',
      location: 'Mumbai, Maharashtra',
      interests: [
        'Cloud Architecture',
        'Machine Learning',
        'Full-Stack Web',
        'Distributed Systems',
        'System Design',
      ],
      portfolioSlug: 'rahul-sharma',
      portfolioPublic: true,
    };

    const studentProfile = await StudentProfile.findOneAndUpdate(
      { user: student._id },
      { $set: profileData },
      { upsert: true, new: true }
    );
    console.log(`✅ StudentProfile seeded (Slug: ${studentProfile.portfolioSlug}, Public: ${studentProfile.portfolioPublic})`);

    // 3. Seed Projects (Idempotent: remove previous for student, re-insert)
    await Project.deleteMany({ student: student._id });
    const sampleProjects = [
      {
        student: student._id,
        title: 'AI-Powered Smart Career & Skill Navigator',
        description:
          'A modern full-stack web application designed for automated skill gap analysis, personalized curriculum recommendation, and AI-driven career pathing.',
        technologies: ['React', 'Node.js', 'Express', 'MongoDB', 'TensorFlow.js', 'Vite'],
        githubUrl: 'https://github.com/rahulsharma/skill-navigator',
        projectUrl: 'https://skill-navigator-demo.dev',
        role: 'Full-Stack Developer & Lead Architect',
        startDate: new Date('2024-08-01'),
        endDate: new Date('2024-12-15'),
        isCurrent: false,
      },
      {
        student: student._id,
        title: 'Distributed Real-Time Task Orchestrator',
        description:
          'High-throughput distributed task scheduling engine with fault-tolerant workers, dynamic retry queues, and WebSocket telemetry stream.',
        technologies: ['Node.js', 'Redis', 'Docker', 'WebSockets', 'TailwindCSS'],
        githubUrl: 'https://github.com/rahulsharma/distributed-orchestrator',
        projectUrl: 'https://orchestrator-demo.dev',
        role: 'Backend Engineer',
        startDate: new Date('2025-01-10'),
        endDate: null,
        isCurrent: true,
      },
      {
        student: student._id,
        title: 'CampusVault Cryptographic Credential Verifier',
        description:
          'Verifiable academic credentials platform featuring tamper-evident PDF digital signatures, QR verification, and institutional attestation workflows.',
        technologies: ['React', 'Express', 'MongoDB Atlas', 'JWT', 'PDFKit'],
        githubUrl: 'https://github.com/rahulsharma/campus-vault-verifier',
        projectUrl: 'https://campusvault-demo.dev',
        role: 'Security & Backend Architect',
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-06-30'),
        isCurrent: false,
      },
    ];
    await Project.insertMany(sampleProjects);
    console.log(`✅ Seeded ${sampleProjects.length} Projects`);

    // 4. Seed Certifications (Idempotent)
    await Certification.deleteMany({ student: student._id });
    const sampleCerts = [
      {
        student: student._id,
        name: 'AWS Certified Solutions Architect – Associate',
        issuingOrganization: 'Amazon Web Services (AWS)',
        issueDate: new Date('2024-05-15'),
        expiryDate: new Date('2027-05-15'),
        credentialId: 'AWS-SAA-8849204',
        credentialUrl: 'https://aws.amazon.com/verification/AWS-SAA-8849204',
      },
      {
        student: student._id,
        name: 'Meta Professional Front-End Developer Specialization',
        issuingOrganization: 'Meta / Coursera',
        issueDate: new Date('2024-03-20'),
        expiryDate: null,
        credentialId: 'COURSERA-META-77382',
        credentialUrl: 'https://coursera.org/verify/professional-cert/COURSERA-META-77382',
      },
    ];
    await Certification.insertMany(sampleCerts);
    console.log(`✅ Seeded ${sampleCerts.length} Certifications`);

    // 5. Seed Achievements (Idempotent)
    await Achievement.deleteMany({ student: student._id });
    const sampleAchievements = [
      {
        student: student._id,
        title: '1st Place Winner — Smart India Hackathon (SIH 2024)',
        description:
          'Awarded 1st place nationwide for building an intelligent academia-to-industry workforce transition and skill gap evaluation system.',
        date: new Date('2024-12-19'),
        organization: 'Ministry of Education & AICTE, Government of India',
      },
      {
        student: student._id,
        title: "Dean's Honor List for Academic Excellence (2024)",
        description:
          'Recognized for exceptional academic performance, maintaining a top percentile CGPA in Computer Science & Engineering.',
        date: new Date('2024-07-10'),
        organization: 'IIT Bombay Academic Council',
      },
    ];
    await Achievement.insertMany(sampleAchievements);
    console.log(`✅ Seeded ${sampleAchievements.length} Achievements`);

    // 6. Seed Internship History (Idempotent)
    await InternshipRecord.deleteMany({ student: student._id });
    const sampleInternships = [
      {
        student: student._id,
        company: 'Tata Consultancy Services (TCS Innovation Labs)',
        role: 'Software Development Engineering Intern',
        location: 'Mumbai / Hybrid',
        startDate: new Date('2024-05-01'),
        endDate: new Date('2024-07-31'),
        isCurrent: false,
        description:
          'Engineered microservices for enterprise event-processing pipeline handling 100k+ messages/sec. Optimized MongoDB aggregation pipelines and reduced query latency by 38%.',
        skills: ['Node.js', 'Express', 'MongoDB', 'Docker', 'Kafka', 'Jest'],
      },
    ];
    await InternshipRecord.insertMany(sampleInternships);
    console.log(`✅ Seeded ${sampleInternships.length} Internship Record`);

    console.log('\n🎉 Phase 2 Seed Data successfully applied!');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seedPhase2Data();
