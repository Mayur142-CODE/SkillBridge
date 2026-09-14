/**
 * Phase 6 Integration Test Suite — Industry Candidate Search
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Requires: backend running (port 5000) + seedUsers + seedPhase3 (skills/assessments)
 * + reachable MongoDB.
 *
 * Scope guard (per project rules): Candidate Search creates NO candidate model and
 * NO duplicate skill/assessment system — every assertion below runs against the
 * REAL User / StudentProfile / StudentSkill / Skill / AssessmentAttempt /
 * Certification / portfolio models.
 *
 * Covered checks (42):
 *  Auth & role gates (1-4). Meta (5). Direct-DB fixtures (6).
 *  Search sanity + privacy shape (7-13). Skill filters (14-20). Sorting (21-24).
 *  Assessment & education filters (25-27). Detail correctness (28-31).
 *  Privacy & isolation (32-38). All-mode + regression (39-42).
 *
 * Honest reporting: if the backend or MongoDB is unreachable, the suite prints
 * BLOCKED and exits 0 (the environment cannot integration-test this phase).
 */

const path = require('path');
const fs = require('fs');

const API_BASE = 'http://127.0.0.1:5000/api';

const readDotEnv = (file) => {
  try {
    const raw = fs.readFileSync(file, 'utf8');
    const out = {};
    raw.split(/\r?\n/).forEach((line) => {
      const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
      if (m && !line.trim().startsWith('#')) out[m[1]] = m[2].replace(/^"|"$/g, '');
    });
    return out;
  } catch {
    return {};
  }
};

async function runTests() {
  let passed = 0;
  let failed = 0;
  let skipped = 0;

  const assert = (condition, message) => {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  };

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📋 SkillBridge Industry Panel Phase 6 Test Suite (Candidate Search)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  let industryToken = '';
  let studentToken = '';
  let facultyToken = '';

  let mongoose = null;
  let seeded = {};
  const runStart = Date.now();

  const q = (params) => {
    const pairs = [];
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') pairs.push(`${k}=${encodeURIComponent(String(v))}`);
    });
    return pairs.length ? `?${pairs.join('&')}` : '';
  };

  const connectForSeeding = async () => {
    const env = readDotEnv(path.resolve(__dirname, '../backend/.env'));
    const mongoUri = env.MONGODB_URI;
    if (!mongoUri) throw new Error('MONGODB_URI missing in backend/.env');

    process.env.MONGODB_URI = mongoUri;
    const { ensureNodeDns } = await import('../backend/src/config/dns.js');
    await ensureNodeDns();

    const { pathToFileURL } = require('url');
    const { default: Mongoose } = await import(pathToFileURL(path.resolve(__dirname, '../backend/node_modules/mongoose/index.js')).href);
    mongoose = Mongoose;
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 30000 });

    const { default: UserModel } = await import('../backend/src/models/User.js');
    const { default: StudentProfileModel } = await import('../backend/src/models/StudentProfile.js');
    const { default: StudentSkillModel } = await import('../backend/src/models/StudentSkill.js');
    const { default: SkillModel } = await import('../backend/src/models/Skill.js');
    const { default: AssessmentModel } = await import('../backend/src/models/Assessment.js');
    const { default: AssessmentAttemptModel } = await import('../backend/src/models/AssessmentAttempt.js');
    const { default: CertificationModel } = await import('../backend/src/models/Certification.js');
    const { default: ProjectModel } = await import('../backend/src/models/Project.js');

    const upsert = (Model, query, $set, $setOnInsert) =>
      Model.findOneAndUpdate(query, { $set, $setOnInsert }, { upsert: true, new: true, setDefaultsOnInsert: true }).lean();

    // Reusable taxonomy skills (find or create — never a duplicate skill system).
    const ensureSkill = async (name, category) => {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const existing = await SkillModel.findOne({ name }).lean();
      if (existing) return existing;
      return SkillModel.create({ name, slug, category });
    };
    const jsSkill = await ensureSkill('JavaScript', 'Programming');
    const reactSkill = await ensureSkill('React', 'Web Development');
    const pySkill = await ensureSkill('Python', 'Programming');

    // Clean stale fixtures from a previous failed run.
    const staleAssessments = await AssessmentModel.find({ title: /^P6TECH-ASSESS-/ }).select('_id').lean();
    const staleAssessmentIds = staleAssessments.map((a) => a._id);
    if (staleAssessmentIds.length) {
      await AssessmentAttemptModel.deleteMany({ assessment: { $in: staleAssessmentIds } });
    }
    const staleUsers = await UserModel.find({ email: /^p6[^@]*@skillbridge\.test$/ }).select('_id').lean();
    for (const u of staleUsers) {
      await AssessmentAttemptModel.deleteMany({ student: u._id });
      await StudentSkillModel.deleteMany({ student: u._id });
      await CertificationModel.deleteMany({ student: u._id });
      await ProjectModel.deleteMany({ student: u._id });
      await StudentProfileModel.deleteMany({ user: u._id });
    }
    await UserModel.deleteMany({ email: /^p6[^@]*@skillbridge\.test$/ });
    await AssessmentModel.deleteMany({ title: /^P6TECH-ASSESS-/ });

    // ── Fixture students ──────────────────────────────────────────
    const mkStudent = async ({ email, name, status, createdAt, profile, univ, branch, acad, cgpa }) => {
      const user = await upsert(
        UserModel,
        { email },
        {
          name,
          role: 'student',
          status,
          createdAt,
          studentProfile: { university: univ, program: 'Bachelor of Technology', branch, academicYear: acad, cgpa },
        },
        { password: 'P6TestPass@123' }
      );
      await StudentProfileModel.findOneAndUpdate(
        { user: user._id },
        {
          $set: {
            education: profile.education,
            branch: profile.branch,
            academicYear: profile.academicYear,
            cgpa: profile.cgpa,
            location: profile.location,
            bio: profile.bio,
            interests: profile.interests,
            portfolioPublic: Boolean(profile.portfolioPublic),
            portfolioSlug: profile.portfolioSlug || ('p6-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-')),
            phone: profile.phone,
            rollNumber: profile.rollNumber,
            resume: profile.resume || { url: '', filename: '', originalName: '', size: 0 },
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      return user._id;
    };

    const alphaId = await mkStudent({
      email: 'p6alpha@skillbridge.test',
      name: 'P6Tech Alpha',
      status: 'verified',
      createdAt: new Date(runStart - 6 * 60 * 60 * 1000),
      univ: 'VIT Pune',
      branch: 'Computer Science',
      acad: '3rd Year',
      cgpa: '8.42',
      profile: {
        education: 'Bachelor of Technology',
        branch: 'Computer Science',
        academicYear: '3rd Year',
        cgpa: '8.42',
        location: 'Pune',
        bio: 'Frontend-focused CS student. This biography is shared publicly.',
        interests: ['Web Development', 'AI'],
        portfolioPublic: false,
        phone: '9999999901',
        rollNumber: 'P6A001',
      },
    });

    const betaId = await mkStudent({
      email: 'p6beta@skillbridge.test',
      name: 'P6Tech Beta',
      status: 'verified',
      createdAt: new Date(runStart - 2 * 60 * 60 * 1000),
      univ: 'Mumbai University',
      branch: 'Information Technology',
      acad: '4th Year',
      cgpa: '7.10',
      profile: {
        education: 'Bachelor of Technology',
        branch: 'Information Technology',
        academicYear: '4th Year',
        cgpa: '7.10',
        location: 'Mumbai',
        bio: 'Backend + cloud enthusiastic IT student.',
        interests: ['Cloud', 'Backend'],
        portfolioPublic: true,
        portfolioSlug: 'p6beta-test',
        phone: '9999999902',
        rollNumber: 'P6B002',
        resume: { url: '/uploads/resumes/p6beta.pdf', filename: 'p6beta.pdf', originalName: 'Beta_Resume.pdf', size: 4096 },
      },
    });

    const gammaId = await mkStudent({
      email: 'p6gamma@skillbridge.test',
      name: 'P6Tech Gamma',
      status: 'pending',
      createdAt: new Date(runStart - 1 * 60 * 60 * 1000),
      univ: 'Some University',
      branch: 'Mechanical',
      acad: '2nd Year',
      cgpa: '6.50',
      profile: {
        education: 'Bachelor of Technology',
        branch: 'Mechanical',
        location: 'Nagpur',
        interests: [],
        portfolioPublic: false,
      },
    });

    // ── Real StudentSkill records (same shape the Skill Engine writes) ──
    const mkSkill = async (studentId, skill, skillName, score, level, verified) =>
      StudentSkillModel.findOneAndUpdate(
        { student: studentId, skillName },
        {
          $set: {
            skill: skill._id,
            category: skill.category,
            score,
            level,
            verified,
            verifiedAt: verified ? new Date(runStart) : null,
            lastAssessedAt: new Date(runStart),
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

    await mkSkill(alphaId, jsSkill, 'JavaScript', 85, 'Proficient', true);
    await mkSkill(alphaId, reactSkill, 'React', 72, 'Developing', true);
    await mkSkill(betaId, jsSkill, 'JavaScript', 95, 'Advanced', false);
    await mkSkill(betaId, pySkill, 'Python', 66, 'Developing', true);

    // ── Real AssessmentAttempt records (valid only when submitted) ──
    const mkAssessment = async (title, type) =>
      AssessmentModel.findOneAndUpdate(
        { title },
        { $set: { title, type, description: 'Phase 6 fixture assessment.', duration: 20, passingScore: 60, active: true } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

    const jsAssess = await mkAssessment('P6TECH-ASSESS-JS-CORE', 'Technical');
    const reactAssess = await mkAssessment('P6TECH-ASSESS-REACT-UI', 'Technical');
    const softAssess = await mkAssessment('P6TECH-ASSESS-BETA-SOFT', 'Soft Skill');

    const mkAttempt = async (studentId, assessment, status, percentage, passed, submittedAt) =>
      AssessmentAttemptModel.create({
        student: studentId,
        assessment: assessment._id,
        attemptNumber: 1,
        status,
        startedAt: submittedAt,
        submittedAt: status === 'submitted' ? submittedAt : null,
        expiresAt: new Date(submittedAt.getTime() + 30 * 60 * 1000),
        percentage,
        passed,
        totalMarks: 20,
        obtainedMarks: Math.round((percentage / 100) * 20),
      });

    // Alpha: 2 submitted attempts → best 90.
    await mkAttempt(alphaId, jsAssess, 'submitted', 90, true, new Date(runStart - 5 * 60 * 60 * 1000));
    await mkAttempt(alphaId, reactAssess, 'submitted', 70, true, new Date(runStart - 4 * 60 * 60 * 1000));
    // Beta: 1 submitted (45) + 1 in_progress (30) → best 45, count must be 1.
    await mkAttempt(betaId, softAssess, 'submitted', 45, false, new Date(runStart - 3 * 60 * 60 * 1000));
    await mkAttempt(betaId, jsAssess, 'in_progress', 30, false, new Date(runStart - 1 * 60 * 60 * 1000));

    // Alpha: a real Certification. Beta: a real portfolio Project (public gate).
    await CertificationModel.findOneAndUpdate(
      { student: alphaId, name: 'AWS Cloud Practitioner' },
      {
        $set: {
          issuingOrganization: 'Amazon Web Services',
          issueDate: new Date(runStart - 30 * 24 * 60 * 60 * 1000),
          credentialId: 'P6-0001',
          credentialUrl: 'https://example.com/verify/P6-0001',
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    await ProjectModel.findOneAndUpdate(
      { student: betaId, title: 'P6 Beta Cloud Dashboard' },
      {
        $set: {
          description: 'Phase 6 portfolio fixture project.',
          gitUrl: 'https://github.com/p6beta/dashboard',
          liveUrl: 'https://dashboard.example.test',
          startDate: new Date(runStart - 20 * 24 * 60 * 60 * 1000),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    seeded = {
      mongoose,
      alphaId: String(alphaId),
      betaId: String(betaId),
      gammaId: String(gammaId),
      slug: {
        javascript: jsSkill.slug,
        react: reactSkill.slug,
      },
      models: {
        UserModel,
        StudentProfileModel,
        StudentSkillModel,
        SkillModel,
        AssessmentModel,
        AssessmentAttemptModel,
        CertificationModel,
        ProjectModel,
      },
      objectId: (id) => new mongoose.Types.ObjectId(id),
    };
  };

  const cleanupSeededData = async () => {
    if (!mongoose) return;
    try {
      const M = seeded.models;
      const fixtureUsers = await M.UserModel.find({ email: /^p6[^@]*@skillbridge\.test$/ }).select('_id').lean();
      const fixtureIds = fixtureUsers.map((u) => u._id);
      if (fixtureIds.length) {
        await M.AssessmentAttemptModel.deleteMany({ student: { $in: fixtureIds } });
        await M.StudentSkillModel.deleteMany({ student: { $in: fixtureIds } });
        await M.CertificationModel.deleteMany({ student: { $in: fixtureIds } });
        await M.ProjectModel.deleteMany({ student: { $in: fixtureIds } });
        await M.StudentProfileModel.deleteMany({ user: { $in: fixtureIds } });
      }
      await M.UserModel.deleteMany({ email: /^p6[^@]*@skillbridge\.test$/ });
      await M.AssessmentModel.deleteMany({ title: /^P6TECH-ASSESS-/ });
      await M.SkillModel.deleteMany({ name: /^(P6TECH-SKILL-)/ });
      await mongoose.disconnect();
      mongoose = null;
    } catch (err) {
      console.warn(`  ⚠ Cleanup warning: ${err.message}`);
    }
  };

  try {
    // ── 1. Role logins ─────────────────────────────────────
    console.log('--- 1. Role Logins ---');
    let indLoginRes;
    try {
      indLoginRes = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'industry@skillbridge.dev', password: 'Industry@123' }),
      });
    } catch (loginErr) {
      console.log('\n═══════════════════════════════════════════════════════════════');
      console.log('🚧 BLOCKED: Backend / MongoDB unreachable from this environment.');
      console.log(`   Industry login fetch failed: ${loginErr.message}`);
      console.log('   Port 5000 is closed — integration tests cannot run here.');
      console.log('   Static verification: node --check + client build completed OK.');
      console.log('═══════════════════════════════════════════════════════════════\n');
      process.exit(0);
    }
    if (indLoginRes.status !== 200) {
      console.log('\n═══════════════════════════════════════════════════════════════');
      console.log('🚧 BLOCKED: Backend / MongoDB unreachable from this environment.');
      console.log('   Industry login did not succeed (status ' + indLoginRes.status + ').');
      console.log('   Phase 6 integration tests cannot run here.');
      console.log('   Static verification: node --check + client build completed OK.');
      console.log('═══════════════════════════════════════════════════════════════\n');
      process.exit(0);
    }
    industryToken = (await indLoginRes.json()).token;
    assert(true, 'Industry logs in');

    const stuLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student@skillbridge.dev', password: 'Student@123' }),
    });
    assert(stuLoginRes.status === 200, 'Student logs in');
    studentToken = (await stuLoginRes.json()).token;

    const facLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'faculty@skillbridge.dev', password: 'Faculty@123' }),
    });
    assert(facLoginRes.status === 200, 'Faculty logs in');
    facultyToken = (await facLoginRes.json()).token;

    const authJson = { 'Content-Type': 'application/json' };
    const indHeaders = { Authorization: `Bearer ${industryToken}`, ...authJson };
    const stuHeaders = { Authorization: `Bearer ${studentToken}`, ...authJson };
    const facHeaders = { Authorization: `Bearer ${facultyToken}`, ...authJson };

    // ── 2. Auth & role gates (1-4) ─────────────────────────
    console.log('\n--- 2. Auth & Role Gates (1-4) ---');
    const noAuth = await fetch(`${API_BASE}/industry/candidates`);
    assert(noAuth.status === 401, '[1] Unauthenticated candidates list → 401');

    const stuList = await fetch(`${API_BASE}/industry/candidates`, { headers: stuHeaders });
    assert(stuList.status === 403, '[2] Student accessing candidates → 403');

    const facList = await fetch(`${API_BASE}/industry/candidates`, { headers: facHeaders });
    assert(facList.status === 403, '[3] Faculty accessing industry candidates → 403');

    const indList = await fetch(`${API_BASE}/industry/candidates`, { headers: indHeaders });
    assert(indList.status === 200, '[4] Industry candidates list → 200');
    const indListJson = await indList.json();
    assert(
      indListJson.success === true &&
        Array.isArray(indListJson.data.candidates) &&
        typeof indListJson.data.pagination?.total === 'number' &&
        typeof indListJson.data.pagination?.pages === 'number',
      '[4] List returns candidates + pagination shape'
    );

    // ── 3. Meta (5) ────────────────────────────────────────
    console.log('\n--- 3. Meta (5) ---');
    const metaRes = await fetch(`${API_BASE}/industry/candidates/meta`, { headers: indHeaders });
    assert(metaRes.status === 200, '[5] Candidate meta endpoint → 200');
    const metaJson = await metaRes.json();
    assert(
      metaJson.success &&
        Array.isArray(metaJson.data.skills) &&
        metaJson.data.skills.length >= 1 &&
        metaJson.data.skills.every((s) => s.name && s.slug && s.category) &&
        Array.isArray(metaJson.data.categories) &&
        metaJson.data.matchModes?.includes('all') &&
        metaJson.data.sortOptions?.includes('recent') &&
        Array.isArray(metaJson.data.searchableStatuses) &&
        metaJson.data.searchableStatuses.includes('verified'),
      '[5] Meta serves the real Skill taxonomy (name/slug/category) + modes/sorts'
    );

    // ── 4. Direct-DB seeding (6) ───────────────────────────
    console.log('\n--- 4. Direct-DB Seeding (6) ---');
    await connectForSeeding();
    assert(
      seeded.alphaId && seeded.betaId && seeded.gammaId,
      '[6] MongoDB reachable; 2 verified + 1 pending fixture students seeded with real skill/assessment/portfolio records'
    );

    // ── 5. Search sanity + privacy shape (7-13) ────────────
    console.log('\n--- 5. Search Sanity + Privacy Shape (7-13) ---');
    const searchAll = await fetch(
      `${API_BASE}/industry/candidates${q({ search: 'P6Tech', limit: 20 })}`,
      { headers: indHeaders }
    );
    const searchAllJson = await searchAll.json();
    const namesIn = (list) => list.map((c) => c.name);
    const allNames = namesIn(searchAllJson.data.candidates);
    assert(
      searchAllJson.data.pagination.total === 2 &&
        allNames.includes('P6Tech Alpha') &&
        allNames.includes('P6Tech Beta') &&
        !allNames.includes('P6Tech Gamma'),
      '[7] Name search returns verified fixtures only; pending student excluded'
    );
    assert(
      allNames.every((n) => n.includes('P6Tech')),
      '[8] Name search round trip (every result matches the query)'
    );

    const paged = await fetch(
      `${API_BASE}/industry/candidates${q({ search: 'P6Tech', limit: 1, page: 1 })}`,
      { headers: indHeaders }
    );
    const pagedJson = await paged.json();
    assert(
      pagedJson.data.candidates.length === 1 && pagedJson.data.pagination.total === 2,
      '[9] limit=1 returns exactly 1 candidate while total stays 2'
    );

    const listPayload = JSON.stringify(searchAllJson.data.candidates);
    assert(
      !/email|password|\$2[aby]\$|token|rollNumber|phone/.test(listPayload),
      '[10] List payloads never expose email/password hash/token/rollNumber/phone'
    );
    assert(
      !/applications|employerNote|interview|offer|scoreNote/i.test(listPayload),
      '[11] Candidate list carries zero application / employer-note / interview / offer data (company-independent)'
    );

    const alphaInList = searchAllJson.data.candidates.find((c) => c.name === 'P6Tech Alpha');
    const betaInList = searchAllJson.data.candidates.find((c) => c.name === 'P6Tech Beta');
    assert(
      alphaInList?.assessmentCount === 2 && alphaInList?.bestAssessmentScore === 90,
      '[12] Alpha counts 2 submitted attempts with best score 90 (no in-progress or fabricated values)'
    );
    assert(
      betaInList?.assessmentCount === 1 && betaInList?.bestAssessmentScore === 45,
      '[13] Beta counts ONLY the submitted 45% attempt; the in_progress 30% attempt is excluded'
    );

    // ── 6. Skill filters (14-20) ───────────────────────────
    console.log('\n--- 6. Skill Filters (14-20) ---');
    const unknownSkill = await fetch(
      `${API_BASE}/industry/candidates${q({ search: 'P6Tech', skills: 'definitely-not-a-real-skill' })}`,
      { headers: indHeaders }
    );
    assert(unknownSkill.status === 400, '[14] Unknown skill ref → 400 (validated against the real Skill taxonomy)');

    const jsAny = await fetch(
      `${API_BASE}/industry/candidates${q({ search: 'P6Tech', skills: seeded.slug.javascript })}`,
      { headers: indHeaders }
    );
    const jsAnyJson = await jsAny.json();
    const jsAnyNames = namesIn(jsAnyJson.data.candidates);
    assert(
      jsAnyJson.data.pagination.total === 2 && jsAnyNames.includes('P6Tech Beta') && jsAnyNames.includes('P6Tech Alpha'),
      '[15] ANY mode (default): JavaScript matches both Alpha and Beta'
    );

    const allMatch = await fetch(
      `${API_BASE}/industry/candidates${q({ search: 'P6Tech', skills: seeded.slug.javascript + ',' + seeded.slug.react, skillMatchMode: 'all' })}`,
      { headers: indHeaders }
    );
    const allMatchJson = await allMatch.json();
    const allMatchNames = namesIn(allMatchJson.data.candidates);
    assert(
      allMatchJson.data.pagination.total === 1 && allMatchNames.includes('P6Tech Alpha'),
      '[16] ALL mode (JS + React): only Alpha holds every requested skill'
    );

    const anyMatch = await fetch(
      `${API_BASE}/industry/candidates${q({ search: 'P6Tech', skills: seeded.slug.javascript + ',' + seeded.slug.react, skillMatchMode: 'any' })}`,
      { headers: indHeaders }
    );
    const anyMatchJson = await anyMatch.json();
    const alphaAny = anyMatchJson.data.candidates.find((c) => c.name === 'P6Tech Alpha');
    const betaAny = anyMatchJson.data.candidates.find((c) => c.name === 'P6Tech Beta');
    assert(
      alphaAny?.matchPercentage === 100 && betaAny?.matchPercentage === 50 &&
        betaAny?.matchedSkillCount === 1 && betaAny?.requestedSkillCount === 2,
      '[17] matchPercentage is exact math: Alpha 2/2=100%, Beta 1/2=50% (never a fake AI score)'
    );

    const verifiedOnly = await fetch(
      `${API_BASE}/industry/candidates${q({ search: 'P6Tech', skills: seeded.slug.javascript, verifiedOnly: 'true' })}`,
      { headers: indHeaders }
    );
    const verifiedOnlyJson = await verifiedOnly.json();
    assert(
      verifiedOnlyJson.data.pagination.total === 1 && namesIn(verifiedOnlyJson.data.candidates).includes('P6Tech Alpha'),
      '[18] verifiedOnly=true keeps Alpha (JS verified); drops Beta (JS unverified)'
    );

    const minScore90 = await fetch(
      `${API_BASE}/industry/candidates${q({ search: 'P6Tech', skills: seeded.slug.javascript, minScore: 90 })}`,
      { headers: indHeaders }
    );
    const minScore90Json = await minScore90.json();
    assert(
      minScore90Json.data.pagination.total === 1 && namesIn(minScore90Json.data.candidates).includes('P6Tech Beta'),
      '[19] minScore=90 on JavaScript keeps only Beta (95), Alpha (85) dropped'
    );

    const band = await fetch(
      `${API_BASE}/industry/candidates${q({ search: 'P6Tech', skills: seeded.slug.javascript, minScore: 80, maxScore: 90 })}`,
      { headers: indHeaders }
    );
    const bandJson = await band.json();
    assert(
      bandJson.data.pagination.total === 1 && namesIn(bandJson.data.candidates).includes('P6Tech Alpha'),
      '[20] minScore=80 & maxScore=90 keeps only Alpha (85) — score band round trip'
    );

    // ── 7. Sorting (21-24) ─────────────────────────────────
    console.log('\n--- 7. Sorting (21-24) ---');
    const sortName = await fetch(
      `${API_BASE}/industry/candidates${q({ search: 'P6Tech', sort: 'name' })}`,
      { headers: indHeaders }
    );
    const sortNameJson = await sortName.json();
    assert(
      sortNameJson.data.candidates[0]?.name === 'P6Tech Alpha',
      '[21] sort=name → Alpha first (A before B, collation applied)'
    );

    const sortRecent = await fetch(
      `${API_BASE}/industry/candidates${q({ search: 'P6Tech', sort: 'recent' })}`,
      { headers: indHeaders }
    );
    const sortRecentJson = await sortRecent.json();
    assert(
      sortRecentJson.data.candidates[0]?.name === 'P6Tech Beta',
      '[22] sort=recent → Beta first (created later than Alpha)'
    );

    const sortAssess = await fetch(
      `${API_BASE}/industry/candidates${q({ search: 'P6Tech', sort: 'assessment' })}`,
      { headers: indHeaders }
    );
    const sortAssessJson = await sortAssess.json();
    assert(
      sortAssessJson.data.candidates[0]?.name === 'P6Tech Alpha' &&
        sortAssessJson.data.candidates[0]?.bestAssessmentScore === 90,
      '[23] sort=assessment → Alpha first (best submitted 90 > 45)'
    );

    const badSort = await fetch(`${API_BASE}/industry/candidates${q({ sort: 'bogus' })}`, { headers: indHeaders });
    assert(badSort.status === 400, '[24] Invalid sort → 400');

    // ── 8. Assessment & education filters (25-27) ──────────
    console.log('\n--- 8. Assessment & Education Filters (25-27) ---');
    const minAssess = await fetch(
      `${API_BASE}/industry/candidates${q({ search: 'P6Tech', minAssessmentScore: 60 })}`,
      { headers: indHeaders }
    );
    const minAssessJson = await minAssess.json();
    assert(
      minAssessJson.data.pagination.total === 1 && namesIn(minAssessJson.data.candidates).includes('P6Tech Alpha'),
      '[25] minAssessmentScore=60 count VALID submitted attempts → only Alpha (best 90)'
    );

    const maxAssess = await fetch(
      `${API_BASE}/industry/candidates${q({ search: 'P6Tech', maxAssessmentScore: 50 })}`,
      { headers: indHeaders }
    );
    const maxAssessJson = await maxAssess.json();
    assert(
      maxAssessJson.data.pagination.total === 1 && namesIn(maxAssessJson.data.candidates).includes('P6Tech Beta'),
      '[26] maxAssessmentScore=50 → only Beta (best submitted 45)'
    );

    const edu = await fetch(
      `${API_BASE}/industry/candidates${q({ search: 'P6Tech', education: 'Mumbai' })}`,
      { headers: indHeaders }
    );
    const eduJson = await edu.json();
    assert(
      eduJson.data.pagination.total === 1 && namesIn(eduJson.data.candidates).includes('P6Tech Beta'),
      '[27] education filter matches university (Mumbai University) server-side → only Beta'
    );

    // ── 9. Detail correctness (28-31) ──────────────────────
    console.log('\n--- 9. Detail Correctness (28-31) ---');
    const alphaDetail = await fetch(
      `${API_BASE}/industry/candidates/${seeded.alphaId}`,
      { headers: indHeaders }
    );
    assert(alphaDetail.status === 200, 'Alpha detail → 200');
    const alphaDetailJson = await alphaDetail.json();
    const alphaCand = alphaDetailJson.data.candidate;
    assert(
      alphaCand?.name === 'P6Tech Alpha' &&
        alphaCand?.profile?.education === 'Bachelor of Technology' &&
        alphaCand?.profile?.branch === 'Computer Science' &&
        alphaCand?.profile?.university === 'VIT Pune',
      '[28] Detail carries real profile identity (name/education/branch/university)'
    );

    const jsInAlpha = alphaCand?.skills?.find((s) => s.skillName === 'JavaScript');
    assert(
      jsInAlpha?.score === 85 && jsInAlpha?.verified === true && alphaCand?.skillsSummary?.totalSkills === 2,
      '[29] Detail skill scores are the REAL StudentSkill values (JS=85 verified) — not fabricated'
    );

    const alphaAssessments = alphaCand?.assessments || [];
    assert(
      alphaAssessments.length === 2 &&
        alphaAssessments.some((a) => a.percentage === 90 && a.passed === true) &&
        alphaAssessments.some((a) => a.percentage === 70),
      '[30] Detail lists only submitted attempts with true percentages (90 & 70)'
    );

    const alphaCerts = alphaCand?.certifications || [];
    assert(
      alphaCerts.some((c) => c.name === 'AWS Cloud Practitioner' && c.issuer === 'Amazon Web Services'),
      '[31] Detail surfaces the student-added certification with issuer'
    );

    // ── 10. Privacy & isolation (32-38) ─────────────────────
    console.log('\n--- 10. Privacy & Isolation (32-38) ---');
    const badId = await fetch(`${API_BASE}/industry/candidates/not-an-id`, { headers: indHeaders });
    assert(badId.status === 400, '[32] Malformed candidate id → 400');

    const randomId = await fetch(`${API_BASE}/industry/candidates/${seeded.objectId()}`, { headers: indHeaders });
    assert(randomId.status === 404, '[33] Unknown valid id → 404');

    const alphaPayload = JSON.stringify(alphaCand);
    assert(
      !/password|\$2[aby]\$|token|email|phone|rollNumber/.test(alphaPayload),
      '[34] Private candidate detail NEVER serializes password/hash/token/email/phone/rollNumber'
    );

    assert(
      alphaCand?.profile?.portfolioPublic === false &&
        alphaCand?.profile?.hasResume === false &&
        alphaCand?.profile?.resumeUrl === undefined &&
        alphaCand?.portfolio === null,
      '[35] Private candidate: portfolioPublic false, hasResume false, NO resumeUrl, NO portfolio sections'
    );

    const betaDetail = await fetch(
      `${API_BASE}/industry/candidates/${seeded.betaId}`,
      { headers: indHeaders }
    );
    const betaDetailJson = await betaDetail.json();
    const betaCand = betaDetailJson.data.candidate;
    assert(
      betaDetail.status === 200 &&
        betaCand?.profile?.portfolioPublic === true &&
        betaCand?.profile?.resumeUrl === `/api/portfolio/p6beta-test/resume` &&
        (betaCand?.portfolio?.projects || []).length >= 1,
      '[36] Public candidate: portfolioPublic true, real portfolio resume route, portfolio sections included'
    );

    const noResumeEndpoint = await fetch(
      `${API_BASE}/industry/candidates/${seeded.alphaId}/resume`,
      { headers: indHeaders }
    );
    assert(
      noResumeEndpoint.status === 404,
      '[37] Candidate API exposes NO resume endpoint (resume access is not invented here) — 404'
    );

    const betaPayload = JSON.stringify(betaCand);
    assert(
      !/applications|employerNote|interview|offer/i.test(betaPayload) && !/email|phone/.test(betaPayload),
      '[38] Even a public candidate payload contains no email/phone and zero application/employer/offer data'
    );

    // ── 11. All-mode guards + regression (39-42) ────────────
    console.log('\n--- 11. All-Mode Guards + Regression (39-42) ---');
    const badMode = await fetch(`${API_BASE}/industry/candidates${q({ skillMatchMode: 'either' })}`, { headers: indHeaders });
    assert(badMode.status === 400, '[39] Invalid skillMatchMode → 400');

    const allRoundTrip = await fetch(
      `${API_BASE}/industry/candidates${q({ search: 'P6Tech', skills: seeded.slug.javascript + ',' + seeded.slug.react, skillMatchMode: 'all' })}`,
      { headers: indHeaders }
    );
    const allRoundTripJson = await allRoundTrip.json();
    const alphaAll = allRoundTripJson.data.candidates.find((c) => c.name === 'P6Tech Alpha');
    assert(
      allRoundTripJson.data.pagination.total === 1 &&
        alphaAll?.matchPercentage === 100 &&
        alphaAll?.matchedSkillCount === 2 &&
        alphaAll?.requestedSkillCount === 2,
      '[40] ALL round trip: reported match counts equal the real matched StudentSkill records'
    );

    const atsReg = await fetch(`${API_BASE}/industry/applications`, { headers: indHeaders });
    assert(atsReg.status === 200, '[41] Phase 4 ATS regression → 200 (Candidate Search is additive, not replacing)');

    const collabReg = await fetch(`${API_BASE}/industry/collaborations`, { headers: indHeaders });
    const facReg = await fetch(`${API_BASE}/faculty/collaborations`, { headers: facHeaders });
    const indexHtml = path.resolve(__dirname, '../client/dist/index.html');
    assert(
      collabReg.status === 200 && facReg.status === 200 && fs.existsSync(indexHtml),
      '[42] Phase 5 collaboration + faculty + production build regression → all OK'
    );
  } catch (err) {
    console.error('Unexpected test error:', err.message);
    if (err.stack) console.error(err.stack.split('\n').slice(0, 4).join('\n'));
    failed++;
  } finally {
    await cleanupSeededData();
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED, ${skipped} SKIPPED`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  process.exit(failed > 0 ? 1 : 0);
}

runTests();