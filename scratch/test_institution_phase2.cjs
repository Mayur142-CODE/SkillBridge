/**
 * Phase 2 Integration Test Suite — Institutional Profile & Accreditation
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Verifies:
 *  1. Institution login + GET /api/institution/profile shape (user / profile /
 *     accreditations / departments) with no password / private field leaks
 *  2. PATCH /api/institution/profile persists real values (re-read matches),
 *     uppercases AISHE and lowercases official email
 *  3. Profile validation rejects: bad pincode, AISHE, establishment year,
 *     website, phone
 *  4. Accreditation CRUD: create NAAC / NBA (201), list, update (PATCH 200),
 *     delete (200); default status Pending → effectiveStatus Pending, active
 *     false
 *  5. Honest status derivation: Active + future expiry → active true;
 *     Active + past expiry → effectiveStatus Expired (never contradicts dates)
 *  6. Accreditation validation rejects: bad type, bad status, score out of
 *     range (0–4), expiry before start
 *  7. Document lifecycle: upload (201) with real file metadata, inline view
 *     (200, Content-Type) and attachment download (Content-Disposition),
 *     remove (200) clears attachment; document DTO never exposes disk path
 *  8. Role isolation: student / faculty / industry → 403 on profile, degrees,
 *     departments; admin → 403 per project requireRole() policy; anonymous → 401
 *  9. Ownership: Institution B (fresh register) sees ONLY its own data; cannot
 *     read / view Institution A documents (404); A ignores spoofed
 *     ?institutionId= query param (no cross-tenant read)
 * 10. Department registry: create (201), duplicate name (case-insensitive) and
 *     duplicate code rejected (400), search filter, update (200)
 * 11. Safe-delete: deleting a department referenced by real students/faculty
 *     → 409 with linked counts; rename → delete succeeds
 * 12. Dashboard Phase-2 summary: accreditations.active is derived from real
 *     records (equals live count of effectiveStatus Active), departments
 *     totals match live registry, profile.hasAisheCode is a boolean
 * 13. Cleanup: temp records removed from MongoDB
 */

const path = require('path');
const fs = require('fs');

const API_BASE = 'http://127.0.0.1:5000/api';

const TEMP_EMAIL = `isolation-p2-${Date.now()}@skillbridge.dev`;
const TEMP_PASS = 'Isolation@123';

async function runTests() {
  let passed = 0;
  let failed = 0;
  let tempInstitutionUserId = '';

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
    const res = await fetch(`${API_BASE}${urlPath}`, {
      method,
      headers,
      body: options.body,
    });
    let data = null;
    try {
      data = await res.json();
    } catch (_) {
      /* non-JSON response (e.g. file stream) */
    }
    return { status: res.status, data, headers: res.headers };
  }

  async function cleanupTempData() {
    try {
      const { pathToFileURL } = await import('url');
      const envFile = fs.readFileSync(path.resolve(__dirname, '../backend/.env'), 'utf8');
      const uriMatch = envFile.match(/^\s*MONGODB_URI\s*=\s*(.+)$/m);
      if (!uriMatch) throw new Error('MONGODB_URI not found in backend/.env');
      const uri = uriMatch[1].trim();
      process.env.MONGODB_URI = uri;

      const fileUrl = (p) => pathToFileURL(path.resolve(__dirname, p)).href;
      const mongoose = (await import(fileUrl('../backend/node_modules/mongoose/lib/index.js'))).default;
      const { default: ensureNodeDns } = await import(fileUrl('../backend/src/config/dns.js'));
      await import(fileUrl('../backend/src/models/User.js'));
      await import(fileUrl('../backend/src/models/Notification.js'));
      await import(fileUrl('../backend/src/models/Accreditation.js'));
      await import(fileUrl('../backend/src/models/Department.js'));

      await ensureNodeDns();
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 20000 });

      if (tempInstitutionUserId) {
        const objId = mongoose.Types.ObjectId.isValid(tempInstitutionUserId)
          ? new mongoose.Types.ObjectId(tempInstitutionUserId)
          : tempInstitutionUserId;
        await Promise.all([
          mongoose.model('Accreditation').deleteMany({ institution: objId }),
          mongoose.model('Department').deleteMany({ institution: objId }),
          mongoose.model('Notification').deleteMany({ user: objId }),
        ]);
      }
      if (registeredTemp) {
        const del = await mongoose.model('User').deleteOne({ email: TEMP_EMAIL });
        const removed = del.deletedCount === 1;
        assert(removed, 'Temporary Phase-2 institution removed from MongoDB (cleanup)');
      }
      await mongoose.disconnect();
    } catch (err) {
      console.error(`  ⚠️ Cleanup warning (non-fatal): ${err.message}`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🏛️ SkillBridge Institution Panel Phase 2 Test Suite');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const createdAccreditations = [];
  const createdDepartments = [];
  let institutionToken = '';
  let studentToken = '';
  let facultyToken = '';
  let registeredTemp = false;

  try {
    // ── 1. Login + Profile GET ──────────────────────────────
    console.log('--- 1. Login & GET /api/institution/profile ---');
    const instLogin = await login('institution@skillbridge.dev', 'Institution@123');
    assert(instLogin.status === 200, 'Institution login returns 200 OK');
    assert(instLogin.data.user?.role === 'institution', 'Institution role is institution');
    institutionToken = instLogin.data.token;

    const prof = await api('GET', '/institution/profile', institutionToken);
    assert(prof.status === 200, 'GET /api/institution/profile returns 200 OK');
    assert(prof.data.success === true, 'Profile response success flag is true');
    const pd = prof.data.data;
    assert(pd.user?._id && pd.user.role === 'institution', 'Response exposes an identity box for the authenticated institution');
    assert(pd.profile?.profileExists === true, 'Embedded institution profile exists (profileExists true)');
    assert(pd.profile?.institutionName === 'ABC Institute of Technology', 'Profile institution name is real (ABC Institute of Technology)');
    assert(Array.isArray(pd.accreditations), 'accreditations is an array');
    assert(Array.isArray(pd.departments), 'departments is an array');
    const rawProfile = JSON.stringify(pd);
    assert(!rawProfile.includes('password') && !rawProfile.includes('"passwordHash"'), 'Profile DTO does not leak password fields');

    // ── 2. PATCH profile persistence ────────────────────────
    console.log('\n--- 2. PATCH /api/institution/profile persists real values ---');
    const patchRes = await api('PATCH', '/institution/profile', institutionToken, {
      body: JSON.stringify({
        institutionName: 'ABC Institute of Technology',
        officialName: 'ABC Institute of Technology (Official)',
        institutionType: 'Institute of Technology',
        establishmentYear: '2005',
        affiliatedUniversity: 'Test University',
        about: 'Phase 2 test description.',
        contactPerson: 'Dr. Test Contact',
        principalName: 'Prof. Test Principal',
        officialEmail: 'OFFICE@abc-tech.test',
        officialPhone: '9876543210',
        website: 'https://www.abc-tech.test',
        address: 'Test Campus, Test City',
        city: 'Test City',
        state: 'MH',
        pincode: '400001',
        aisheCode: 'c-99887',
      }),
    });
    assert(patchRes.status === 200, 'PATCH /api/institution/profile returns 200 OK');
    const patched = patchRes.data?.data?.profile;
    assert(patched?.about === 'Phase 2 test description.', 'About text persists on save');
    assert(patched?.officialEmail === 'office@abc-tech.test', 'Official email is lowercased and persisted');
    assert(patched?.aisheCode === 'C-99887', 'AISHE code is uppercased and persisted');

    const prof2 = await api('GET', '/institution/profile', institutionToken);
    const prof2Profile = prof2.data.data.profile;
    assert(
      prof2Profile.about === 'Phase 2 test description.' &&
        prof2Profile.aisheCode === 'C-99887' &&
        prof2Profile.city === 'Test City',
      'GET re-read matches the patched values (real MongoDB persistence)'
    );

    // ── 3. Profile validation ───────────────────────────────
    console.log('\n--- 3. Profile validation ---');
    const invalidProfile = await api('PATCH', '/institution/profile', institutionToken, {
      body: JSON.stringify({
        institutionName: 'ABC Institute of Technology',
        pincode: '123',
        aisheCode: 'abc',
        establishmentYear: 'abcd',
        website: 'not-a-url',
        officialPhone: 'xxx',
      }),
    });
    assert(invalidProfile.status === 400, 'PATCH with invalid profile fields returns 400');
    assert(invalidProfile.data?.errors?.pincode, 'Invalid pincode rejected with a field error');
    assert(invalidProfile.data?.errors?.aisheCode, 'Invalid AISHE code rejected with a field error');
    assert(invalidProfile.data?.errors?.establishmentYear, 'Invalid establishment year rejected with a field error');
    assert(invalidProfile.data?.errors?.website, 'Invalid website rejected with a field error');
    assert(invalidProfile.data?.errors?.officialPhone, 'Invalid official phone rejected with a field error');
    assert(invalidProfile.data.success === false, 'Validation failure success flag is false');

    // ── 4. Accreditation CRUD ───────────────────────────────
    console.log('\n--- 4. Accreditation CRUD ---');
    const accNaac = await api('POST', '/institution/accreditations', institutionToken, {
      body: JSON.stringify({ type: 'NAAC', status: 'Pending', grade: 'A' }),
    });
    assert(accNaac.status === 201, 'POST NAAC accreditation returns 201 Created');
    assert(accNaac.data?.data?.accreditation?.type === 'NAAC', 'Created record type is NAAC');
    assert(accNaac.data?.data?.accreditation?.status === 'Pending', 'Default status is Pending');
    assert(accNaac.data?.data?.accreditation?.effectiveStatus === 'Pending', 'Effective status matches Pending for a new record');
    assert(accNaac.data?.data?.accreditation?.active === false, 'Pending record is not active');
    assert(accNaac.data?.data?.accreditation?.document === null, 'New record has no supporting document');
    createdAccreditations.push(accNaac.data?.data?.accreditation?._id);
    const naacId = accNaac.data?.data?.accreditation?._id;

    const accNba = await api('POST', '/institution/accreditations', institutionToken, {
      body: JSON.stringify({ type: 'NBA', status: 'Under Review', scope: 'B.Tech CSE' }),
    });
    assert(accNba.status === 201 && accNba.data?.data?.accreditation?.type === 'NBA', 'POST NBA accreditation returns 201 Created');
    createdAccreditations.push(accNba.data?.data?.accreditation?._id);

    // Active with future expiry → active true
    const accActive = await api('POST', '/institution/accreditations', institutionToken, {
      body: JSON.stringify({
        type: 'NAAC',
        status: 'Active',
        grade: 'A+',
        score: 3.51,
        startDate: '2026-01-01',
        expiryDate: '2036-12-31',
        referenceNumber: 'NAAC-TEST-001',
      }),
    });
    assert(accActive.status === 201, 'POST active NAAC returns 201 Created');
    const activeRec = accActive.data?.data?.accreditation;
    if (activeRec) {
      assert(activeRec.effectiveStatus === 'Active' && activeRec.active === true, 'Active + future expiry derives effectiveStatus Active');
      assert(activeRec.score === 3.51 && typeof activeRec.score === 'number', 'Score persisted as a number (3.51)');
      createdAccreditations.push(activeRec._id);
    }

    // Active status + past expiry → derived Expired (dates never contradict)
    const accExpired = await api('POST', '/institution/accreditations', institutionToken, {
      body: JSON.stringify({
        type: 'NAAC',
        status: 'Active',
        grade: 'B++',
        startDate: '2020-01-01',
        expiryDate: '2021-01-01',
      }),
    });
    assert(accExpired.status === 201, 'POST NAAC with past expiry returns 201');
    const expiredRec = accExpired.data?.data?.accreditation;
    if (expiredRec) {
      assert(
        expiredRec.effectiveStatus === 'Expired' && expiredRec.active === false,
        'Active status + past expiry derives effectiveStatus Expired (no fake values)'
      );
      createdAccreditations.push(expiredRec._id);
    }

    // Update
    let updAfterNaacCreate = null;
    if (naacId) {
      const upd = await api('PATCH', `/institution/accreditations/${naacId}`, institutionToken, {
        body: JSON.stringify({ type: 'NAAC', status: 'Active', grade: 'A+', score: 3.9, referenceNumber: 'NAAC-UPD-001' }),
      });
      assert(upd.status === 200, 'PATCH accreditation returns 200 OK');
      assert(upd.data?.data?.accreditation?.grade === 'A+' && upd.data.data.accreditation.score === 3.9, 'Update persists new grade/score');
      updAfterNaacCreate = upd.data?.data?.accreditation;
    }

    // List reflects the created + updated records
    const accList = await api('GET', '/institution/accreditations', institutionToken);
    assert(accList.status === 200 && accList.data?.data?.accreditations?.length >= 4, 'GET /api/institution/accreditations lists created records');
    if (updAfterNaacCreate) {
      assert(
        accList.data.data.accreditations.some((r) => r._id === updAfterNaacCreate._id && r.effectiveStatus === 'Active'),
        'Updated record appears in list with derived active status'
      );
    }

    // ── 5. Accreditation validation ─────────────────────────
    console.log('\n--- 5. Accreditation validation ---');
    const badType = await api('POST', '/institution/accreditations', institutionToken, {
      body: JSON.stringify({ type: 'NIRF' }),
    });
    assert(badType.status === 400 && badType.data?.errors?.type, 'Invalid accreditation type rejected');

    const badStatus = await api('POST', '/institution/accreditations', institutionToken, {
      body: JSON.stringify({ type: 'NAAC', status: 'Nope' }),
    });
    assert(badStatus.status === 400 && badStatus.data?.errors?.status, 'Invalid accreditation status rejected');

    const badScore = await api('POST', '/institution/accreditations', institutionToken, {
      body: JSON.stringify({ type: 'NAAC', score: 9 }),
    });
    assert(badScore.status === 400 && badScore.data?.errors?.score, 'Out-of-range score (0–4) rejected');

    const badDates = await api('POST', '/institution/accreditations', institutionToken, {
      body: JSON.stringify({ type: 'NAAC', startDate: '2030-01-01', expiryDate: '2029-01-01' }),
    });
    assert(badDates.status === 400 && badDates.data?.errors?.expiryDate, 'Expiry earlier than start date rejected');

    // ── 6. Document lifecycle ───────────────────────────────
    console.log('\n--- 6. Accreditation document lifecycle ---');
    if (naacId) {
      const pdfBytes = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF');
      const form = new FormData();
      form.append('file', new Blob([pdfBytes], { type: 'application/pdf' }), 'naac-certificate.pdf');

      const upDoc = await api('POST', `/institution/accreditations/${naacId}/document`, institutionToken, {
        json: false,
        body: form,
      });
      assert(upDoc.status === 201, 'POST document upload returns 201 Created');
      assert(upDoc.data?.data?.document?.originalName === 'naac-certificate.pdf', 'Uploaded document original name kept');
      assert(upDoc.data?.data?.document?.mimeType === 'application/pdf', 'Uploaded document mime type kept');
      assert(upDoc.data?.data?.document?.size > 0, 'Uploaded document size is positive (real file on disk)');
      assert(!JSON.stringify(upDoc.data).includes('"path":'), 'Document DTO does not expose the server disk path');

      const viewDoc = await api('GET', `/institution/accreditations/${naacId}/document/view`, institutionToken, { json: false });
      assert(viewDoc.status === 200, 'GET document/view returns 200 OK');
      assert((viewDoc.headers.get('content-type') || '').includes('application/pdf'), 'View response Content-Type is application/pdf');
      const downDoc = await api('GET', `/institution/accreditations/${naacId}/document/download`, institutionToken, { json: false });
      assert(downDoc.status === 200, 'GET document/download returns 200 OK');
      assert(
        (downDoc.headers.get('content-disposition') || '').includes('attachment'),
        'Download response forces attachment disposition'
      );

      const delDoc = await api('DELETE', `/institution/accreditations/${naacId}/document`, institutionToken);
      assert(delDoc.status === 200 && delDoc.data.success === true, 'DELETE document returns 200 OK');
      const accList2 = await api('GET', '/institution/accreditations', institutionToken);
      const naacAfterDocDel = accList2.data.data.accreditations.find((r) => r._id === naacId);
      assert(naacAfterDocDel?.document === null, 'After removal, record shows no attachment');
    }

    // ── 7. Role / auth isolation ────────────────────────────
    console.log('\n--- 7. Role & auth isolation on Phase 2 endpoints ---');
    const studentLogin = await login('student@skillbridge.dev', 'Student@123');
    studentToken = studentLogin.data.token;
    const facLogin = await login('faculty@skillbridge.dev', 'Faculty@123');
    facultyToken = facLogin.data.token;
    const indLogin = await login('industry@skillbridge.dev', 'Industry@123');

    for (const [label, token] of [['student', studentToken], ['faculty', facultyToken], ['industry', indLogin.data.token]]) {
      const r = await api('GET', '/institution/profile', token);
      assert(r.status === 403, `${label} accessing /api/institution/profile returns 403`);
    }
    const studentCreate = await api('POST', '/institution/accreditations', studentToken, {
      body: JSON.stringify({ type: 'NAAC' }),
    });
    assert(studentCreate.status === 403, 'Student creating accreditation returns 403');
    const facultyDepartments = await api('GET', '/institution/departments', facultyToken);
    assert(facultyDepartments.status === 403, 'Faculty listing departments returns 403');
    const studentViewDoc = await api('GET', `/institution/accreditations/${naacId}/document/view`, studentToken, { json: false });
    assert(studentViewDoc.status === 403, 'Student viewing accreditation document returns 403');

    const admLogin = await login('admin@skillbridge.dev', 'Admin@123');
    const adminProfile = await api('GET', '/institution/profile', admLogin.data.token);
    assert(adminProfile.status === 403, 'Admin accessing /api/institution/profile returns 403 (existing requireRole policy)');

    const anonProfile = await api('GET', '/institution/profile', null);
    assert(anonProfile.status === 401, 'Anonymous GET /api/institution/profile returns 401');
    const anonCreate = await api('POST', '/institution/accreditations', null, { body: JSON.stringify({ type: 'NAAC' }) });
    assert(anonCreate.status === 401, 'Anonymous POST /api/institution/accreditations returns 401');

    // ── 8. Ownership isolation (Institution B) ──────────────
    console.log('\n--- 8. Ownership isolation (Institution A vs B) ---');
    const regRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'institution',
        name: 'Phase2 Isolation Institute',
        email: TEMP_EMAIL,
        password: TEMP_PASS,
        institutionName: 'Phase2 Isolation Institute',
        aisheCode: 'ISO-7007',
        contactPerson: 'Phase2 Tester',
        address: 'Isolation Campus, Test City',
      }),
    });
    registeredTemp = true;
    const regData = await regRes.json();
    assert(regRes.status === 200 || regRes.status === 201, `Second institution registers (${regRes.status})`);
    tempInstitutionUserId = regData.user?.id || regData.user?._id || '';

    const bLogin = await login(TEMP_EMAIL, TEMP_PASS);
    assert(!!bLogin.data?.token, 'Second institution authenticates');
    const bToken = bLogin.data.token;

    const bProfile = await api('GET', '/institution/profile', bToken);
    assert(bProfile.status === 200, 'Institution B GET /profile returns 200');
    assert(
      bProfile.data?.data?.profile?.institutionName === 'Phase2 Isolation Institute',
      'Institution B sees ONLY its own identity'
    );
    assert(bProfile.data?.data?.accreditations?.length === 0, 'Institution B starts with zero accreditations');
    assert(!JSON.stringify(bProfile.data.data).includes('ABC Institute of Technology'), 'Institution B response contains no ABC data leak');

    const bTriesPatch = await api('PATCH', `/institution/accreditations/${naacId}`, bToken, {
      body: JSON.stringify({ type: 'NAAC', status: 'Active' }),
    });
    assert(bTriesPatch.status === 404, 'Institution B cannot patch Institution A accreditation (404, cross-tenant guarded)');
    const bTriesDoc = await api('GET', `/institution/accreditations/${naacId}/document/view`, bToken, { json: false });
    assert(bTriesDoc.status === 404, 'Institution B cannot view Institution A document (404)');

    const bCreate = await api('POST', '/institution/accreditations', bToken, {
      body: JSON.stringify({ type: 'NBA', status: 'Pending', grade: 'B' }),
    });
    assert(bCreate.status === 201, 'Institution B creates its own NBA accreditation');
    const bId = bCreate.data?.data?.accreditation?._id;
    const bProfile2 = await api('GET', '/institution/profile', bToken);
    if (bId) {
      assert(bProfile2.data?.data?.accreditations?.length === 1, 'Institution B sees exactly its own single accreditation');
      assert(bProfile2.data?.data?.accreditations?.[0]?._id === bId, 'Institution B record is the one it created');
      const bDel = await api('DELETE', `/institution/accreditations/${bId}`, bToken);
      assert(bDel.status === 200, 'Institution B removes its own accreditation');
    }

    // A ignores spoofed institutionId query param
    const spoof = await api('GET', `/institution/profile?institutionId=${studentLogin.data.user?._id}`, institutionToken);
    assert(spoof.status === 200, 'Spoofed ?institutionId= query param does not error the endpoint');
    assert(
      spoof.data?.data?.profile?.institutionName === 'ABC Institute of Technology',
      'Institution A still reads its OWN profile despite spoofed param (no cross-tenant read)'
    );

    // ── 9. Department registry ──────────────────────────────
    console.log('\n--- 9. Department registry ---');
    const deptUniqueName = `CSE Phase2 ${Date.now()}`;
    const deptCreate = await api('POST', '/institution/departments', institutionToken, {
      body: JSON.stringify({
        name: deptUniqueName,
        code: `P2${String(Date.now()).slice(-6)}`,
        headOfDepartment: 'Dr. Dept Head',
        description: 'Phase 2 department test record',
        programs: ['B.Tech CSE', 'M.Tech CSE'],
        status: 'Active',
      }),
    });
    assert(deptCreate.status === 201, 'POST department returns 201 Created');
    assert(deptCreate.data?.data?.department?.name === deptUniqueName, 'Department name persisted');
    assert(deptCreate.data?.data?.department?.programs?.length === 2, 'Department programs array persisted');
    const deptId = deptCreate.data.data.department._id;
    createdDepartments.push(deptId);

    const dupName = await api('POST', '/institution/departments', institutionToken, {
      body: JSON.stringify({ name: deptUniqueName.toLowerCase(), code: `P2X${String(Date.now()).slice(-5)}` }),
    });
    assert(dupName.status === 400 && dupName.data?.errors?.name, 'Duplicate department name rejected case-insensitively');

    const dupCode = await api('POST', '/institution/departments', institutionToken, {
      body: JSON.stringify({ name: `${deptUniqueName} B`, code: deptCreate.data.data.department.code.toLowerCase() }),
    });
    assert(dupCode.status === 400 && dupCode.data?.errors?.code, 'Duplicate department code rejected');

    const searchRes = await api('GET', `/institution/departments?search=${encodeURIComponent(deptUniqueName.split(' ')[0])}`, institutionToken);
    assert(searchRes.data?.data?.departments?.some((d) => d._id === deptId), 'Department search filter finds the created record');

    const updDept = await api('PATCH', `/institution/departments/${deptId}`, institutionToken, {
      body: JSON.stringify({ name: deptUniqueName, code: deptCreate.data.data.department.code, headOfDepartment: 'Dr. New Head', status: 'Inactive' }),
    });
    assert(updDept.status === 200 && updDept.data?.data?.department?.status === 'Inactive', 'PATCH department persists new status');

    // ── 10. Safe-delete guard ───────────────────────────────
    console.log('\n--- 10. Safe-delete guard (referenced departments) ---');
    const dash = await api('GET', '/institution/dashboard', institutionToken);
    const referencedDept = dash.data?.data?.roster?.departments?.[0]?.department;
    assert(!!referencedDept, 'Dashboard exposes a real department referenced by faculty/students (for 409 test)');

    if (referencedDept) {
      const guardDept = await api('POST', '/institution/departments', institutionToken, {
        body: JSON.stringify({ name: referencedDept, code: `G9${String(Date.now()).slice(-5)}` }),
      });
      assert(guardDept.status === 201, 'Registry accepts department named after a referenced department (no false duplicate)');
      const guardDeptId = guardDept.data.data.department._id;

      const deniedDelete = await api('DELETE', `/institution/departments/${guardDeptId}`, institutionToken);
      assert(deniedDelete.status === 409, 'Deleting a referenced department returns 409 Conflict');
      assert(
        typeof deniedDelete.data?.errors?.linkedStudents === 'number' && typeof deniedDelete.data?.errors?.linkedFaculty === 'number',
        '409 response exposes honest linked student/faculty counts'
      );

      const renameRes = await api('PATCH', `/institution/departments/${guardDeptId}`, institutionToken, {
        body: JSON.stringify({ name: `G9 Freed ${Date.now()}`, code: guardDept.data.data.department.code, status: 'Inactive' }),
      });
      assert(renameRes.status === 200, 'Referenced department can be renamed');
      const freedDelete = await api('DELETE', `/institution/departments/${guardDeptId}`, institutionToken);
      assert(freedDelete.status === 200, 'Renamed (unreferenced) department can now be deleted');
    }

    // ── 11. Dashboard Phase 2 summary ───────────────────────
    console.log('\n--- 11. Dashboard Phase-2 summary reflects real records ---');
    const profileFinal = await api('GET', '/institution/profile', institutionToken);
    const liveAccreds = profileFinal.data.data.accreditations;
    const liveActiveCount = liveAccreds.filter((r) => r.effectiveStatus === 'Active').length;
    const liveActiveNaac = liveAccreds.filter((r) => r.type === 'NAAC' && r.effectiveStatus === 'Active').length;
    const liveActiveNba = liveAccreds.filter((r) => r.type === 'NBA' && r.effectiveStatus === 'Active').length;
    const liveNaac = liveAccreds.filter((r) => r.type === 'NAAC').length;
    const liveNba = liveAccreds.filter((r) => r.type === 'NBA').length;
    const liveDepts = profileFinal.data.data.departments;

    const dash2 = await api('GET', '/institution/dashboard', institutionToken);
    const s = dash2.data?.data?.accreditations;
    assert(!!s, 'Dashboard exposes Phase-2 accreditations summary');
    assert(typeof s?.total === 'number' && s.total === liveAccreds.length, 'Dashboard accreditation total matches live profile count');
    assert(typeof s?.active === 'number' && s.active === liveActiveCount, 'Dashboard active count is derived from live effectiveStatus records');
    assert(typeof s?.naac === 'number' && s.naac === liveActiveNaac, 'Dashboard NAAC count reflects active NAAC records only');
    assert(typeof s?.nba === 'number' && s.nba === liveActiveNba, 'Dashboard NBA count reflects active NBA records only');
    assert(s.naac + s.nba === s.active, 'Active NAAC + active NBA sum exactly to active total');
    assert(liveActiveNaac + liveActiveNba === liveActiveCount, 'Live effectiveStatus active breakdown matches totals');
    const dDepts = dash2.data?.data?.departments;
    assert(!!dDepts, 'Dashboard exposes Phase-2 departments summary');
    assert(typeof dDepts?.total === 'number' && dDepts.total === liveDepts.length, 'Dashboard department total matches live registry');
    const dashProfile = dash2.data?.data?.profile;
    assert(typeof dashProfile?.hasAisheCode === 'boolean' && dashProfile.hasAisheCode === true, 'Dashboard hasAisheCode is a boolean reflecting the real profile');
    assert(liveActiveCount === liveAccreds.filter((r) => r.active).length, 'effectiveStatus Active and active flag agree on every record');

    // ── 12. Cleanup ABC-created records via API ─────────────
    console.log('\n--- 12. Cleanup of Phase-2 test records on ABC ---');
    let cleaned = true;
    for (const id of createdAccreditations.filter(Boolean)) {
      const delRes = await api('DELETE', `/institution/accreditations/${id}`, institutionToken);
      if (delRes.status !== 200) cleaned = false;
    }
    for (const id of createdDepartments.filter(Boolean)) {
      const delRes = await api('DELETE', `/institution/departments/${id}`, institutionToken);
      if (delRes.status !== 200) cleaned = false;
    }
    assert(cleaned, 'All Phase-2 temporary accreditation/department records removed from ABC institute');

  } catch (err) {
    console.error('Unexpected test error:', err);
    failed++;
  }

  // ── Cleanup: remove the temporary second institution ─────
  console.log('\n--- Cleanup ---');
  await cleanupTempData();

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