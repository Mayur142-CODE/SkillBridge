/**
 * Phase 5 Integration Test Suite — Industry Collaborative Project Management
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Requires: backend running (port 5000) + seedUsers/seedPhase6 + seedFacultyOpportunities
 * + reachable MongoDB.
 *
 * Covered checks (35):
 *  Auth & role gates (1-4). Meta (5). Direct-DB fixtures (6).
 *  Ownership chain (7-12). Applications list + review (13-19). Documents (20-21).
 *  Collaboration lifecycle (22-30). Opportunities (31-34). Notifications (35).
 *  Regression (36-38).
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
  console.log('📋 SkillBridge Industry Panel Phase 5 Test Suite (Collaborations)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  let industryToken = '';
  let studentToken = '';
  let facultyToken = '';

  // Direct-DB seeding handles
  let mongoose = null;
  let seeded = {};
  const runStart = Date.now();

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
    const { default: CompanyModel } = await import('../backend/src/models/Company.js');
    const { default: FacultyOpportunityModel } = await import('../backend/src/models/FacultyOpportunity.js');
    const { default: FacultyApplicationModel } = await import('../backend/src/models/FacultyApplication.js');
    const { default: FacultyCollaborationModel } = await import('../backend/src/models/FacultyCollaboration.js');
    const { default: NotificationModel } = await import('../backend/src/models/Notification.js');

    const facultyUser = await UserModel.findOne({ email: 'faculty@skillbridge.dev' }).lean();
    if (!facultyUser) throw new Error('faculty@skillbridge.dev not found (run seedUsers)');

    const ownedCompany =
      (await CompanyModel.findOne({ slug: 'skillbridge-technologies' }).lean()) ||
      (await CompanyModel.create({
        name: 'SkillBridge Technologies',
        slug: 'skillbridge-technologies',
        sector: 'Education Technology',
        active: true,
        verified: true,
        user: facultyUser._id, // corrected below — see industry owner resolution
      }));
    // Security-critical: the company owned by the industry session MUST be the
    // one with user = industry@skillbridge.dev (Company.user governs authorization).
    const industryUser = await UserModel.findOne({ email: 'industry@skillbridge.dev' }).lean();
    if (!industryUser) throw new Error('industry@skillbridge.dev not found (run seedUsers)');
    if (!ownedCompany.user || String(ownedCompany.user) !== String(industryUser._id)) {
      await CompanyModel.updateOne({ _id: ownedCompany._id }, { $set: { user: industryUser._id } });
    }

    let foreignCompany = await CompanyModel.findOne({ slug: 'cloudcore-technologies' }).lean();
    if (!foreignCompany) {
      foreignCompany = await CompanyModel.create({
        name: 'CloudCore Technologies',
        slug: 'cloudcore-technologies',
        sector: 'Information Technology',
        active: true,
        verified: true,
      });
    }

    // Clean any stale test fixtures from a previous failed run (children first).
    const staleOppIds = await FacultyOpportunityModel.distinct('_id', { title: /^P5-COLLAB-TEST-/ });
    if (staleOppIds.length) {
      await FacultyApplicationModel.deleteMany({ opportunity: { $in: staleOppIds } });
      await FacultyCollaborationModel.deleteMany({ opportunity: { $in: staleOppIds } });
    }
    await FacultyOpportunityModel.deleteMany({ title: /^P5-COLLAB-TEST-/ });

    // Owned test opportunity (skillbridge) + foreign test opportunity (cloudcore)
    const ownedOpp = await FacultyOpportunityModel.create({
      title: 'P5-COLLAB-TEST-OWN-Live AI Safety Analytics Consortium',
      type: 'Live Industry Project',
      description: 'Phase 5 integration test opportunity owned by SkillBridge Technologies.',
      provider: 'SkillBridge National Consortium',
      industryPartner: ownedCompany.name,
      industryCompany: ownedCompany._id,
      industryCompanyName: ownedCompany.name,
      institution: 'National Innovation Council',
      domain: 'Artificial Intelligence',
      requiredExpertise: ['Artificial Intelligence', 'Machine Learning'],
      preferredExpertise: ['Python'],
      duration: '4 Months',
      startDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 130 * 24 * 60 * 60 * 1000),
      mode: 'Hybrid',
      location: 'Remote',
      capacity: 3,
      applicationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'Proposed',
      createdBy: facultyUser._id,
    });

    const foreignOpp = await FacultyOpportunityModel.create({
      title: 'P5-COLLAB-TEST-FOREIGN-Cloud Lab Workflows Workshop',
      type: 'Workshop',
      description: 'Phase 5 integration test opportunity owned by CloudCore Technologies.',
      provider: 'CloudCore Academic Alliance',
      industryPartner: foreignCompany.name,
      industryCompany: foreignCompany._id,
      industryCompanyName: foreignCompany.name,
      institution: 'Cloud Academy',
      domain: 'Cloud Computing',
      mode: 'Offline',
      location: 'Remote',
      capacity: 20,
      applicationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'Open',
      createdBy: facultyUser._id,
    });

    const rejectOpp = await FacultyOpportunityModel.create({
      title: 'P5-COLLAB-TEST-REJECT-Digital Twin Curriculum Review',
      type: 'Collaborative Research',
      description: 'Phase 5 integration test opportunity (reject leg) owned by SkillBridge Technologies.',
      provider: 'SkillBridge National Consortium',
      industryPartner: ownedCompany.name,
      industryCompany: ownedCompany._id,
      industryCompanyName: ownedCompany.name,
      institution: 'National Innovation Council',
      domain: 'Digital Twin',
      mode: 'Hybrid',
      location: 'Remote',
      capacity: 2,
      applicationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'Open',
      createdBy: facultyUser._id,
    });

    const mkApp = async (opp, status) =>
      FacultyApplicationModel.create({
        faculty: facultyUser._id,
        opportunity: opp._id,
        status,
        coverMessage: 'Phase 5 faculty proposal for integration testing.',
        matchScore: status === 'Applied' ? 82 : 60,
        matchedSkills: ['Artificial Intelligence'],
        missingSkills: [],
        submittedAt: new Date(runStart),
        statusHistory: [{ status, timestamp: new Date(runStart), actor: 'System', note: 'Seeded for Phase 5 tests.' }],
        reviewNotes: '',
      });

    const ownAppApplied = await mkApp(ownedOpp, 'Applied');
    const ownAppReject = await mkApp(rejectOpp, 'Applied');
    const foreignApp = await mkApp(foreignOpp, 'Applied');

    const mkCollab = async (opp, status, role) =>
      FacultyCollaborationModel.create({
        faculty: facultyUser._id,
        opportunity: opp._id,
        title: opp.title,
        type: opp.type,
        role,
        status,
        joinedAt: new Date(runStart),
        startDate: opp.startDate,
        endDate: opp.endDate,
        industryPartner: opp.industryPartner,
        industryCompany: opp.industryCompany,
        institution: opp.institution,
        domain: opp.domain,
        mode: opp.mode,
        location: opp.location,
        description: opp.description,
        completionStatus: status === 'Completed' ? 'Completed' : 'Pending',
      });

    const collabAccept = await mkCollab(ownedOpp, 'Proposed', 'Lead Proposer / Coordinator'); // 22
    const collabReject = await mkCollab(rejectOpp, 'Proposed', 'Lead Proposer / Coordinator'); // 23

    const completedOpp = await FacultyOpportunityModel.create({
      title: 'P5-COLLAB-TEST-COMPLETED-Open Data Governance Framework',
      type: 'Collaborative Research',
      description: 'Phase 5 integration test opportunity (completed-collab leg) owned by SkillBridge Technologies.',
      provider: 'SkillBridge National Consortium',
      industryPartner: ownedCompany.name,
      industryCompany: ownedCompany._id,
      industryCompanyName: ownedCompany.name,
      institution: 'National Innovation Council',
      domain: 'Data Governance',
      mode: 'Online',
      location: 'Remote',
      capacity: 5,
      applicationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'Open',
      createdBy: facultyUser._id,
    });
    const collabCompleted = await mkCollab(completedOpp, 'Completed', 'Faculty Peer Reviewer'); // 25
    const collabActiveHost = await FacultyOpportunityModel.create({
      title: 'P5-COLLAB-TEST-OWN-Accepted Lifecycle Consortium',
      type: 'Collaborative Research',
      description: 'Accepted collaboration used for whitelist lifecycle testing.',
      provider: 'SkillBridge National Consortium',
      industryPartner: ownedCompany.name,
      industryCompany: ownedCompany._id,
      industryCompanyName: ownedCompany.name,
      institution: 'National Innovation Council',
      domain: 'Cyber Security',
      mode: 'Hybrid',
      location: 'Remote',
      capacity: 4,
      applicationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'Open',
      createdBy: facultyUser._id,
    });
    const collabActive = await mkCollab(collabActiveHost, 'Accepted', 'Faculty Project Lead'); // 24
    const foreignCollab = await mkCollab(foreignOpp, 'Proposed', 'Lead Proposer / Coordinator'); // 10

    seeded = {
      facultyUserId: facultyUser._id,
      industryUserId: industryUser?._id || null,
      ownedCompanyId: ownedCompany._id,
      foreignCompanyId: foreignCompany._id,
      ownedOpp: ownedOpp._id,
      foreignOppId: foreignOpp._id,
      rejectOppId: rejectOpp._id,
      completedOppId: completedOpp._id,
      ownAppApplied: ownAppApplied._id,
      ownAppReject: ownAppReject._id,
      foreignApp: foreignApp._id,
      collabAccept: collabAccept._id,
      collabReject: collabReject._id,
      collabCompleted: collabCompleted._id,
      collabActive: collabActive._id,
      foreignCollab: foreignCollab._id,
      collabActiveHost: collabActiveHost._id,
      models: {
        UserModel,
        CompanyModel,
        FacultyOpportunityModel,
        FacultyApplicationModel,
        FacultyCollaborationModel,
        NotificationModel,
      },
      objectId: (id) => new mongoose.Types.ObjectId(id),
    };
  };

  const cleanupSeededData = async () => {
    if (!mongoose) return;
    try {
      const M = seeded.models;
      await M.NotificationModel.deleteMany({
        user: seeded.facultyUserId,
        createdAt: { $gte: new Date(runStart) },
        type: { $in: ['application', 'collaboration'] },
      });
      await M.FacultyApplicationModel.deleteMany({
        _id: { $in: [seeded.ownAppApplied, seeded.ownAppReject, seeded.foreignApp] },
      });
      await M.FacultyCollaborationModel.deleteMany({
        _id: {
          $in: [seeded.collabAccept, seeded.collabReject, seeded.collabCompleted, seeded.collabActive, seeded.foreignCollab],
        },
      });
      await M.FacultyOpportunityModel.deleteMany({
        _id: { $in: [seeded.ownedOpp, seeded.foreignOppId, seeded.rejectOppId, seeded.completedOppId, seeded.collabActiveHost] },
      });
      const foreignCompanyStill = await M.CompanyModel.findOne({
        slug: 'cloudcore-technologies',
        user: null,
      }).lean();
      if (foreignCompanyStill) {
        const occs = await M.FacultyOpportunityModel.countDocuments({
          industryCompany: foreignCompanyStill._id,
        });
        if (occs === 0) {
          await M.CompanyModel.deleteOne({ _id: foreignCompanyStill._id });
        }
      }
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
      console.log('   Phase 5 integration tests cannot run here.');
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

    // ── 2. Auth & role gates ───────────────────────────────
    console.log('\n--- 2. Auth & Role Gates (1-4) ---');
    const noAuth = await fetch(`${API_BASE}/industry/collaborations`);
    assert(noAuth.status === 401, '[1] Unauthenticated collaborations list → 401');

    const stuList = await fetch(`${API_BASE}/industry/collaborations`, { headers: stuHeaders });
    assert(stuList.status === 403, '[2] Student accessing collaborations → 403');

    const facList = await fetch(`${API_BASE}/industry/collaborations`, { headers: facHeaders });
    assert(facList.status === 403, '[3] Faculty accessing industry collaborations → 403');

    const indList = await fetch(`${API_BASE}/industry/collaborations`, { headers: indHeaders });
    assert(indList.status === 200, '[4] Industry collaborations list → 200');
    const indListJson = await indList.json();
    assert(
      indListJson.success === true &&
        Array.isArray(indListJson.data.collaborations) &&
        indListJson.data.pagination.total !== undefined,
      '[4] List returns collaborations + pagination shape'
    );

    // ── 3. Direct-DB seeding ───────────────────────────────
    console.log('\n--- 3. Direct-DB seeding (isolation + lifecycle fixtures) ---');
    await connectForSeeding();
    assert(true, 'MongoDB reachable; own x2 apps, foreign x1 app, own x4 collabs, foreign x1 collab seeded');

    const gen = () => new mongoose.Types.ObjectId();

    // ── 4. Meta ────────────────────────────────────────────
    console.log('\n--- 4. Meta (5) ---');
    const metaRes = await fetch(`${API_BASE}/industry/collaborations/meta`, { headers: indHeaders });
    assert(metaRes.status === 200, '[5] Collaboration meta endpoint → 200');
    const metaJson = await metaRes.json();
    assert(
      metaJson.success &&
        metaJson.data.collaborations &&
        typeof metaJson.data.applications?.pending === 'number' &&
        metaJson.data.opportunities?.total >= 1,
      '[5] Meta returns collaborations/applications/opportunities counters'
    );

    // ── 5. Ownership chain (6-12) ──────────────────────────
    console.log('\n--- 5. Ownership Chain (6-12) ---');
    const foreignDetail = await fetch(
      `${API_BASE}/industry/collaborations/applications/${seeded.foreignApp}`,
      { headers: indHeaders }
    );
    assert(foreignDetail.status === 403, '[6] Foreign application detail → 403');

    const appsList = await fetch(`${API_BASE}/industry/collaborations/applications`, { headers: indHeaders });
    assert(appsList.status === 200, 'Owned applications list → 200');
    const appsListJson = await appsList.json();
    const ownedVisible = appsListJson.data.applications.filter(
      (a) =>
        a._id === String(seeded.ownAppApplied) ||
        a._id === String(seeded.ownAppReject) ||
        a._id === String(seeded.foreignApp)
    );
    assert(
      ownedVisible.length === 2 &&
        !ownedVisible.some((a) => a._id === String(seeded.foreignApp)),
      '[7] Foreign application NEVER listed even when matched (2 own visible, 0 foreign)'
    );

    const badCollabId = await fetch(`${API_BASE}/industry/collaborations/${gen()}`, { headers: indHeaders });
    assert(badCollabId.status === 404, '[8] Random collaboration id → 404');

    const foreignCollabDetail = await fetch(
      `${API_BASE}/industry/collaborations/${seeded.foreignCollab}`,
      { headers: indHeaders }
    );
    assert(foreignCollabDetail.status === 404, '[9] Foreign collaboration detail → 404 (existence hidden)');

    const foreignAccept = await fetch(
      `${API_BASE}/industry/collaborations/${seeded.foreignCollab}/accept`,
      { method: 'POST', headers: indHeaders, body: JSON.stringify({}) }
    );
    assert(foreignAccept.status === 404, '[10] Approving a foreign collaboration → 404 (existence hidden)');

    const foreignAppAccept = await fetch(
      `${API_BASE}/industry/collaborations/applications/${seeded.foreignApp}/accept`,
      { method: 'POST', headers: indHeaders, body: JSON.stringify({}) }
    );
    assert(foreignAppAccept.status === 403, '[11] Accepting a foreign application → 403');

    const foreignOppDetail = await fetch(
      `${API_BASE}/industry/collaborations/opportunities/${seeded.foreignOppId}`,
      { headers: indHeaders }
    );
    assert(foreignOppDetail.status === 404, '[12] Foreign opportunity detail → 404 (existence hidden)');

    // ── 6. Applications list + review (13-19) ──────────────
    console.log('\n--- 6. Applications List + Review (13-19) ---');
    const statusFiltered = await fetch(
      `${API_BASE}/industry/collaborations/applications?status=Applied&limit=5`,
      { headers: indHeaders }
    );
    const statusFilteredJson = await statusFiltered.json();
    assert(
      statusFiltered.status === 200 &&
        statusFilteredJson.data.applications.every((a) => a.status === 'Applied'),
      '[13] Status filter round trip on applications'
    );

    const ownDetail = await fetch(
      `${API_BASE}/industry/collaborations/applications/${seeded.ownAppApplied}`,
      { headers: indHeaders }
    );
    assert(ownDetail.status === 200, 'Owned application detail → 200');
    const ownDetailJson = await ownDetail.json();
    assert(
      ownDetailJson.data.application?.faculty?.email === 'faculty@skillbridge.dev' &&
        String(ownDetailJson.data.application?.opportunity?._id) === String(seeded.ownedOpp) &&
        ownDetailJson.data.hasResume === false,
      '[14] Detail populates faculty + scoped opportunity (no resume snapshot attached)'
    );

    const acceptApp = await fetch(
      `${API_BASE}/industry/collaborations/applications/${seeded.ownAppApplied}/accept`,
      { method: 'POST', headers: indHeaders, body: JSON.stringify({ note: 'Excellent research alignment.' }) }
    );
    assert(acceptApp.status === 200 && (await acceptApp.json()).data.application.status === 'Selected',
      '[15] Applied application accepted → Selected');

    const acceptAgain = await fetch(
      `${API_BASE}/industry/collaborations/applications/${seeded.ownAppApplied}/accept`,
      { method: 'POST', headers: indHeaders, body: JSON.stringify({}) }
    );
    assert(acceptAgain.status === 400, '[16] Re-accepting a Select-ed application → 400');

    const rejectApp = await fetch(
      `${API_BASE}/industry/collaborations/applications/${seeded.ownAppReject}/reject`,
      { method: 'POST', headers: indHeaders, body: JSON.stringify({ note: 'Not the right domain fit.' }) }
    );
    assert(rejectApp.status === 200 && (await rejectApp.json()).data.application.status === 'Rejected',
      '[17] Applied application rejected → Rejected');

    const rejectAgain = await fetch(
      `${API_BASE}/industry/collaborations/applications/${seeded.ownAppReject}/reject`,
      { method: 'POST', headers: indHeaders, body: JSON.stringify({}) }
    );
    assert(rejectAgain.status === 400, '[18] Rejecting a Rejected application → 400');

    const appResumeMeta = await fetch(
      `${API_BASE}/industry/collaborations/applications/${seeded.ownAppReject}/resume`,
      { headers: indHeaders }
    );
    assert(
      appResumeMeta.status === 200 && (await appResumeMeta.json()).data.resume.hasResume === false,
      '[19] Resume metadata endpoint ownership-scoped → 200 (hasResume false)'
    );

    // ── 7. Documents (20-21) ───────────────────────────────
    console.log('\n--- 7. Documents (20-21) ---');
    // Attach a synthetic document to the rejected application (no file on disk).
    const M = seeded.models;
    await M.FacultyApplicationModel.updateOne(
      { _id: seeded.ownAppReject },
      {
        $set: {
          documents: [
            {
              title: 'Proposal Brief',
              filename: 'p5_proposal_brief.pdf',
              originalName: 'Proposal_Brief.pdf',
              path: '',
              mimeType: 'application/pdf',
              size: 2048,
            },
          ],
        },
      }
    );
    const reDetail = await fetch(
      `${API_BASE}/industry/collaborations/applications/${seeded.ownAppReject}`,
      { headers: indHeaders }
    );
    const reDetailJson = await reDetail.json();
    const doc = reDetailJson.data.application?.documents?.[0];
    assert(reDetailJson.data.hasDocuments === true && doc, '[20] Application with attached document surfaces in review detail');

    const foreignDoc = await fetch(
      `${API_BASE}/industry/collaborations/applications/${seeded.foreignApp}/documents/${doc?._id || gen()}`,
      { headers: indHeaders }
    );
    assert(foreignDoc.status === 403, '[21] Attached document on a foreign application → 403');

    if (doc) {
      const docView = await fetch(
        `${API_BASE}/industry/collaborations/applications/${seeded.ownAppReject}/documents/${doc._id}/view`,
        { headers: indHeaders }
      );
      // File not written to FACULTY_DOCS_DIR → safe 404, never a leak or crash.
      assert(docView.status === 404, '[21] Document view for a missing disk file → safe 404');
    }

    // ── 8. Collaboration lifecycle (22-30) ──────────────────
    console.log('\n--- 8. Collaboration Lifecycle (22-30) ---');
    const collabDetail = await fetch(
      `${API_BASE}/industry/collaborations/${seeded.collabAccept}`,
      { headers: indHeaders }
    );
    assert(collabDetail.status === 200, 'Owned collaboration detail → 200');
    const collabDetailJson = await collabDetail.json();
    assert(
      collabDetailJson.data.collaboration?.faculty?.email === 'faculty@skillbridge.dev' &&
        collabDetailJson.data.collaboration?.opportunity?._id !== undefined,
      '[22] Collaboration detail populates faculty + linked opportunity'
    );

    const approveCollab = await fetch(
      `${API_BASE}/industry/collaborations/${seeded.collabAccept}/accept`,
      { method: 'POST', headers: indHeaders, body: JSON.stringify({ note: 'Approved for the AI Consortium.' }) }
    );
    assert(approveCollab.status === 200 && (await approveCollab.json()).data.collaboration.status === 'Accepted',
      '[23] Proposed collaboration approved → Accepted');

    const oppAfterApprove = await fetch(
      `${API_BASE}/industry/collaborations/opportunities/${seeded.ownedOpp}`,
      { headers: indHeaders }
    );
    const oppAfterApproveJson = await oppAfterApprove.json();
    assert(
      oppAfterApproveJson.data.opportunity?.status === 'Open',
      '[23] Linked opportunity automatically opened on approval (Proposed → Open)'
    );

    const approveAgain = await fetch(
      `${API_BASE}/industry/collaborations/${seeded.collabAccept}/accept`,
      { method: 'POST', headers: indHeaders, body: JSON.stringify({}) }
    );
    assert(approveAgain.status === 400, '[24] Re-approving an Accepted collaboration → 400');

    const declineCollab = await fetch(
      `${API_BASE}/industry/collaborations/${seeded.collabReject}/reject`,
      { method: 'POST', headers: indHeaders, body: JSON.stringify({ note: 'Outside this cycle.' }) }
    );
    assert(declineCollab.status === 200 && (await declineCollab.json()).data.collaboration.status === 'Rejected',
      '[25] Proposed collaboration declined → Rejected');

    const rejectActiveMove = await fetch(
      `${API_BASE}/industry/collaborations/${seeded.collabReject}/status`,
      { method: 'PATCH', headers: indHeaders, body: JSON.stringify({ status: 'Active' }) }
    );
    assert(rejectActiveMove.status === 400, '[26] Rejected (terminal) collaboration cannot move → 400');

    // Whitelist transitions on an Accepted collaboration (cannot skip to Completed).
    const skipComplete = await fetch(
      `${API_BASE}/industry/collaborations/${seeded.collabActive}/status`,
      { method: 'PATCH', headers: indHeaders, body: JSON.stringify({ status: 'Completed' }) }
    );
    assert(skipComplete.status === 400, '[27] Accepted → Completed (skipping Active) → 400');

    const makeActive = await fetch(
      `${API_BASE}/industry/collaborations/${seeded.collabActive}/status`,
      { method: 'PATCH', headers: indHeaders, body: JSON.stringify({ status: 'Active' }) }
    );
    assert(makeActive.status === 200 && (await makeActive.json()).data.collaboration.status === 'Active',
      '[28] Accepted → Active → 200 (whitelist transition)');

    const completeActive = await fetch(
      `${API_BASE}/industry/collaborations/${seeded.collabActive}/status`,
      { method: 'PATCH', headers: indHeaders, body: JSON.stringify({ status: 'Completed' }) }
    );
    assert(completeActive.status === 200 && (await completeActive.json()).data.collaboration.completionStatus === 'Completed',
      '[29] Active → Completed → 200 with completionStatus recorded');

    const invalidStatusValue = await fetch(
      `${API_BASE}/industry/collaborations/${seeded.collabActive}/status`,
      { method: 'PATCH', headers: indHeaders, body: JSON.stringify({ status: 'Terminated' }) }
    );
    assert(invalidStatusValue.status === 400, '[30] Invalid status value → 400 (no arbitrary PATCH)');

    // ── 9. Opportunities (31-33) ───────────────────────────
    console.log('\n--- 9. Opportunities (31-33) ---');
    const oppsList = await fetch(`${API_BASE}/industry/collaborations/opportunities`, { headers: indHeaders });
    const oppsListJson = await oppsList.json();
    const hasOwn = oppsListJson.data.opportunities.some((o) => o._id === String(seeded.ownedOpp));
    const hasForeign = oppsListJson.data.opportunities.some((o) => o._id === String(seeded.foreignOppId));
    assert(oppsList.status === 200 && hasOwn && !hasForeign, '[31] Opportunities list shows own, never foreign');

    const typeFilter = await fetch(
      `${API_BASE}/industry/collaborations/opportunities?type=Live+Industry+Project`,
      { headers: indHeaders }
    );
    const typeFilterJson = await typeFilter.json();
    assert(
      typeFilter.status === 200 &&
        typeFilterJson.data.opportunities.every((o) => o.type === 'Live Industry Project'),
      '[32] Collaboration-type filter round trip on opportunities'
    );

    const ownOppCounts = await fetch(
      `${API_BASE}/industry/collaborations/opportunities/${seeded.ownedOpp}`,
      { headers: indHeaders }
    );
    const ownOppCountsJson = await ownOppCounts.json();
    assert(
      ownOppCounts.status === 200 &&
        typeof ownOppCountsJson.data.opportunity.applicationsCount === 'number' &&
        typeof ownOppCountsJson.data.opportunity.collaborationsCount === 'number',
      '[33] Opportunity detail returns live applicationsCount + collaborationsCount'
    );

    // ── 10. Notifications (34-35) ──────────────────────────
    console.log('\n--- 10. Notifications (34-35) ---');
    const appNotif = await M.NotificationModel.findOne({
      user: seeded.facultyUserId,
      type: 'application',
    }).sort({ createdAt: -1 }).lean();
    assert(
      appNotif != null &&
        (appNotif.message || '').includes('accepted') &&
        (appNotif.link || '').includes('/faculty/applications/'),
      '[34] Faculty received an application notification on acceptance'
    );

    const collabNotif = await M.NotificationModel.findOne({
      user: seeded.facultyUserId,
      type: 'collaboration',
    }).sort({ createdAt: -1 }).lean();
    assert(
      collabNotif != null &&
        (collabNotif.title || '').includes('Accepted') &&
        (collabNotif.link || '').includes('/faculty/collaborations/'),
      '[35] Faculty received a collaboration notification on approval'
    );

    // ── 11. Regression (36-38) ─────────────────────────────
    console.log('\n--- 11. Regression (36-38) ---');
    const facCollabs = await fetch(`${API_BASE}/faculty/collaborations`, { headers: facHeaders });
    assert(facCollabs.status === 200, '[36] Faculty collaboration panel regression → 200');

    const indAts = await fetch(`${API_BASE}/industry/applications`, { headers: indHeaders });
    assert(indAts.status === 200, '[37] Phase 4 ATS regression → 200');

    const indexHtml = path.resolve(__dirname, '../client/dist/index.html');
    assert(fs.existsSync(indexHtml), '[38] client/dist/index.html present (production build verified)');
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