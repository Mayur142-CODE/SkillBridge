import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { ensureNodeDns } from '../config/dns.js';
import Skill from '../models/Skill.js';
import LearningProgram from '../models/LearningProgram.js';
import User from '../models/User.js';
import MentorProfile from '../models/MentorProfile.js';

dotenv.config();

const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  console.error('❌ MONGODB_URI is not defined in environment variables.');
  process.exit(1);
}

async function seedPhase5() {
  try {
    console.log('\n======================================================');
    console.log('🌱 Starting Phase 5 Seed: Learning Hub & Mentorship');
    console.log('======================================================\n');

    console.log('Connecting to MongoDB Atlas...');
    await ensureNodeDns();
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB Atlas');

    // ── 1. Fetch Skill References ──
    const skills = await Skill.find().lean();
    const skillMap = new Map();
    skills.forEach((s) => {
      skillMap.set(s.slug, s._id);
      skillMap.set(s.name.toLowerCase(), s._id);
    });

    const getSkillId = (slugOrName) => {
      return skillMap.get(slugOrName.toLowerCase()) || null;
    };

    // ── 2. Define 10 Realistic Learning Programs ──
    const programsData = [
      {
        title: 'MongoDB Fundamentals & Schema Engineering',
        slug: 'mongodb-fundamentals-schema-engineering',
        description: 'Comprehensive industry certification covering NoSQL document modeling, indexing strategies, aggregation framework, and distributed replica sets for high-throughput applications.',
        provider: 'MongoDB University & SkillBridge Industry Partners',
        type: 'Certification',
        level: 'Intermediate',
        duration: '6 Weeks',
        mode: 'Online',
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // in 7 days
        endDate: new Date(Date.now() + 49 * 24 * 60 * 60 * 1000),
        registrationDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        capacity: 100,
        enrolledCount: 12,
        thumbnail: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=800&q=80',
        certificateAvailable: true,
        skills: [getSkillId('mongodb'), getSkillId('database')].filter(Boolean),
        eligibility: {
          minimumCgpa: 6.0,
          branches: ['Computer Science & Engineering', 'Information Technology', 'Electronics'],
          academicYears: ['2nd Year', '3rd Year', '4th Year'],
        },
        modules: [
          {
            title: 'Module 1: Document Modeling & Core Architecture',
            order: 1,
            lessons: [
              {
                title: 'Introduction to MongoDB & JSON/BSON Storage',
                description: 'Understand the document model, BSON data types, and comparison with relational RDBMS schemas.',
                content: `### Introduction to MongoDB & BSON

MongoDB is a document-oriented database designed for high availability, horizontal scalability, and developer agility.

#### Key Architectural Concepts:
1. **Document-Oriented**: Data is stored as BSON (Binary JSON) documents containing dynamic key-value pairs.
2. **Collections**: Analogous to relational tables, but schema-flexible.
3. **Primary Key (_id)**: Every document has an immutable, unique 12-byte ObjectId automatically assigned if omitted.

\`\`\`json
{
  "_id": ObjectId("6501f2e1a4b12c001f8d9101"),
  "title": "MongoDB Fundamentals",
  "rating": 4.9,
  "tags": ["database", "nosql", "cloud"]
}
\`\`\`

#### Best Practices:
- Prefer embedding for 1-to-1 or 1-to-few relationships with bounded growth.
- Prefer referencing with ObjectIds for unbounded arrays or large datasets.`,
                duration: '20 mins',
                order: 1,
                required: true,
              },
              {
                title: 'CRUD Operations & Expressive Query Operators',
                description: 'Master insert, find, update, and delete operators ($set, $push, $in, $elemMatch).',
                content: `### MongoDB CRUD Mastery

Mastering atomic modifications and expressive query filtering.

#### Essential Query Operators:
- **Comparison**: \`$eq\`, \`$gt\`, \`$gte\`, \`$lt\`, \`$lte\`, \`$in\`, \`$nin\`
- **Logical**: \`$and\`, \`$or\`, \`$not\`, \`$nor\`
- **Array Operators**: \`$elemMatch\`, \`$all\`, \`$size\`

\`\`\`javascript
// Querying documents with specific criteria
db.students.find({
  cgpa: { $gte: 8.5 },
  skills: { $elemMatch: { name: "MongoDB", score: { $gt: 70 } } }
});
\`\`\`

#### Updates:
Always use update operators like \`$set\`, \`$inc\`, \`$push\` to avoid accidentally overwriting documents.`,
                duration: '25 mins',
                order: 2,
                required: true,
              },
            ],
          },
          {
            title: 'Module 2: Indexing & The Aggregation Pipeline',
            order: 2,
            lessons: [
              {
                title: 'Indexes & Query Optimization (explain plan)',
                description: 'Single-field, compound, multikey, and text indexes. Understanding executionStats and COLLSCAN prevention.',
                content: `### Indexes & Query Performance

Without indexes, MongoDB must perform a collection scan (COLLSCAN) inspecting every document.

#### Index Types:
1. **Single Field**: \`db.users.createIndex({ email: 1 })\`
2. **Compound Index**: \`db.orders.createIndex({ customerId: 1, createdAt: -1 })\`
   - *Equality, Sort, Range (ESR)* rule is critical for index design.
3. **Multikey Index**: Automatically created when indexing fields containing arrays.

#### Query Diagnostics:
Use \`.explain("executionStats")\` to measure \`totalDocsExamined\` vs \`nReturned\`. Ideal ratio is 1:1.`,
                duration: '30 mins',
                order: 1,
                required: true,
              },
              {
                title: 'The Aggregation Pipeline & Group Operations',
                description: 'Multi-stage transformations using $match, $group, $project, $lookup, and $unwind.',
                content: `### Aggregation Framework

The Aggregation Pipeline is MongoDB's native analytics and data transformation engine.

#### Common Pipeline Stages:
- \`$match\`: Filters documents early in pipeline.
- \`$group\`: Aggregates metrics (sum, avg, min, max, push).
- \`$project\`: Shapes output fields.
- \`$lookup\`: Performs left outer joins with other collections.

\`\`\`javascript
db.orders.aggregate([
  { $match: { status: "Completed" } },
  { $group: { _id: "$customerId", totalSpent: { $sum: "$amount" } } },
  { $sort: { totalSpent: -1 } },
  { $limit: 10 }
]);
\`\`\``,
                duration: '35 mins',
                order: 2,
                required: true,
              },
            ],
          },
          {
            title: 'Module 3: Production Schema Design & Sharding',
            order: 3,
            lessons: [
              {
                title: 'Advanced Patterns (Bucket, Subset, Extended Reference)',
                description: 'Design patterns for real-time IoT metrics, large product catalogs, and audit logs.',
                content: `### Production Schema Design Patterns

1. **Subset Pattern**: Keep only top 5 recent comments embedded; move rest to secondary collection.
2. **Bucket Pattern**: Ideal for time-series / IoT telemetry data.
3. **Computed Pattern**: Pre-calculate running aggregates rather than computing on read.`,
                duration: '25 mins',
                order: 1,
                required: true,
              },
            ],
          },
        ],
      },
      {
        title: 'Full Stack React & Modern State Management',
        slug: 'full-stack-react-modern-state-management',
        description: 'Deep-dive frontend engineering masterclass focusing on React 18, custom hooks, context architecture, optimistic UI, and scalable component systems.',
        provider: 'Meta & SkillBridge Frontend Guild',
        type: 'Training',
        level: 'Intermediate',
        duration: '8 Weeks',
        mode: 'Online',
        startDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 66 * 24 * 60 * 60 * 1000),
        registrationDeadline: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
        capacity: 150,
        enrolledCount: 45,
        thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&q=80',
        certificateAvailable: true,
        skills: [getSkillId('react'), getSkillId('javascript')].filter(Boolean),
        eligibility: {
          minimumCgpa: 0,
        },
        modules: [
          {
            title: 'Module 1: Reactive Paradigms & Hook Architecture',
            order: 1,
            lessons: [
              {
                title: 'Declarative State & Hooks Lifecycle',
                description: 'Deep-dive into useState, useEffect synchronization, useMemo, and useCallback memory boundaries.',
                content: `### React Lifecycle & Modern Hooks

React renders components purely as functions of their current state and props.

#### Core Rules:
1. Only call hooks at top level.
2. Always specify exhaustive dependencies in \`useEffect\`.
3. Separate side effects from rendering calculations.`,
                duration: '25 mins',
                order: 1,
                required: true,
              },
              {
                title: 'Building Production Custom Hooks',
                description: 'Encapsulate data fetching, debouncing, local storage, and media queries into reusable custom hooks.',
                content: `### Reusable Custom Hooks

Extracting component logic into cohesive hooks like \`useDebounce\` and \`useFetch\`.`,
                duration: '30 mins',
                order: 2,
                required: true,
              },
            ],
          },
          {
            title: 'Module 2: Scalable Context & Global State',
            order: 2,
            lessons: [
              {
                title: 'React Context API with Reducer Patterns',
                description: 'Scalable state architectures avoiding prop drilling without external heavyweight libraries.',
                content: `### Context + useReducer Pattern

Combining React Context with \`useReducer\` yields a lightweight Redux-like centralized store with typed dispatch actions.`,
                duration: '30 mins',
                order: 1,
                required: true,
              },
            ],
          },
        ],
      },
      {
        title: 'Node.js & Express Microservices Engineering',
        slug: 'nodejs-express-microservices-engineering',
        description: 'Architecting robust, asynchronous backend services using Node.js event loop, Express middleware pipeline, JWT security, and resilient error handlers.',
        provider: 'OpenJS Foundation & Industry Tech Guild',
        type: 'Certification',
        level: 'Intermediate',
        duration: '6 Weeks',
        mode: 'Online',
        startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 56 * 24 * 60 * 60 * 1000),
        registrationDeadline: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
        capacity: 80,
        enrolledCount: 22,
        thumbnail: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80',
        certificateAvailable: true,
        skills: [getSkillId('nodejs'), getSkillId('express'), getSkillId('rest-apis')].filter(Boolean),
        eligibility: {
          minimumCgpa: 6.5,
        },
        modules: [
          {
            title: 'Module 1: The Asynchronous Event Loop & I/O',
            order: 1,
            lessons: [
              {
                title: 'Libuv, Worker Pools & Non-Blocking I/O',
                description: 'How Node.js executes asynchronous tasks via the Libuv event loop and thread pool.',
                content: `### Node.js Architecture & Event Loop

Node.js is single-threaded for JS execution but delegates blocking OS operations to Libuv's thread pool.`,
                duration: '25 mins',
                order: 1,
                required: true,
              },
              {
                title: 'Express Middleware Pipelines & Error Propagation',
                description: 'Crafting modular authentication, validation, logging, and centralized error handling middleware.',
                content: `### Middleware Architecture in Express

Every request flows sequentially through middleware layers (\`req, res, next\`). Centralized error handlers accept 4 arguments: \`(err, req, res, next)\`.`,
                duration: '20 mins',
                order: 2,
                required: true,
              },
            ],
          },
        ],
      },
      {
        title: 'Production Python & Algorithmic Problem Solving',
        slug: 'production-python-algorithmic-problem-solving',
        description: 'Master data structures, algorithms, generator pipelines, typing, and competitive programming techniques in Python.',
        provider: 'Python Software Foundation',
        type: 'Training',
        level: 'All Levels',
        duration: '5 Weeks',
        mode: 'Online',
        startDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000),
        registrationDeadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        capacity: 200,
        enrolledCount: 88,
        thumbnail: 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=800&q=80',
        certificateAvailable: true,
        skills: [getSkillId('python'), getSkillId('problem-solving')].filter(Boolean),
        eligibility: {
          minimumCgpa: 0,
        },
        modules: [
          {
            title: 'Module 1: Idiomatic Python & Computational Complexity',
            order: 1,
            lessons: [
              {
                title: 'Big-O Complexity & Memory Optimization in Python',
                description: 'Analyzing time and space complexity of built-in collections (lists, dicts, sets, deques).',
                content: `### Big-O & Data Structures in Python

Understanding time complexities of Python dicts (O(1) average lookup via open addressing hash tables) vs lists (O(1) append, O(n) insert/delete).`,
                duration: '20 mins',
                order: 1,
                required: true,
              },
              {
                title: 'Generators, Iterators & Memory Efficiency',
                description: 'Streaming large datasets using generator expressions and yield without exhausting memory.',
                content: `### Generators and Memory Conservation

Generators produce items on demand using lazy evaluation, consuming O(1) memory regardless of stream size.`,
                duration: '25 mins',
                order: 2,
                required: true,
              },
            ],
          },
        ],
      },
      {
        title: 'PostgreSQL Relational Modeling & Query Optimization',
        slug: 'postgresql-relational-modeling-query-optimization',
        description: 'Enterprise SQL architecture covering relational normalization, ACID transactions, vacuum tuning, and complex CTEs.',
        provider: 'PostgreSQL Professional Guild',
        type: 'Certification',
        level: 'Intermediate',
        duration: '4 Weeks',
        mode: 'Online',
        startDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000),
        registrationDeadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        capacity: 60,
        enrolledCount: 15,
        thumbnail: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=800&q=80',
        certificateAvailable: true,
        skills: [getSkillId('postgresql'), getSkillId('database')].filter(Boolean),
        eligibility: {
          minimumCgpa: 6.0,
        },
        modules: [
          {
            title: 'Module 1: ACID Transactions & Indexing',
            order: 1,
            lessons: [
              {
                title: 'ACID Compliance & Isolation Levels',
                description: 'Read Committed, Repeatable Read, and Serializable transaction isolation in Postgres.',
                content: `### ACID & Concurrency Control

PostgreSQL uses Multi-Version Concurrency Control (MVCC) where reads never block writes and writes never block reads.`,
                duration: '25 mins',
                order: 1,
                required: true,
              },
            ],
          },
        ],
      },
      {
        title: 'Docker & Containerized Microservices Hands-on Workshop',
        slug: 'docker-containerized-microservices-workshop',
        description: 'Interactive workshop on containerizing full-stack applications, multi-stage builds, Docker Compose, and environment isolation.',
        provider: 'Cloud Native Computing Foundation (CNCF)',
        type: 'Workshop',
        level: 'Beginner',
        duration: '2 Weeks',
        mode: 'Online',
        startDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000),
        registrationDeadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        capacity: 120,
        enrolledCount: 95,
        thumbnail: 'https://images.unsplash.com/photo-1607799279861-4dd421887fb3?w=800&q=80',
        certificateAvailable: true,
        skills: [getSkillId('docker'), getSkillId('git')].filter(Boolean),
        eligibility: {
          minimumCgpa: 0,
        },
        modules: [
          {
            title: 'Module 1: Images, Layers & Multi-Stage Builds',
            order: 1,
            lessons: [
              {
                title: 'Dockerfile Anatomy & Layer Caching',
                description: 'Structuring Dockerfiles for optimal layer cache utilization and minimal image footprint.',
                content: `### Dockerfile Best Practices

1. Order instructions from least frequently changing to most frequently changing.
2. Use multi-stage builds to exclude build toolchains from production runtime containers.`,
                duration: '30 mins',
                order: 1,
                required: true,
              },
            ],
          },
        ],
      },
      {
        title: 'Git Version Control & Enterprise Workflow Bootcamp',
        slug: 'git-version-control-enterprise-workflow',
        description: 'Master trunk-based development, rebase vs merge strategies, git bisect debugging, and pull request reviews.',
        provider: 'GitHub Education & SkillBridge',
        type: 'Workshop',
        level: 'Beginner',
        duration: '1 Week',
        mode: 'Online',
        startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
        registrationDeadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        capacity: 250,
        enrolledCount: 180,
        thumbnail: 'https://images.unsplash.com/photo-1556075798-4825dfaaf498?w=800&q=80',
        certificateAvailable: true,
        skills: [getSkillId('git'), getSkillId('teamwork')].filter(Boolean),
        eligibility: {
          minimumCgpa: 0,
        },
        modules: [
          {
            title: 'Module 1: The Git DAG & Branching Models',
            order: 1,
            lessons: [
              {
                title: 'The Directed Acyclic Graph (DAG) & Commits',
                description: 'How Git stores trees, blobs, and commit objects with SHA hashes.',
                content: `### Git Internal Architecture

Git stores commits as snapshots in an immutable Directed Acyclic Graph. Commits reference parent commits, trees, and blobs.`,
                duration: '20 mins',
                order: 1,
                required: true,
              },
            ],
          },
        ],
      },
      {
        title: 'High-Performance Caching & Data Structures with Redis',
        slug: 'high-performance-caching-redis-workshop',
        description: 'Hands-on training in in-memory key-value caching, Pub/Sub message queues, rate limiting, and cache invalidation strategies.',
        provider: 'Redis Labs Partner Network',
        type: 'Workshop',
        level: 'Intermediate',
        duration: '3 Weeks',
        mode: 'Hybrid',
        startDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 36 * 24 * 60 * 60 * 1000),
        registrationDeadline: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
        capacity: 50,
        enrolledCount: 14,
        thumbnail: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&q=80',
        certificateAvailable: true,
        skills: [getSkillId('redis'), getSkillId('system-design')].filter(Boolean),
        eligibility: {
          minimumCgpa: 6.5,
        },
        modules: [
          {
            title: 'Module 1: In-Memory Primitives & Cache Strategies',
            order: 1,
            lessons: [
              {
                title: 'Cache-Aside, Write-Through & Eviction Policies',
                description: 'Designing resilient caching layers with TTLs, LRU/LFU eviction, and thundering herd prevention.',
                content: `### Caching Architecture

Understanding Cache-Aside (Lazy Loading) vs Write-Through patterns and handling stale read windows.`,
                duration: '25 mins',
                order: 1,
                required: true,
              },
            ],
          },
        ],
      },
      {
        title: 'System Design & Distributed Scalability Masterclass',
        slug: 'system-design-distributed-scalability',
        description: 'Advanced engineering program covering microservices, load balancing, CAP theorem, database sharding, and message queues.',
        provider: 'AWS Academy & High Scalability Guild',
        type: 'Training',
        level: 'Advanced',
        duration: '8 Weeks',
        mode: 'Online',
        startDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 76 * 24 * 60 * 60 * 1000),
        registrationDeadline: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000),
        capacity: 75,
        enrolledCount: 30,
        thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80',
        certificateAvailable: true,
        skills: [getSkillId('system-design'), getSkillId('logical-reasoning')].filter(Boolean),
        eligibility: {
          minimumCgpa: 7.0,
          branches: ['Computer Science & Engineering', 'Information Technology'],
          academicYears: ['3rd Year', '4th Year'],
        },
        modules: [
          {
            title: 'Module 1: Distributed Foundations & The CAP Theorem',
            order: 1,
            lessons: [
              {
                title: 'CAP Theorem, PACELC & Consistency Models',
                description: 'Navigating consistency vs availability tradeoffs across distributed partitions.',
                content: `### The CAP Theorem in Production

In the presence of a network partition (P), a distributed system must choose between Consistency (C) and Availability (A).`,
                duration: '35 mins',
                order: 1,
                required: true,
              },
            ],
          },
        ],
      },
      {
        title: 'Technical Communication & Leadership for Engineers',
        slug: 'technical-communication-leadership-engineers',
        description: 'Develop executive presence, stakeholder alignment, RFC design document writing, and empathetic engineering team mentorship.',
        provider: 'IIM Ahmedabad & SkillBridge Leadership Academy',
        type: 'Training',
        level: 'All Levels',
        duration: '4 Weeks',
        mode: 'Hybrid',
        startDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 36 * 24 * 60 * 60 * 1000),
        registrationDeadline: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
        capacity: 100,
        enrolledCount: 40,
        thumbnail: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80',
        certificateAvailable: true,
        skills: [getSkillId('communication'), getSkillId('leadership')].filter(Boolean),
        eligibility: {
          minimumCgpa: 0,
        },
        modules: [
          {
            title: 'Module 1: Architectural Articulation & Technical Writing',
            order: 1,
            lessons: [
              {
                title: 'Writing Persuasive RFCs & Design Docs',
                description: 'Structure technical proposals that convey business impact, risks, and alternatives clearly.',
                content: `### RFC Architecture & Stakeholder Alignment

A great Request for Comments (RFC) outlines Context, Goals, Non-Goals, Proposed Solution, Alternatives Considered, and Cross-Cutting Concerns.`,
                duration: '25 mins',
                order: 1,
                required: true,
              },
            ],
          },
        ],
      },
    ];

    console.log(`Seeding ${programsData.length} Learning Programs...`);
    for (const prog of programsData) {
      await LearningProgram.findOneAndUpdate(
        { slug: prog.slug },
        { $set: prog },
        { upsert: true, returnDocument: 'after' }
      );
    }
    console.log(`✅ Successfully seeded ${programsData.length} Learning Programs`);

    // ── 3. Seed Mentors ──
    console.log('Seeding Mentor Profiles...');
    // Find faculty and industry accounts
    const facultyUser = await User.findOne({ role: 'academician' });
    const industryUser = await User.findOne({ role: 'industry' });

    if (facultyUser) {
      await MentorProfile.findOneAndUpdate(
        { user: facultyUser._id },
        {
          $set: {
            user: facultyUser._id,
            type: 'Faculty',
            role: 'Associate Professor & Research Lead',
            organization: facultyUser.academicianProfile?.institution || 'IIT Bombay',
            department: 'Computer Science & Engineering',
            bio: 'Over 12 years of experience leading research in distributed systems, distributed databases, and machine learning infrastructure. Passionate about guiding students towards cutting-edge industry readiness.',
            expertise: ['Artificial Intelligence', 'Distributed Systems', 'Cloud Computing', 'Database Architecture'],
            skills: [getSkillId('system-design'), getSkillId('mongodb'), getSkillId('python')].filter(Boolean),
            yearsOfExperience: 12,
            availability: 'Available',
            maxMentees: 6,
            active: true,
          },
        },
        { upsert: true, returnDocument: 'after' }
      );
      console.log(`✅ Seeded Faculty Mentor Profile for: ${facultyUser.name}`);
    }

    if (industryUser) {
      await MentorProfile.findOneAndUpdate(
        { user: industryUser._id },
        {
          $set: {
            user: industryUser._id,
            type: 'Industry',
            role: 'Staff Cloud Architect & Tech Director',
            organization: industryUser.industryProfile?.companyName || 'SkillBridge Technologies',
            department: 'Core Architecture',
            bio: 'Principal engineer with 15+ years in high-scale cloud platforms, Node.js microservices, and database performance tuning. Enjoys mentoring aspiring software engineers on real-world system architecture.',
            expertise: ['Full Stack Development', 'Node.js Microservices', 'MongoDB Performance', 'Cloud Infrastructure'],
            skills: [getSkillId('nodejs'), getSkillId('react'), getSkillId('mongodb'), getSkillId('docker')].filter(Boolean),
            yearsOfExperience: 15,
            availability: 'Available',
            maxMentees: 5,
            active: true,
          },
        },
        { upsert: true, returnDocument: 'after' }
      );
      console.log(`✅ Seeded Industry Mentor Profile for: ${industryUser.name}`);
    }

    // Also create 2 additional diverse mentor accounts if not present
    let extraFaculty = await User.findOne({ email: 'mentor.swaminathan@skillbridge.dev' });
    if (!extraFaculty) {
      extraFaculty = await User.create({
        name: 'Dr. Arvind Swaminathan',
        email: 'mentor.swaminathan@skillbridge.dev',
        password: 'Faculty@123',
        role: 'academician',
        status: 'verified',
        isEmailVerified: true,
        phone: '+91 98765 03009',
        academicianProfile: {
          institution: 'VJTI Mumbai',
          department: 'Information Technology',
          designation: 'Professor & Dean of Academics',
          expertise: ['Data Engineering', 'Relational Databases', 'Algorithms'],
        },
      });
    }

    await MentorProfile.findOneAndUpdate(
      { user: extraFaculty._id },
      {
        $set: {
          user: extraFaculty._id,
          type: 'Faculty',
          role: 'Professor & Head of Data Systems',
          organization: 'VJTI Mumbai',
          department: 'Information Technology',
          bio: 'Professor specializing in relational modeling, database internal engines, and data pipeline optimization. Mentoring students for national hackathons and top research fellowships.',
          expertise: ['PostgreSQL', 'Data Engineering', 'Algorithms & Problem Solving'],
          skills: [getSkillId('postgresql'), getSkillId('problem-solving'), getSkillId('python')].filter(Boolean),
          yearsOfExperience: 18,
          availability: 'Limited',
          maxMentees: 4,
          active: true,
        },
      },
      { upsert: true, returnDocument: 'after' }
    );
    console.log('✅ Seeded Extra Faculty Mentor Profile for: Dr. Arvind Swaminathan');

    let extraIndustry = await User.findOne({ email: 'mentor.sneha@skillbridge.dev' });
    if (!extraIndustry) {
      extraIndustry = await User.create({
        name: 'Sneha Kulkarni',
        email: 'mentor.sneha@skillbridge.dev',
        password: 'Industry@123',
        role: 'industry',
        status: 'verified',
        isEmailVerified: true,
        phone: '+91 98765 02008',
        industryProfile: {
          companyName: 'CloudCore Global Systems',
          sector: 'Enterprise Software & Cloud Platforms',
          contactPerson: 'Sneha Kulkarni',
          website: 'https://cloudcore.example.com',
        },
      });
    }

    await MentorProfile.findOneAndUpdate(
      { user: extraIndustry._id },
      {
        $set: {
          user: extraIndustry._id,
          type: 'Industry',
          role: 'Senior Engineering Manager & Frontend Architect',
          organization: 'CloudCore Global Systems',
          department: 'Frontend Experience',
          bio: 'Frontend engineering leader driving multi-million user design systems, React performance, and modern web application reliability. Passionate about women in tech and engineering career acceleration.',
          expertise: ['React & Next.js', 'Frontend Architecture', 'Technical Leadership', 'Interview Mentorship'],
          skills: [getSkillId('react'), getSkillId('javascript'), getSkillId('communication')].filter(Boolean),
          yearsOfExperience: 10,
          availability: 'Available',
          maxMentees: 5,
          active: true,
        },
      },
      { upsert: true, returnDocument: 'after' }
    );
    console.log('✅ Seeded Extra Industry Mentor Profile for: Sneha Kulkarni');

    console.log('\n======================================================');
    console.log('🎉 Phase 5 Seed Complete!');
    console.log('======================================================\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during Phase 5 seed:', error);
    process.exit(1);
  }
}

seedPhase5();
