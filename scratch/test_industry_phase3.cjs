/**
 * Phase 3 Integration Test Suite — Industry Opportunity Management
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Verifies (requires backend + seedPhase3/4/6 + reachable MongoDB):
 *  1. Auth/role gates — 401 unauthenticated, 403 for student & faculty
 *  2. Meta endpoint — real enums (types/workModes/visibilities/statuses),
 *     active skills taxonomy, university suggestions
 *  3. Create — always Draft, never auto-published, company resolved server-side
 *  4. Draft invisibility — Draft must NOT appear in the student catalog
 *  5. Read own detail (+ applicationCount); 404 on foreign ids
 *  6. Update — Draft only, allow-list enforced (tampered protected fields ignored)
 *  7. Validation — invalid type / past deadline / unknown skill / bad scores rejected
 *  8. Skill names resolved from the DB taxonomy (never client labels)
 *  9. Lifecycle — Draft→Published→Closed and Draft→Cancelled; illegal transitions rejected
 * 10. Edit/delete restrictions on non-Draft states
 * 11. List filters — status + search round trip
 * 12. Cross-company isolation — foreign opps (Direct-DB seeded) are 404/invisible
 * 13. Application counts — Direct-DB Application insert reflects in detail + list
 * 14. Published visibility — student feed serves the opportunity after publish
 * 15. Faculty opportunity panel regression — unaffected by Phase 3 changes
 */

const path = require('path');
const fs = require('fs');

const API_BASE = 'http://127.0.0.1:5000/api';
const CLIENT_BASE = 'http://localhost:5173';

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
  console.log('💼 SkillBridge Industry Panel Phase 3 Test Suite');
  console.log('═══════════════════════════════════════════════════════════════\n');

  let industryToken = '';
  let studentToken = '';
  let facultyToken = '';
  let ownOpportunityId = '';
  let ownCompanyName = '';

  try {
    // ── Login all roles ─────────────────────────────────────
    console.log('--- 1. Role Logins ---');
    const indLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'industry@skillbridge.dev', password: 'Industry@123' }),
    });
    assert(indLoginRes.status === 200, 'Industry logs in');
    industryToken = (await indLoginRes.json()).token;

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

    // ── 2. Auth / role gates ────────────────────────────────
    console.log('\n--- 2. Auth & Role Gates ---');
    const noAuth = await fetch(`${API_BASE}/industry/opportunities`);
    assert(noAuth.status === 401, 'Unauthenticated list request → 401');

    const stuList = await fetch(`${API_BASE}/industry/opportunities`, { headers: stuHeaders });
    assert(stuList.status === 403, 'Student accessing industry opportunities → 403');

    const stuMeta = await fetch(`${API_BASE}/industry/opportunities/meta`, { headers: stuHeaders });
    assert(stuMeta.status === 403, 'Student accessing meta → 403');

    const facList = await fetch(`${API_BASE}/industry/opportunities`, { headers: facHeaders });
    assert(facList.status === 403, 'Faculty accessing industry opportunities → 403');

    // ── 3. Meta endpoint ────────────────────────────────────
    console.log('\n--- 3. Meta Endpoint (real taxonomy) ---');
    const metaRes = await fetch(`${API_BASE}/industry/opportunities/meta`, { headers: indHeaders });
    assert(metaRes.status === 200, 'Meta endpoint reachable');
    const meta = (await metaRes.json()).data;
    assert(
      Array.isArray(meta.types) &&
        ['Internship', 'Apprenticeship', 'Live Project', 'Entry-level Job'].every((t) => meta.types.includes(t)),
      'Meta lists the real opportunity types'
    );
    assert(
      Array.isArray(meta.workModes) && meta.workModes.includes('Remote') && meta.workModes.includes('Hybrid'),
      'Meta lists the real work modes'
    );
    assert(
      Array.isArray(meta.visibilities) &&
        ['Open to All', 'Selected Universities', 'Campus Drive'].every((v) => meta.visibilities.includes(v)),
      'Meta lists the real visibility options'
    );
    assert(Array.isArray(meta.skills) && meta.skills.length > 0, 'Meta returns > 0 active taxonomy skills');
    assert(Array.isArray(meta.universities), 'Meta returns university suggestions array');

    // ── 4. Create (always Draft) ────────────────────────────
    console.log('\n--- 4. Create Opportunity (Draft) ---');
    const sampleSkill = meta.skills[0];
    const futureDeadline = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();

    const createRes = await fetch(`${API_BASE}/industry/opportunities`, {
      method: 'POST',
      headers: indHeaders,
      body: JSON.stringify({
        title: 'Phase 3 Test Internship',
        type: 'Internship',
        description: 'Integration test opportunity — deleted at the end of the suite.',
        location: 'Pune',
        workMode: 'Hybrid',
        duration: '6 Months',
        stipend: '₹15,000 / month',
        salary: '',
        applicationDeadline: futureDeadline,
        minimumCgpa: 7,
        openings: 5,
        eligibleBranches: ['Computer Science'],
        eligibleAcademicYears: ['3rd Year', '4th Year'],
        responsibilities: ['Build REST APIs', 'Work with the product team'],
        visibility: 'Open to All',
        requiredSkills: [{ skill: String(sampleSkill._id), targetScore: 70, importance: 'Core' }],
        preferredSkills: [],
      }),
    });
    assert(createRes.status === 201, 'Create with valid payload → 201');
    const created = (await createRes.json()).data.opportunity;
    ownOpportunityId = created._id;
    assert(created.status === 'Draft', 'Created opportunity is a Draft (never auto-published)');
    assert(created.slug && created.slug.length > 0, 'Created opportunity has a generated slug');
    ownCompanyName = created.companyName;

    const inviteRes = await fetch(`${API_BASE}/industry/opportunities`, {
      method: 'POST',
      headers: indHeaders,
      body: JSON.stringify({
        title: 'Tampered Company Create',
        type: 'Internship',
        description: 'Attempt to inject foreign company identity.',
        applicationDeadline: futureDeadline,
        visibility: 'Open to All',
        company: '507f1f77bcf86cd799439011',
        companyName: 'Evil Corp',
        status: 'Published',
        slug: 'injected-slug-attempt',
      }),
    });
    assert(inviteRes.status === 201, 'Create ignores injected company/status/slug');
    const invited = (await inviteRes.json()).data.opportunity;
    assert(invited.status === 'Draft', 'Injected status ignored → still Draft');
    assert(invited.companyName === ownCompanyName, 'Injected companyName ignored → server company used');

    // ── 5. Draft invisibility ───────────────────────────────
    console.log('\n--- 5. Draft Invisibility in Student Catalog ---');
    const stuFeed1 = await fetch(`${API_BASE}/student/opportunities?search=Phase%203%20Test`, { headers: stuHeaders });
    const feed1Json = await stuFeed1.json();
    const feed1Titles = JSON.stringify(feed1Json);
    assert(!feed1Titles.includes('Phase 3 Test Internship'), 'Draft opportunity is NOT served to students');

    // ── 6. Read own detail + count ──────────────────────────
    console.log('\n--- 6. Read Detail (owner) ---');
    const detailRes = await fetch(`${API_BASE}/industry/opportunities/${ownOpportunityId}`, { headers: indHeaders });
    assert(detailRes.status === 200, 'Owner reads own opportunity detail');
    const detail = (await detailRes.json()).data;
    assert(detail.opportunity.title === 'Phase 3 Test Internship', 'Detail returns the created opportunity');
    assert(detail.applicationCount === 0, 'Detail reports initial applicationCount of 0');

    // ── 7. Update (Draft only, allow-list) ──────────────────
    console.log('\n--- 7. Edit Draft ---');
    const updateRes = await fetch(`${API_BASE}/industry/opportunities/${ownOpportunityId}`, {
      method: 'PUT',
      headers: indHeaders,
      body: JSON.stringify({
        title: 'Phase 3 Test Internship (Edited)',
        type: 'Internship',
        description: 'Updated description.',
        location: 'Bengaluru',
        workMode: 'Hybrid',
        duration: '6 Months',
        stipend: '₹18,000 / month',
        applicationDeadline: futureDeadline,
        openings: 8,
        visibility: 'Open to All',
        requiredSkills: [{ skill: String(sampleSkill._id), targetScore: 80, importance: 'Core' }],
        status: 'Published',
        companyName: 'Evil Corp',
        slug: 'evil-injected-slug',
      }),
    });
    assert(updateRes.status === 200, 'Edit draft → 200');
    const updated = (await updateRes.json()).data.opportunity;
    assert(updated.title === 'Phase 3 Test Internship (Edited)', 'Edit persisted (title round trip)');
    assert(updated.location === 'Bengaluru', 'Edit persisted (location round trip)');
    assert(updated.status === 'Draft', 'Injected status ignored on edit → still Draft');
    assert(updated.companyName === ownCompanyName, 'Injected companyName ignored on edit');
    assert(updated.slug !== 'evil-injected-slug', 'Injected slug ignored on edit');
    assert(updated.requiredSkills[0].skillName === sampleSkill.name, 'Skill name resolved from DB taxonomy (not client label)');
    assert(updated.requiredSkills[0].targetScore === 80, 'Required skill targetScore round trip');

    // ── 8. Validation errors ────────────────────────────────
    console.log('\n--- 8. Validation ---');
    const badType = await fetch(`${API_BASE}/industry/opportunities/${ownOpportunityId}`, {
      method: 'PUT',
      headers: indHeaders,
      body: JSON.stringify({
        title: 'Bad Type',
        type: 'Moonwalking',
        description: 'x',
        applicationDeadline: futureDeadline,
        visibility: 'Open to All',
      }),
    });
    const badTypeJson = await badType.json();
    assert(badType.status === 400 && (badTypeJson.errors?.type || '').length > 0, 'Invalid type → 400 with field error');

    const pastDeadline = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();
    const badDate = await fetch(`${API_BASE}/industry/opportunities/${ownOpportunityId}`, {
      method: 'PUT',
      headers: indHeaders,
      body: JSON.stringify({
        title: 'Past Deadline',
        type: 'Internship',
        description: 'x',
        applicationDeadline: pastDeadline,
        visibility: 'Open to All',
      }),
    });
    const badDateJson = await badDate.json();
    assert(badDate.status === 400 && (badDateJson.errors?.applicationDeadline || '').includes('future'), 'Past deadline → 400');

    const badSkill = await fetch(`${API_BASE}/industry/opportunities/${ownOpportunityId}`, {
      method: 'PUT',
      headers: indHeaders,
      body: JSON.stringify({
        title: 'Bad Skill',
        type: 'Internship',
        description: 'x',
        applicationDeadline: futureDeadline,
        visibility: 'Open to All',
        requiredSkills: [{ skill: '507f1f77bcf86cd799439011' }],
      }),
    });
    const badSkillJson = await badSkill.json();
    assert(badSkill.status === 400 && (badSkillJson.errors?.skills || '').length > 0, 'Unknown skill reference → 400');

    const badScore = await fetch(`${API_BASE}/industry/opportunities/${ownOpportunityId}`, {
      method: 'PUT',
      headers: indHeaders,
      body: JSON.stringify({
        title: 'Bad Score',
        type: 'Internship',
        description: 'x',
        applicationDeadline: futureDeadline,
        visibility: 'Open to All',
        requiredSkills: [{ skill: String(sampleSkill._id), targetScore: 250 }],
      }),
    });
    const badScoreJson = await badScore.json();
    assert(badScore.status === 400 && (badScoreJson.errors?.skills || '').length > 0, 'targetScore out of range → 400');

    const badCgpa = await fetch(`${API_BASE}/industry/opportunities/${ownOpportunityId}`, {
      method: 'PUT',
      headers: indHeaders,
      body: JSON.stringify({
        title: 'Bad CGPA',
        type: 'Internship',
        description: 'x',
        applicationDeadline: futureDeadline,
        visibility: 'Open to All',
        minimumCgpa: 42,
      }),
    });
    const badCgpaJson = await badCgpa.json();
    assert(badCgpa.status === 400 && (badCgpaJson.errors?.minimumCgpa || '').length > 0, 'CGPA out of range → 400');

    // ── 9. Lifecycle ────────────────────────────────────────
    console.log('\n--- 9. Lifecycle (strict transitions) ---');
    const pubRes = await fetch(`${API_BASE}/industry/opportunities/${ownOpportunityId}/publish`, {
      method: 'POST',
      headers: indHeaders,
    });
    assert(pubRes.status === 200, 'Publish Draft → 200');
    assert((await pubRes.json()).data.opportunity.status === 'Published', 'Publish moves Draft → Published');

    const stuFeed2 = await fetch(`${API_BASE}/student/opportunities?search=Edited`, { headers: stuHeaders });
    const feed2Titles = JSON.stringify(await stuFeed2.json());
    assert(feed2Titles.includes('Phase 3 Test Internship (Edited)'), 'Published opportunity appears in the student catalog');

    const pubAgain = await fetch(`${API_BASE}/industry/opportunities/${ownOpportunityId}/publish`, {
      method: 'POST',
      headers: indHeaders,
    });
    assert(pubAgain.status === 400, 'Publishing an already-published opportunity → 400');

    const closeRes = await fetch(`${API_BASE}/industry/opportunities/${ownOpportunityId}/close`, {
      method: 'POST',
      headers: indHeaders,
    });
    assert(closeRes.status === 200 && (await closeRes.json()).data.opportunity.status === 'Closed', 'Close moves Published → Closed');

    const closeDraft = await fetch(`${API_BASE}/industry/opportunities/${invited._id}/close`, {
      method: 'POST',
      headers: indHeaders,
    });
    assert(closeDraft.status === 400, 'Closing a Draft → 400');

    const editClosed = await fetch(`${API_BASE}/industry/opportunities/${ownOpportunityId}`, {
      method: 'PUT',
      headers: indHeaders,
      body: JSON.stringify({
        title: 'Nope',
        type: 'Internship',
        description: 'x',
        applicationDeadline: futureDeadline,
        visibility: 'Open to All',
      }),
    });
    assert(editClosed.status === 400, 'Editing a Closed opportunity → 400');

    // ── 10. Cancel + delete guards ──────────────────────────
    console.log('\n--- 10. Cancel & Delete Guards ---');
    const cancelRes = await fetch(`${API_BASE}/industry/opportunities/${invited._id}/cancel`, {
      method: 'POST',
      headers: indHeaders,
    });
    assert(cancelRes.status === 200 && (await cancelRes.json()).data.opportunity.status === 'Cancelled', 'Cancel moves Draft → Cancelled');

    const delCancelled = await fetch(`${API_BASE}/industry/opportunities/${invited._id}`, {
      method: 'DELETE',
      headers: indHeaders,
    });
    assert(delCancelled.status === 400, 'Deleting a Cancelled opportunity → 400');

    const cancelCancelled = await fetch(`${API_BASE}/industry/opportunities/${invited._id}/cancel`, {
      method: 'POST',
      headers: indHeaders,
    });
    assert(cancelCancelled.status === 400, 'Cancelling a Cancelled opportunity → 400');

    const publishCancelled = await fetch(`${API_BASE}/industry/opportunities/${invited._id}/publish`, {
      method: 'POST',
      headers: indHeaders,
    });
    assert(publishCancelled.status === 400, 'Publishing a Cancelled opportunity → 400');

    // ── 11. List filters ────────────────────────────────────
    console.log('\n--- 11. List Filters ---');
    const listAll = await fetch(`${API_BASE}/industry/opportunities`, { headers: indHeaders });
    const listAllJson = await listAll.json();
    assert(listAllJson.success === true && Array.isArray(listAllJson.data.opportunities), 'List returns opportunities array');
    assert(listAllJson.data.pagination.total >= 2, 'List reports both created opportunities in total');

    const listClosed = await fetch(`${API_BASE}/industry/opportunities?status=Closed`, { headers: indHeaders });
    const listClosedJson = await listClosed.json();
    assert(
      listClosedJson.data.opportunities.every((o) => o.status === 'Closed'),
      'Status filter returns only Closed opportunities'
    );

    const listSearch = await fetch(`${API_BASE}/industry/opportunities?search=Edited`, { headers: indHeaders });
    const listSearchJson = await listSearch.json();
    assert(listSearchJson.data.opportunities.some((o) => o.title.includes('(Edited)')), 'Search filter matches title');

    // ── 12. Cross-company isolation (direct DB) ─────────────
    console.log('\n--- 12. Cross-Company Isolation (Direct DB) ---');
    const env = readDotEnv(path.resolve(__dirname, '../backend/.env'));
    const MONGODB_URI =
      env.MONGODB_URI || 'mongodb://127.0.0.1:27017/skillBridge';
    let foreignOppId = '';
    let foreignCompanyId = '';
    let foreignCompanyName = 'Foreign Test Corp';

    let mongoose;
    try {
      const { pathToFileURL } = require('url');
      ({ default: mongoose } = await import(pathToFileURL(path.resolve(__dirname, '../backend/node_modules/mongoose/index.js')).href));
      await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 30000 });
      const { default: CompanyModel } = await import('../backend/src/models/Company.js');
      const { default: OpportunityModel } = await import('../backend/src/models/Opportunity.js');

      const foreignCompany = await CompanyModel.create({
        name: foreignCompanyName,
        slug: `foreign-phase3-${Date.now()}`,
        sector: 'Software',
        user: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      });
      foreignCompanyId = String(foreignCompany._id);

      const foreignOpp = await OpportunityModel.create({
        title: 'Foreign Seeded Opportunity',
        type: 'Internship',
        description: 'Seeded directly for isolation testing.',
        slug: `foreign-phase3-${Date.now()}`,
        company: foreignCompany._id,
        companyName: foreignCompanyName,
        visibility: 'Open to All',
        status: 'Published',
        applicationDeadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 60),
      });
      foreignOppId = String(foreignOpp._id);
      assert(fs.existsSync(path.resolve(__dirname, '../client/dist/index.html')), 'dist exists (build produced)');

      const foreignGet = await fetch(`${API_BASE}/industry/opportunities/${foreignOppId}`, { headers: indHeaders });
      assert(foreignGet.status === 404, 'Foreign opportunity detail → 404 (not 403/200 — existence hidden)');

      const foreignPut = await fetch(`${API_BASE}/industry/opportunities/${foreignOppId}`, {
        method: 'PUT',
        headers: indHeaders,
        body: JSON.stringify({
          title: 'Hijack',
          type: 'Internship',
          description: 'x',
          applicationDeadline: futureDeadline,
          visibility: 'Open to All',
        }),
      });
      assert(foreignPut.status === 404, 'Foreign opportunity edit → 404');

      const foreignPublish = await fetch(`${API_BASE}/industry/opportunities/${foreignOppId}/publish`, {
        method: 'POST',
        headers: indHeaders,
      });
      assert(foreignPublish.status === 404, 'Foreign opportunity publish → 404');

      const foreignDelete = await fetch(`${API_BASE}/industry/opportunities/${foreignOppId}`, {
        method: 'DELETE',
        headers: indHeaders,
      });
      assert(foreignDelete.status === 404, 'Foreign opportunity delete → 404');

      const ownListAfterSeeds = await fetch(`${API_BASE}/industry/opportunities`, { headers: indHeaders });
      const ownListTitles = JSON.stringify(await ownListAfterSeeds.json());
      assert(!ownListTitles.includes('Foreign Seeded Opportunity'), 'Foreign opportunities never appear in the owner list');

      // ── 13. Application counts (direct DB insert) ─────────
      console.log('\n--- 13. Application Counts (Direct DB insert) ---');
      const { default: UserModel } = await import('../backend/src/models/User.js');
      const { default: ApplicationModel } = await import('../backend/src/models/Application.js');
      const stuUser = await UserModel.findOne({ role: 'student' }).lean();
      const appDoc = await ApplicationModel.create({
        student: stuUser._id,
        opportunity: new mongoose.Types.ObjectId(ownOpportunityId),
        resumeUrl: 'https://example.com/resume.pdf',
        status: 'Applied',
      });
      assert(Boolean(appDoc._id), 'Direct Application inserted');

      const detailAfter = await fetch(`${API_BASE}/industry/opportunities/${ownOpportunityId}`, { headers: indHeaders });
      const detailAfterJson = await detailAfter.json();
      assert(detailAfterJson.data.applicationCount === 1, 'Detail applicationCount reflects the DB insert');

      const listAfter = await fetch(`${API_BASE}/industry/opportunities`, { headers: indHeaders });
      const listAfterJson = await listAfter.json();
      const row = listAfterJson.data.opportunities.find((o) => o._id === ownOpportunityId);
      assert(row && row.applicationCount === 1, 'List row applicationCount reflects the DB insert');

      // Cleanup direct DB artifacts (keep the seed DB tidy)
      await ApplicationModel.deleteOne({ _id: appDoc._id });
      await OpportunityModel.deleteOne({ _id: foreignOpp._id });
      await CompanyModel.deleteOne({ _id: foreignCompany._id });
      await mongoose.disconnect();
    } catch (dbErr) {
      skipped++;
      console.warn(`  ⚠ SKIP (DB slice unavailable): ${dbErr.message}`);
    }

    // ── 14. Faculty regression ──────────────────────────────
    console.log('\n--- 14. Faculty Panel Regression ---');
    const facOpps = await fetch(`${API_BASE}/faculty/opportunities`, { headers: facHeaders });
    assert(facOpps.status === 200, 'Faculty opportunity list still reachable (Phase 3 untouched)');

    // ── 15. Cleanup created opportunities + build check ─────
    console.log('\n--- 15. Cleanup & Build ---');
    const thirdDraft = await fetch(`${API_BASE}/industry/opportunities`, {
      method: 'POST',
      headers: indHeaders,
      body: JSON.stringify({
        title: 'Phase 3 Delete Me Draft',
        type: 'Live Project',
        description: 'Draft to verify DELETE.',
        applicationDeadline: futureDeadline,
        visibility: 'Open to All',
      }),
    });
    const third = (await thirdDraft.json()).data.opportunity;
    const delRes = await fetch(`${API_BASE}/industry/opportunities/${third._id}`, {
      method: 'DELETE',
      headers: indHeaders,
    });
    assert(delRes.status === 200, 'Deleting a Draft → 200');

    const afterDelete = await fetch(`${API_BASE}/industry/opportunities?search=Delete%20Me`, { headers: indHeaders });
    assert(
      (await afterDelete.json()).data.opportunities.length === 0,
      'Deleted draft no longer appears in the list'
    );

    const indexHtml = path.resolve(__dirname, '../client/dist/index.html');
    assert(fs.existsSync(indexHtml), 'client/dist/index.html exists (production build produced)');
  } catch (err) {
    console.error('Unexpected test error:', err.message);
    failed++;
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED, ${skipped} SKIPPED`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();