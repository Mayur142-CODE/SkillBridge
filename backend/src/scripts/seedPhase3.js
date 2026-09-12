import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import Skill from '../models/Skill.js';
import Assessment from '../models/Assessment.js';
import AssessmentQuestion from '../models/AssessmentQuestion.js';
import IndustrySkillDemand from '../models/IndustrySkillDemand.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const seedPhase3Data = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) throw new Error('MONGODB_URI missing in .env');

    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB Atlas');

    // ── 1. Seed Skills (20 skills across categories) ──
    console.log('Seeding skills taxonomy...');
    const skillsList = [
      { name: 'JavaScript', slug: 'javascript', category: 'Programming', description: 'Core web and runtime programming language.' },
      { name: 'TypeScript', slug: 'typescript', category: 'Programming', description: 'Typed superset of JavaScript for scalable codebases.' },
      { name: 'Python', slug: 'python', category: 'Programming', description: 'Versatile language for backend, AI, and automation.' },
      { name: 'React', slug: 'react', category: 'Web Development', description: 'Declarative component-based frontend framework.' },
      { name: 'Node.js', slug: 'nodejs', category: 'Web Development', description: 'Asynchronous event-driven JavaScript server runtime.' },
      { name: 'Express', slug: 'express', category: 'Web Development', description: 'Minimalist web framework for Node.js REST APIs.' },
      { name: 'MongoDB', slug: 'mongodb', category: 'Database', description: 'Document-oriented NoSQL database system.' },
      { name: 'PostgreSQL', slug: 'postgresql', category: 'Database', description: 'Advanced relational SQL database with ACID compliance.' },
      { name: 'Redis', slug: 'redis', category: 'Database', description: 'In-memory data structure store for caching and pub/sub.' },
      { name: 'Docker', slug: 'docker', category: 'Cloud & DevOps', description: 'Containerization platform for application packaging.' },
      { name: 'Git', slug: 'git', category: 'Cloud & DevOps', description: 'Distributed version control and collaboration.' },
      { name: 'RESTful APIs', slug: 'rest-apis', category: 'Web Development', description: 'Architecture standards for scalable web services.' },
      { name: 'System Design', slug: 'system-design', category: 'Domain', description: 'Architecture of distributed, fault-tolerant architectures.' },
      { name: 'Problem Solving', slug: 'problem-solving', category: 'Aptitude', description: 'Algorithmic breakdown and critical thinking.' },
      { name: 'Logical Reasoning', slug: 'logical-reasoning', category: 'Aptitude', description: 'Deductive reasoning and analytical deduction.' },
      { name: 'Communication', slug: 'communication', category: 'Soft Skills', description: 'Clear technical expression and stakeholder articulation.' },
      { name: 'Teamwork', slug: 'teamwork', category: 'Soft Skills', description: 'Collaborative engineering and cross-functional synergy.' },
      { name: 'Leadership', slug: 'leadership', category: 'Soft Skills', description: 'Mentorship, accountability, and project ownership.' },
      { name: 'Adaptability', slug: 'adaptability', category: 'Soft Skills', description: 'Agile pivoting and rapid adoption of new paradigms.' },
      { name: 'Time Management', slug: 'time-management', category: 'Soft Skills', description: 'Prioritization, sprint pacing, and delivery cadence.' },
    ];

    const skillMap = new Map();
    for (const item of skillsList) {
      const sk = await Skill.findOneAndUpdate(
        { slug: item.slug },
        { $set: item },
        { upsert: true, returnDocument: 'after' }
      );
      skillMap.set(item.slug, sk);
    }
    console.log(`✅ Seeded ${skillMap.size} Skills`);

    // ── 2. Seed Industry Skill Demand Benchmarks ──
    console.log('Seeding industry demand benchmarks...');
    const demandConfigs = [
      { slug: 'javascript', targetScore: 75, demandLevel: 'Critical', growth: '+22% YoY' },
      { slug: 'react', targetScore: 75, demandLevel: 'Critical', growth: '+28% YoY' },
      { slug: 'nodejs', targetScore: 70, demandLevel: 'High', growth: '+18% YoY' },
      { slug: 'express', targetScore: 70, demandLevel: 'High', growth: '+15% YoY' },
      { slug: 'mongodb', targetScore: 70, demandLevel: 'High', growth: '+16% YoY' },
      { slug: 'postgresql', targetScore: 75, demandLevel: 'Critical', growth: '+25% YoY' },
      { slug: 'python', targetScore: 75, demandLevel: 'Critical', growth: '+32% YoY' },
      { slug: 'docker', targetScore: 65, demandLevel: 'High', growth: '+20% YoY' },
      { slug: 'git', targetScore: 80, demandLevel: 'High', growth: '+10% YoY' },
      { slug: 'system-design', targetScore: 70, demandLevel: 'Critical', growth: '+35% YoY' },
      { slug: 'communication', targetScore: 80, demandLevel: 'Critical', growth: '+24% YoY' },
      { slug: 'teamwork', targetScore: 80, demandLevel: 'High', growth: '+20% YoY' },
      { slug: 'leadership', targetScore: 65, demandLevel: 'Medium', growth: '+12% YoY' },
      { slug: 'time-management', targetScore: 75, demandLevel: 'High', growth: '+15% YoY' },
      { slug: 'logical-reasoning', targetScore: 70, demandLevel: 'High', growth: '+14% YoY' },
    ];

    for (const d of demandConfigs) {
      const sk = skillMap.get(d.slug);
      if (sk) {
        await IndustrySkillDemand.findOneAndUpdate(
          { skill: sk._id },
          {
            $set: {
              skill: sk._id,
              skillName: sk.name,
              targetScore: d.targetScore,
              demandLevel: d.demandLevel,
              marketGrowthRate: d.growth,
            },
          },
          { upsert: true }
        );
      }
    }
    console.log(`✅ Seeded ${demandConfigs.length} Industry Demand Targets`);

    // ── 3. Seed Assessments ──
    console.log('Seeding assessment definitions...');

    // Assessment A: Technical Assessment
    const techAssessment = await Assessment.findOneAndUpdate(
      { title: 'Full-Stack Web & Software Engineering Assessment' },
      {
        $set: {
          title: 'Full-Stack Web & Software Engineering Assessment',
          description:
            'Comprehensive technical evaluation covering JavaScript fundamentals, modern React architecture, Node.js concurrency, database query optimization, and Git.',
          type: 'Technical',
          category: 'Software Engineering',
          duration: 20,
          passingScore: 60,
          active: true,
          version: 1,
        },
      },
      { upsert: true, returnDocument: 'after' }
    );

    // Assessment B: Soft Skill Assessment
    const softAssessment = await Assessment.findOneAndUpdate(
      { title: 'Workplace Behavioral & Collaboration Competencies' },
      {
        $set: {
          title: 'Workplace Behavioral & Collaboration Competencies',
          description:
            'Scenario-based assessment evaluating communication under pressure, conflict resolution, cross-functional collaboration, and professional time management.',
          type: 'Soft Skill',
          category: 'Professional Skills',
          duration: 15,
          passingScore: 60,
          active: true,
          version: 1,
        },
      },
      { upsert: true, returnDocument: 'after' }
    );

    // Assessment C: Aptitude Assessment (Optional)
    const aptitudeAssessment = await Assessment.findOneAndUpdate(
      { title: 'Logical Reasoning & Algorithmic Problem Solving' },
      {
        $set: {
          title: 'Logical Reasoning & Algorithmic Problem Solving',
          description:
            'Cognitive and deductive evaluation measuring analytical pattern recognition, quantitative reasoning, and algorithmic complexity intuition.',
          type: 'Aptitude',
          category: 'Cognitive Aptitude',
          duration: 15,
          passingScore: 60,
          active: true,
          version: 1,
        },
      },
      { upsert: true, returnDocument: 'after' }
    );

    // Assessment D: Domain Assessment (Optional)
    const domainAssessment = await Assessment.findOneAndUpdate(
      { title: 'Cloud & Distributed Systems Architecture' },
      {
        $set: {
          title: 'Cloud & Distributed Systems Architecture',
          description:
            'Specialized domain examination on distributed caching, CAP theorem tradeoffs, load balancing, idempotency, and containerization.',
          type: 'Domain',
          category: 'Cloud Engineering',
          duration: 15,
          passingScore: 60,
          active: true,
          version: 1,
        },
      },
      { upsert: true, returnDocument: 'after' }
    );
    console.log('✅ Seeded 4 Assessments (Technical, Soft Skill, Aptitude, Domain)');

    // ── 4. Seed Questions ──
    console.log('Seeding assessment questions...');

    // 15 Technical Questions
    await AssessmentQuestion.deleteMany({ assessment: techAssessment._id });
    const techQuestions = [
      {
        assessment: techAssessment._id,
        skill: skillMap.get('javascript')._id,
        question: 'What is the primary difference between Array.prototype.map() and Array.prototype.forEach() in JavaScript?',
        options: [
          { optionId: 'opt_a', text: 'map() mutates the original array in place; forEach() does not.' },
          { optionId: 'opt_b', text: 'map() returns a new array of transformed elements; forEach() returns undefined.' },
          { optionId: 'opt_c', text: 'forEach() is asynchronous; map() executes synchronously.' },
          { optionId: 'opt_d', text: 'There is no functional difference; they are syntactic aliases.' },
        ],
        correctAnswer: 'opt_b',
        explanation: 'map() creates and returns a new array populated with the results of calling the provided function on every element, whereas forEach() executes side effects and returns undefined.',
        marks: 1,
        difficulty: 'Easy',
        order: 1,
      },
      {
        assessment: techAssessment._id,
        skill: skillMap.get('javascript')._id,
        question: 'What is the output of `typeof null` and `typeof undefined` in standard JavaScript?',
        options: [
          { optionId: 'opt_a', text: '"object" and "undefined"' },
          { optionId: 'opt_b', text: '"null" and "undefined"' },
          { optionId: 'opt_c', text: '"object" and "object"' },
          { optionId: 'opt_d', text: '"undefined" and "null"' },
        ],
        correctAnswer: 'opt_a',
        explanation: 'In JavaScript, typeof null returns "object" due to a historical legacy bug, whereas typeof undefined returns "undefined".',
        marks: 1,
        difficulty: 'Easy',
        order: 2,
      },
      {
        assessment: techAssessment._id,
        skill: skillMap.get('javascript')._id,
        question: 'In the JavaScript Event Loop, which queue takes highest execution priority between microtasks and macrotasks?',
        options: [
          { optionId: 'opt_a', text: 'Macrotasks (e.g. setTimeout) execute before the Microtask queue is drained.' },
          { optionId: 'opt_b', text: 'The microtask queue (e.g. Promise.then) is completely emptied before the next macrotask is dequeued.' },
          { optionId: 'opt_c', text: 'Microtasks and macrotasks are interleaved alternately 1:1.' },
          { optionId: 'opt_d', text: 'Execution priority depends strictly on CPU thread availability.' },
        ],
        correctAnswer: 'opt_b',
        explanation: 'After every macrotask, the microtask queue (Promises, queueMicrotask) is exhausted completely before the engine picks the next macrotask.',
        marks: 1,
        difficulty: 'Medium',
        order: 3,
      },
      {
        assessment: techAssessment._id,
        skill: skillMap.get('react')._id,
        question: 'Why should keys provided to list items in React be unique and stable rather than array indices?',
        options: [
          { optionId: 'opt_a', text: 'Keys are strictly required by the browser DOM specification for all child elements.' },
          { optionId: 'opt_b', text: 'Indices cause reconciliation reordering bugs and state corruption during insertions or deletions.' },
          { optionId: 'opt_c', text: 'Indices cause immediate runtime exceptions in production builds.' },
          { optionId: 'opt_d', text: 'Keys determine the CSS z-index rendering order.' },
        ],
        correctAnswer: 'opt_b',
        explanation: 'Using indices as keys degrades reconciliation performance and causes component state to be incorrectly preserved across reordered or deleted items.',
        marks: 1,
        difficulty: 'Medium',
        order: 4,
      },
      {
        assessment: techAssessment._id,
        skill: skillMap.get('react')._id,
        question: 'What is the primary purpose of the `useCallback` hook in React?',
        options: [
          { optionId: 'opt_a', text: 'To asynchronously fetch data after the component mounts.' },
          { optionId: 'opt_b', text: 'To memoize a callback function instance between renders to prevent unnecessary child re-renders.' },
          { optionId: 'opt_c', text: 'To create a two-way data binding with form inputs.' },
          { optionId: 'opt_d', text: 'To store mutable values that do not trigger a re-render when changed.' },
        ],
        correctAnswer: 'opt_b',
        explanation: 'useCallback returns a memoized version of the callback that only changes if one of the dependencies has updated, preventing re-rendering of optimized child components.',
        marks: 1,
        difficulty: 'Medium',
        order: 5,
      },
      {
        assessment: techAssessment._id,
        skill: skillMap.get('react')._id,
        question: 'When does a cleanup function returned from `useEffect` execute?',
        options: [
          { optionId: 'opt_a', text: 'Only when the browser window is closed.' },
          { optionId: 'opt_b', text: 'Before the component unmounts and before re-running the effect on subsequent renders.' },
          { optionId: 'opt_c', text: 'Immediately after the effect function executes.' },
          { optionId: 'opt_d', text: 'Only when an unhandled runtime error occurs.' },
        ],
        correctAnswer: 'opt_b',
        explanation: 'React cleans up the previous effect before applying the effect next time, as well as when the component unmounts.',
        marks: 1,
        difficulty: 'Medium',
        order: 6,
      },
      {
        assessment: techAssessment._id,
        skill: skillMap.get('nodejs')._id,
        question: 'How does Node.js handle concurrency despite running on a single main thread?',
        options: [
          { optionId: 'opt_a', text: 'It creates a new OS thread for every incoming HTTP request.' },
          { optionId: 'opt_b', text: 'By utilizing an event-driven, non-blocking I/O model backed by the libuv thread pool.' },
          { optionId: 'opt_c', text: 'By utilizing hardware multi-threading directly in the V8 engine.' },
          { optionId: 'opt_d', text: 'Node.js is completely synchronous and cannot handle concurrent connections.' },
        ],
        correctAnswer: 'opt_b',
        explanation: 'Node.js delegates asynchronous I/O and blocking operations to the underlying libuv C library and its worker thread pool, notifying the event loop upon completion.',
        marks: 1,
        difficulty: 'Medium',
        order: 7,
      },
      {
        assessment: techAssessment._id,
        skill: skillMap.get('express')._id,
        question: 'In an Express.js middleware chain, what happens if neither `next()` nor a response method is called?',
        options: [
          { optionId: 'opt_a', text: 'The request automatically returns a 200 OK status after 500ms.' },
          { optionId: 'opt_b', text: 'The client request will hang indefinitely until the HTTP connection times out.' },
          { optionId: 'opt_c', text: 'Express falls back to the next registered route handler.' },
          { optionId: 'opt_d', text: 'Express terminates the Node process immediately.' },
        ],
        correctAnswer: 'opt_b',
        explanation: 'If the current middleware does not end the request-response cycle, it must call next() to pass control to the next middleware function. Otherwise, the request hangs.',
        marks: 1,
        difficulty: 'Easy',
        order: 8,
      },
      {
        assessment: techAssessment._id,
        skill: skillMap.get('mongodb')._id,
        question: 'In MongoDB, what index type is essential to enforce that no two documents have identical values for a field?',
        options: [
          { optionId: 'opt_a', text: 'Text Index' },
          { optionId: 'opt_b', text: 'Unique Index' },
          { optionId: 'opt_c', text: 'Geospatial Index' },
          { optionId: 'opt_d', text: 'Hashed Index' },
        ],
        correctAnswer: 'opt_b',
        explanation: 'A unique index causes MongoDB to reject duplicate values for the indexed field across documents in the collection.',
        marks: 1,
        difficulty: 'Easy',
        order: 9,
      },
      {
        assessment: techAssessment._id,
        skill: skillMap.get('mongodb')._id,
        question: 'What is the purpose of the `$lookup` stage in a MongoDB aggregation pipeline?',
        options: [
          { optionId: 'opt_a', text: 'To perform a left outer join to an unsharded collection in the same database.' },
          { optionId: 'opt_b', text: 'To search for substring text patterns within indexed fields.' },
          { optionId: 'opt_c', text: 'To sort the documents by ascending or descending order.' },
          { optionId: 'opt_d', text: 'To project specific fields into the final result set.' },
        ],
        correctAnswer: 'opt_a',
        explanation: '$lookup performs a left outer join to another collection in the same database to filter in documents from the "joined" collection for processing.',
        marks: 1,
        difficulty: 'Medium',
        order: 10,
      },
      {
        assessment: techAssessment._id,
        skill: skillMap.get('git')._id,
        question: 'What is the fundamental difference between `git merge` and `git rebase`?',
        options: [
          { optionId: 'opt_a', text: 'rebase deletes past commits; merge keeps every branch permanently.' },
          { optionId: 'opt_b', text: 'merge preserves complete historical branch topology with a merge commit; rebase rewrites project history linearly.' },
          { optionId: 'opt_c', text: 'git rebase can only be used on the remote repository server.' },
          { optionId: 'opt_d', text: 'There is no difference in commit history.' },
        ],
        correctAnswer: 'opt_b',
        explanation: 'git rebase re-applies commits on top of another base tip, creating a linear history, whereas git merge ties two branch histories together with a dedicated merge commit.',
        marks: 1,
        difficulty: 'Medium',
        order: 11,
      },
      {
        assessment: techAssessment._id,
        skill: skillMap.get('docker')._id,
        question: 'What is the benefit of using Multi-Stage Builds in a Dockerfile?',
        options: [
          { optionId: 'opt_a', text: 'They allow Docker to run on multiple host operating systems at the same time.' },
          { optionId: 'opt_b', text: 'They dramatically reduce final production container image size by discarding build tools and intermediate artifacts.' },
          { optionId: 'opt_c', text: 'They bypass the container security sandbox.' },
          { optionId: 'opt_d', text: 'They automatically publish images to Docker Hub without credentials.' },
        ],
        correctAnswer: 'opt_b',
        explanation: 'Multi-stage builds separate the compilation/build environment from the lightweight runtime image, yielding minimal, secure production containers.',
        marks: 1,
        difficulty: 'Medium',
        order: 12,
      },
      {
        assessment: techAssessment._id,
        skill: skillMap.get('python')._id,
        question: 'What is the key characteristic of Python generator functions that use the `yield` statement?',
        options: [
          { optionId: 'opt_a', text: 'They execute entirely on startup and store all elements in heap memory.' },
          { optionId: 'opt_b', text: 'They produce items lazily on-demand, maintaining state between calls without loading entire sequences into memory.' },
          { optionId: 'opt_c', text: 'They convert procedural code into multithreaded machine code.' },
          { optionId: 'opt_d', text: 'They can only be called from inside asynchronous event loops.' },
        ],
        correctAnswer: 'opt_b',
        explanation: 'Generators yield values one at a time on demand (lazy evaluation), which greatly reduces memory consumption when working with large data sets.',
        marks: 1,
        difficulty: 'Medium',
        order: 13,
      },
      {
        assessment: techAssessment._id,
        skill: skillMap.get('postgresql')._id,
        question: 'What does the "I" in ACID database transactions guarantee?',
        options: [
          { optionId: 'opt_a', text: 'Indexation: all primary keys are automatically clustered.' },
          { optionId: 'opt_b', text: 'Isolation: concurrent transactions execute without interference or uncommitted dirty reads from one another.' },
          { optionId: 'opt_c', text: 'Immediate write: all changes are persisted directly to SSD without memory caching.' },
          { optionId: 'opt_d', text: 'Idempotency: repeating the transaction always produces identical outputs.' },
        ],
        correctAnswer: 'opt_b',
        explanation: 'Isolation ensures that concurrent transactions occur in isolation from each other, preventing partial reads or dirty data interference.',
        marks: 1,
        difficulty: 'Hard',
        order: 14,
      },
      {
        assessment: techAssessment._id,
        skill: skillMap.get('javascript')._id,
        question: 'What is the purpose of using Object.freeze() on a JavaScript object?',
        options: [
          { optionId: 'opt_a', text: 'It compresses the object in memory for transmission.' },
          { optionId: 'opt_b', text: 'It prevents new properties from being added, existing properties from being removed, and prevents changing property values.' },
          { optionId: 'opt_c', text: 'It pauses execution of all methods attached to the object.' },
          { optionId: 'opt_d', text: 'It deep-clones the object recursively.' },
        ],
        correctAnswer: 'opt_b',
        explanation: 'Object.freeze() makes an object shallowly immutable; properties cannot be added, removed, or modified.',
        marks: 1,
        difficulty: 'Easy',
        order: 15,
      },
    ];
    await AssessmentQuestion.insertMany(techQuestions);
    console.log(`✅ Seeded ${techQuestions.length} Technical Questions`);

    // 10 Soft Skill Scenario Questions
    await AssessmentQuestion.deleteMany({ assessment: softAssessment._id });
    const softQuestions = [
      {
        assessment: softAssessment._id,
        skill: skillMap.get('communication')._id,
        question: 'A critical production bug is detected 15 minutes before a sprint release. What is the most effective immediate communication action?',
        options: [
          { optionId: 'opt_a', text: 'Immediately notify the release lead and team on the public channel with bug reproduction details, impact severity, and proposed fix.', scoreValue: 4 },
          { optionId: 'opt_b', text: 'Silently push a quick hotfix commit and hope the automated tests pass before anyone notices.', scoreValue: 1 },
          { optionId: 'opt_c', text: 'Wait until the post-release retrospective next week to discuss why the bug occurred.', scoreValue: 1 },
          { optionId: 'opt_d', text: 'Send a private DM to your friend on the team asking them to delay the pipeline manually.', scoreValue: 2 },
        ],
        correctAnswer: 'opt_a',
        explanation: 'Immediate transparent communication of severity, impact, and mitigation ensures coordinated team decision-making and prevents production outages.',
        marks: 4,
        difficulty: 'Medium',
        order: 1,
      },
      {
        assessment: softAssessment._id,
        skill: skillMap.get('teamwork')._id,
        question: 'During a peer code review, a teammate leaves direct critical feedback on your architectural choices. How do you respond constructively?',
        options: [
          { optionId: 'opt_a', text: 'Acknowledge the feedback professionally, discuss technical trade-offs with data or benchmarks, and align on the optimal architecture.', scoreValue: 4 },
          { optionId: 'opt_b', text: 'Reject their suggestions immediately and escalate to the engineering manager.', scoreValue: 1 },
          { optionId: 'opt_c', text: 'Ignore the review comments and merge the pull request directly.', scoreValue: 1 },
          { optionId: 'opt_d', text: 'Leave retaliatory harsh comments on their open pull requests.', scoreValue: 1 },
        ],
        correctAnswer: 'opt_a',
        explanation: 'Constructive technical dialogue focusing on code quality and architectural trade-offs builds team psychological safety and engineering excellence.',
        marks: 4,
        difficulty: 'Easy',
        order: 2,
      },
      {
        assessment: softAssessment._id,
        skill: skillMap.get('leadership')._id,
        question: 'A junior engineer is struggling to meet their sprint commitment on an unfamiliar microservice. As a collaborative lead, what do you do?',
        options: [
          { optionId: 'opt_a', text: 'Schedule a 30-minute pair-programming walkthrough to unblock them, review architecture, and co-create an achievable milestone plan.', scoreValue: 4 },
          { optionId: 'opt_b', text: 'Take all their tickets away and complete them yourself overnight.', scoreValue: 2 },
          { optionId: 'opt_c', text: 'Publicly reprimand them in daily standup for slowing down velocity.', scoreValue: 1 },
          { optionId: 'opt_d', text: 'Tell them to read the documentation and figure it out alone.', scoreValue: 1 },
        ],
        correctAnswer: 'opt_a',
        explanation: 'Empathetic mentorship and collaborative unblocking builds team autonomy and long-term delivery capability.',
        marks: 4,
        difficulty: 'Medium',
        order: 3,
      },
      {
        assessment: softAssessment._id,
        skill: skillMap.get('adaptability')._id,
        question: 'Halfway through a quarter, product management shifts strategic priority from Feature A to Feature B due to new market regulations. How do you adapt?',
        options: [
          { optionId: 'opt_a', text: 'Document and cleanly archive Feature A work, align with the product lead on Feature B scope, and adjust sprint capacity proactively.', scoreValue: 4 },
          { optionId: 'opt_b', text: 'Continue building Feature A in secret because you already wrote 50% of the code.', scoreValue: 1 },
          { optionId: 'opt_c', text: 'Express vocal frustration in customer meetings and refuse to take new tasks.', scoreValue: 1 },
          { optionId: 'opt_d', text: 'Disengage from sprint ceremonies until the quarter ends.', scoreValue: 1 },
        ],
        correctAnswer: 'opt_a',
        explanation: 'Agility requires understanding regulatory constraints, preserving clean engineering assets, and shifting focus constructively.',
        marks: 4,
        difficulty: 'Medium',
        order: 4,
      },
      {
        assessment: softAssessment._id,
        skill: skillMap.get('time-management')._id,
        question: 'You have 3 simultaneous tasks: a high-impact production security patch, an ongoing roadmap feature due next week, and several non-urgent email threads. How do you prioritize?',
        options: [
          { optionId: 'opt_a', text: 'Apply the Eisenhower Matrix: execute the security patch immediately, block time for the roadmap feature, and batch reply to emails later.', scoreValue: 4 },
          { optionId: 'opt_b', text: 'Answer all emails first because they are quick and easy to clear.', scoreValue: 2 },
          { optionId: 'opt_c', text: 'Work on all 3 concurrently by switching browser tabs every 2 minutes.', scoreValue: 1 },
          { optionId: 'opt_d', text: 'Procrastinate on the security patch until the end of the sprint.', scoreValue: 1 },
        ],
        correctAnswer: 'opt_a',
        explanation: 'Effective prioritization addresses high-urgency/high-impact security threats first while safeguarding focused deep-work blocks for roadmap deliverables.',
        marks: 4,
        difficulty: 'Easy',
        order: 5,
      },
      {
        assessment: techAssessment._id,
        skill: skillMap.get('communication')._id,
        question: 'When presenting a technical proposal to non-technical executive stakeholders, which approach is most effective?',
        options: [
          { optionId: 'opt_a', text: 'Lead with business impact, cost efficiencies, risk mitigation, and user experience, using clear diagrams rather than low-level syntax.', scoreValue: 4 },
          { optionId: 'opt_b', text: 'Read directly from compiler error logs and complex regex source code.', scoreValue: 1 },
          { optionId: 'opt_c', text: 'Use excessive engineering jargon to impress the executives with technical complexity.', scoreValue: 1 },
          { optionId: 'opt_d', text: 'Refuse to meet and demand they hire an engineer to talk to you.', scoreValue: 1 },
        ],
        correctAnswer: 'opt_a',
        explanation: 'Stakeholder communication succeeds when technical value is framed in terms of business impact, reliability, and user value.',
        marks: 4,
        difficulty: 'Medium',
        order: 6,
      },
      {
        assessment: softAssessment._id,
        skill: skillMap.get('teamwork')._id,
        question: 'Two senior developers on your team disagree on whether to use GraphQL or REST for a new service, stalling sprint progress. How can the deadlock be resolved?',
        options: [
          { optionId: 'opt_a', text: 'Conduct a timeboxed 1-day spike comparing specific latency, client complexity, and team familiarity against concrete project requirements.', scoreValue: 4 },
          { optionId: 'opt_b', text: 'Choose whichever technology has more stars on GitHub today.', scoreValue: 1 },
          { optionId: 'opt_c', text: 'Flip a coin in standup and ban further discussion.', scoreValue: 1 },
          { optionId: 'opt_d', text: 'Build two identical services and run both in production simultaneously.', scoreValue: 1 },
        ],
        correctAnswer: 'opt_a',
        explanation: 'Objective, evidence-based spikes evaluate concrete technical trade-offs aligned with project needs rather than personal opinions.',
        marks: 4,
        difficulty: 'Hard',
        order: 7,
      },
      {
        assessment: softAssessment._id,
        skill: skillMap.get('leadership')._id,
        question: 'Your team discovers that an estimate given to leadership is 2 weeks too optimistic due to legacy system tech debt. What is the professional course of action?',
        options: [
          { optionId: 'opt_a', text: 'Proactively inform leadership early with a revised timeline, clear root-cause breakdown, and options to either cut secondary scope or adjust the launch date.', scoreValue: 4 },
          { optionId: 'opt_b', text: 'Say nothing until the original launch date and announce the delay with 1 hour remaining.', scoreValue: 1 },
          { optionId: 'opt_c', text: 'Force the engineering team to work 20-hour days without rest or testing.', scoreValue: 1 },
          { optionId: 'opt_d', text: 'Blame the previous team members who wrote the legacy code.', scoreValue: 1 },
        ],
        correctAnswer: 'opt_a',
        explanation: 'Early visibility into timeline deviations gives stakeholders flexibility to adjust marketing, sales, or scope gracefully.',
        marks: 4,
        difficulty: 'Medium',
        order: 8,
      },
      {
        assessment: softAssessment._id,
        skill: skillMap.get('adaptability')._id,
        question: 'A legacy database system you support crashes during a weekend holiday. The on-call runbook is outdated. How do you respond?',
        options: [
          { optionId: 'opt_a', text: 'Stay calm, systematically inspect logs and cluster health, recover services using verified backups, and author an updated runbook and post-mortem.', scoreValue: 4 },
          { optionId: 'opt_b', text: 'Panic and delete the cluster to start fresh from empty data.', scoreValue: 1 },
          { optionId: 'opt_c', text: 'Ignore the pager alerts until Monday morning.', scoreValue: 1 },
          { optionId: 'opt_d', text: 'Turn off system monitoring so the alert stops sounding.', scoreValue: 1 },
        ],
        correctAnswer: 'opt_a',
        explanation: 'High adaptability combines systematic emergency triage, methodical diagnosis, safe restoration, and post-incident documentation.',
        marks: 4,
        difficulty: 'Hard',
        order: 9,
      },
      {
        assessment: softAssessment._id,
        skill: skillMap.get('time-management')._id,
        question: 'How do you prevent context-switching fatigue when assigned to both reactive customer bug fixes and proactive feature development?',
        options: [
          { optionId: 'opt_a', text: 'Designate specific time blocks for deep feature engineering, and reserve dedicated windows for bug triage and message response.', scoreValue: 4 },
          { optionId: 'opt_b', text: 'Check Slack every 30 seconds to respond instantaneously to everything.', scoreValue: 1 },
          { optionId: 'opt_c', text: 'Completely abandon feature development and only do small bug fixes.', scoreValue: 1 },
          { optionId: 'opt_d', text: 'Work through the night to catch up on missed focus hours.', scoreValue: 1 },
        ],
        correctAnswer: 'opt_a',
        explanation: 'Time-blocking protects sustained cognitive flow for complex engineering while ensuring predictable customer issue resolution.',
        marks: 4,
        difficulty: 'Easy',
        order: 10,
      },
    ];
    await AssessmentQuestion.insertMany(softQuestions);
    console.log(`✅ Seeded ${softQuestions.length} Soft Skill Questions`);

    // 5 Aptitude Questions
    await AssessmentQuestion.deleteMany({ assessment: aptitudeAssessment._id });
    const aptitudeQuestions = [
      {
        assessment: aptitudeAssessment._id,
        skill: skillMap.get('logical-reasoning')._id,
        question: 'If all Microservices are Distributed Systems, and some Distributed Systems are Fault-Tolerant, which deduction is logically certain?',
        options: [
          { optionId: 'opt_a', text: 'All Microservices are Fault-Tolerant.' },
          { optionId: 'opt_b', text: 'Some Distributed Systems are Microservices.' },
          { optionId: 'opt_c', text: 'No Microservice can be Fault-Tolerant.' },
          { optionId: 'opt_d', text: 'All Fault-Tolerant systems are Microservices.' },
        ],
        correctAnswer: 'opt_b',
        explanation: 'Since the entire set of Microservices is contained inside Distributed Systems, it follows with mathematical certainty that some Distributed Systems are Microservices.',
        marks: 1,
        difficulty: 'Medium',
        order: 1,
      },
      {
        assessment: aptitudeAssessment._id,
        skill: skillMap.get('problem-solving')._id,
        question: 'What is the worst-case time complexity of searching an element in a balanced Binary Search Tree (AVL / Red-Black Tree) containing N elements?',
        options: [
          { optionId: 'opt_a', text: 'O(1)' },
          { optionId: 'opt_b', text: 'O(log N)' },
          { optionId: 'opt_c', text: 'O(N)' },
          { optionId: 'opt_d', text: 'O(N log N)' },
        ],
        correctAnswer: 'opt_b',
        explanation: 'Because the tree height is strictly maintained at logarithmic bounds, tree traversal in balanced BSTs is guaranteed O(log N).',
        marks: 1,
        difficulty: 'Easy',
        order: 2,
      },
      {
        assessment: aptitudeAssessment._id,
        skill: skillMap.get('logical-reasoning')._id,
        question: 'Find the next number in the series: 2, 6, 12, 20, 30, 42, ?',
        options: [
          { optionId: 'opt_a', text: '54' },
          { optionId: 'opt_b', text: '56' },
          { optionId: 'opt_c', text: '60' },
          { optionId: 'opt_d', text: '64' },
        ],
        correctAnswer: 'opt_b',
        explanation: 'The differences between consecutive terms are 4, 6, 8, 10, 12. The next difference is 14, so 42 + 14 = 56 (also n*(n+1): 7*8 = 56).',
        marks: 1,
        difficulty: 'Medium',
        order: 3,
      },
      {
        assessment: aptitudeAssessment._id,
        skill: skillMap.get('problem-solving')._id,
        question: 'Given an unsorted array of N integers, what is the minimum theoretical number of comparisons needed in the worst-case to sort it via comparison-based sorting?',
        options: [
          { optionId: 'opt_a', text: 'O(N)' },
          { optionId: 'opt_b', text: 'O(N log N)' },
          { optionId: 'opt_c', text: 'O(N²)' },
          { optionId: 'opt_d', text: 'O(log N)' },
        ],
        correctAnswer: 'opt_b',
        explanation: 'By the decision tree model, any comparison-based sort must make at least log2(N!) comparisons, which asymptotically equals Omega(N log N).',
        marks: 1,
        difficulty: 'Hard',
        order: 4,
      },
      {
        assessment: aptitudeAssessment._id,
        skill: skillMap.get('logical-reasoning')._id,
        question: 'A server rack has 5 servers. If Server A must be deployed before Server B, and Server C must be deployed after Server B but before Server D, which deployment sequence is valid?',
        options: [
          { optionId: 'opt_a', text: 'A -> B -> C -> D -> E' },
          { optionId: 'opt_b', text: 'B -> A -> C -> D -> E' },
          { optionId: 'opt_c', text: 'C -> A -> B -> D -> E' },
          { optionId: 'opt_d', text: 'D -> C -> B -> A -> E' },
        ],
        correctAnswer: 'opt_a',
        explanation: 'Sequence A -> B -> C -> D -> E satisfies all topological precedence constraints: A before B, B before C, and C before D.',
        marks: 1,
        difficulty: 'Easy',
        order: 5,
      },
    ];
    await AssessmentQuestion.insertMany(aptitudeQuestions);
    console.log(`✅ Seeded ${aptitudeQuestions.length} Aptitude Questions`);

    // 5 Domain Questions
    await AssessmentQuestion.deleteMany({ assessment: domainAssessment._id });
    const domainQuestions = [
      {
        assessment: domainAssessment._id,
        skill: skillMap.get('system-design')._id,
        question: 'According to Eric Brewer’s CAP Theorem, when a network partition (P) occurs in a distributed system, what must the architecture choose between?',
        options: [
          { optionId: 'opt_a', text: 'Throughput and Low Latency' },
          { optionId: 'opt_b', text: 'Consistency (C) and Availability (A)' },
          { optionId: 'opt_c', text: 'Security and Encryption' },
          { optionId: 'opt_d', text: 'Scalability and Portability' },
        ],
        correctAnswer: 'opt_b',
        explanation: 'In the presence of a network partition (P), a distributed system must trade off between returning the most recent write (Consistency) and ensuring every non-failing node returns a response (Availability).',
        marks: 1,
        difficulty: 'Medium',
        order: 1,
      },
      {
        assessment: domainAssessment._id,
        skill: skillMap.get('redis')._id,
        question: 'What is the primary architectural consequence of the Cache Stampede (or Thundering Herd) problem in high-traffic web applications?',
        options: [
          { optionId: 'opt_a', text: 'Concurrent clients all experience a cache miss simultaneously when a key expires, overwhelming the primary database.' },
          { optionId: 'opt_b', text: 'The cache memory overflows and stops responding to health checks.' },
          { optionId: 'opt_c', text: 'Network packets are dropped by the load balancer due to TLS expiration.' },
          { optionId: 'opt_d', text: 'Data in the database is automatically deleted.' },
        ],
        correctAnswer: 'opt_a',
        explanation: 'When a popular cached item expires, hundreds of simultaneous requests experience a cache miss at once and query the backend database in parallel, causing database saturation.',
        marks: 1,
        difficulty: 'Hard',
        order: 2,
      },
      {
        assessment: domainAssessment._id,
        skill: skillMap.get('system-design')._id,
        question: 'What is the definition of an Idempotent HTTP operation in API architecture?',
        options: [
          { optionId: 'opt_a', text: 'An operation that executes in less than 50 milliseconds.' },
          { optionId: 'opt_b', text: 'An operation where making multiple identical requests has the same intended side-effect on the server as making a single request.' },
          { optionId: 'opt_c', text: 'An operation that requires mutual TLS authentication.' },
          { optionId: 'opt_d', text: 'An operation that can only be called once in the lifetime of a user.' },
        ],
        correctAnswer: 'opt_b',
        explanation: 'HTTP methods like GET, PUT, and DELETE are idempotent because repeating the request N times leaves the server resource in the same state as executing it once.',
        marks: 1,
        difficulty: 'Medium',
        order: 3,
      },
      {
        assessment: domainAssessment._id,
        skill: skillMap.get('system-design')._id,
        question: 'What load balancing algorithm distributes requests based on the current active connection count of each backend server?',
        options: [
          { optionId: 'opt_a', text: 'Round Robin' },
          { optionId: 'opt_b', text: 'Least Connections' },
          { optionId: 'opt_c', text: 'IP Hash' },
          { optionId: 'opt_d', text: 'Random Selection' },
        ],
        correctAnswer: 'opt_b',
        explanation: 'The Least Connections algorithm directs incoming traffic to the server currently processing the fewest active transactions, ideal for variable request durations.',
        marks: 1,
        difficulty: 'Easy',
        order: 4,
      },
      {
        assessment: domainAssessment._id,
        skill: skillMap.get('docker')._id,
        question: 'In Kubernetes and container architectures, what role does a Liveness Probe serve?',
        options: [
          { optionId: 'opt_a', text: 'It checks whether the pod is ready to accept incoming traffic from the service load balancer.' },
          { optionId: 'opt_b', text: 'It determines if the container is still running properly; if it fails, the kubelet kills and restarts the container.' },
          { optionId: 'opt_c', text: 'It verifies that the container image signature matches the registry key.' },
          { optionId: 'opt_d', text: 'It measures the network bandwidth consumed by the container.' },
        ],
        correctAnswer: 'opt_b',
        explanation: 'Liveness probes detect deadlocks or unrecoverable application states. When a liveness probe fails, Kubernetes restarts the container to restore health.',
        marks: 1,
        difficulty: 'Medium',
        order: 5,
      },
    ];
    await AssessmentQuestion.insertMany(domainQuestions);
    console.log(`✅ Seeded ${domainQuestions.length} Domain Questions`);

    console.log('\n🎉 Phase 3 Seed Data successfully applied!');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Phase 3 seed failed:', error);
    process.exit(1);
  }
};

seedPhase3Data();
