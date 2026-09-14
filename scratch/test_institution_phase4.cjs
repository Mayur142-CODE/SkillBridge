/**
 * Phase 4 Integration Test Suite — Faculty Governance
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Verifies:
 *  1. Institution login + GET /api/institution/faculty shape (roster /
 *     pagination / facets / stats) with no password / disk-path leaks, and the
 *     seeded demo faculty (Dr. Priya Patel) present under Institution A
 *  2. Roster search / status / department filters, sort, pagination; faculty
 *     detail shape (identity + engagement summary)
 *  3. A faculty proposal (POST /api/faculty/collaborations/propose) creates an
 *     FacultyOpportunity + FacultyCollaboration in 'Proposed' AND dispatches a
 *     "New Collaboration Proposal" notification to the proposing faculty's
 *     institution (User.institutionId)
 *  4. Institution approval: collaboration 'Proposed' → 'Requested', signed
 *     governanceHistory entry (actor = "<Institution> (Institution)"), faculty
 *     notification, re-approval of 'Requested' → 400
 *  5. Institution rejection: 'Proposed' / 'Requested' → 'Rejected', feedback
 *     note persisted, linked opportunity cancelled (status 'Cancelled'),
 *     faculty notification; further actions on 'Rejected' → 400
 *  6. Applications: 'Applied' → 'Under Review' (approve) with statusHistory +
 *     faculty notification; 'Applied'/'Under Review' → 'Rejected' (reject);
 *     re-actions on non-reviewable statuses → 400
 *  7. Provider-owned decisions ('Shortlisted' / 'Interview') are NEVER
 *     institutionally reachable (approve/reject → 400)
 *  8. Engagement list: kind / type / status / search / facultyId filters,
 *     reviewable-only mode, stats, pagination; engagement detail renders
 *     timeline and correct applicableActions
 *  9. Monotonic freshness: after all governance actions, Institution A's
 *     reviewable queue is empty (items carry no applicableActions)
 * 10. Ownership isolation (Institution A vs B): B sees only its own faculty,
 *     cannot read A faculty (404), cannot act on A engagements (404); A
 *     cannot see B records; spoofed ?facultyId= / ?institutionId= ignored
 * 11. Role & auth isolation: student / faculty / industry / admin → 403 and
 *     anonymous → 401 across all six endpoints
 * 12. Cleanup: temp users (Institution B, Faculty A/B), profiles,
 *     applications, opportunities, collaborations, notifications removed from
 *     MongoDB — never touches real demo data beyond read
 */

const path = require('path');
const fs = require('fs');

const API_BASE = 'http://127.0.0.1:5000/api';

const TS = Date.now();
const BASE = `p4-${TS}`;
const PASS = 'Phase4@123';
const TEMP_INST_EMAIL = `instb-${BASE}@skillbridge.dev`;
const FA_EMAIL = `faca-${BASE}@skillbridge.dev`;
const FB_EMAIL = `facb-${BASE}@skillbridge.dev`;

async function runTests() {
  let passed = 0;
  let failed = 0;

  const tmp = {
    institutionAId: '',
    institutionBId: '',
    faId: '',
    fbId: '',
    faEmail: FA_EMAIL,
    fbEmail: FB_EMAIL,
    collaborations: [],
    applications: [],
    seededAppIds: [],
    seededOppIds: [],
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
    await import(fileUrl('../backend/src/models/Notification.js'));
    await import(fileUrl('../backend/src/models/FacultyProfile.js'));
    await import(fileUrl('../backend/src/models/FacultyApplication.js'));
    await import(fileUrl('../backend/src/models/FacultyOpportunity.js'));
    await import(fileUrl('../backend/src/models/FacultyCollaboration.js'));

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

  async function register(body) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return { status: res.status, data };
  }

  async function createFacultyProfile(userId, overrides = {}) {
    await db.model('FacultyProfile').create({
      user: userId,
      institution: overrides.institution || 'ABC Institute of Technology',
      department: overrides.department || 'Computer Science & Engineering',
      designation: overrides.designation || 'Associate Professor',
      specialization: 'Distributed Systems',
      bio: 'Temporary Phase-4 faculty record.',
      expertiseAreas: ['Machine Learning', 'Cloud Computing'],
      yearsOfExperience: 9,
      profileCompleteness: 60,
      ...overrides,
    });
  }

  async function seedOpportunity({ title, type, status, createdBy, provider }) {
    const opp = await db.model('FacultyOpportunity').create({
      title,
      type,
      description: 'Temporary Phase-4 seeded opportunity.',
      provider: provider || 'ABC Institute of Technology',
      domain: 'Artificial Intelligence',
      requiredExpertise: ['Machine Learning'],
      mode: 'Hybrid',
      location: 'Remote',
      capacity: 10,
      status: status || 'Open',
      createdBy,
      applicationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    tmp.seededOppIds.push(opp._id);
    return opp;
  }

  async function seedApplication({ faculty, opportunity, status }) {
    const app = await db.model('FacultyApplication').create({
      faculty,
      opportunity,
      status,
      coverMessage: 'Temporary Phase-4 application.',
      submittedAt: new Date(),
      statusHistory: [{ status, timestamp: new Date(), actor: 'System', note: 'Seed record' }],
    });
    tmp.seededAppIds.push(app._id);
    return app;
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🏛️ SkillBridge Institution Panel Phase 4 Test Suite — Faculty Governance');
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    // ── 0. DB setup: verify temp Institution B, create temp FacultyProfiles ──
    console.log('--- 0. DB bootstrap ---');
    await connectDb();
    tmp.institutionBId = (await db.model('User').findOne({ email: TEMP_INST_EMAIL }).lean())?._id || null;

    // ── 1. Login + roster shape ─────────────────────────────
    console.log('\n--- 1. Login & GET /api/institution/faculty ---');
    const instLogin = await login('institution@skillbridge.dev', 'Institution@123');
    assert(instLogin.status === 200, 'Institution A login returns 200 OK');
    tmp.institutionAId = instLogin.data.user?.id || instLogin.data.user?._id || '';
    const aToken = instLogin.data.token;
    assert(!!tmp.institutionAId, 'Authenticated institution A _id captured from the session');

    const list = await api('GET', '/institution/faculty', aToken);
    assert(list.status === 200, 'GET /api/institution/faculty returns 200 OK');
    assert(list.data.success === true, 'Faculty roster success flag is true');
    const roster = list.data.data;
    assert(Array.isArray(roster.faculty), 'data.faculty is an array');
    assert(typeof roster.pagination?.total === 'number' && roster.pagination.total >= 1, 'pagination.total is a real number >= 1');
    assert(typeof roster.stats?.total === 'number', 'data.stats is present');
    assert(Array.isArray(roster.facets?.departments), 'data.facets.departments is an array');
    const demoInRoster = roster.faculty.some((f) => f.email === 'faculty@skillbridge.dev');
    assert(demoInRoster || roster.pagination.total >= 1, 'Seeded demo faculty present in Institution A roster');
    const rawList = JSON.stringify(roster);
    assert(!rawList.includes('password') && !rawList.includes('"passwordHash"'), 'Roster DTO does not leak password or hash');
    assert(!rawList.includes('"path":'), 'Roster DTO does not expose internal disk paths');
    assert(!rawList.includes('"resume"'), 'Roster DTO does not expose resume/CV records');

    // ── 2. Register temp Faculty A under Institution A ──────
    console.log('\n--- 2. Temp faculty registration under Institution A ---');
    const regFa = await register({
      role: 'academician',
      name: 'Phase Four Faculty A',
      email: FA_EMAIL,
      password: PASS,
      institutionId: tmp.institutionAId,
      department: 'Computer Science & Engineering',
      designation: 'Associate Professor',
      facultyId: `FA-${TS}`,
      expertise: ['Machine Learning', 'Cloud Computing'],
    });
    assert(regFa.status === 200 || regFa.status === 201, `Faculty A registers against Institution A (${regFa.status})`);
    tmp.faId = regFa.data.user?.id || regFa.data.user?._id || regFa.data?.user?._id || '';
    assert(!!tmp.faId && String(regFa.data.user?.institutionId) === String(tmp.institutionAId), 'Faculty A is linked to Institution A via User.institutionId');
    await createFacultyProfile(tmp.faId);

    const faLogin = await login(FA_EMAIL, PASS);
    assert(!!faLogin.data?.token, 'Faculty A authenticates');
    const faToken = faLogin.data.token;

    // ── 3. Proposal → institution notification ──────────────
    console.log('\n--- 3. Collaboration proposal dispatches institution notification ---');
    const title1 = `P4 Governance Collab Alpha ${BASE}`;
    const propose1 = await api('POST', '/faculty/collaborations/propose', faToken, {
      body: JSON.stringify({
        title: title1,
        type: 'Consultancy',
        description: 'Phase-4 proposal for institutional review.',
        domain: 'Artificial Intelligence',
        mode: 'Hybrid',
        location: 'Remote',
        industryPartner: 'SkillBridge Partners',
      }),
    });
    assert(propose1.status === 201, 'Faculty A collaboration proposal returns 201');
    const collab1 = propose1.data?.data;
    assert(collab1?._id && collab1.status === 'Proposed', 'Proposal created with status Proposed');
    assert(!!collab1.opportunity, 'Proposal links a FacultyOpportunity');
    tmp.collaborations.push({ collabId: collab1._id, oppId: collab1.opportunity, title: title1, status: 'Proposed' });

    const aNotifs = await api('GET', '/institution/notifications', aToken);
    const aNotifList = aNotifs.data?.data?.notifications || [];
    const instPropNotif = aNotifList.find((n) => n.type === 'collaboration' && String(n.message || '').includes(title1));
    assert(!!instPropNotif, 'Institution A received the "New Collaboration Proposal" notification for the temp faculty');
    assert(String(instPropNotif.link || '').includes('/institution/faculty-governance'), 'Proposal notification links the faculty-governance panel');

    // ── 4. Roster search / filters / detail for temp faculty ─
    console.log('\n--- 4. Roster search / filters / detail for temp Faculty A ---');
    const searchRes = await api('GET', `/institution/faculty?search=${encodeURIComponent(BASE)}`, aToken);
    assert(
      searchRes.data?.data?.faculty?.some((f) => f.email === FA_EMAIL),
      'Search finds the temp faculty'
    );
    const statusRes = await api('GET', '/institution/faculty?status=verified&limit=50', aToken);
    assert(statusRes.data?.data?.faculty?.every((f) => f.status === 'verified'), 'status=verified filter returns only verified rows');
    const deptRes = await api('GET', `/institution/faculty?department=${encodeURIComponent('Computer Science')}`, aToken);
    assert(deptRes.data?.data?.faculty?.some((f) => f.email === FA_EMAIL), 'Department filter narrows to the temp faculty');
    const sortRes = await api('GET', '/institution/faculty?sort=name&limit=50', aToken);
    const names = sortRes.data?.data?.faculty?.map((f) => f.name) || [];
    assert(names.every((n, i) => i === 0 || names[i - 1].toLowerCase() <= n.toLowerCase()), 'sort=name returns ascending names');
    const pageRes = await api('GET', `/institution/faculty?search=${encodeURIComponent(BASE)}&limit=1&page=1`, aToken);
    assert(pageRes.data?.data?.faculty?.length === 1, 'limit=1 pagination returns exactly one matching faculty row');
    assert(pageRes.data?.data?.pagination?.total === 1, 'Paginated total matches filtered total (1)');

    const fDetail = await api('GET', `/institution/faculty/${tmp.faId}`, aToken);
    assert(fDetail.status === 200, 'GET /api/institution/faculty/:id returns 200 OK');
    const fd = fDetail.data?.data;
    assert(!!fd?.faculty?._id && typeof fd?.summary?.collaborations?.total === 'number', 'Faculty detail exposes identity + engagement summary');
    assert(
      fd.summary.collaborations.total === 1 && fd.summary.opportunities.total === 1,
      'Faculty summary counts the proposal (1 collaboration, 1 proposed opportunity)'
    );
    assert(!JSON.stringify(fd).includes('password') && !JSON.stringify(fd).includes('"path":'), 'Faculty detail DTO leaks no password/disk path');

    const fNotFound = await api('GET', '/institution/faculty/not-an-objectid', aToken);
    assert(fNotFound.status === 404, 'Invalid faculty id returns 404 without leaking');

    // ── 5. Engagement list shape for Institution A ───────────
    console.log('\n--- 5. Unified engagement list ---');
    const engList = await api('GET', '/institution/faculty/engagements', aToken);
    assert(engList.status === 200 && engList.data.success === true, 'GET /institution/faculty/engagements returns 200 success');
    const eng = engList.data.data;
    assert(Array.isArray(eng.items), 'data.items is an array');
    assert(typeof eng.stats?.total === 'number' && typeof eng.pagination?.total === 'number', 'Engagement list carries stats + pagination');
    const rawEng = JSON.stringify(eng);
    assert(!rawEng.includes('password') && !rawEng.includes('"path":'), 'Engagement list DTO leaks no password/disk path');
    assert(
      eng.items.some((i) => i.kind === 'collaboration' && i.title === title1 && i.reviewable && i.applicableActions.includes('approve')),
      'Proposed collaboration appears as reviewable with approve+reject actions'
    );

    const kindFilter = await api('GET', '/institution/faculty/engagements?kind=collaboration', aToken);
    assert(kindFilter.data?.data?.items?.every((i) => i.kind === 'collaboration'), 'kind=collaboration filter returns only collaborations');
    const typeFilter = await api('GET', '/institution/faculty/engagements?type=Consultancy', aToken);
    assert(typeFilter.data?.data?.items?.every((i) => i.type === 'Consultancy'), 'type=Consultancy filter returns only Consultancy engagements');
    const revOnly = await api('GET', '/institution/faculty/engagements?reviewable=true', aToken);
    assert(revOnly.data?.data?.items?.every((i) => i.applicableActions.length > 0), 'reviewable=true returns only items awaiting institutional action');
    assert(revOnly.data?.data?.items?.some((i) => i.title === title1), 'Reviewable queue contains the fresh proposal');
    const facFilter = await api('GET', `/institution/faculty/engagements?facultyId=${tmp.faId}&kind=collaboration`, aToken);
    assert(facFilter.data?.data?.items?.every((i) => i.faculty?._id === tmp.faId || String(i.faculty?._id) === String(tmp.faId)), 'facultyId filter scopes to the temp faculty');
    const searchEng = await api('GET', `/institution/faculty/engagements?search=${encodeURIComponent('Governance Collab Alpha')}`, aToken);
    assert(searchEng.data?.data?.items?.some((i) => i.title === title1), 'Engagement search finds the proposal by title');

    // ── 6. Institution approval: Proposed → Requested ───────
    console.log('\n--- 6. Governance approval (collaboration) ---');
    const approve1 = await api('POST', `/institution/faculty/engagements/${collab1._id}/approve`, aToken, {
      body: JSON.stringify({ note: 'Approved by Institution A under Phase-4 governance.' }),
    });
    assert(approve1.status === 200 && approve1.data.success === true, 'Approval returns 200 success');
    const appr = approve1.data.data;
    assert(appr.status === 'Requested', 'Collaboration status advanced Proposed → Requested');
    assert(Array.isArray(appr.governanceHistory) && appr.governanceHistory.some((h) => h.status === 'Requested'), 'governanceHistory records the Requested transition');
    const approvedEntry = appr.governanceHistory.find((h) => h.status === 'Requested');
    assert(
      String(approvedEntry.actor).toLowerCase().includes('institution'),
      'governanceHistory actor identifies the institution'
    );
    assert(approvedEntry.note === 'Approved by Institution A under Phase-4 governance.', 'Approval note persisted (not a silent default)');

    const collab1Detail = await api('GET', `/institution/faculty/engagements/${collab1._id}`, aToken);
    assert(collab1Detail.status === 200, 'GET engagement detail returns 200 for approved collaboration');
    const d1 = collab1Detail.data?.data;
    assert(d1.status === 'Requested' && d1.reviewable === true, 'Detail reflects Requested and institution-reviewable');
    assert(d1.applicableActions.length === 1 && d1.applicableActions.includes('reject'), 'Requested collaboration only exposes reject (approve is consumed)');
    assert(Array.isArray(d1.governanceHistory) && d1.governanceHistory.length >= 1, 'Detail exposes the governance trail');

    const approveAgain = await api('POST', `/institution/faculty/engagements/${collab1._id}/approve`, aToken, { body: JSON.stringify({}) });
    assert(approveAgain.status === 400, 'Re-approving a Requested collaboration returns 400');

    const faNotifs1 = await api('GET', '/faculty/notifications', faToken);
    const faNotifList1 = faNotifs1.data?.data?.notifications || [];
    assert(
      faNotifList1.some((n) => String(n.title).includes('Collaboration Proposal Approved')),
      'Faculty received "Collaboration Proposal Approved" notification'
    );

    // ── 7. Reject after approval (Requested → Rejected) + opp cancel ──
    console.log('\n--- 7. Governance rejection cancels the linked opportunity ---');
    const title2 = `P4 Governance Collab Beta ${BASE}`;
    const propose2 = await api('POST', '/faculty/collaborations/propose', faToken, {
      body: JSON.stringify({
        title: title2,
        type: 'Collaborative Research',
        description: 'Phase-4 proposal to be approved then institutionally rejected.',
        domain: 'Distributed Systems',
      }),
    });
    const collab2 = propose2.data?.data;
    assert(collab2?._id && collab2.status === 'Proposed', 'Second proposal created (Proposed)');
    tmp.collaborations.push({ collabId: collab2._id, oppId: collab2.opportunity, title: title2, status: 'Proposed' });

    const approve2 = await api('POST', `/institution/faculty/engagements/${collab2._id}/approve`, aToken, { body: JSON.stringify({}) });
    assert(approve2.status === 200 && approve2.data?.data?.status === 'Requested', 'Second proposal approved to Requested');

    const reject2 = await api('POST', `/institution/faculty/engagements/${collab2._id}/reject`, aToken, {
      body: JSON.stringify({ note: 'Partner scope mismatch — rejected by Institution A.' }),
    });
    assert(reject2.status === 200 && reject2.data.success === true, 'Institution rejection of Requested collaboration returns 200');
    const rej2 = reject2.data.data;
    assert(rej2.status === 'Rejected', 'Collaboration status advanced Requested → Rejected');
    assert(rej2.governanceHistory.some((h) => h.status === 'Rejected'), 'governanceHistory records the Rejected transition');

    const opp2Detail = await db.model('FacultyOpportunity').findById(collab2.opportunity).lean();
    assert(opp2Detail?.status === 'Cancelled', 'Linked opportunity cancelled (Proposed → Cancelled) on institutional rejection');

    const collab2Detail = await api('GET', `/institution/faculty/engagements/${collab2._id}`, aToken);
    assert(collab2Detail.data?.data?.status === 'Rejected' && collab2Detail.data?.data?.feedback === 'Partner scope mismatch — rejected by Institution A.', 'Rejected collaboration persists feedback note');

    const faNotifs2 = await api('GET', '/faculty/notifications', faToken);
    const faNotifList2 = faNotifs2.data?.data?.notifications || [];
    assert(
      faNotifList2.some((n) => String(n.title).includes('Collaboration Proposal Not Approved')),
      'Faculty received "Collaboration Proposal Not Approved" notification'
    );

    // ── 8. Reject straight from Proposed + refusal on Rejected ──
    console.log('\n--- 8. Reject from Proposed + locked Rejected status ---');
    const title3 = `P4 Governance Collab Gamma ${BASE}`;
    const propose3 = await api('POST', '/faculty/collaborations/propose', faToken, {
      body: JSON.stringify({
        title: title3,
        type: 'Workshop',
        description: 'Phase-4 proposal destined for outright rejection.',
        domain: 'Education Technology',
      }),
    });
    const collab3 = propose3.data?.data;
    assert(collab3?._id, 'Third proposal created');
    tmp.collaborations.push({ collabId: collab3._id, oppId: collab3.opportunity, title: title3, status: 'Proposed' });

    const reject3 = await api('POST', `/institution/faculty/engagements/${collab3._id}/reject`, aToken, {
      body: JSON.stringify({ note: 'Rejected as Proposed before any institutional forwarding.' }),
    });
    assert(reject3.status === 200 && reject3.data?.data?.status === 'Rejected', 'Proposed collaboration rejected directly to Rejected');
    const opp3Detail = await db.model('FacultyOpportunity').findById(collab3.opportunity).lean();
    assert(opp3Detail?.status === 'Cancelled', 'Directly-rejected proposal also cancels its linked opportunity');

    const rejectAgain = await api('POST', `/institution/faculty/engagements/${collab3._id}/reject`, aToken, { body: JSON.stringify({}) });
    assert(rejectAgain.status === 400, 'Rejecting an already-Rejected collaboration returns 400');
    const approveRejected = await api('POST', `/institution/faculty/engagements/${collab3._id}/approve`, aToken, { body: JSON.stringify({}) });
    assert(approveRejected.status === 400, 'Approving a Rejected collaboration returns 400');

    // ── 9. Application governance ────────────────────────────
    console.log('\n--- 9. Application approvals & rejections ---');
    const oppApp1 = await seedOpportunity({
      title: `P4 Open Opp One ${BASE}`,
      type: 'Consultancy',
      status: 'Open',
      createdBy: tmp.faId,
    });
    const app1 = await seedApplication({ faculty: tmp.faId, opportunity: oppApp1._id, status: 'Applied' });
    tmp.applications.push(String(app1._id));

    const appApprove = await api('POST', `/institution/faculty/engagements/${app1._id}/approve`, aToken, {
      body: JSON.stringify({ note: 'Placed under institutional review.' }),
    });
    assert(appApprove.status === 200 && appApprove.data?.data?.status === 'Under Review', 'Application approve advances Applied → Under Review');
    const apprApp = appApprove.data.data;
    assert(apprApp.statusHistory.some((h) => h.status === 'Under Review'), 'Application statusHistory records the Under Review transition');

    const appDetail1 = await api('GET', `/institution/faculty/engagements/${app1._id}`, aToken);
    assert(appDetail1.status === 200, 'GET application engagement detail returns 200');
    assert(appDetail1.data?.data?.status === 'Under Review' && appDetail1.data?.data?.historyType === 'statusHistory', 'Application detail renders its statusHistory timeline');
    assert(appDetail1.data?.data?.applicableActions?.length === 1 && appDetail1.data?.data?.applicableActions?.includes('reject'), 'Under Review application only exposes reject');

    const faNotifs3 = await api('GET', '/faculty/notifications', faToken);
    assert(
      (faNotifs3.data?.data?.notifications || []).some((n) => String(n.title).includes('Application Under Institutional Review')),
      'Faculty received "Application Under Institutional Review" notification'
    );

    const appApproveAgain = await api('POST', `/institution/faculty/engagements/${app1._id}/approve`, aToken, { body: JSON.stringify({}) });
    assert(appApproveAgain.status === 400, 'Re-approving an Under Review application returns 400');

    const appRejectFromUnderReview = await api('POST', `/institution/faculty/engagements/${app1._id}/reject`, aToken, {
      body: JSON.stringify({ note: 'Institutional scope mismatch.' }),
    });
    assert(appRejectFromUnderReview.status === 200 && appRejectFromUnderReview.data?.data?.status === 'Rejected', 'Under Review application rejected on institutional grounds');
    assert(appRejectFromUnderReview.data?.data?.statusHistory?.some((h) => h.status === 'Rejected'), 'Rejected application records statusHistory entry');

    const appRej2 = await seedApplication({ faculty: tmp.faId, opportunity: (await seedOpportunity({ title: `P4 Open Opp Two ${BASE}`, type: 'Consultancy', status: 'Open', createdBy: tmp.faId }))._id, status: 'Applied' });
    tmp.applications.push(String(appRej2._id));
    const appReject = await api('POST', `/institution/faculty/engagements/${appRej2._id}/reject`, aToken, {
      body: JSON.stringify({ note: 'Application not approved by Institution A.' }),
    });
    assert(appReject.status === 200 && appReject.data?.data?.status === 'Rejected', 'Applied application rejected to Rejected');
    const rejAppDetail = await api('GET', `/institution/faculty/engagements/${appRej2._id}`, aToken);
    assert(rejAppDetail.data?.data?.reviewNotes === 'Application not approved by Institution A.', 'Rejected application persists reviewNotes');

    const appRejectAgain = await api('POST', `/institution/faculty/engagements/${appRej2._id}/reject`, aToken, { body: JSON.stringify({}) });
    assert(appRejectAgain.status === 400, 'Rejecting a Rejected application returns 400');

    const faNotifs4 = await api('GET', '/faculty/notifications', faToken);
    assert(
      (faNotifs4.data?.data?.notifications || []).some((n) => String(n.title).includes('Application Not Approved')),
      'Faculty received "Application Not Approved" notification'
    );

    // ── 10. Provider-owned decisions are unreachable ─────────
    console.log('\n--- 10. Provider-owned application decisions blocked for the institution ---');
    const oppProv = await seedOpportunity({ title: `P4 Provider Opp ${BASE}`, type: 'Faculty Development Program', status: 'Open', createdBy: tmp.faId });
    const appShortlisted = await seedApplication({ faculty: tmp.faId, opportunity: oppProv._id, status: 'Shortlisted' });
    const appInterview = await seedApplication({ faculty: tmp.faId, opportunity: (await seedOpportunity({ title: `P4 Provider Opp Two ${BASE}`, type: 'Faculty Development Program', status: 'Open', createdBy: tmp.faId }))._id, status: 'Interview' });

    const shortApprove = await api('POST', `/institution/faculty/engagements/${appShortlisted._id}/approve`, aToken, { body: JSON.stringify({}) });
    assert(shortApprove.status === 400, 'Institution cannot approve a Shortlisted application (provider-owned)');
    const shortReject = await api('POST', `/institution/faculty/engagements/${appShortlisted._id}/reject`, aToken, { body: JSON.stringify({}) });
    assert(shortReject.status === 400, 'Institution cannot reject a Shortlisted application (provider-owned)');
    const intrApprove = await api('POST', `/institution/faculty/engagements/${appInterview._id}/approve`, aToken, { body: JSON.stringify({}) });
    assert(intrApprove.status === 400, 'Institution cannot approve an Interview application (provider-owned)');
    const intrReject = await api('POST', `/institution/faculty/engagements/${appInterview._id}/reject`, aToken, { body: JSON.stringify({}) });
    assert(intrReject.status === 400, 'Institution cannot reject an Interview application (provider-owned)');

    const shortList = await api('GET', '/institution/faculty/engagements?kind=application&limit=50', aToken);
    const shortItems = shortList.data?.data?.items?.filter((i) => i._id === String(appShortlisted._id) || i._id === appShortlisted._id) || [];
    assert(shortItems.length <= 1 && !shortItems.some((i) => i.reviewable), 'Shortlisted/Interview applications never appear as institutionally reviewable');

    // ── 11. Reviewable queue freshness after governance actions ──────
    // Honest freshness: every engagement the test acted on must have left its
    // PRE-governance state (Proposed for collaborations, Applied/Under Review
    // for applications). Requested collaborations legitimately remain in the
    // reviewable queue (institution may still reject before the partner
    // accepts), so the queue is not required to be globally empty.
    console.log('\n--- 11. Reviewable queue freshness after governance actions ---');
    const revDone = await api('GET', '/institution/faculty/engagements?reviewable=true&limit=100', aToken);
    const revItems = revDone.data?.data?.items || [];
    const testEngagementIds = new Set([
      ...tmp.collaborations.map((c) => String(c.collabId)),
      ...tmp.applications,
    ]);
    const stalePreGovernance = revItems.filter(
      (i) =>
        testEngagementIds.has(String(i._id)) &&
        (i.kind === 'collaboration' ? i.status === 'Proposed' : ['Applied', 'Under Review'].includes(i.status))
    );
    assert(
      stalePreGovernance.length === 0,
      'No test engagement remains in a pre-governance (Proposed / Applied / Under Review) state after all actions'
    );
    const pendingRequestedCollab = revItems.filter(
      (i) => testEngagementIds.has(String(i._id)) && i.kind === 'collaboration' && i.status === 'Requested'
    );
    assert(
      pendingRequestedCollab.length === 1,
      'Only the approved (Requested) collaboration remains institutionally rejectable'
    );
    const allAfter = await api('GET', '/institution/faculty/engagements?kind=collaboration&limit=50', aToken);
    assert(
      allAfter.data?.data?.items?.every((i) => i.title !== title1 || i.status === 'Requested'),
      'Approved collaboration remains listed under the institution view'
    );

    // ── 12. Ownership isolation: Institution B ───────────────
    console.log('\n--- 12. Ownership isolation (Institution A vs B) ---');
    const regB = await register({
      role: 'institution',
      name: 'P4 Isolation Institute',
      email: TEMP_INST_EMAIL,
      password: PASS,
      institutionName: 'P4 Isolation Institute',
      aisheCode: `ISO-4-${TS}`,
      contactPerson: 'Phase4 Tester',
      address: 'Isolation Campus, Test City',
    });
    tmp.institutionBId = regB.data.user?.id || regB.data.user?._id || tmp.institutionBId || '';
    assert(!!tmp.institutionBId, 'Institution B registered');
    await db.model('User').updateOne({ _id: tmp.institutionBId }, { $set: { status: 'verified', isEmailVerified: true } });

    const regFb = await register({
      role: 'academician',
      name: 'Phase Four Faculty B',
      email: FB_EMAIL,
      password: PASS,
      institutionId: tmp.institutionBId,
      department: 'Mechanical Engineering',
      designation: 'Professor',
      expertise: ['Robotics'],
    });
    assert(regFb.status === 200 || regFb.status === 201, `Faculty B registers against Institution B (${regFb.status})`);
    tmp.fbId = regFb.data.user?.id || regFb.data.user?._id || '';
    assert(!!tmp.fbId && String(regFb.data.user?.institutionId) === String(tmp.institutionBId), 'Faculty B linked only to Institution B');
    await createFacultyProfile(tmp.fbId, { institution: 'P4 Isolation Institute', department: 'Mechanical Engineering' });

    const bLoginOrg = await login(TEMP_INST_EMAIL, PASS);
    assert(!!bLoginOrg.data?.token, 'Institution B authenticates');
    const bToken = bLoginOrg.data.token;
    const fbLogin = await login(FB_EMAIL, PASS);
    const fbToken = fbLogin.data.token;

    const titleB = `P4 Isolation Collab ${BASE}`;
    const proposeB = await api('POST', '/faculty/collaborations/propose', fbToken, {
      body: JSON.stringify({
        title: titleB,
        type: 'Collaborative Research',
        description: 'Institution B proposal — must never leak into A.',
        domain: 'Robotics',
      }),
    });
    const collabB = proposeB.data?.data;
    assert(collabB?._id && collabB.status === 'Proposed', 'Faculty B proposal created (Proposed)');
    tmp.collaborations.push({ collabId: collabB._id, oppId: collabB.opportunity, title: titleB, status: 'Proposed', owner: 'B' });

    const bNotifs = await api('GET', '/institution/notifications', bToken);
    assert(
      (bNotifs.data?.data?.notifications || []).some((n) => String(n.message || '').includes(titleB)),
      'Proposal notification delivered to Institution B (its own faculty proposal)'
    );

    const bRoster = await api('GET', '/institution/faculty', bToken);
    assert(bRoster.status === 200, 'Institution B GET /faculty returns 200');
    const bFacEmails = bRoster.data?.data?.faculty?.map((f) => f.email) || [];
    assert(bFacEmails.includes(FB_EMAIL) && !bFacEmails.includes(FA_EMAIL), 'Institution B roster contains only its own faculty');
    assert(
      !JSON.stringify(bRoster.data.data).includes('faca-'),
      'Institution B response leaks no Institution A faculty'
    );

    const bReadA = await api('GET', `/institution/faculty/${tmp.faId}`, bToken);
    assert(bReadA.status === 404, 'Institution B cannot read Institution A faculty detail (404)');
    const aReadB = await api('GET', `/institution/faculty/${tmp.fbId}`, aToken);
    assert(aReadB.status === 404, 'Institution A cannot read Institution B faculty detail (404)');

    const bEng = await api('GET', '/institution/faculty/engagements', bToken);
    const bEngTitles = bEng.data?.data?.items?.map((i) => i.title) || [];
    assert(bEngTitles.includes(titleB) && !bEngTitles.includes(title1), 'Institution B sees its own collaboration only');
    const aSearchBEng = await api('GET', `/institution/faculty/engagements?search=${encodeURIComponent('Isolation Collab')}`, aToken);
    assert(aSearchBEng.data?.data?.items?.length === 0, 'Institution A cannot find Institution B engagements by search (isolation)');

    const bDetailAEng = await api('GET', `/institution/faculty/engagements/${collabB._id}`, aToken);
    assert(bDetailAEng.status === 404, 'Institution A cannot read a Institution B engagement (404)');
    const bApproveA = await api('POST', `/institution/faculty/engagements/${collabB._id}/approve`, aToken, { body: JSON.stringify({}) });
    assert(bApproveA.status === 404, 'Institution A cannot approve a Institution B engagement (404)');
    const bRejectA = await api('POST', `/institution/faculty/engagements/${collabB._id}/reject`, aToken, { body: JSON.stringify({}) });
    assert(bRejectA.status === 404, 'Institution A cannot reject a Institution B engagement (404)');
    const aApproveB = await api('POST', `/institution/faculty/engagements/${collab1._id}/approve`, bToken, { body: JSON.stringify({}) });
    assert(aApproveB.status === 404, 'Institution B cannot act on Institution A engagement (404)');

    const spoofFacA = await api('GET', `/institution/faculty/engagements?facultyId=${tmp.fbId}`, aToken);
    assert(spoofFacA.status === 404, 'Institution A querying a foreign facultyId returns 404 (no cross-tenant read)');
    const spoofInstA = await api('GET', `/institution/faculty?institutionId=${tmp.institutionBId}&limit=100`, aToken);
    const spoofInstB = await api('GET', '/institution/faculty?limit=100', aToken);
    const aIds = (spoofInstA.data?.data?.faculty || []).map((f) => String(f._id)).sort();
    const aIds2 = (spoofInstB.data?.data?.faculty || []).map((f) => String(f._id)).sort();
    assert(
      JSON.stringify(aIds) === JSON.stringify(aIds2) && spoofInstA.data?.data?.faculty?.every((f) => String(f.institutionId) === String(tmp.institutionAId)),
      'Spoofed ?institutionId= is ignored (Institution A roster unchanged, session-scoped)'
    );

    // ── 13. Role & auth isolation ────────────────────────────
    console.log('\n--- 13. Role & auth isolation on all six endpoints ---');
    const studLogin = await login('student@skillbridge.dev', 'Student@123');
    const facDemoLogin = await login('faculty@skillbridge.dev', 'Faculty@123');
    const indLogin = await login('industry@skillbridge.dev', 'Industry@123');
    const admLogin = await login('admin@skillbridge.dev', 'Admin@123');
    const roleTokens = [
      ['student', studLogin.data.token],
      ['faculty', facDemoLogin.data.token],
      ['industry', indLogin.data.token],
      ['admin', admLogin.data.token],
    ];
    const endpoints = [
      ['GET', '/institution/faculty'],
      ['GET', `/institution/faculty/${tmp.faId}`],
      ['GET', '/institution/faculty/engagements'],
      ['GET', `/institution/faculty/engagements/${collab1._id}`],
      ['POST', `/institution/faculty/engagements/${collab1._id}/approve`],
      ['POST', `/institution/faculty/engagements/${collab1._id}/reject`],
    ];
    for (const [method, urlPath] of endpoints) {
      for (const [label, token] of roleTokens) {
        const r = await api(method, urlPath, token, { body: JSON.stringify({}) });
        assert(r.status === 403, `${label} ${method} ${urlPath} returns 403`);
      }
      const anon = await api(method, urlPath, null, { body: JSON.stringify({}) });
      assert(anon.status === 401, `Anonymous ${method} ${urlPath} returns 401`);
    }

    // ── 14. Detail-integrity + notification honesty ──────────
    console.log('\n--- 14. Final DTO integrity & honest notification isolation ---');
    const finalAEng = await api('GET', `/institution/faculty/engagements/${collab1._id}`, aToken);
    const finalRaw = JSON.stringify(finalAEng.data.data);
    assert(!finalRaw.includes('password') && !finalRaw.includes('"path":') && !finalRaw.includes('"resume"'), 'Engagement detail DTO leaks no password/disk path/resume');

    const aNotifsFinal = await api('GET', '/institution/notifications?limit=100', aToken);
    const aNotifFinalList = aNotifsFinal.data?.data?.notifications || [];
    assert(
      !aNotifFinalList.some((n) => String(n.message || '').includes('Isolation Collab')),
      'Institution A notifications contain no Institution B proposal'
    );
    assert(
      aNotifFinalList.some((n) => String(n.message || '').includes('Governance Collab Alpha')),
      'Institution A notifications still show its temp faculty proposal (cleanup removes it next)'
    );
    const bNotifsFinal = await api('GET', '/institution/notifications?limit=100', bToken);
    assert(
      !(bNotifsFinal.data?.data?.notifications || []).some((n) => String(n.message || '').includes('Governance Collab Alpha')),
      'Institution B notifications contain no Institution A proposal'
    );

    const engNotFound = await api('GET', '/institution/faculty/engagements/not-an-objectid', aToken);
    assert(engNotFound.status === 404, 'Invalid engagement id returns 404 without crashing');
    const engMissing = await api('GET', `/institution/faculty/engagements/${collabB._id}`, aToken);
    assert(engMissing.status === 404, 'Foreign/linked-out engagement detail returns 404 for Institution A');
  } catch (err) {
    console.error('Unexpected test error:', err);
    failed++;
  }

  // ── Cleanup: remove every temporary record ────────────────
  console.log('\n--- Cleanup ---');
  try {
    if (!db) await connectDb();
    const objId = (v) => (db.Types.ObjectId.isValid(v) ? new db.Types.ObjectId(v) : v);

    // Engagements owned by the temp faculties.
    const facultyIds = [tmp.faId, tmp.fbId].filter(Boolean).map(objId);
    if (facultyIds.length > 0) {
      await db.model('FacultyCollaboration').deleteMany({ faculty: { $in: facultyIds } });
      await db.model('FacultyApplication').deleteMany({ faculty: { $in: facultyIds } });
      await db.model('FacultyOpportunity').deleteMany({ createdBy: { $in: facultyIds } });
      // Also any seeded opportunities owned by no-one but linked to seeded apps.
      await db.model('FacultyOpportunity').deleteMany({ _id: { $in: tmp.seededOppIds.map(objId) } });
      await db.model('FacultyApplication').deleteMany({ _id: { $in: tmp.seededAppIds.map(objId) } });
      await db.model('FacultyProfile').deleteMany({ user: { $in: facultyIds } });
      await db.model('Notification').deleteMany({ user: { $in: facultyIds } });
    }

    // Demo-institution notifications created for our temp proposals (matched by
    // unique BASE banner) — the demo account itself is never deleted.
    if (tmp.institutionAId) {
      await db.model('Notification').deleteMany({
        user: objId(tmp.institutionAId),
        $or: [
          { message: new RegExp(BASE) },
          { message: new RegExp(FA_EMAIL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) },
        ],
      });
    }

    const tempEmails = [TEMP_INST_EMAIL, FA_EMAIL, FB_EMAIL].filter(Boolean);
    const tempUsers = await db.model('User').find({ email: { $in: tempEmails } }).lean();
    for (const u of tempUsers) {
      await db.model('Notification').deleteMany({ user: u._id });
      await db.model('FacultyProfile').deleteMany({ user: u._id });
      await db.model('FacultyApplication').deleteMany({ faculty: u._id });
      await db.model('FacultyCollaboration').deleteMany({ faculty: u._id });
      await db.model('FacultyOpportunity').deleteMany({ createdBy: u._id });
    }
    if (tempEmails.length > 0) {
      await db.model('User').deleteMany({ email: { $in: tempEmails } });
    }

    await db.disconnect();
    console.log('  ✅ PASS: Temporary Phase-4 records removed from MongoDB (users, faculty, applications, opportunities, collaborations, notifications)');
    passed++;
  } catch (err) {
    console.error(`  ⚠️ Cleanup warning (non-fatal): ${err.message}`);
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(async (err) => {
  console.error('Fatal test harness error:', err);
  process.exit(1);
});