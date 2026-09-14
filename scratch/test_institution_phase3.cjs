/**
 * Phase 3 Integration Test Suite — Student Roster & Verification
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Verifies:
 *  1. Institution login + GET /api/institution/students shape (students /
 *     pagination / facets) with no password / hash / internal disk-path leaks
 *  2. Roster search (name/email/rollNumber), status filter, sort, pagination
 *  3. Single enrollment: valid create (201), verified default, real bcrypt
 *     login, duplicate-email 409, field validation, spoofed institutionId
 *     body field ignored (ownership always from req.user._id)
 *  4. Bulk CSV enrollment: valid + duplicate-in-file + existing-email +
 *     bad-password rows → honest summary { total, created, skipped, errors }
 *     with per-row row numbers & reasons; BOM/CRLF/quoted-comma parsing;
 *     missing-header 400; non-CSV 400; CSV temp file cleaned up
 *  5. Academic verification: set academicVerified + by + at + note, student
 *     notification dispatched, over-length note rejected
 *  6. Institution-side academic corrections: persisted, and any academic
 *     change AFTER verification resets academicVerified/by/at + note
 *  7. Soft deactivation: status → 'deactivated', record still listed,
 *     login blocked with status deactivated, double-deactivate 409
 *  8. NOC issuance & document lifecycle: issueNumber NOC-yyyy-XXXX, reason/
 *     date validation, secure inline view + attachment download with correct
 *     Content-Type/Disposition, no disk-path leak, student notification
 *  9. Role & auth isolation: student / faculty / industry / admin → 403,
 *     anonymous → 401 across roster, enrollment, verify, NOC document
 * 10. Ownership isolation: Institution B sees ONLY its own roster (0), cannot
 *     read/verify/update/deactivate/issue-NOC for A students (404), cannot
 *     view A NOC documents (404), spoofed ?institutionId= ignored
 * 11. Cleanup: temp students, NOCs, uploaded docs and temp institution removed
 *     from MongoDB + disk (crash-safe, never touches real demo data)
 */

const path = require('path');
const fs = require('fs');

const API_BASE = 'http://127.0.0.1:5000/api';

const TS = Date.now();
const BASE = `p3-${TS}`;
const TEMP_EMAIL = `isolation-p3-${TS}@skillbridge.dev`;
const TEMP_PASS = 'Isolation@123';
const STUDENT_PASS = 'Phase3@123';

async function runTests() {
  let passed = 0;
  let failed = 0;
  let tempInstitutionUserId = '';
  let registeredTemp = false;

  const createdStudentEmails = [];
  const createdStudentIds = [];
  let singleStudentId = '';
  let verifyStudentId = '';
  let nocStudentId = '';
  let deactivatedStudentId = '';
  let nocRecordId = '';
  let institutionUserId = '';
  let institutionBId = '';

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

  const csvDir = path.resolve(__dirname, '../backend/uploads/institution_csv');
  const csvFilesBefore = fs.existsSync(csvDir) ? fs.readdirSync(csvDir) : [];

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
      await import(fileUrl('../backend/src/models/StudentNOC.js'));

      await ensureNodeDns();
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 20000 });

      const objId = (v) =>
        mongoose.Types.ObjectId.isValid(v) ? new mongoose.Types.ObjectId(v) : v;

      // Delete NOCs for temp students and their physical document files.
      const nocs = await mongoose.model('StudentNOC').find({
        student: { $in: createdStudentIds.map(objId) },
      }).lean();
      for (const n of nocs) {
        if (n?.document?.path && fs.existsSync(n.document.path)) {
          try { fs.unlinkSync(n.document.path); } catch (_) {}
        }
      }
      await mongoose.model('StudentNOC').deleteMany({ student: { $in: createdStudentIds.map(objId) } });
      await mongoose.model('Notification').deleteMany({ user: { $in: createdStudentIds.map(objId) } });

      // Never delete the seeded demo student — only records we created.
      if (createdStudentEmails.length > 0) {
        await mongoose.model('User').deleteMany({ email: { $in: createdStudentEmails } });
      }

      if (tempInstitutionUserId && registeredTemp) {
        await mongoose.model('Notification').deleteMany({ user: objId(tempInstitutionUserId) });
        await mongoose.model('User').deleteOne({ _id: objId(tempInstitutionUserId) });
      }

      // Ensure no CSV temp files were left behind by this run.
      const csvFilesAfter = fs.existsSync(csvDir) ? fs.readdirSync(csvDir) : [];
      const leftoverBulk = csvFilesAfter.filter((f) => f.includes(`bulk_${institutionBId}`) || f.includes('bulk_'));
      assert(
        JSON.stringify(csvFilesBefore) === JSON.stringify(csvFilesAfter),
        'No leftover bulk CSV upload files remain in backend/uploads/institution_csv'
      );
      for (const f of leftoverBulk) {
        try { fs.unlinkSync(path.join(csvDir, f)); } catch (_) {}
      }

      await mongoose.disconnect();
      console.log('  ✅ PASS: Temporary Phase-3 records removed from MongoDB + disk (cleanup)');
      passed++;
    } catch (err) {
      console.error(`  ⚠️ Cleanup warning (non-fatal): ${err.message}`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🏛️ SkillBridge Institution Panel Phase 3 Test Suite');
  console.log('═══════════════════════════════════════════════════════════════\n');

  let institutionToken = '';
  let studentToken = '';
  let facultyToken = '';

  try {
    // ── 1. Login & roster list shape ────────────────────────
    console.log('--- 1. Login & GET /api/institution/students ---');
    const instLogin = await login('institution@skillbridge.dev', 'Institution@123');
    assert(instLogin.status === 200, 'Institution login returns 200 OK');
    assert(instLogin.data.user?.role === 'institution', 'Institution role is institution');
    institutionUserId = instLogin.data.user?.id || instLogin.data.user?._id || '';
    institutionToken = instLogin.data.token;
    assert(!!institutionUserId, 'Authenticated institution _id captured from the session');

    const list = await api('GET', '/institution/students', institutionToken);
    assert(list.status === 200, 'GET /api/institution/students returns 200 OK');
    assert(list.data.success === true, 'Roster response success flag is true');
    const roster = list.data.data;
    assert(Array.isArray(roster.students), 'data.students is an array');
    assert(typeof roster.pagination?.total === 'number' && roster.pagination.total >= 1, 'pagination.total is a real number >= 1 (seeded student present)');
    assert(roster.pagination.pages >= 1, 'pagination.pages computed from real total');
    assert(Array.isArray(roster.facets?.programs) && Array.isArray(roster.facets?.branches) && Array.isArray(roster.facets?.years), 'facets exposes programs/branches/years arrays');
    const rawList = JSON.stringify(roster);
    assert(!rawList.includes('password') && !rawList.includes('"passwordHash"'), 'Roster DTO does not leak password or hash');
    assert(!rawList.includes('"path":'), 'Roster DTO does not expose internal disk paths');

    // ── 2. Roster search / filter / sort / pagination ───────
    console.log('\n--- 2. Roster search / filter / sort / pagination ---');
    const searchRes = await api('GET', `/institution/students?search=${encodeURIComponent('Rahul')}`, institutionToken);
    assert(
      searchRes.data?.data?.students?.some((s) => s.email === 'student@skillbridge.dev'),
      'Name search finds the seeded demo student (Rahul Sharma)'
    );

    const statusRes = await api('GET', '/institution/students?status=verified', institutionToken);
    assert(
      statusRes.data?.data?.students?.every((s) => s.status === 'verified') && statusRes.data.data.students.length >= 1,
      'status=verified filter returns only verified students'
    );

    const sortRes = await api('GET', '/institution/students?sort=name&limit=10', institutionToken);
    const names = sortRes.data?.data?.students?.map((s) => s.name) || [];
    const sorted = names.every((n, i) => i === 0 || (names[i - 1].toLowerCase() <= n.toLowerCase()));
    assert(sorted && names.length >= 1, 'sort=name returns students in ascending name order');

    const pageRes = await api('GET', '/institution/students?limit=1&page=1', institutionToken);
    assert(pageRes.data?.data?.students?.length === 1, 'limit=1 pagination returns exactly one student');
    assert(pageRes.data?.data?.pagination?.total === roster.pagination.total, 'Paginated total matches unfiltered total');

    const badPageRes = await api('GET', '/institution/students?page=99999&limit=5', institutionToken);
    assert(badPageRes.status === 200 && badPageRes.data?.data?.students?.length === 0, 'Out-of-range page returns empty array, not an error');
    assert(badPageRes.data?.data?.pagination?.pages > 0, 'Out-of-range page still reports real total pages');

    // ── 3. Single enrollment ────────────────────────────────
    console.log('\n--- 3. Single enrollment ---');
    const singleEmail = `one-${BASE}@skillbridge.dev`;
    const spoofedInstitutionId = '66f000000000000000000000';
    const singleCreate = await api('POST', '/institution/students', institutionToken, {
      body: JSON.stringify({
        name: 'Phase Three One',
        email: singleEmail,
        password: STUDENT_PASS,
        degree: 'B.Tech',
        program: 'B.Tech CSE',
        branch: 'Computer Science & Engineering',
        academicYear: '3rd Year',
        semester: '5',
        division: 'A',
        cgpa: '9.3',
        university: 'Test University',
        institutionId: spoofedInstitutionId,
      }),
    });
    assert(singleCreate.status === 201, 'POST /api/institution/students returns 201 Created');
    assert(singleCreate.data.success === true, 'Single enrollment success flag is true');
    const createdOne = singleCreate.data?.data?.student;
    assert(!!createdOne?._id, 'Created student has an _id');
    assert(createdOne.status === 'verified', 'Created student is immediately verified (global registration unchanged)');
    assert(createdOne.institutionId === institutionUserId, 'Created student institutionId equals the authenticated institution (ownership from session)');
    assert(createdOne.institutionId !== spoofedInstitutionId, 'Client-supplied institutionId in body is IGNORED (no spoofing)');
    assert(createdOne.studentProfile?.degree === 'B.Tech', 'Degree persisted into embedded studentProfile');
    assert(createdOne.studentProfile?.program === 'B.Tech CSE', 'Program persisted into embedded studentProfile');
    assert(createdOne.studentProfile?.cgpa === '9.3', 'CGPA persisted as real value');
    assert(!JSON.stringify(createdOne).includes('password'), 'Created student DTO does not leak password');
    singleStudentId = createdOne._id;
    createdStudentIds.push(createdOne._id);
    createdStudentEmails.push(singleEmail);

    const dupCreate = await api('POST', '/institution/students', institutionToken, {
      body: JSON.stringify({ name: 'Duplicate One', email: singleEmail, password: STUDENT_PASS }),
    });
    assert(dupCreate.status === 409, 'Duplicate email returns 409 Conflict');
    assert(dupCreate.data.success === false, 'Duplicate email failure success flag is false');

    const invalidCreate = await api('POST', '/institution/students', institutionToken, {
      body: JSON.stringify({ email: singleEmail, password: STUDENT_PASS }),
    });
    assert(invalidCreate.status === 400 && invalidCreate.data?.errors?.name, 'Missing name rejected with field error');

    const badPassCreate = await api('POST', '/institution/students', institutionToken, {
      body: JSON.stringify({ name: 'Bad Pass', email: `badpass-${BASE}@skillbridge.dev`, password: 'short' }),
    });
    assert(badPassCreate.status === 400 && badPassCreate.data?.errors?.password, 'Short password rejected with field error');

    const badCgpaCreate = await api('POST', '/institution/students', institutionToken, {
      body: JSON.stringify({ name: 'Bad Cgpa', email: `badcgpa-${BASE}@skillbridge.dev`, password: STUDENT_PASS, cgpa: '12' }),
    });
    assert(badCgpaCreate.status === 400 && badCgpaCreate.data?.errors?.cgpa, 'CGPA above max (10) rejected with field error');

    const badCgpaCreate2 = await api('POST', '/institution/students', institutionToken, {
      body: JSON.stringify({ name: 'Bad Cgpa Two', email: `badcgpa2-${BASE}@skillbridge.dev`, password: STUDENT_PASS, cgpa: '-1' }),
    });
    assert(badCgpaCreate2.status === 400 && badCgpaCreate2.data?.errors?.cgpa, 'Negative CGPA rejected with field error');

    const loginAsStudent = await login(singleEmail, STUDENT_PASS);
    assert(loginAsStudent.status === 200, 'Created student can actually log in (bcrypt hash written, not raw password)');
    assert(loginAsStudent.data.user?.role === 'student', 'Logged-in student role is student');

    // Detail endpoint
    const detail = await api('GET', `/institution/students/${singleStudentId}`, institutionToken);
    assert(detail.status === 200, 'GET /api/institution/students/:id returns 200 OK');
    assert('profile' in detail.data?.data?.student && Array.isArray(detail.data.data.student.documents) && Array.isArray(detail.data.data.student.nocs), 'Student detail exposes profile/documents/nocs boxes');

    const notFound = await api('GET', '/institution/students/not-an-objectid', institutionToken);
    assert(notFound.status === 404, 'Invalid student id returns 404 (no crash)');

    // ── 4. Bulk CSV enrollment ──────────────────────────────
    console.log('\n--- 4. Bulk CSV enrollment ---');
    const bulk1Email = `bulk1-${BASE}@skillbridge.dev`;
    const bulk2Email = `bulk2-${BASE}@skillbridge.dev`;
    const bulkBadEmail = `bulkbad-${BASE}@skillbridge.dev`;
    const bulkProgram = `P3 ECE ${BASE}`;
    const csvText =
      '\uFEFF' +
      'name,email,password,studentId,rollNumber,university,program,branch,academicYear,semester,division,degree,cgpa\r\n' +
      `"Enrolled, Bulk One",${bulk1Email},${STUDENT_PASS},B-001,B-001,Test University,${bulkProgram},Electronics,2nd Year,3,A,B.Tech,8.7\r\n` +
      `Enrolled Bulk Two,${bulk2Email},${STUDENT_PASS},B-002,B-002,Test University,${bulkProgram},Electronics,2nd Year,3,B,B.Tech,7.9\r\n` +
      `Duplicate In File,${bulk1Email},${STUDENT_PASS},B-003,B-003,Test University,${bulkProgram},Electronics,2nd Year,3,C,B.Tech,9.1\r\n` +
      `Existing Demo,student@skillbridge.dev,${STUDENT_PASS},B-004,B-004,Test University,${bulkProgram},Electronics,2nd Year,3,D,B.Tech,8.2\r\n` +
      `Bad Password Row,${bulkBadEmail},short,B-005,B-005,Test University,${bulkProgram},Electronics,2nd Year,3,E,B.Tech,9.0\r\n`;

    const bulkForm = new FormData();
    bulkForm.append('file', new Blob([csvText], { type: 'text/csv' }), `roster-${BASE}.csv`);
    const bulkRes = await fetch(`${API_BASE}/institution/students/bulk`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${institutionToken}` },
      body: bulkForm,
    });
    const bulkData = await bulkRes.json();
    assert(bulkRes.status === 201, 'POST /api/institution/students/bulk returns 201 Created');
    const summary = bulkData.data?.summary;
    assert(!!summary, 'Bulk response contains a summary box');
    assert(summary.total === 5, 'summary.total is the real data-row count (5)');
    assert(summary.created === 2, 'summary.created is exactly the two valid rows (2)');
    assert(summary.skipped === 3, 'summary.skipped is exactly the three problem rows (3)');
    assert(Array.isArray(summary.errors) && summary.errors.length === 3, 'summary.errors lists all skipped rows with reasons');
    assert(
      summary.errors.some((e) => e.email === bulk1Email && String(e.reason).toLowerCase().includes('duplicate')),
      'Duplicate-within-file row flagged with duplicate reason'
    );
    assert(
      summary.errors.some((e) => e.email === 'student@skillbridge.dev' && String(e.reason).toLowerCase().includes('exists')),
      'Existing platform email flagged (skipped, not failed, and demo account untouched)'
    );
    assert(
      summary.errors.some((e) => e.email === bulkBadEmail),
      'Invalid-password row flagged with its row email'
    );
    assert(summary.errors.every((e) => typeof e.row === 'number' && e.row >= 2), 'Every row error reports a numeric 1-based file line (header=1)');

    const bulkSearch = await api('GET', `/institution/students?search=${encodeURIComponent(BASE)}&limit=50`, institutionToken);
    const bulkEmails = bulkSearch.data?.data?.students?.map((s) => s.email) || [];
    assert(bulkEmails.includes(bulk1Email) && bulkEmails.includes(bulk2Email), 'Both valid bulk rows became real enrolled students');
    assert(!bulkEmails.includes(bulkBadEmail), 'Invalid bulk row did NOT become a student');
    assert(!bulkEmails.includes('student@skillbridge.dev'), 'Demo account was not duplicated/re-created by bulk import');

    const progFilter = await api('GET', `/institution/students?program=${encodeURIComponent(bulkProgram)}`, institutionToken);
    const progEmails = progFilter.data?.data?.students?.map((s) => s.email) || [];
    assert(progFilter.data?.data?.students?.every((s) => s.studentProfile?.program === bulkProgram), 'Program filter returns only matching students');
    assert(progEmails.length === 2 && progEmails.includes(bulk1Email) && progEmails.includes(bulk2Email), 'Program filter isolates exactly the two bulk-created students');
    assert(
      (progFilter.data?.data?.facets?.programs || []).includes(bulkProgram),
      'facets.programs reflects the newly imported program'
    );

    const cgpaSort = await api('GET', '/institution/students?sort=cgpa&limit=50', institutionToken);
    const cgpaVals = cgpaSort.data?.data?.students?.map((s) => Number(s.studentProfile?.cgpa || 0));
    assert(
      cgpaVals.every((v, i) => i === 0 || cgpaVals[i - 1] >= v),
      'sort=cgpa orders students by descending CGPA'
    );
    createdStudentIds.push(bulkSearch.data?.data?.students?.find((s) => s.email === bulk1Email)?._id);
    createdStudentIds.push(bulkSearch.data?.data?.students?.find((s) => s.email === bulk2Email)?._id);
    createdStudentEmails.push(bulk1Email, bulk2Email);

    // Missing header → 400
    const noHeaderForm = new FormData();
    noHeaderForm.append('file', new Blob(['John Doe,john-doe@x.com,SomePassword'], { type: 'text/csv' }), 'no-header.csv');
    const noHeaderRes = await fetch(`${API_BASE}/institution/students/bulk`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${institutionToken}` },
      body: noHeaderForm,
    });
    const noHeaderData = await noHeaderRes.json();
    assert(noHeaderRes.status === 400, 'CSV without name/email/password header returns 400');
    assert(noHeaderData.success === false, 'Missing-header failure success flag is false');

    // Non-CSV file → 400
    const badTypeForm = new FormData();
    badTypeForm.append('file', new Blob(['%PDF-1.4'], { type: 'application/pdf' }), 'roster.pdf');
    const badTypeRes = await fetch(`${API_BASE}/institution/students/bulk`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${institutionToken}` },
      body: badTypeForm,
    });
    const badTypeData = await badTypeRes.json();
    assert(badTypeRes.status === 400, 'Non-CSV upload to bulk endpoint returns 400');
    assert(badTypeData.success === false, 'Non-CSV rejection success flag is false');

    // No file → 400
    const noFileRes = await api('POST', '/institution/students/bulk', institutionToken, { json: false, body: null });
    assert(noFileRes.status === 400, 'Bulk endpoint without attached CSV returns 400');

    // ── 5. Academic verification ───────────────────────────
    console.log('\n--- 5. Academic verification ---');
    const verifyEmail = `verify-${BASE}@skillbridge.dev`;
    const verifyCreate = await api('POST', '/institution/students', institutionToken, {
      body: JSON.stringify({ name: 'Verify Me', email: verifyEmail, password: STUDENT_PASS, degree: 'B.Sc', cgpa: '8.1' }),
    });
    verifyStudentId = verifyCreate.data?.data?.student?._id;
    assert(!!verifyStudentId, 'Verification-target student created');
    createdStudentIds.push(verifyStudentId);
    createdStudentEmails.push(verifyEmail);

    const verifyNote = 'Transcript verified against university records on ' + new Date().toISOString().slice(0, 10) + '.';
    const verifyRes = await api('PATCH', `/institution/students/${verifyStudentId}/verify`, institutionToken, {
      body: JSON.stringify({ note: verifyNote }),
    });
    assert(verifyRes.status === 200, 'PATCH /api/institution/students/:id/verify returns 200 OK');
    assert(verifyRes.data.success === true, 'Verification success flag is true');
    const verifiedStudent = verifyRes.data?.data?.student;
    assert(verifiedStudent?.studentProfile?.academicVerified === true, 'academicVerified set to true');
    assert(verifiedStudent.studentProfile.academicVerifiedBy === institutionUserId, 'academicVerifiedBy records the authenticating institution');
    assert(!!verifiedStudent.studentProfile.academicVerifiedAt, 'academicVerifiedAt timestamp recorded');
    assert(verifiedStudent.studentProfile.academicVerificationNote === verifyNote, 'Verification note persisted verbatim');

    const verifyStudentLogin = await login(verifyEmail, STUDENT_PASS);
    assert(verifyStudentLogin.status === 200, 'Verified student can log in');
    const studentNotifs = await fetch(`${API_BASE}/student/notifications`, {
      headers: { Authorization: `Bearer ${verifyStudentLogin.data.token}` },
    });
    const notifData = await studentNotifs.json();
    const notifs = notifData.data?.notifications || notifData.data || [];
    assert(
      notifs.some((n) => String(n.title).includes('Academic credentials verified')),
      'Student received an "Academic credentials verified" notification'
    );

    const longNote = await api('PATCH', `/institution/students/${verifyStudentId}/verify`, institutionToken, {
      body: JSON.stringify({ note: 'x'.repeat(1001) }),
    });
    assert(longNote.status === 400 && longNote.data?.errors?.note, 'Verification note over 1000 chars rejected with field error');

    // ── 6. Academic corrections → verification reset ───────
    console.log('\n--- 6. Academic corrections reset verification ---');
    const updRes = await api('PATCH', `/institution/students/${verifyStudentId}`, institutionToken, {
      body: JSON.stringify({ degree: 'B.Sc (Hons)', cgpa: '8.6' }),
    });
    assert(updRes.status === 200, 'PATCH /api/institution/students/:id (academic correction) returns 200 OK');
    const updatedStudent = updRes.data?.data?.student;
    assert(updatedStudent?.studentProfile?.degree === 'B.Sc (Hons)', 'Corrected degree persisted');
    assert(updatedStudent.studentProfile.cgpa === '8.6', 'Corrected CGPA persisted');
    assert(updatedStudent.studentProfile.academicVerified === false, 'Academic change AFTER verification resets academicVerified to false');
    assert(updatedStudent.studentProfile.academicVerifiedBy === null, 'Academic change clears academicVerifiedBy');
    assert(updatedStudent.studentProfile.academicVerifiedAt === null, 'Academic change clears academicVerifiedAt');
    assert(
      String(updatedStudent.studentProfile.academicVerificationNote).toLowerCase().includes('reset'),
      'Academic change writes an explanatory reset note'
    );

    const updBadCgpa = await api('PATCH', `/institution/students/${verifyStudentId}`, institutionToken, {
      body: JSON.stringify({ cgpa: '99' }),
    });
    assert(updBadCgpa.status === 400 && updBadCgpa.data?.errors?.cgpa, 'Invalid CGPA on correction rejected');

    // ── 7. Soft deactivation ───────────────────────────────
    console.log('\n--- 7. Soft deactivation ---');
    const deactEmail = `deact-${BASE}@skillbridge.dev`;
    const deactCreate = await api('POST', '/institution/students', institutionToken, {
      body: JSON.stringify({ name: 'Deactivate Me', email: deactEmail, password: STUDENT_PASS }),
    });
    deactivatedStudentId = deactCreate.data?.data?.student?._id;
    assert(!!deactivatedStudentId, 'Deactivation-target student created');
    createdStudentIds.push(deactivatedStudentId);
    createdStudentEmails.push(deactEmail);

    const deactRes = await api('DELETE', `/institution/students/${deactivatedStudentId}`, institutionToken);
    assert(deactRes.status === 200 && deactRes.data.success === true, 'DELETE /api/institution/students/:id returns 200 success');

    const deactDetail = await api('GET', `/institution/students/${deactivatedStudentId}`, institutionToken);
    assert(deactDetail.status === 200 && deactDetail.data?.data?.student?.status === 'deactivated', 'Deactivated student record is STILL present (soft delete, not removed)');

    const deactList = await api('GET', '/institution/students?status=deactivated', institutionToken);
    assert(deactList.data?.data?.students?.some((s) => s._id === deactivatedStudentId), 'Deactivated student still listed under status=deactivated');

    const deactLogin = await login(deactEmail, STUDENT_PASS);
    assert(deactLogin.status === 403 && deactLogin.data?.status === 'deactivated', 'Deactivated student login blocked with status deactivated');

    const deactTwice = await api('DELETE', `/institution/students/${deactivatedStudentId}`, institutionToken);
    assert(deactTwice.status === 409, 'Double-deactivation returns 409 (already deactivated)');

    // ── 8. NOC issuance & document lifecycle ───────────────
    console.log('\n--- 8. NOC issuance & document lifecycle ---');
    const nocEmail = `noc-${BASE}@skillbridge.dev`;
    const nocCreate = await api('POST', '/institution/students', institutionToken, {
      body: JSON.stringify({ name: 'NOC Me', email: nocEmail, password: STUDENT_PASS, degree: 'M.Tech' }),
    });
    nocStudentId = nocCreate.data?.data?.student?._id;
    assert(!!nocStudentId, 'NOC-target student created');
    createdStudentIds.push(nocStudentId);
    createdStudentEmails.push(nocEmail);

    const pdfBytes = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF');
    const nocForm = new FormData();
    nocForm.append('reason', 'internship');
    nocForm.append('issueDate', '2026-07-01');
    nocForm.append('validity', '2027-06-30');
    nocForm.append('file', new Blob([pdfBytes], { type: 'application/pdf' }), 'noc-document.pdf');

    const nocRes = await fetch(`${API_BASE}/institution/students/${nocStudentId}/noc`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${institutionToken}` },
      body: nocForm,
    });
    const nocData = await nocRes.json();
    assert(nocRes.status === 201, 'POST /api/institution/students/:id/noc returns 201 Created');
    const noc = nocData.data?.noc;
    assert(!!noc?._id, 'NOC record returned with _id');
    assert(/^NOC-\d{4}-[0-9A-F]+$/.test(noc.issueNumber), 'NOC issueNumber follows NOC-yyyy-random pattern');
    assert(noc.status === 'Issued', 'NOC status defaults to Issued');
    assert(noc.reason === 'internship', 'NOC reason persisted (internship)');
    assert(noc.document?.originalName === 'noc-document.pdf', 'NOC document original name kept');
    assert(noc.document?.mimeType === 'application/pdf', 'NOC document mime type kept');
    assert(noc.document?.size > 0, 'NOC document size positive (real file on disk)');
    assert(!JSON.stringify(noc).includes('"path":'), 'NOC DTO does not expose server disk path');
    nocRecordId = noc._id;

    const nocList = await api('GET', `/institution/students/${nocStudentId}/noc`, institutionToken);
    assert(nocList.status === 200 && Array.isArray(nocList.data?.data?.nocs), 'GET /api/institution/students/:id/noc lists NOCs');
    assert(nocList.data?.data?.nocs?.some((r) => r._id === nocRecordId), 'Issued NOC appears in the student NOC list');

    const viewDoc = await fetch(`${API_BASE}/institution/noc/${nocRecordId}/document/view`, {
      headers: { Authorization: `Bearer ${institutionToken}` },
    });
    assert(viewDoc.status === 200, 'GET noc/:id/document/view returns 200 OK');
    assert((viewDoc.headers.get('content-type') || '').includes('application/pdf'), 'View response Content-Type is application/pdf');

    const downDoc = await fetch(`${API_BASE}/institution/noc/${nocRecordId}/document/download`, {
      headers: { Authorization: `Bearer ${institutionToken}` },
    });
    assert(downDoc.status === 200, 'GET noc/:id/document/download returns 200 OK');
    assert((downDoc.headers.get('content-disposition') || '').includes('attachment'), 'Download response forces attachment disposition');

    // NOC without a document (plain JSON) + validation
    const nocJson = await api('POST', `/institution/students/${nocStudentId}/noc`, institutionToken, {
      body: JSON.stringify({ reason: 'placement' }),
    });
    assert(nocJson.status === 201, 'NOC can be issued via plain JSON without an attached document');
    assert(nocJson.data?.data?.noc?.document === null && nocJson.data.data.noc.reason === 'placement', 'JSON NOC has no document and reason placement');

    const nocBadReason = await api('POST', `/institution/students/${nocStudentId}/noc`, institutionToken, {
      body: JSON.stringify({ reason: 'bogus' }),
    });
    assert(nocBadReason.status === 400 && nocBadReason.data?.errors?.reason, 'Invalid NOC reason rejected with field error');

    const nocBadDates = await api('POST', `/institution/students/${nocStudentId}/noc`, institutionToken, {
      body: JSON.stringify({ reason: 'internship', issueDate: '2030-01-01', validity: '2029-01-01' }),
    });
    assert(nocBadDates.status === 400 && nocBadDates.data?.errors?.validity, 'NOC validity earlier than issue date rejected');

    const nocList2 = await api('GET', `/institution/students/${nocStudentId}/noc`, institutionToken);
    assert(nocList2.data?.data?.nocs?.length === 2, 'Student NOC list reflects both issued NOCs');

    const nocStudentLogin = await login(nocEmail, STUDENT_PASS);
    const nocNotifs = await (await fetch(`${API_BASE}/student/notifications`, {
      headers: { Authorization: `Bearer ${nocStudentLogin.data.token}` },
    })).json();
    const nList = nocNotifs.data?.notifications || nocNotifs.data || [];
    assert(nList.some((n) => String(n.title).includes('NOC issued')), 'Student received a "NOC issued" notification');

    // ── 9. Role & auth isolation ───────────────────────────
    console.log('\n--- 9. Role & auth isolation on Phase 3 endpoints ---');
    const studentLogin = await login('student@skillbridge.dev', 'Student@123');
    studentToken = studentLogin.data.token;
    const facLogin = await login('faculty@skillbridge.dev', 'Faculty@123');
    facultyToken = facLogin.data.token;
    const indLogin = await login('industry@skillbridge.dev', 'Industry@123');
    const admLogin = await login('admin@skillbridge.dev', 'Admin@123');

    for (const [label, token] of [['student', studentToken], ['faculty', facultyToken], ['industry', indLogin.data.token], ['admin', admLogin.data.token]]) {
      const r = await api('GET', '/institution/students', token);
      assert(r.status === 403, `${label} listing /api/institution/students returns 403`);
    }
    const studentCreate = await api('POST', '/institution/students', studentToken, {
      body: JSON.stringify({ name: 'Nope', email: `nope-${BASE}@skillbridge.dev`, password: STUDENT_PASS }),
    });
    assert(studentCreate.status === 403, 'Student creating a student returns 403');
    const studentVerify = await api('PATCH', `/institution/students/${singleStudentId}/verify`, studentToken, { body: JSON.stringify({}) });
    assert(studentVerify.status === 403, 'Student verifying a student returns 403');
    const facultyNocDoc = await fetch(`${API_BASE}/institution/noc/${nocRecordId}/document/view`, {
      headers: { Authorization: `Bearer ${facultyToken}` },
    });
    assert(facultyNocDoc.status === 403, 'Faculty viewing NOC document returns 403');

    const anonList = await api('GET', '/institution/students', null);
    assert(anonList.status === 401, 'Anonymous GET /api/institution/students returns 401');
    const anonBulk = await api('POST', '/institution/students/bulk', null, { json: false, body: null });
    assert(anonBulk.status === 401, 'Anonymous bulk enrollment returns 401');
    const anonDetail = await api('GET', `/institution/students/${singleStudentId}`, null);
    assert(anonDetail.status === 401, 'Anonymous student detail returns 401');

    // ── 10. Ownership isolation (Institution B) ────────────
    console.log('\n--- 10. Ownership isolation (Institution A vs B) ---');
    const regRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'institution',
        name: 'Phase3 Isolation Institute',
        email: TEMP_EMAIL,
        password: TEMP_PASS,
        institutionName: 'Phase3 Isolation Institute',
        aisheCode: 'ISO-9000',
        contactPerson: 'Phase3 Tester',
        address: 'Isolation Campus, Test City',
      }),
    });
    registeredTemp = true;
    const regData = await regRes.json();
    assert(regRes.status === 200 || regRes.status === 201, `Second institution registers (${regRes.status})`);
    tempInstitutionUserId = regData.user?.id || regData.user?._id || '';
    institutionBId = tempInstitutionUserId;

    const bLogin = await login(TEMP_EMAIL, TEMP_PASS);
    assert(!!bLogin.data?.token, 'Second institution authenticates');
    const bToken = bLogin.data.token;

    const bRoster = await api('GET', '/institution/students', bToken);
    assert(bRoster.status === 200, 'Institution B GET /students returns 200');
    assert(bRoster.data?.data?.students?.length === 0 && bRoster.data.data.pagination.total === 0, 'Institution B sees an EMPTY own roster (fully isolated)');
    assert(
      !JSON.stringify(bRoster.data.data).includes('student@skillbridge.dev') && !JSON.stringify(bRoster.data.data).includes('skillbridge.dev'),
      'Institution B response leaks no Institution A student data'
    );

    const bReadA = await api('GET', `/institution/students/${singleStudentId}`, bToken);
    assert(bReadA.status === 404, 'Institution B cannot read Institution A student (404)');
    const bVerifyA = await api('PATCH', `/institution/students/${singleStudentId}/verify`, bToken, { body: JSON.stringify({}) });
    assert(bVerifyA.status === 404, 'Institution B cannot verify Institution A student (404)');
    const bUpdateA = await api('PATCH', `/institution/students/${singleStudentId}`, bToken, { body: JSON.stringify({ degree: 'Hacked' }) });
    assert(bUpdateA.status === 404, 'Institution B cannot edit Institution A student (404)');
    const bDeleteA = await api('DELETE', `/institution/students/${singleStudentId}`, bToken);
    assert(bDeleteA.status === 404, 'Institution B cannot deactivate Institution A student (404)');
    const bNocA = await api('POST', `/institution/students/${singleStudentId}/noc`, bToken, { body: JSON.stringify({ reason: 'internship' }) });
    assert(bNocA.status === 404, 'Institution B cannot issue NOC for Institution A student (404)');
    const bNocDocA = await fetch(`${API_BASE}/institution/noc/${nocRecordId}/document/view`, {
      headers: { Authorization: `Bearer ${bToken}` },
    });
    assert(bNocDocA.status === 404, 'Institution B cannot view Institution A NOC document (404)');

    // Spoofed institutionId query param ignored on BOTH sides
    const bSpoof = await api('GET', `/institution/students?institutionId=${institutionUserId}`, bToken);
    assert(bSpoof.status === 200 && bSpoof.data?.data?.students?.length === 0, 'Institution B roster unchanged despite spoofed ?institutionId= (no cross-tenant read)');

    const aSpoof = await api('GET', `/institution/students?institutionId=${institutionBId}&limit=100`, institutionToken);
    const aNormal = await api('GET', '/institution/students?limit=100', institutionToken);
    const aSpoofIds = (aSpoof.data?.data?.students || []).map((s) => s._id).sort();
    const aNormalIds = (aNormal.data?.data?.students || []).map((s) => s._id).sort();
    assert(
      JSON.stringify(aSpoofIds) === JSON.stringify(aNormalIds) &&
        aSpoof.data?.data?.students?.every((s) => s.institutionId === institutionUserId),
      'Institution A roster identical with/without spoofed param, all owned by A (session-scoped)'
    );

    // ── 11. Detail after all mutations (honest noise checks) ──
    console.log('\n--- 11. Student detail integrity post-mutations ---');
    const finalDetail = await api('GET', `/institution/students/${nocStudentId}`, institutionToken);
    const finalStudent = finalDetail.data?.data?.student;
    assert(finalStudent?.nocsCount === 2 && finalStudent.nocs?.length === 2, 'Detail nocsCount reflects exactly the issued NOCs');
    assert(!JSON.stringify(finalStudent).includes('password'), 'Detail DTO still leaks no password');
    assert(!JSON.stringify(finalStudent).includes('"path":'), 'Detail DTO exposes no internal disk path');

  } catch (err) {
    console.error('Unexpected test error:', err);
    failed++;
  }

  // ── Cleanup: remove temporary records ─────────────────────
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