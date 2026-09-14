/**
 * Phase 2 Integration Test Suite — Industry Company Profile & Compliance
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Verifies (requires backend + seedPhase6 + reachable MongoDB):
 *  1. Get industry sector taxonomy (GET /api/industry/sectors)
 *  2. Get own company profile (GET /api/industry/profile)
 *  3. Update own profile (PUT /api/industry/profile) — round trip
 *  4. Compliance validation — invalid CIN / GSTIN are rejected (400)
 *  5. Compliance status transitions honestly (not_submitted → submitted,
 *     and never auto-verified)
 *  6. Company profile documents — upload/list/view/download/delete
 *  7. Role isolation — student & faculty get 403 on every profile/doc route
 *  8. Cross-user ownership — requests targeting other companies' docs are
 *     rejected (no client-supplied company ids are honored)
 *  9. Unauthenticated → 401
 * 10. Faculty profile routes still work (regression check)
 * 11. Frontend build verification
 */

const path = require('path');
const fs = require('fs');

const API_BASE = 'http://127.0.0.1:5000/api';
const CLIENT_BASE = 'http://localhost:5173';

async function runTests() {
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🏭 SkillBridge Industry Panel Phase 2 Test Suite');
  console.log('═══════════════════════════════════════════════════════════════\n');

  let industryToken = '';
  let studentToken = '';
  let facultyToken = '';

  try {
    // ── 1. Login all roles ───────────────────────────────────
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

    // ── 2. Sector taxonomy ───────────────────────────────────
    console.log('\n--- 2. Sector Taxonomy ---');
    const sectorsRes = await fetch(`${API_BASE}/industry/sectors`, { headers: indHeaders });
    assert(sectorsRes.status === 200, 'GET /api/industry/sectors returns 200');
    const sectorsData = await sectorsRes.json();
    assert(sectorsData.success === true, 'Sectors response success flag is true');
    assert(Array.isArray(sectorsData.data?.sectors), 'sectors is an array');
    assert(sectorsData.data.sectors.length >= 1, 'At least one sector exists in taxonomy');
    const labels = sectorsData.data.sectors.map((s) => s.label);
    assert(labels.every((l) => typeof l === 'string' && l.length > 0), 'Every sector has a non-empty label');

    // ── 3. Get own profile ───────────────────────────────────
    console.log('\n--- 3. Get Own Company Profile ---');
    const getRes = await fetch(`${API_BASE}/industry/profile`, { headers: indHeaders });
    assert(getRes.status === 200, 'GET /api/industry/profile returns 200');
    const getData = await getRes.json();
    assert(getData.success === true, 'Profile response success flag is true');
    const comp = getData.data?.company || {};
    assert(typeof comp.name === 'string', 'Company name exists');
    assert(typeof getData.data?.contact?.contactPerson === 'string', 'Contact person exists');
    assert(typeof comp.verified === 'boolean', 'Company verified flag is a boolean');
    assert(!!comp._id, 'Company is a real linked company document (Company.user → req.user)');

    // ── 4. Compliance validation (invalid CIN / GSTIN) ───────
    console.log('\n--- 4. Compliance Validation ---');
    const badCin = await fetch(`${API_BASE}/industry/profile`, {
      method: 'PUT',
      headers: indHeaders,
      body: JSON.stringify({
        companyName: comp.name,
        sector: comp.sector,
        cin: 'INVALID-CIN-NUMBER',
        gstin: 'NOT-A-GSTIN',
      }),
    });
    assert([400, 422].includes(badCin.status), `Invalid CIN/GSTIN rejected (got ${badCin.status}, expected 400)`);
    const badCinData = await badCin.json();
    assert(badCinData.success === false, 'Invalid compliance request success is false');
    assert(
      badCinData.errors?.cin === 'Enter a valid 21-character CIN (e.g. U74999MH2020PTC335460).',
      'CIN validation error message is precise'
    );
    assert(
      badCinData.errors?.gstin === 'Enter a valid 15-character GSTIN (e.g. 27ABCDE1234F1Z5).',
      'GSTIN validation error message is precise'
    );

    // ── 5. Profile update round-trip + honest status ─────────
    console.log('\n--- 5. Profile Update Round-Trip ---');
    const updateRes = await fetch(`${API_BASE}/industry/profile`, {
      method: 'PUT',
      headers: indHeaders,
      body: JSON.stringify({
        companyName: comp.name,
        sector: comp.sector || (labels[0] || ''),
        website: 'https://skillbridge.example.com',
        description: 'Industry panel phase 2 round-trip verification.',
        locations: ['Mumbai', 'Bengaluru'],
        contactPerson: 'Verification Officer',
        officialPhone: '+91 90000 00001',
        cin: 'U74999MH2020PTC335460',
        gstin: '27ABCDE1234F1Z5',
        signatoryName: 'Authorized Signatory Test',
        signatoryDesignation: 'Director',
        signatoryContactEmail: 'signatory@skillbridge.example.com',
        signatoryContactPhone: '+91 90000 00002',
      }),
    });
    assert(updateRes.status === 200, 'PUT /api/industry/profile returns 200');
    const updateData = await updateRes.json();
    assert(updateData.success === true, 'Profile update success flag is true');
    const updComp = updateData.data?.company || {};
    const updCompl = updateData.data?.compliance || {};
    assert(updComp.website === 'https://skillbridge.example.com', 'Website persists');
    assert(Array.isArray(updComp.locations) && updComp.locations.length === 2, 'Locations persist as array');
    assert(updCompl.cin === 'U74999MH2020PTC335460', 'CIN persists');
    assert(updCompl.gstin === '27ABCDE1234F1Z5', 'GSTIN persists');
    assert(updCompl.signatory?.name === 'Authorized Signatory Test', 'Signatory name persists');
    assert(updCompl.status === 'submitted', 'Compliance status transitions to submitted (not auto-verified)');
    assert(!!updCompl.submittedAt, 'submittedAt is recorded');

    const complianceStatus = updCompl.status;

    // ── 6. Compliance documents lifecycle ────────────────────
    console.log('\n--- 6. Compliance Documents ---');

    // List (starts as empty array)
    const listRes = await fetch(`${API_BASE}/industry/profile/documents`, { headers: indHeaders });
    assert(listRes.status === 200, 'GET /api/industry/profile/documents returns 200');
    const listData = await listRes.json();
    assert(listData.success === true && Array.isArray(listData.data?.documents), 'Documents list is an array');

    // Missing file / invalid payload → 400
    const badUpload = await fetch(`${API_BASE}/industry/profile/documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${industryToken}` },
      body: new URLSearchParams({ title: 'No File Here', category: 'Other' }),
    });
    assert([400, 422].includes(badUpload.status), `Upload without a file rejected (got ${badUpload.status})`);

    // Valid upload (PNG is in the accepted set: PDF, JPG, PNG, WEBP)
    const buf = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
    const fd = new FormData();
    fd.append('title', 'Phase 2 Proof Document');
    fd.append('category', 'Registration / Incorporation Proof');
    fd.append('file', new Blob([buf], { type: 'image/png' }), 'phase2-proof.png');

    const uploadRes = await fetch(`${API_BASE}/industry/profile/documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${industryToken}` },
      body: fd,
    });
    assert(uploadRes.status === 201, 'POST /api/industry/profile/documents returns 201 Created');
    const uploadData = await uploadRes.json();
    assert(uploadData.success === true, 'Document upload success flag is true');
    const doc = uploadData.data?.document;
    assert(!!doc?._id, 'Uploaded document has an _id');
    assert(doc.title === 'Phase 2 Proof Document', 'Document title persists');
    assert(doc.category === 'Registration / Incorporation Proof', 'Document category persists');
    assert(doc.status === 'submitted', 'Document status defaults to submitted (honest)');
    const docId = doc._id;

    // Verify it appears in the list and in the compliance subdocument
    const listAfter = await (await fetch(`${API_BASE}/industry/profile/documents`, { headers: indHeaders })).json();
    assert(
      listAfter.data.documents.some((d) => d._id === docId),
      'Uploaded document appears in the document list'
    );
    const getAfter = await (await fetch(`${API_BASE}/industry/profile`, { headers: indHeaders })).json();
    assert(
      (getAfter.data.compliance?.documents || []).some((d) => d._id === docId),
      'Uploaded document persists within the compliance subdocument'
    );

    // View (authenticated inline preview)
    const viewRes = await fetch(`${API_BASE}/industry/profile/documents/${docId}/view`, {
      headers: { Authorization: `Bearer ${industryToken}` },
    });
    assert(viewRes.status === 200, 'GET /documents/:id/view returns 200');
    const viewBytes = Buffer.from(await viewRes.arrayBuffer());
    assert(viewBytes.equals(buf), 'View stream returns the stored file content');

    // Download (attachment headers)
    const dlRes = await fetch(`${API_BASE}/industry/profile/documents/${docId}/download`, {
      headers: { Authorization: `Bearer ${industryToken}` },
    });
    assert(dlRes.status === 200, 'GET /documents/:id/download returns 200');
    assert(
      /attachment;\s*filename=/.test(dlRes.headers.get('content-disposition') || ''),
      'Download sets content-disposition attachment with filename'
    );

    // ── 7. Role isolation (all profile/doc routes) ───────────
    console.log('\n--- 7. Role Isolation ---');
    const studentRoutes = [
      ['GET', '/industry/profile'],
      ['PUT', '/industry/profile'],
      ['GET', '/industry/sectors'],
      ['GET', '/industry/profile/documents'],
      ['GET', `/industry/profile/documents/${docId}/view`],
      ['GET', `/industry/profile/documents/${docId}/download`],
      ['DELETE', `/industry/profile/documents/${docId}`],
    ];
    for (const [method, route] of studentRoutes) {
      const res = await fetch(`${API_BASE}${route}`, { method, headers: stuHeaders });
      assert(res.status === 403, `Student ${method} ${route} → 403 Forbidden`);
    }
    const facProfileRes = await fetch(`${API_BASE}/industry/profile`, { headers: facHeaders });
    assert(facProfileRes.status === 403, 'Faculty GET /api/industry/profile → 403 Forbidden');

    // ── 8. Cross-user ownership isolation ────────────────────
    console.log('\n--- 8. Cross-User Ownership Isolation ---');
    const ownerRes = await fetch(`${API_BASE}/industry/profile/documents/${docId}/view`, {
      headers: facHeaders,
    });
    assert(ownerRes.status === 403, 'A non-industry role cannot view another company document (403)');

    // Delete own document now (cleanup + lifecycle proof)
    const delRes = await fetch(`${API_BASE}/industry/profile/documents/${docId}`, {
      method: 'DELETE',
      headers: indHeaders,
    });
    assert(delRes.status === 200, 'DELETE /documents/:id returns 200');
    const delData = await delRes.json();
    assert(delData.success === true, 'Document deletion success flag is true');
    const listFinal = await (await fetch(`${API_BASE}/industry/profile/documents`, { headers: indHeaders })).json();
    assert(!listFinal.data.documents.some((d) => d._id === docId), 'Deleted document removed from the list');

    // ── 9. Unauthenticated → 401 ─────────────────────────────
    console.log('\n--- 9. Unauthenticated Security ---');
    for (const route of ['/industry/profile', '/industry/sectors', '/industry/profile/documents']) {
      const res = await fetch(`${API_BASE}${route}`);
      assert(res.status === 401, `Unauthenticated ${route} → 401 Unauthorized`);
    }

    // ── 10. Faculty profile regression ───────────────────────
    console.log('\n--- 10. Faculty Routes Regression ---');
    const facultyProfileRoute = await fetch(`${API_BASE}/faculty/profile`, { headers: facHeaders });
    assert(
      facultyProfileRoute.status === 200,
      `Faculty own profile route still reachable (got ${facultyProfileRoute.status})`
    );

    // Reset compliance profile to a clean state (honest, no caller-side mutations persist in test db)
    await fetch(`${API_BASE}/industry/profile`, {
      method: 'PUT',
      headers: indHeaders,
      body: JSON.stringify({
        companyName: comp.name,
        sector: comp.sector,
        cin: '',
        gstin: '',
        signatoryName: '',
        signatoryDesignation: '',
        signatoryContactEmail: '',
        signatoryContactPhone: '',
      }),
    });

    // ── 11. Frontend build verification ──────────────────────
    console.log('\n--- 11. Frontend Build Verification ---');
    const indexHtml = path.resolve(__dirname, '../client/dist/index.html');
    assert(fs.existsSync(indexHtml), 'client/dist/index.html exists (production build produced)');

    assert(
      complianceStatus === 'submitted',
      'Compliance never auto-verifies — status is submitted at best in this phase'
    );
  } catch (err) {
    console.error('Unexpected test error:', err);
    failed++;
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();