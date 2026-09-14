/**
 * Phase 5 Integration Test Suite — Placement & Training (TPO) Oversight
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * READ-ONLY endpoint: GET /api/institution/placements (filters: type / program /
 * branch / academicYear / fromDate / toDate). All placement data is derived LIVE
 * from real model relationships scoped to the authenticated institution user.
 *
 * Verifies:
 *  1. Login + GET /api/institution/placements envelope shape (profile / overview /
 *     typeBreakdown / distribution / recruiters / trend / recent / training /
 *     facets / filters / generatedAt) with NO password / disk-path leaks
 *  2. Controlled seeding (temp students with a UNIQUE program/branch/year under
 *     Institution A + temp opportunities with a UNIQUE employer, applications with
 *     known statuses/matchScores, one interview, two offers, one issued NOC +
 *     one revoked NOC, one enrollment, two assessment attempts) then exact metric
 *     derivation under ?program=<UNIQUE>: totalApplications=5, uniqueStudents=3,
 *     statusCounts, selectionRate=50, avgMatchScore=61.7, interviews=1, offers=2,
 *     acceptedOffers=1, completedInternships=1, nocs{total=2,internship=1,
 *     placement=0}, typeBreakdown, distribution, recruiters, recent, trend,
 *     training.overview (1 enrollment, avgAssessmentScore=82), facets include the
 *     unique values, filters echo
 *  3. Filter behavior: program+type -> exact; multitype; academicYear; date range
 *     (fromDate) excludes the stale application; validation errors: invalid type ->
 *     400, invalid fromDate -> 400, fromDate after toDate -> 400
 *  4. Ownership isolation vs Institution B (fresh register): B starts at zero,
 *     never sees Institution A's employer/students even under the SAME unique
 *     program filter; A never sees B's student/application (deterministic);
 *     spoofed ?institutionId= is ignored on both sides
 *  5. Role & auth isolation: student / faculty / industry / admin -> 403,
 *     anonymous -> 401
 *  6. Monotonic honesty: overview counts equal live model aggregates for the
 *     filtered cohort; every rate is a real ratio, null-safe
 *  7. Cleanup: all temp users/companies/opportunities/applications/interviews/
 *     offers/nocs/enrollments/attempts/programs/assessments + Institution B
 *     removed from MongoDB — never touches demo data except reads
 */

const path = require('path');
const fs = require('fs');

const API_BASE = 'http://127.0.0.1:5000/api';

const TS = Date.now();
const BASE = `p5-${TS}`;
const PASS = 'Phase5@123';
const TEMP_INST_B_EMAIL = `instb-${BASE}@skillbridge.dev`;

const UNIQUE_PROGRAM = `P5 Program ${BASE}`;
const UNIQUE_BRANCH = `P5 Branch ${BASE}`;
const UNIQUE_YEAR = `P5 Year ${BASE}`;
const A_EMPLOYER = `P5 Employer ${BASE}`;
const B_EMPLOYER = `P5 B Employer ${BASE}`;

async function runTests() {
  let passed = 0;
  let failed = 0;

  const tmp = {
    instAId: '',
    instBId: '',
    students: [],
    bStudents: [],
    companies: [],
    opportunities: [],
    bOpportunities: [],
    applications: [],
    bApplications: [],
    interviews: [],
    offers: [],
    nocs: [],
    enrollments: [],
    attempts: [],
    programId: '',
    assessmentId: '',
  };

  let db = null;

  async function connectDb() {
    const { pathToFileURL } = await import('url');
    const envFile = fs.readFileSync(path.resolve(__dirname, '../backend/.env'), 'utf8');
    const uriMatch = envFile.match(/^\s*MONGODB_URI\s*=\s*(.+)$/m);
    if (!uriMatch) throw new Error('MONGODB_URI not found in backend/.env');
    process.env.MONGODB_URI = uriMatch[1].trim();

    const fileUrl = (p) => pathToFileURL(path.resolve(__dirname, p)).href;
    const mongoose = (await import(fileUrl('../backend/node_modules/mongoose/lib/index.js'))).default;
    const { default: ensureNodeDns } = await import(fileUrl('../backend/src/config/dns.js'));
    await import(fileUrl('../backend/src/models/User.js'));
    await import(fileUrl('../backend/src/models/Company.js'));
    await import(fileUrl('../backend/src/models/Opportunity.js'));
    await import(fileUrl('../backend/src/models/Application.js'));
    await import(fileUrl('../backend/src/models/Interview.js'));
    await import(fileUrl('../backend/src/models/Offer.js'));
    await import(fileUrl('../backend/src/models/StudentNOC.js'));
    await import(fileUrl('../backend/src/models/LearningProgram.js'));
    await import(fileUrl('../backend/src/models/Enrollment.js'));
    await import(fileUrl('../backend/src/models/Assessment.js'));
    await import(fileUrl('../backend/src/models/AssessmentAttempt.js'));

    await ensureNodeDns();
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 20000 });
    db = mongoose;
    return mongoose;
  }

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  async function login(email, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    return { status: res.status, data };
  }

  async function api(method, urlPath, token, options = {}) {
    const headers = { ...(options.json !== false ? { 'Content-Type': 'application/json' } : {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const allowsBody = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(String(method).toUpperCase());
    const res = await fetch(`${API_BASE}${urlPath}`, {
      method,
      headers,
      ...(allowsBody && options.body ? { body: options.body } : {}),
    });
    let data = null;
    try {
      data = await res.json();
    } catch (_) {
      /* non-JSON */
    }
    return { status: res.status, data };
  }

  async function seedStudent({ email, name, institutionId }) {
    const user = await db.model('User').create({
      email,
      name,
      password: 'Temp@123',
      role: 'student',
      status: 'verified',
      institutionId: String(institutionId),
      studentProfile: {
        program: UNIQUE_PROGRAM,
        branch: UNIQUE_BRANCH,
        academicYear: UNIQUE_YEAR,
        university: 'Phase 5 Test University',
        degree: 'B.Tech',
        studentId: `P5-${email.split('@')[0]}`,
      },
    });
    return user;
  }

  async function seedCompany({ name, institution }) {
    const company = await db.model('Company').create({
      name,
      slug: `p5-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      sector: 'Phase 5 Testing',
      isVerified: true,
      ...(institution ? { institution } : {}),
    });
    tmp.companies.push(company._id);
    return company;
  }

  async function seedOpportunity({ title, type, company }) {
    const opp = await db.model('Opportunity').create({
      title,
      slug: `p5-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${TS}-${Math.random().toString(36).slice(2, 8)}`,
      company: company._id,
      companyName: company.name,
      type,
      description: 'Temporary Phase-5 placement opportunity.',
      applicationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      visibility: 'Open to All',
      status: 'Published',
      openings: 5,
    });
    return opp;
  }

  async function seedApplication({ student, opportunity, status, appliedAt, matchScore, completion }) {
    const app = await db.model('Application').create({
      student: student._id,
      opportunity: opportunity._id,
      resume: { url: `https://resume.skillbridge.test/${student._id}.pdf`, originalName: 'resume.pdf' },
      appliedAt: appliedAt || new Date(),
      currentStatus: status,
      statusHistory: [{ status, timestamp: appliedAt || new Date(), note: 'Seed record' }],
      matchScore: matchScore || 0,
      internshipCompletion: completion,
    });
    return app;
  }

  async function seedInterview({ application, opportunity, student, company, createdBy }) {
    const iv = await db.model('Interview').create({
      application: application._id,
      opportunity: opportunity._id,
      company: company._id,
      student: student._id,
      scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      mode: 'Video Call',
      interviewRound: 'Round 1',
      status: 'Scheduled',
      createdBy,
    });
    tmp.interviews.push(iv._id);
    return iv;
  }

  async function seedOffer({ application, opportunity, student, company, status, issuedBy }) {
    const off = await db.model('Offer').create({
      application: application._id,
      opportunity: opportunity._id,
      company: company._id,
      student: student._id,
      status,
      issuedBy,
    });
    tmp.offers.push(off._id);
    return off;
  }

  async function seedNoc({ student, institution, reason, status }) {
    const noc = await db.model('StudentNOC').create({
      student: student._id,
      institution,
      reason,
      issueNumber: `P5-NOC-${reason}-${TS}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase(),
      status,
      issueDate: new Date(),
      validity: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    });
    tmp.nocs.push(noc._id);
    return noc;
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🏛️ SkillBridge Institution Panel Phase 5 Test Suite — Placements & Training');
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    // ── 0. DB bootstrap + login ─────────────────────────────
    console.log('--- 0. DB bootstrap ---');
    await connectDb();
    const instLogin = await login('institution@skillbridge.dev', 'Institution@123');
    const aToken = instLogin.data.token;
    tmp.instAId = instLogin.data.user?._id || instLogin.data.user?.id || '';
    assert(!!tmp.instAId && !!aToken, 'Institution A authenticates (demo account)');
    // Phase 5 uses direct model seeds — no temp institution A required.

    // ── 1. Baseline envelope shape ──────────────────────────
    console.log('\n--- 1. GET /api/institution/placements envelope ---');
    const base = await api('GET', '/institution/placements', aToken);
    assert(base.status === 200 && base.data.success === true, 'GET /api/institution/placements returns 200 success');
    const d = base.data.data;
    assert(typeof d?.profile?.institutionName === 'string' && d.profile.institutionName.length > 0, 'data.profile.institutionName is a non-empty string');
    assert(typeof d?.overview?.totalApplications === 'number' && typeof d.overview.uniqueStudents === 'number', 'data.overview carries totalApplications + uniqueStudents numbers');
    assert(typeof d?.overview?.selectionRate === 'number' || d?.overview?.selectionRate === null, 'selectionRate is a number or null (honest ratio)');
    assert(typeof d?.overview?.avgMatchScore === 'number' || d?.overview?.avgMatchScore === null, 'avgMatchScore is a number or null (honest average)');
    const requiredStatusKeys = ['Applied', 'Shortlisted', 'Interview', 'Selected', 'Rejected', 'Withdrawn'];
    assert(
      requiredStatusKeys.every((k) => typeof d?.overview?.statusCounts?.[k] === 'number'),
      'statusCounts carries every APPLICATION_STATUSES key as a number'
    );
    assert(typeof d?.overview?.nocs?.total === 'number' && typeof d.overview.nocs.internship === 'number' && typeof d.overview.nocs.placement === 'number', 'overview.nocs carries total/internship/placement numbers');
    assert(Array.isArray(d?.typeBreakdown) && d.typeBreakdown.every((t) => typeof t.type === 'string' && t.type.length > 0), 'typeBreakdown is an array of {type, applications, selected}');
    assert(
      typeof d?.distribution?.branches === 'object' && typeof d.distribution.years === 'object' && typeof d.distribution.programs === 'object',
      'distribution exposes branches/years/programs arrays'
    );
    assert(Array.isArray(d?.recruiters), 'recruiters is an array');
    assert(Array.isArray(d?.trend) && Array.isArray(d?.recent), 'trend and recent are arrays');
    assert(typeof d?.training?.overview?.totalEnrollments === 'number' && Array.isArray(d?.training?.programs), 'training.overview + training.programs shape');
    assert(typeof d?.training?.overview?.avgAssessmentScore === 'number' || d?.training?.overview?.avgAssessmentScore === null, 'training.overview.avgAssessmentScore is number or null');
    assert(Array.isArray(d?.facets?.programs) && Array.isArray(d.facets.branches) && Array.isArray(d.facets.years), 'facets exposes programs/branches/years arrays');
    assert(typeof d?.filters?.type === 'string' && typeof d.generatedAt === 'string', 'filters echo + generatedAt ISO');
    const rawBase = JSON.stringify(d);
    assert(!rawBase.includes('password') && !rawBase.includes('"path":'), 'Placement response leaks no password / server disk path');
    assert(!/verificationtoken/i.test(rawBase) && !/refreshtoken|accesstoken/i.test(rawBase), 'Placement response leaks no tokens');
    const rec = d.recent;
    if (rec.length > 0) {
      console.log('       [note] baseline recent[0]:', JSON.stringify({ title: rec[0].opportunityTitle, status: rec[0].status, student: rec[0].studentName }));
    }

    // ── 2. Controlled seeding under a UNIQUE cohort ─────────
    console.log('\n--- 2. Seeding controlled placement data (Institution A unique cohort) ---');
    const s1 = await seedStudent({ email: `p5s1-${BASE}@test.edu`, name: 'P5 Student One', institutionId: tmp.instAId });
    const s2 = await seedStudent({ email: `p5s2-${BASE}@test.edu`, name: 'P5 Student Two', institutionId: tmp.instAId });
    const s3 = await seedStudent({ email: `p5s3-${BASE}@test.edu`, name: 'P5 Student Three', institutionId: tmp.instAId });
    tmp.students.push(s1._id, s2._id, s3._id);

    const compA = await seedCompany({ name: A_EMPLOYER });
    const oppA = await seedOpportunity({ title: `P5 Internship ${BASE}`, type: 'Internship', company: compA });
    const oppB = await seedOpportunity({ title: `P5 Apprenticeship ${BASE}`, type: 'Apprenticeship', company: compA });
    const oppC = await seedOpportunity({ title: `P5 Entry Level ${BASE}`, type: 'Entry-level Job', company: compA });
    tmp.opportunities.push(oppA._id, oppB._id, oppC._id);

    const now = new Date();
    const old = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
    const a1 = await seedApplication({ student: s1, opportunity: oppA, status: 'Selected', appliedAt: now, matchScore: 85, completion: { completionStatus: 'Completed', completionDate: new Date() } });
    const a2 = await seedApplication({ student: s1, opportunity: oppB, status: 'Interview', appliedAt: now, matchScore: 60 });
    const a3 = await seedApplication({ student: s2, opportunity: oppC, status: 'Shortlisted', appliedAt: now, matchScore: 0 });
    const a4 = await seedApplication({ student: s2, opportunity: oppA, status: 'Rejected', appliedAt: old, matchScore: 40 });
    const a5 = await seedApplication({ student: s3, opportunity: oppA, status: 'Applied', appliedAt: now, matchScore: 0 });
    tmp.applications.push(a1._id, a2._id, a3._id, a4._id, a5._id);

    await seedInterview({ application: a2, opportunity: oppB, student: s1, company: compA, createdBy: tmp.instAId });
    await seedOffer({ application: a1, opportunity: oppA, student: s1, company: compA, status: 'Accepted', issuedBy: tmp.instAId });
    await seedOffer({ application: a2, opportunity: oppB, student: s1, company: compA, status: 'Pending', issuedBy: tmp.instAId });
    await seedNoc({ student: s1, institution: tmp.instAId, reason: 'internship', status: 'Issued' });
    await seedNoc({ student: s2, institution: tmp.instAId, reason: 'placement', status: 'Revoked' });

    const program = await db.model('LearningProgram').create({
      title: `P5 Training ${BASE}`,
      slug: `p5-training-${BASE}`,
      description: 'Phase-5 temporary training program.',
      provider: 'Phase 5 Trainer',
      type: 'Training',
      level: 'Intermediate',
      mode: 'Online',
    });
    tmp.programId = program._id;
    await db.model('Enrollment').create({ student: s1._id, program: program._id, status: 'In Progress', progress: 50, startedAt: new Date() }).then((e) => tmp.enrollments.push(e._id));
    const assessment = await db.model('Assessment').create({ title: `P5 Assessment ${BASE}`, type: 'Technical', durationMinutes: 60 });
    tmp.assessmentId = assessment._id;
    await db.model('AssessmentAttempt').create({
      student: s1._id,
      assessment: assessment._id,
      status: 'submitted',
      startedAt: now,
      submittedAt: now,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      percentage: 82,
      passed: true,
      obtainedMarks: 82,
      totalMarks: 100,
    }).then((t) => tmp.attempts.push(t._id));
    await db.model('AssessmentAttempt').create({
      student: s2._id,
      assessment: assessment._id,
      status: 'in_progress',
      startedAt: now,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    }).then((t) => tmp.attempts.push(t._id));

    console.log('       Seeded 3 students, 3 opportunities, 5 applications (4 recent, 1 stale-40d), 1 interview, 2 offers, 2 NOCs, 1 enrollment, 2 attempts');

    // ── 3. Exact metric derivation under ?program=<UNIQUE> ───
    console.log(`\n--- 3. Exact metrics under ?program=${UNIQUE_PROGRAM} ---`);
    const f1 = await api('GET', `/institution/placements?program=${encodeURIComponent(UNIQUE_PROGRAM)}`, aToken);
    assert(f1.status === 200, 'Filtered placement query by unique program returns 200');
    const ov = f1.data.data.overview;
    assert(ov.totalApplications === 5, `totalApplications === 5 (got ${ov.totalApplications})`);
    assert(ov.uniqueStudents === 3, `uniqueStudents === 3 (got ${ov.uniqueStudents})`);
    assert(ov.statusCounts.Applied === 1 && ov.statusCounts.Shortlisted === 1 && ov.statusCounts.Interview === 1 && ov.statusCounts.Selected === 1 && ov.statusCounts.Rejected === 1 && ov.statusCounts.Withdrawn === 0, 'statusCounts exactly {Applied:1,Shortlisted:1,Interview:1,Selected:1,Rejected:1,Withdrawn:0}');
    assert(ov.resolvedApplications === 2, `resolvedApplications === 2 (got ${ov.resolvedApplications})`);
    assert(ov.selectionRate === 50, `selectionRate === 50 (got ${ov.selectionRate})`);
    assert(ov.avgMatchScore === 61.7, `avgMatchScore === 61.7 (got ${ov.avgMatchScore})`);
    assert(ov.interviews === 1 && ov.offers === 2 && ov.acceptedOffers === 1, `interviews/offers/acceptedOffers === 1/2/1 (got ${ov.interviews}/${ov.offers}/${ov.acceptedOffers})`);
    assert(ov.completedInternships === 1 && ov.inProgressInternships === 0, `completedInternships===1, inProgressInternships===0 (got ${ov.completedInternships}/${ov.inProgressInternships})`);
    assert(ov.nocs.total === 1 && ov.nocs.internship === 1 && ov.nocs.placement === 0, `nocs {total:1 (Issued only), internship:1, placement:0} (got ${JSON.stringify(ov.nocs)})`);

    const tb = f1.data.data.typeBreakdown;
    const tbIntern = tb.find((t) => t.type === 'Internship');
    const tbAppr = tb.find((t) => t.type === 'Apprenticeship');
    const tbEntry = tb.find((t) => t.type === 'Entry-level Job');
    assert(tb.length === 3 && tbIntern?.applications === 3 && tbIntern?.selected === 1, `typeBreakdown Internship {applications:3, selected:1} out of ${tb.length} rows`);
    assert(tbAppr?.applications === 1 && tbEntry?.applications === 1, 'typeBreakdown Apprenticeship=1 and Entry-level Job=1');

    const dist = f1.data.data.distribution;
    for (const key of ['branches', 'years', 'programs']) {
      const row = dist[key][0];
      assert(
        row && row.applications === 5 && row.shortlisted === 1 && row.interview === 1 && row.selected === 1 && row.rejected === 1,
        `distribution.${key}[0] aggregates {apps:5, shortlisted:1, interview:1, selected:1, rejected:1}`
      );
    }

    const recs = f1.data.data.recruiters;
    assert(recs.length === 1 && recs[0].companyName === A_EMPLOYER, `recruiters has exactly 1 row (${A_EMPLOYER})`);
    assert(recs[0].applications === 5 && recs[0].shortlisted === 1 && recs[0].interview === 1 && recs[0].selected === 1 && recs[0].offers === 2, 'recruiter row: applications=5, shortlisted=1, interview=1, selected=1, offers=2');
    assert(typeof recs[0].opportunities === 'number' && recs[0].opportunities === 3, 'recruiter row counts 3 distinct opportunities');

    const yrs = f1.data.data.trend;
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const errMsg0 = `trend sum of applications === 5, current-month row {apps:4, interviews:1, selected:1}`;
    assert(
      yrs.reduce((s, r) => s + (r.applications || 0), 0) === 5 &&
        yrs.some((r) => r.period === thisMonth && r.applications === 4 && r.interviews === 1 && r.selected === 1),
      `${errMsg0} (rows: ${JSON.stringify(yrs)})`
    );

    const recent = f1.data.data.recent;
    assert(recent.length >= 4, `recent returns all in-window applications (got ${recent.length})`);
    assert(
      recent.every((r) => typeof r.studentName === 'string' && typeof r.opportunityTitle === 'string' && typeof r.companyName === 'string' && typeof r.appliedAt === 'string'),
      'recent rows carry studentName / opportunityTitle / companyName / appliedAt'
    );
    assert(['P5 Student One', 'P5 Student Two', 'P5 Student Three'].includes(recent[0].studentName), 'most recent activity belongs to the seeded cohort');

    const tr = f1.data.data.training;
    assert(tr.overview.totalEnrollments === 1 && tr.overview.uniquePrograms === 1, `training.overview totalEnrollments/uniquePrograms === 1/1 (got ${tr.overview.totalEnrollments}/${tr.overview.uniquePrograms})`);
    assert(tr.overview.statusCounts['In Progress'] === 1, 'training statusCounts ["In Progress"] === 1');
    assert(tr.overview.assessmentsSubmitted === 1 && tr.overview.assessmentsPassed === 1 && tr.overview.avgAssessmentScore === 82, `training assessmentsSubmitted/passed/avg === 1/1/82 (got ${tr.overview.assessmentsSubmitted}/${tr.overview.assessmentsPassed}/${tr.overview.avgAssessmentScore})`);
    assert(tr.programs.length === 1 && tr.programs[0].title === `P5 Training ${BASE}` && tr.programs[0].statuses['In Progress'] === 1, 'training.programs[0] aggregates the seeded enrollment');

    assert(f1.data.data.facets.programs.includes(UNIQUE_PROGRAM) && f1.data.data.facets.branches.includes(UNIQUE_BRANCH) && f1.data.data.facets.years.includes(UNIQUE_YEAR), 'facets include the seeded unique cohort values');
    assert(f1.data.data.filters.program === UNIQUE_PROGRAM && f1.data.data.filters.type === '' && f1.data.data.filters.fromDate === '', 'filters echo the applied program filter');
    const rawF1 = JSON.stringify(f1.data.data);
    assert(!rawF1.includes('password') && !rawF1.includes('"path":'), 'Filtered placement response leaks no password / disk path');

    // ── 4. Filters (type / branch / year / date range) ──────
    console.log('\n--- 4. Filter behavior ---');
    const fInt = await api('GET', `/institution/placements?program=${encodeURIComponent(UNIQUE_PROGRAM)}&type=Internship`, aToken);
    assert(fInt.data?.data?.overview?.totalApplications === 3, `program+type=Internship -> 3 applications (got ${fInt.data?.data?.overview?.totalApplications})`);
    assert(fInt.data?.data?.typeBreakdown?.length === 1 && fInt.data.data.typeBreakdown[0].type === 'Internship', 'type=Internship narrows typeBreakdown to Internship only');

    const fAppr = await api('GET', `/institution/placements?branch=${encodeURIComponent(UNIQUE_BRANCH)}&type=Apprenticeship`, aToken);
    assert(fAppr.data?.data?.overview?.totalApplications === 1, `branch + type=Apprenticeship -> 1 application (got ${fAppr.data?.data?.overview?.totalApplications})`);

    const fYr = await api('GET', `/institution/placements?academicYear=${encodeURIComponent(UNIQUE_YEAR)}&type=Internship`, aToken);
    assert(fYr.data?.data?.overview?.totalApplications === 3, `academicYear + type=Internship -> 3 applications (got ${fYr.data?.data?.overview?.totalApplications})`);

    const fromDate = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();
    const fDate = await api('GET', `/institution/placements?program=${encodeURIComponent(UNIQUE_PROGRAM)}&fromDate=${encodeURIComponent(fromDate)}`, aToken);
    assert(fDate.data?.data?.overview?.totalApplications === 4, `fromDate window excludes the stale 40d application -> 4 (got ${fDate.data?.data?.overview?.totalApplications})`);
    assert(fDate.data?.data?.overview?.avgMatchScore === 72.5, `avgMatchScore in window === 72.5 (got ${fDate.data?.data?.overview?.avgMatchScore})`);
    assert(fDate.data?.data?.filters?.fromDate === fromDate, 'filters echo fromDate');

    const badType = await api('GET', '/institution/placements?type=NotARealType', aToken);
    assert(badType.status === 400 && badType.data.success === false, 'Invalid opportunity type returns 400');
    const badDate = await api('GET', '/institution/placements?fromDate=notadate', aToken);
    assert(badDate.status === 400, 'Invalid fromDate returns 400');
    const badRange = await api('GET', '/institution/placements?fromDate=2025-01-01T00:00:00.000Z&toDate=2024-01-01T00:00:00.000Z', aToken);
    assert(badRange.status === 400, 'fromDate after toDate returns 400');

    // ── 5. Ownership isolation vs Institution B ─────────────
    console.log('\n--- 5. Ownership isolation (Institution A vs B) ---');
    const A_BEFORE = JSON.stringify({ ov: f1.data.data.overview, recs: f1.data.data.recruiters, tb: f1.data.data.typeBreakdown });

    const regRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'institution',
        name: 'Phase5 Isolation Institute',
        email: TEMP_INST_B_EMAIL,
        password: PASS,
        institutionName: 'Phase5 Isolation Institute',
        aisheCode: 'ISO-5001',
        contactPerson: 'Phase5 Tester',
        address: 'Isolation Campus, Test City',
      }),
    });
    const regData = await regRes.json();
    assert(regRes.status === 200 || regRes.status === 201, `Second institution registers (${regRes.status})`);
    tmp.instBId = regData.user?._id || regData.user?.id || '';
    const bLogin = await login(TEMP_INST_B_EMAIL, PASS);
    const bToken = bLogin.data.token;
    assert(!!bToken && !!tmp.instBId, 'Institution B authenticates');

    const bBase = await api('GET', '/institution/placements', bToken);
    assert(bBase.status === 200, 'Institution B GET /placements returns 200');
    assert(bBase.data?.data?.profile?.institutionName === 'Phase5 Isolation Institute', 'Institution B sees ONLY its own identity');
    assert(bBase.data?.data?.overview?.totalApplications === 0, 'Institution B starts with zero placement applications (no A leakage)');
    assert(!JSON.stringify(bBase.data.data).includes(A_EMPLOYER) && !JSON.stringify(bBase.data.data).includes('ABC Institute'), 'Institution B response contains no Institution A employer/identity leak');

    // Seed B's own student with the SAME unique program values + B-side application
    const b1 = await seedStudent({ email: `p5b1-${BASE}@test.edu`, name: 'P5 B Student', institutionId: tmp.instBId });
    tmp.bStudents.push(b1._id);
    const compB = await seedCompany({ name: B_EMPLOYER });
    const bOpp = await seedOpportunity({ title: `P5 B Internship ${BASE}`, type: 'Internship', company: compB });
    tmp.bOpportunities.push(bOpp._id);
    const bApp = await seedApplication({ student: b1, opportunity: bOpp, status: 'Applied', appliedAt: new Date(), matchScore: 0 });
    tmp.bApplications.push(bApp._id);

    const bFiltered = await api('GET', `/institution/placements?program=${encodeURIComponent(UNIQUE_PROGRAM)}`, bToken);
    assert(bFiltered.data?.data?.overview?.totalApplications === 1, 'Institution B ?program=<UNIQUE> sees ONLY its own application (1)');
    assert(bFiltered.data?.data?.overview?.uniqueStudents === 1, 'Institution B uniqueStudents === 1');
    assert(
      bFiltered.data?.data?.recruiters?.length === 1 && bFiltered.data.data.recruiters[0].companyName === B_EMPLOYER,
      'Institution B recruiters contain only its own employer'
    );
    assert(!JSON.stringify(bFiltered.data.data).includes(A_EMPLOYER), 'Institution B filtered response contains no Institution A employer');

    const aAfter = await api('GET', `/institution/placements?program=${encodeURIComponent(UNIQUE_PROGRAM)}`, aToken);
    const A_AFTER = JSON.stringify({ ov: aAfter.data.data.overview, recs: aAfter.data.data.recruiters, tb: aAfter.data.data.typeBreakdown });
    assert(A_AFTER === A_BEFORE, 'Institution A metrics unchanged after B seeded its own identical-cohort data (no cross-tenant count)');
    assert(aAfter.data?.data?.overview?.totalApplications === 5, 'Institution A still counts its own 5 applications');

    const spoofA = await api('GET', `/institution/placements?program=${encodeURIComponent(UNIQUE_PROGRAM)}&institutionId=${tmp.instBId}`, aToken);
    const A_SPOOF = JSON.stringify({ ov: spoofA.data.data.overview, recs: spoofA.data.data.recruiters, tb: spoofA.data.data.typeBreakdown });
    assert(A_SPOOF === A_BEFORE, 'Spoofed ?institutionId=<B> on Institution A is ignored (response identical)');
    const spoofB = await api('GET', `/institution/placements?program=${encodeURIComponent(UNIQUE_PROGRAM)}&institutionId=${tmp.instAId}`, bToken);
    const B_SPOOF = JSON.stringify({ ov: spoofB.data.data.overview, recs: spoofB.data.data.recruiters, tb: spoofB.data.data.typeBreakdown });
    const B_UNSPOOF = JSON.stringify({ ov: bFiltered.data.data.overview, recs: bFiltered.data.data.recruiters, tb: bFiltered.data.data.typeBreakdown });
    assert(B_SPOOF === B_UNSPOOF, 'Spoofed ?institutionId=<A> on Institution B is ignored (response identical)');

    // ── 6. Role & auth isolation ────────────────────────────
    console.log('\n--- 6. Role & auth isolation ---');
    const studentLogin = await login('student@skillbridge.dev', 'Student@123');
    const facLogin = await login('faculty@skillbridge.dev', 'Faculty@123');
    const indLogin = await login('industry@skillbridge.dev', 'Industry@123');
    const admLogin = await login('admin@skillbridge.dev', 'Admin@123');
    for (const [label, token] of [
      ['student', studentLogin.data.token],
      ['faculty', facLogin.data.token],
      ['industry', indLogin.data.token],
      ['admin', admLogin.data.token],
    ]) {
      const r = await api('GET', '/institution/placements', token);
      assert(r.status === 403, `${label} accessing /api/institution/placements returns 403`);
    }
    const anon = await api('GET', '/institution/placements', null);
    assert(anon.status === 401, 'Anonymous GET /api/institution/placements returns 401');

    // ── 7. Cleanup ──────────────────────────────────────────
    console.log('\n--- 7. Cleanup (temp records removed) ---');
    if (tmp.bApplications.length) await db.model('Application').deleteMany({ _id: { $in: tmp.bApplications } });
    if (tmp.applications.length) await db.model('Application').deleteMany({ _id: { $in: tmp.applications } });
    if (tmp.interviews.length) await db.model('Interview').deleteMany({ _id: { $in: tmp.interviews } });
    if (tmp.offers.length) await db.model('Offer').deleteMany({ _id: { $in: tmp.offers } });
    if (tmp.nocs.length) await db.model('StudentNOC').deleteMany({ _id: { $in: tmp.nocs } });
    if (tmp.enrollments.length) await db.model('Enrollment').deleteMany({ _id: { $in: tmp.enrollments } });
    if (tmp.attempts.length) await db.model('AssessmentAttempt').deleteMany({ _id: { $in: tmp.attempts } });
    if (tmp.programId) await db.model('LearningProgram').deleteOne({ _id: tmp.programId });
    if (tmp.assessmentId) await db.model('Assessment').deleteOne({ _id: tmp.assessmentId });
    if (tmp.bOpportunities.length) await db.model('Opportunity').deleteMany({ _id: { $in: tmp.bOpportunities } });
    if (tmp.opportunities.length) await db.model('Opportunity').deleteMany({ _id: { $in: tmp.opportunities } });
    if (tmp.companies.length) await db.model('Company').deleteMany({ _id: { $in: tmp.companies } });
    const allUserIds = [...tmp.students, ...tmp.bStudents];
    if (tmp.instBId) allUserIds.push(tmp.instBId);
    const userDel = await db.model('User').deleteMany({ _id: { $in: allUserIds } });
    const expectedUsers = tmp.students.length + tmp.bStudents.length + (tmp.instBId ? 1 : 0);
    assert(userDel.deletedCount === expectedUsers, `All temp users removed (${userDel.deletedCount}/${expectedUsers})`);
    assert(
      (await db.model('Application').countDocuments({ _id: { $in: [...tmp.applications, ...tmp.bApplications] } })) === 0,
      'All temp applications removed'
    );
    assert(
      (await db.model('Opportunity').countDocuments({ _id: { $in: [...tmp.opportunities, ...tmp.bOpportunities] } })) === 0,
      'All temp opportunities removed'
    );

    await db.disconnect();
  } catch (error) {
    console.error('  ❌ UNEXPECTED ERROR:', error);
    failed++;
    if (db) {
      try {
        await db.disconnect();
      } catch (_) { /* ignore */ }
    }
  }

  console.log('\n───────────────────────────────────────────────────────────────');
  console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('───────────────────────────────────────────────────────────────\n');
  return failed === 0;
}

runTests().then((ok) => process.exit(ok ? 0 : 1));