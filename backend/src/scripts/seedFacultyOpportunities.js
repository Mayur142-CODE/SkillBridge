import dotenv from 'dotenv';
import mongoose from 'mongoose';
import FacultyOpportunity from '../models/FacultyOpportunity.js';
import User from '../models/User.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

export const SEED_FACULTY_OPPORTUNITIES = [
  // ── 1. Faculty Internships (2) ──
  {
    title: 'Advanced AI & Large Language Models Research Immersion',
    type: 'Faculty Internship',
    description:
      'Immerse in cutting-edge industrial AI research with TCS Research Labs. Faculty interns collaborate directly with senior scientists on parameter-efficient fine-tuning, retrieval-augmented generation (RAG), and model alignment for enterprise domain data.',
    provider: 'TCS Research',
    industryPartner: 'Tata Consultancy Services',
    institution: 'IIT Bombay Research Park',
    domain: 'Artificial Intelligence',
    requiredExpertise: ['Artificial Intelligence', 'Machine Learning', 'Python'],
    preferredExpertise: ['Deep Learning', 'Natural Language Processing', 'Distributed Systems'],
    duration: '8 Weeks',
    startDate: new Date('2026-10-15'),
    endDate: new Date('2026-12-15'),
    mode: 'Hybrid',
    location: 'Bengaluru / Remote',
    eligibility: 'Open to full-time faculty in CS/IT or related departments with prior research or teaching experience in Machine Learning.',
    minimumExperience: 2,
    departmentEligibility: ['Computer Science & Engineering', 'Information Technology', 'Data Science & AI'],
    qualificationRequirements: ['Ph.D.', 'M.Tech'],
    capacity: 5,
    applicationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    certificateAvailable: true,
    collaborationRequired: true,
    status: 'Open',
  },
  {
    title: 'Autonomous Edge Systems & Robotics Engineering Fellowship',
    type: 'Faculty Internship',
    description:
      'Hands-on industrial fellowship focused on real-time embedded operating systems, sensor fusion, and reinforcement learning for autonomous robotic arms in smart manufacturing plants.',
    provider: 'Siemens Industrial AI Labs',
    industryPartner: 'Siemens India',
    domain: 'Robotics',
    requiredExpertise: ['Robotics', 'Embedded Systems', 'C++'],
    preferredExpertise: ['ROS2', 'Control Systems', 'Edge AI'],
    duration: '6 Weeks',
    startDate: new Date('2026-11-01'),
    endDate: new Date('2026-12-15'),
    mode: 'Offline',
    location: 'Pune Innovation Center',
    eligibility: 'Faculty with expertise in robotics, automation, or mechatronics.',
    minimumExperience: 3,
    departmentEligibility: ['Electrical Engineering', 'Mechanical Engineering', 'Computer Science & Engineering'],
    qualificationRequirements: ['M.Tech', 'Ph.D.'],
    capacity: 4,
    applicationDeadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
    certificateAvailable: true,
    collaborationRequired: false,
    status: 'Open',
  },

  // ── 2. Industrial Training (2) ──
  {
    title: 'Industry 4.0 Digital Twin & Cloud Infrastructure Immersion',
    type: 'Industrial Training',
    description:
      'Intensive industrial training program covering IoT data pipelines, cloud-native telemetry architectures, and digital twin simulation models applied to aerospace and heavy engineering turbines.',
    provider: 'L&T Technology Services',
    industryPartner: 'Larsen & Toubro',
    domain: 'Cloud Computing',
    requiredExpertise: ['Cloud Computing', 'Internet of Things', 'Distributed Systems'],
    preferredExpertise: ['Docker', 'Kubernetes', 'MQTT'],
    duration: '4 Weeks',
    startDate: new Date('2026-10-01'),
    endDate: new Date('2026-10-30'),
    mode: 'Hybrid',
    location: 'Mumbai Tech Park',
    eligibility: 'Faculty members interested in upgrading practical laboratory curriculum with industrial IoT workflows.',
    minimumExperience: 1,
    departmentEligibility: ['Computer Science & Engineering', 'Electrical Engineering', 'Information Technology'],
    qualificationRequirements: ['M.Tech', 'Ph.D.'],
    capacity: 15,
    applicationDeadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
    certificateAvailable: true,
    collaborationRequired: false,
    status: 'Open',
  },
  {
    title: 'Enterprise Zero-Trust Cybersecurity & Threat Intelligence',
    type: 'Industrial Training',
    description:
      'Live training on contemporary SOC workflows, red-teaming paradigms, cloud perimeter defense, and zero-trust identity architectures led by enterprise cybersecurity architects.',
    provider: 'QuickHeal Security Research Center',
    industryPartner: 'QuickHeal Technologies',
    domain: 'Cyber Security',
    requiredExpertise: ['Cyber Security', 'Network Security', 'Computer Networks'],
    preferredExpertise: ['Cryptographic Protocols', 'Linux Systems'],
    duration: '2 Weeks',
    startDate: new Date('2026-10-20'),
    endDate: new Date('2026-11-05'),
    mode: 'Online',
    location: 'Virtual Classroom',
    eligibility: 'Faculty teaching Information Security, Cryptography, or Computer Networks.',
    minimumExperience: 2,
    departmentEligibility: ['Computer Science & Engineering', 'Information Technology'],
    qualificationRequirements: ['Master\'s Degree', 'Ph.D.'],
    capacity: 25,
    applicationDeadline: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
    certificateAvailable: true,
    collaborationRequired: false,
    status: 'Open',
  },

  // ── 3. Faculty Development Programs (3) ──
  {
    title: 'National FDP on Generative AI & Foundation Models in Academia',
    type: 'Faculty Development Program',
    description:
      'Premier Ministry & Industry backed national faculty development program designed to empower educators with modern generative AI architectures, prompt engineering, fine-tuning, and pedagogical AI integration.',
    provider: 'IIT Bombay Tech Hub & NASSCOM',
    industryPartner: 'NASSCOM FutureSkills Prime',
    institution: 'IIT Bombay',
    domain: 'Artificial Intelligence',
    requiredExpertise: ['Artificial Intelligence', 'Machine Learning', 'Python'],
    preferredExpertise: ['PyTorch', 'Hugging Face', 'Data Science'],
    duration: '2 Weeks',
    startDate: new Date('2026-10-10'),
    endDate: new Date('2026-10-24'),
    mode: 'Online',
    location: 'Online / Pan-India',
    eligibility: 'All college and university academicians looking to modernize their curriculum.',
    minimumExperience: 0,
    departmentEligibility: ['Computer Science & Engineering', 'Information Technology', 'Electronics & Telecommunication', 'Data Science & AI'],
    qualificationRequirements: ['Master\'s Degree', 'Ph.D.'],
    capacity: 100,
    applicationDeadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    certificateAvailable: true,
    collaborationRequired: false,
    status: 'Open',
  },
  {
    title: 'High-Performance Computing & Accelerated GPU Architectures FDP',
    type: 'Faculty Development Program',
    description:
      'Hands-on technical workshop for faculty in computational sciences. Covers CUDA programming, OpenMP, MPI distributed clusters, and performance profiling for large scientific simulation workloads.',
    provider: 'CDAC & NVIDIA Teaching Center',
    industryPartner: 'NVIDIA India',
    institution: 'Centre for Development of Advanced Computing',
    domain: 'Software Engineering',
    requiredExpertise: ['Parallel Computing', 'C++', 'High-Performance Computing'],
    preferredExpertise: ['CUDA', 'MPI', 'Linux'],
    duration: '1 Week',
    startDate: new Date('2026-11-10'),
    endDate: new Date('2026-11-17'),
    mode: 'Hybrid',
    location: 'CDAC Innovation Campus, Pune',
    eligibility: 'Faculty with background in systems programming, scientific computing, or algorithmic design.',
    minimumExperience: 2,
    departmentEligibility: ['Computer Science & Engineering', 'Applied Mathematics'],
    qualificationRequirements: ['M.Tech', 'Ph.D.'],
    capacity: 30,
    applicationDeadline: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000),
    certificateAvailable: true,
    collaborationRequired: false,
    status: 'Open',
  },
  {
    title: 'Cloud-Native Microservices & Kubernetes Orchestration FDP',
    type: 'Faculty Development Program',
    description:
      'Curated curriculum alignment program designed by Google Cloud engineers to bring industry microservice patterns, container orchestration, CI/CD, and serverless architectures into university labs.',
    provider: 'Google Cloud Academics',
    industryPartner: 'Google India',
    domain: 'Cloud Computing',
    requiredExpertise: ['Cloud Computing', 'Distributed Systems', 'DevOps'],
    preferredExpertise: ['Kubernetes', 'Docker', 'Go'],
    duration: '2 Weeks',
    startDate: new Date('2026-11-01'),
    endDate: new Date('2026-11-15'),
    mode: 'Online',
    location: 'Google Cloud Learning Hub',
    eligibility: 'Academicians teaching Cloud Computing, Web Engineering, or Software Architecture.',
    minimumExperience: 1,
    departmentEligibility: ['Computer Science & Engineering', 'Information Technology'],
    qualificationRequirements: ['Master\'s Degree'],
    capacity: 60,
    applicationDeadline: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
    certificateAvailable: true,
    collaborationRequired: false,
    status: 'Open',
  },

  // ── 4. Consultancy Projects (2) ──
  {
    title: 'Predictive Failure Diagnostics for Wind Turbine Transmission Networks',
    type: 'Consultancy',
    description:
      'Tata Power Renewable Energy seeks expert academic consultants to audit vibration telemetry datasets and develop acoustic anomaly detection models for multi-megawatt offshore wind turbine gearboxes.',
    provider: 'Tata Power Renewable Energy',
    industryPartner: 'Tata Power',
    domain: 'Data Science',
    requiredExpertise: ['Signal Processing', 'Machine Learning', 'Internet of Things'],
    preferredExpertise: ['Time Series Analysis', 'Predictive Maintenance'],
    duration: '6 Months',
    startDate: new Date('2026-11-15'),
    endDate: new Date('2027-05-15'),
    mode: 'Hybrid',
    location: 'Mumbai / Offshore Field Visits',
    eligibility: 'Senior faculty members with demonstrated consulting or published research in acoustic telemetry or structural health monitoring.',
    minimumExperience: 5,
    departmentEligibility: ['Electrical Engineering', 'Mechanical Engineering', 'Computer Science & Engineering'],
    qualificationRequirements: ['Ph.D.'],
    capacity: 2,
    applicationDeadline: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000),
    certificateAvailable: false,
    collaborationRequired: true,
    status: 'Open',
  },
  {
    title: 'Algorithmic Optimization for Automated Warehouse Fleet Dispatch',
    type: 'Consultancy',
    description:
      'Mahindra Logistics R&D invites principal academic investigators to optimize graph-theoretic dispatch heuristics for automated guided vehicles (AGVs) operating in high-density fulfillment centers.',
    provider: 'Mahindra Logistics Innovation Hub',
    industryPartner: 'Mahindra Logistics',
    domain: 'Software Engineering',
    requiredExpertise: ['Algorithms', 'Operations Research', 'Distributed Systems'],
    preferredExpertise: ['Graph Theory', 'Discrete Mathematics', 'Python'],
    duration: '3 Months',
    startDate: new Date('2026-10-25'),
    endDate: new Date('2027-01-25'),
    mode: 'Hybrid',
    location: 'Chakan Logistics Facility, Pune',
    eligibility: 'Faculty with research track record in combinatorial optimization or logistics engineering.',
    minimumExperience: 4,
    departmentEligibility: ['Computer Science & Engineering', 'Industrial Engineering'],
    qualificationRequirements: ['Ph.D.'],
    capacity: 2,
    applicationDeadline: new Date(Date.now() + 22 * 24 * 60 * 60 * 1000),
    certificateAvailable: false,
    collaborationRequired: true,
    status: 'Open',
  },

  // ── 5. Collaborative Research Projects (3) ──
  {
    title: 'Decentralized Federated Learning for Multi-Hospital Clinical Diagnostics',
    type: 'Collaborative Research',
    description:
      'Joint interdisciplinary research call sponsored by Apollo Research and ICMR to train privacy-preserving neural diagnostic models across distributed oncology centers without pooling raw patient records.',
    provider: 'Apollo HealthTech & ICMR Consortium',
    industryPartner: 'Apollo Hospitals Educational Research Foundation',
    institution: 'ICMR National Network',
    domain: 'Artificial Intelligence',
    requiredExpertise: ['Artificial Intelligence', 'Machine Learning', 'Federated Learning'],
    preferredExpertise: ['Computer Vision', 'Medical Imaging', 'Privacy-Preserving AI'],
    duration: '12 Months',
    startDate: new Date('2026-11-01'),
    endDate: new Date('2027-11-01'),
    mode: 'Hybrid',
    location: 'Pan-India Multi-Center Initiative',
    eligibility: 'Academic investigators with laboratory infrastructure to conduct distributed model training and publish joint Tier-1 papers.',
    minimumExperience: 3,
    departmentEligibility: ['Computer Science & Engineering', 'Biomedical Engineering', 'Data Science & AI'],
    qualificationRequirements: ['Ph.D.'],
    capacity: 6,
    applicationDeadline: new Date(Date.now() + 50 * 24 * 60 * 60 * 1000),
    certificateAvailable: true,
    collaborationRequired: true,
    status: 'Open',
  },
  {
    title: 'Post-Quantum Cryptographic Protocols for Satellite Telecommand Uplinks',
    type: 'Collaborative Research',
    description:
      'Collaborative R&D project exploring NIST-standardized lattice cryptography and fault-tolerant key exchange algorithms implemented on resource-constrained satellite transponders.',
    provider: 'ISRO Space Technology Cell',
    institution: 'Indian Space Research Organisation',
    domain: 'Cyber Security',
    requiredExpertise: ['Cyber Security', 'Cryptography', 'Distributed Systems'],
    preferredExpertise: ['Embedded C', 'Hardware Security', 'Lattice Cryptography'],
    duration: '9 Months',
    startDate: new Date('2026-11-15'),
    endDate: new Date('2027-08-15'),
    mode: 'Offline',
    location: 'ISRO Satellite Center, Bengaluru',
    eligibility: 'Faculty researchers holding active security clearances and Ph.D. in cryptography or secure architectures.',
    minimumExperience: 4,
    departmentEligibility: ['Computer Science & Engineering', 'Electronics & Communication Engineering'],
    qualificationRequirements: ['Ph.D.'],
    capacity: 3,
    applicationDeadline: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000),
    certificateAvailable: true,
    collaborationRequired: true,
    status: 'Open',
  },
  {
    title: 'Edge Intelligence & Grid Resiliency for Zero-Emission Microgrids',
    type: 'Collaborative Research',
    description:
      'Schneider Electric and affiliated university laboratories co-develop dynamic load balancing algorithms leveraging decentralized reinforcement learning at edge substations.',
    provider: 'Schneider Electric R&D Hub',
    industryPartner: 'Schneider Electric',
    domain: 'Internet of Things',
    requiredExpertise: ['Internet of Things', 'Smart Grids', 'Edge Computing'],
    preferredExpertise: ['Renewable Energy', 'Machine Learning', 'Embedded Systems'],
    duration: '8 Months',
    startDate: new Date('2026-10-30'),
    endDate: new Date('2027-06-30'),
    mode: 'Hybrid',
    location: 'Hyderabad R&D Center',
    eligibility: 'Faculty active in clean-tech, smart electrical distribution, and IoT network simulation.',
    minimumExperience: 2,
    departmentEligibility: ['Electrical Engineering', 'Computer Science & Engineering', 'Energy Systems'],
    qualificationRequirements: ['M.Tech', 'Ph.D.'],
    capacity: 4,
    applicationDeadline: new Date(Date.now() + 32 * 24 * 60 * 60 * 1000),
    certificateAvailable: true,
    collaborationRequired: true,
    status: 'Open',
  },

  // ── 6. Guest Lectures (2) ──
  {
    title: 'Industry Keynote Series: Architecting Resilient Financial Microservices',
    type: 'Guest Lecture',
    description:
      'Distinguished guest lecture opportunity hosted by Infosys Emerging Tech for faculty to present real-world systems architecture insights to graduate students and corporate apprentices.',
    provider: 'Infosys Emerging Technologies Unit',
    industryPartner: 'Infosys Limited',
    domain: 'Software Engineering',
    requiredExpertise: ['Distributed Systems', 'Software Engineering', 'System Design'],
    preferredExpertise: ['FinTech', 'Event-Driven Architecture'],
    duration: '1 Day',
    startDate: new Date('2026-10-18'),
    endDate: new Date('2026-10-18'),
    mode: 'Online',
    location: 'Global Virtual Stage',
    eligibility: 'Distinguished faculty with industry-tested distributed architectures expertise.',
    minimumExperience: 3,
    departmentEligibility: ['Computer Science & Engineering', 'Information Technology'],
    qualificationRequirements: ['Ph.D.'],
    capacity: 1,
    applicationDeadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    certificateAvailable: true,
    collaborationRequired: false,
    status: 'Open',
  },
  {
    title: 'Executive Roundtable: Responsible AI & Algorithm Auditing in Healthcare',
    type: 'Guest Lecture',
    description:
      'Interactive panel talk and expert keynote on fairness metrics, explainable AI (XAI), and medical device regulatory standards for AI systems.',
    provider: 'Microsoft Research India',
    industryPartner: 'Microsoft Technology Center',
    domain: 'Artificial Intelligence',
    requiredExpertise: ['Artificial Intelligence', 'Ethics in AI', 'Machine Learning'],
    preferredExpertise: ['Healthcare Informatics', 'Policy & Governance'],
    duration: '1 Day',
    startDate: new Date('2026-10-28'),
    endDate: new Date('2026-10-28'),
    mode: 'Hybrid',
    location: 'Bengaluru Tech Center',
    eligibility: 'Senior academicians and policy researchers in AI fairness and health data.',
    minimumExperience: 4,
    departmentEligibility: ['Computer Science & Engineering', 'Data Science & AI', 'Bioengineering'],
    qualificationRequirements: ['Ph.D.'],
    capacity: 2,
    applicationDeadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
    certificateAvailable: true,
    collaborationRequired: false,
    status: 'Open',
  },

  // ── 7. Workshops (2) ──
  {
    title: 'Hands-on Workshop: RISC-V SoC Architecture & FPGA Emulation',
    type: 'Workshop',
    description:
      'Intense technical workshop covering open-source RISC-V core customization, pipeline verification, and real-time synthesis on Xilinx FPGA development boards for academic lab instructors.',
    provider: 'ARM & RISC-V Academic Consortium',
    industryPartner: 'Cadence Design Systems',
    institution: 'IIT Bombay Microelectronics Lab',
    domain: 'Electronics',
    requiredExpertise: ['VLSI Design', 'Computer Architecture', 'Verilog / VHDL'],
    preferredExpertise: ['FPGA Prototyping', 'Digital Electronics'],
    duration: '3 Days',
    startDate: new Date('2026-11-05'),
    endDate: new Date('2026-11-07'),
    mode: 'Offline',
    location: 'IIT Bombay Campus, Mumbai',
    eligibility: 'Faculty teaching Digital Electronics, Computer Architecture, or Microprocessors.',
    minimumExperience: 1,
    departmentEligibility: ['Electrical Engineering', 'Electronics & Telecommunication', 'Computer Science & Engineering'],
    qualificationRequirements: ['M.Tech', 'Ph.D.'],
    capacity: 25,
    applicationDeadline: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000),
    certificateAvailable: true,
    collaborationRequired: false,
    status: 'Open',
  },
  {
    title: 'Academic Cloud Engineering & Containerized Laboratory Workflows',
    type: 'Workshop',
    description:
      'Practical training on setting up containerized, reproducible student lab environments using Docker Compose, Linux namespaces, and automated grading pipelines.',
    provider: 'Red Hat Academic Alliance',
    industryPartner: 'Red Hat India',
    domain: 'Cloud Computing',
    requiredExpertise: ['Linux', 'Docker', 'DevOps'],
    preferredExpertise: ['Bash Scripting', 'Git'],
    duration: '2 Days',
    startDate: new Date('2026-10-22'),
    endDate: new Date('2026-10-23'),
    mode: 'Online',
    location: 'Interactive Remote Lab',
    eligibility: 'Open to all engineering faculty managing student laboratory environments.',
    minimumExperience: 0,
    departmentEligibility: ['Computer Science & Engineering', 'Information Technology'],
    qualificationRequirements: ['Bachelor\'s Degree', 'Master\'s Degree'],
    capacity: 50,
    applicationDeadline: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
    certificateAvailable: true,
    collaborationRequired: false,
    status: 'Open',
  },

  // ── 8. Live Industry Projects (2) ──
  {
    title: 'National Curriculum-to-Industry Skill Alignment AI Engine',
    type: 'Live Industry Project',
    description:
      'Participate in building the SIH national automated skill translation pipeline. Faculty mentors provide pedagogical insights and validate NLP taxonomy extraction models mapping university syllabi to real-time hiring demands.',
    provider: 'SkillBridge National Consortium',
    industryPartner: 'NASSCOM AI Council',
    institution: 'National Innovation Council',
    domain: 'Artificial Intelligence',
    requiredExpertise: ['Artificial Intelligence', 'Natural Language Processing', 'Curriculum Design'],
    preferredExpertise: ['Python', 'BERT', 'Ontology Engineering'],
    duration: '4 Months',
    startDate: new Date('2026-10-20'),
    endDate: new Date('2027-02-20'),
    mode: 'Hybrid',
    location: 'Mumbai Tech Hub / Remote',
    eligibility: 'Faculty with expertise in AI, NLP, or institutional syllabus restructuring.',
    minimumExperience: 2,
    departmentEligibility: ['Computer Science & Engineering', 'Information Technology'],
    qualificationRequirements: ['M.Tech', 'Ph.D.'],
    capacity: 6,
    applicationDeadline: new Date(Date.now() + 19 * 24 * 60 * 60 * 1000),
    certificateAvailable: true,
    collaborationRequired: true,
    status: 'Open',
  },
  {
    title: 'Real-Time Telemetry & BMS Health Predictor for Electric Vehicle Fleets',
    type: 'Live Industry Project',
    description:
      'Collaborate with automotive engineers on CAN-bus data processing, battery state-of-health (SoH) regression models, and thermal runaway warning algorithms for public transit buses.',
    provider: 'Tata Motors Electric Mobility Division',
    industryPartner: 'Tata Motors',
    domain: 'Internet of Things',
    requiredExpertise: ['Internet of Things', 'Machine Learning', 'Automotive Systems'],
    preferredExpertise: ['Battery Management Systems', 'Python'],
    duration: '4 Months',
    startDate: new Date('2026-11-01'),
    endDate: new Date('2027-03-01'),
    mode: 'Hybrid',
    location: 'Pune Technical Center',
    eligibility: 'Faculty in electrical, automobile, or computer systems with embedded data background.',
    minimumExperience: 3,
    departmentEligibility: ['Electrical Engineering', 'Mechanical Engineering', 'Computer Science & Engineering'],
    qualificationRequirements: ['M.Tech', 'Ph.D.'],
    capacity: 4,
    applicationDeadline: new Date(Date.now() + 26 * 24 * 60 * 60 * 1000),
    certificateAvailable: true,
    collaborationRequired: true,
    status: 'Open',
  },

  // ── 9. Innovation Challenges (2) ──
  {
    title: 'Smart Agri-Tech & Autonomous Crop Monitoring Innovation Challenge',
    type: 'Innovation Challenge',
    description:
      'National innovation challenge tasking faculty-led research teams to solve localized agricultural yield problems using low-cost multi-spectral drones, edge vision, and soil moisture telemetry.',
    provider: 'Ministry of Agriculture & NABARD',
    industryPartner: 'AgriTech India Council',
    domain: 'Artificial Intelligence',
    requiredExpertise: ['Computer Vision', 'Internet of Things', 'Artificial Intelligence'],
    preferredExpertise: ['Drone Telemetry', 'Embedded AI'],
    duration: '2 Months',
    startDate: new Date('2026-11-01'),
    endDate: new Date('2027-01-01'),
    mode: 'Online',
    location: 'Pan-India Grand Challenge',
    eligibility: 'Faculty principal investigators leading student or interdisciplinary teams.',
    minimumExperience: 1,
    departmentEligibility: ['Computer Science & Engineering', 'Agricultural Engineering', 'Electrical Engineering'],
    qualificationRequirements: ['Master\'s Degree', 'Ph.D.'],
    capacity: 20,
    applicationDeadline: new Date(Date.now() + 29 * 24 * 60 * 60 * 1000),
    certificateAvailable: true,
    collaborationRequired: true,
    status: 'Open',
  },
  {
    title: 'FinTech Quantum-Safe Cyber Defense Hackathon for Faculty',
    type: 'Innovation Challenge',
    description:
      'National challenge organized by RBI Innovation Hub to design resilient intrusion detection architectures and post-quantum banking authentication modules.',
    provider: 'Reserve Bank Innovation Hub (RBIH)',
    industryPartner: 'RBI Innovation Hub',
    domain: 'Cyber Security',
    requiredExpertise: ['Cyber Security', 'Cryptography', 'FinTech'],
    preferredExpertise: ['Blockchain', 'Distributed Systems'],
    duration: '1 Month',
    startDate: new Date('2026-10-25'),
    endDate: new Date('2026-11-25'),
    mode: 'Online',
    location: 'Mumbai Financial Center / Virtual',
    eligibility: 'Faculty researchers in cyber security, banking systems, and applied cryptography.',
    minimumExperience: 2,
    departmentEligibility: ['Computer Science & Engineering', 'Information Technology'],
    qualificationRequirements: ['Master\'s Degree', 'Ph.D.'],
    capacity: 15,
    applicationDeadline: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000),
    certificateAvailable: true,
    collaborationRequired: true,
    status: 'Open',
  },

  // ── 10. Draft Opportunity (for security isolation verification) ──
  {
    title: '[DRAFT] Classified Next-Gen Quantum Sensor Collaboration',
    type: 'Collaborative Research',
    description:
      'Preliminary internal draft for confidential quantum sensing call. Must NOT be exposed to faculty discovery.',
    provider: 'Defense Advanced Research Center',
    domain: 'Cyber Security',
    requiredExpertise: ['Quantum Computing', 'Physics'],
    duration: '6 Months',
    mode: 'Offline',
    applicationDeadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    status: 'Draft',
  },
];

async function seedFacultyOpportunities() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI is not defined.');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log('📦 Connected to MongoDB Atlas for Faculty Opportunity Seeding...');

    // Find default admin or system user for createdBy reference
    const adminUser = await User.findOne({ role: 'admin' });
    const adminId = adminUser ? adminUser._id : null;

    let createdCount = 0;
    let updatedCount = 0;

    for (const oppData of SEED_FACULTY_OPPORTUNITIES) {
      const dataToSave = {
        ...oppData,
        createdBy: adminId,
      };

      const existing = await FacultyOpportunity.findOne({
        title: oppData.title,
        provider: oppData.provider,
      });

      if (existing) {
        await FacultyOpportunity.updateOne({ _id: existing._id }, { $set: dataToSave });
        updatedCount++;
      } else {
        await FacultyOpportunity.create(dataToSave);
        createdCount++;
      }
    }

    const totalInDb = await FacultyOpportunity.countDocuments();
    const openInDb = await FacultyOpportunity.countDocuments({ status: 'Open' });
    const draftInDb = await FacultyOpportunity.countDocuments({ status: 'Draft' });

    console.log(`
═══════════════════════════════════════════════════
🎉 Faculty Opportunity Seeding Completed!
═══════════════════════════════════════════════════
✨ Created:           ${createdCount}
🔄 Updated:           ${updatedCount}
📊 Total in DB:       ${totalInDb}
🟢 Open / Public:     ${openInDb}
🔒 Draft / Private:   ${draftInDb}
═══════════════════════════════════════════════════
    `);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding faculty opportunities:', err);
    process.exit(1);
  }
}

// Run standalone if executed directly
if (process.argv[1]?.endsWith('seedFacultyOpportunities.js')) {
  seedFacultyOpportunities();
}

export default seedFacultyOpportunities;
