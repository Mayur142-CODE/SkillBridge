/**
 * Phase 1 Integration Test Suite — Educational Institution Panel Foundation
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Verifies:
 * 1. Institution login (institution@skillbridge.dev / Institution@123)
 * 2. Institution dashboard retrieval (GET /api/institution/dashboard) with
 *    real, scoped, non-fabricated data (identity profile / roster /
 *    pending approvals / applications pipeline / notifications)
 * 3. Application pipeline statuses sum exactly to total (no fake numbers)
 * 4. Student cannot access institution dashboard (403 Forbidden)
 * 5. Faculty cannot access institution dashboard (403 Forbidden)
 * 6. Industry cannot access institution dashboard (403 Forbidden)
 * 7. Admin follows project requireRole() policy (403 on institution routes)
 * 8. Unauthenticated request → 401 Unauthorized
 * 9. Ownership isolation: second institution sees ONLY its own (zero) data,
 *    never ABC Institute's; a spoofed ?institutionId= query param is ignored
 * 10. Notifications endpoints (GET /api/institution/notifications,
 *     PATCH /api/institution/notifications/read-all)
 * 11. Institution logout (POST /api/auth/logout)
 * 12. Temp isolation-test institution cleaned up from MongoDB afterwards
 */

const path = require('path');
const fs = require('fs');

const API_BASE = 'http://127.0.0.1:5000/api';
const CLIENT_BASE = 'http://localhost:5173';

const TEMP_EMAIL = `isolation-test-${Date.now()}@skillbridge.dev`;
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

  async function cleanupTempInstitution() {
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

      await ensureNodeDns();
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 20000 });
      if (tempInstitutionUserId) {
        await mongoose.model('Notification').deleteMany({ user: tempInstitutionUserId });
      }
      const del = await mongoose.model('User').deleteOne({ email: TEMP_EMAIL });
      const removed = del.deletedCount === 1;
      assert(removed, 'Temporary isolation-test institution removed from MongoDB (cleanup)');
      await mongoose.disconnect();
    } catch (err) {
      console.error(`  ⚠️ Cleanup warning (non-fatal): ${err.message}`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🏛️ SkillBridge Institution Panel Phase 1 Test Suite');
  console.log('═══════════════════════════════════════════════════════════════\n');

  let institutionToken = '';
  let studentToken = '';
  let facultyToken = '';

  try {
    // ── 1. Institution Login ──────────────────────────────────
    console.log('--- 1. Institution Login ---');
    const instLogin = await login('institution@skillbridge.dev', 'Institution@123');
    assert(instLogin.status === 200, 'Institution login returns 200 OK');
    assert(instLogin.data.success === true, 'Institution login success flag is true');
    assert(!!instLogin.data.token, 'Institution login returns valid JWT token');
    assert(instLogin.data.user?.role === 'institution', "Institution user role is 'institution'");
    assert(instLogin.data.user?.email === 'institution@skillbridge.dev', 'Institution email matches');
    institutionToken = instLogin.data.token;

    // ── 2. Institution Dashboard API ─────────────────────────
    console.log('\n--- 2. Institution Dashboard API ---');
    const dashRes = await fetch(`${API_BASE}/institution/dashboard`, {
      headers: {
        Authorization: `Bearer ${institutionToken}`,
        'Content-Type': 'application/json',
      },
    });
    assert(dashRes.status === 200, 'GET /api/institution/dashboard returns 200 OK');
    const dashData = await dashRes.json();
    assert(dashData.success === true, 'Dashboard response success flag is true');

    // Identity profile (real, from the demo institution account)
    const profile = dashData.data?.profile;
    assert(!!profile, 'Dashboard contains institution identity profile');
    assert(profile?.institutionName === 'ABC Institute of Technology', 'Institution name is real (ABC Institute of Technology)');
    assert(typeof profile?.aisheCode === 'string' && profile.aisheCode.length > 0, 'AISHE code present');
    assert(typeof profile?.contactPerson === 'string' && profile.contactPerson.length > 0, 'Contact person present');
    assert(typeof profile?.status === 'string', 'Account status is a string');

    // Roster metrics: honest, typed (no fake numbers)
    const roster = dashData.data?.roster;
    assert(!!roster, 'Dashboard contains roster metrics');
    for (const group of ['students', 'faculty']) {
      for (const key of ['total', 'verified', 'pending']) {
        assert(
          typeof roster?.[group]?.[key] === 'number' && roster[group][key] >= 0 && Number.isFinite(roster[group][key]),
          `roster.${group}.${key} is a non-negative finite number (honest metric)`
        );
      }
    }
    assert(roster?.students?.total >= 1, 'Roster reflects real students registered under the institution (>= 1, seeded data present)');
    assert(roster?.faculty?.total >= 1, 'Roster reflects real faculty registered under the institution (>= 1, seeded data present)');
    assert(
      roster.students.verified + roster.students.pending === roster.students.total,
      'Student verified + pending sums exactly to total (honest status accounting)'
    );
    assert(
      roster.faculty.verified + roster.faculty.pending === roster.faculty.total,
      'Faculty verified + pending sums exactly to total (honest status accounting)'
    );
    assert(Array.isArray(roster?.departments), 'roster.departments is an array');
    assert(Array.isArray(roster?.programs), 'roster.programs is an array');
    assert(
      roster.departments.length >= 1 &&
        roster.departments.every((d) => typeof d.department === 'string' && d.department.length > 0 && typeof d.count === 'number' && d.count > 0),
      'Departments are typed, non-empty, and aggregated from real faculty records'
    );
    assert(
      roster.programs.length >= 1 &&
        roster.programs.every((p) => typeof p.program === 'string' && p.program.length > 0 && typeof p.count === 'number' && p.count > 0),
      'Programs are typed, non-empty, and aggregated from real student records'
    );

    // Pending approvals
    const pendingActions = dashData.data?.pendingActions;
    assert(!!pendingActions, 'Dashboard contains pending actions');
    assert(typeof pendingActions?.total === 'number' && pendingActions.total >= 0, 'pendingActions.total is a non-negative number');
    assert(
      typeof pendingActions?.students === 'number' && typeof pendingActions?.faculty === 'number',
      'pendingActions exposes typed student/faculty breakdown'
    );

    // Application overview: pipeline must sum exactly to total
    const apps = dashData.data?.applications;
    assert(!!apps, 'Dashboard contains application metrics');
    for (const key of ['total', 'applied', 'shortlisted', 'interview', 'selected', 'rejected', 'withdrawn', 'completed', 'inProgress']) {
      assert(
        typeof apps?.[key] === 'number' && apps[key] >= 0 && Number.isFinite(apps[key]),
        `applications.${key} is a non-negative finite number (honest metric)`
      );
    }
    const statusSum = (apps?.applied || 0) + (apps?.shortlisted || 0) + (apps?.interview || 0) + (apps?.selected || 0) + (apps?.rejected || 0) + (apps?.withdrawn || 0);
    assert(statusSum === apps?.total, 'Application pipeline statuses sum exactly to total (no double count / no fake numbers)');
    assert(typeof apps?.interviews === 'number' && apps.interviews >= 0, 'applications.interviews is a non-negative number');
    assert(typeof apps?.offers === 'number' && apps.offers >= 0, 'applications.offers is a non-negative number');
    assert(Array.isArray(apps?.engagement), 'applications.engagement is an array');
    assert(Array.isArray(apps?.recent), 'applications.recent is an array');

    // Notifications: user-scoped, typed
    const notifs = dashData.data?.notifications;
    assert(!!notifs, 'Dashboard contains notifications');
    assert(typeof notifs?.unreadCount === 'number' && notifs.unreadCount >= 0, 'notifications.unreadCount is a non-negative number');
    assert(Array.isArray(notifs?.recent), 'notifications.recent is an array');

    // No password/JWT/private fields leaking into the DTO
    const raw = JSON.stringify(dashData.data);
    assert(!raw.includes('password'), 'Dashboard DTO does not expose password fields');

    // ── 3. Student Cannot Access Institution Dashboard ────────
    console.log('\n--- 3. Role Isolation: Student Access Blocked ---');
    const studentLogin = await login('student@skillbridge.dev', 'Student@123');
    assert(studentLogin.status === 200, 'Student logs in successfully');
    studentToken = studentLogin.data.token;

    const studentToInstRes = await fetch(`${API_BASE}/institution/dashboard`, {
      headers: {
        Authorization: `Bearer ${studentToken}`,
        'Content-Type': 'application/json',
      },
    });
    assert(studentToInstRes.status === 403, 'Student accessing /api/institution/dashboard returns 403 Forbidden');
    const studentDenied = await studentToInstRes.json();
    assert(studentDenied.success === false, 'Student access denied success is false');

    // ── 4. Faculty Cannot Access Institution Dashboard ────────
    console.log('\n--- 4. Role Isolation: Faculty Access Blocked ---');
    const facLogin = await login('faculty@skillbridge.dev', 'Faculty@123');
    assert(facLogin.status === 200, 'Faculty logs in successfully');
    facultyToken = facLogin.data.token;

    const facToInstRes = await fetch(`${API_BASE}/institution/dashboard`, {
      headers: {
        Authorization: `Bearer ${facultyToken}`,
        'Content-Type': 'application/json',
      },
    });
    assert(facToInstRes.status === 403, 'Faculty accessing /api/institution/dashboard returns 403 Forbidden');
    const facDenied = await facToInstRes.json();
    assert(facDenied.success === false, 'Faculty access denied success is false');

    // ── 5. Industry Cannot Access Institution Dashboard ───────
    console.log('\n--- 5. Role Isolation: Industry Access Blocked ---');
    const indLogin = await login('industry@skillbridge.dev', 'Industry@123');
    assert(indLogin.status === 200, 'Industry logs in successfully');

    const indToInstRes = await fetch(`${API_BASE}/institution/dashboard`, {
      headers: {
        Authorization: `Bearer ${indLogin.data.token}`,
        'Content-Type': 'application/json',
      },
    });
    assert(indToInstRes.status === 403, 'Industry accessing /api/institution/dashboard returns 403 Forbidden');
    const indDenied = await indToInstRes.json();
    assert(indDenied.success === false, 'Industry access denied success is false');

    // ── 6. Admin Follows Existing requireRole() Policy ───────
    console.log('\n--- 6. Admin Follows Existing Authorization Policy ---');
    const admLogin = await login('admin@skillbridge.dev', 'Admin@123');
    assert(admLogin.status === 200, 'Admin logs in successfully');
    const admToInstRes = await fetch(`${API_BASE}/institution/dashboard`, {
      headers: {
        Authorization: `Bearer ${admLogin.data.token}`,
        'Content-Type': 'application/json',
      },
    });
    assert(admToInstRes.status === 403, 'Admin accessing /api/institution/dashboard returns 403 via project requireRole() policy (no new admin rules invented)');
    const admDenied = await admToInstRes.json();
    assert(admDenied.success === false, 'Admin access denied success is false');

    // ── 7. Unauthenticated Request → 401 ─────────────────────
    console.log('\n--- 7. Unauthenticated Request Security ---');
    const unauthRes = await fetch(`${API_BASE}/institution/dashboard`);
    assert(unauthRes.status === 401, 'Unauthenticated GET /api/institution/dashboard returns 401 Unauthorized');
    const unauthData = await unauthRes.json();
    assert(unauthData.success === false, 'Unauthenticated response success is false');

    // ── 8. Ownership Isolation ───────────────────────────────
    console.log('\n--- 8. Ownership Isolation (Institution A vs Institution B) ---');
    // Create a second, independent institution through the real register API
    const regRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'institution',
        name: 'Isolation Test Institute',
        email: TEMP_EMAIL,
        password: TEMP_PASS,
        institutionName: 'Isolation Test Institute',
        aisheCode: 'ISO-9000',
        contactPerson: 'Isolation Tester',
        address: 'Test Campus, Test City',
      }),
    });
    const regData = await regRes.json();
    assert(regRes.status === 200 || regRes.status === 201, `Second institution registers (${regRes.status})`);
    assert(regData.success === true, 'Second institution registration succeeds');
    tempInstitutionUserId = regData.user?.id || regData.user?._id || '';

    const instBLogin = await login(TEMP_EMAIL, TEMP_PASS);
    assert(!!instBLogin.data?.token, 'Second institution can authenticate');

    const instBDashRes = await fetch(`${API_BASE}/institution/dashboard`, {
      headers: {
        Authorization: `Bearer ${instBLogin.data.token}`,
        'Content-Type': 'application/json',
      },
    });
    assert(instBDashRes.status === 200, 'Second institution GET /api/institution/dashboard returns 200 OK');
    const instBDash = await instBDashRes.json();

    assert(
      instBDash.data?.profile?.institutionName === 'Isolation Test Institute',
      'Institution B dashboard reflects ONLY its own identity (not ABC Institute)'
    );
    assert(instBDash.data?.roster?.students?.total === 0, 'Institution B sees zero students (isolated from ABC roster)');
    assert(instBDash.data?.roster?.faculty?.total === 0, 'Institution B sees zero faculty (isolated from ABC roster)');
    assert(instBDash.data?.applications?.total === 0, 'Institution B sees zero applications (isolated from ABC data)');
    assert(!JSON.stringify(instBDash.data).includes('ABC Institute of Technology'), 'Institution B response contains no ABC data leak');

    // Frontend-supplied institution IDs are never trusted:
    const spoofStudentId = studentLogin.data.user?._id || 'student-unknown';
    const spoofRes = await fetch(`${API_BASE}/institution/dashboard?institutionId=${spoofStudentId}`, {
      headers: {
        Authorization: `Bearer ${institutionToken}`,
        'Content-Type': 'application/json',
      },
    });
    const spoofData = await spoofRes.json();
    assert(spoofRes.status === 200, 'Spoofed ?institutionId= query param does not error the endpoint');
    assert(
      JSON.stringify(spoofData.data) === JSON.stringify(dashData.data),
      'Spoofed institutionId query param is ignored — response remains Institution A’s own dashboard'
    );
    assert(
      spoofData.data?.profile?.institutionName === 'ABC Institute of Technology',
      'Institution A still sees its OWN data despite spoofed param (no cross-tenant read)'
    );

    // ── 9. Notifications Endpoints ───────────────────────────
    console.log('\n--- 9. Notifications Endpoints ---');
    const notifListRes = await fetch(`${API_BASE}/institution/notifications`, {
      headers: {
        Authorization: `Bearer ${institutionToken}`,
        'Content-Type': 'application/json',
      },
    });
    assert(notifListRes.status === 200, 'GET /api/institution/notifications returns 200 OK');
    const notifList = await notifListRes.json();
    assert(Array.isArray(notifList.data?.notifications || notifList.data), 'Notifications list is an array');

    const markAllRes = await fetch(`${API_BASE}/institution/notifications/read-all`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${institutionToken}`,
        'Content-Type': 'application/json',
      },
    });
    assert(markAllRes.status === 200, 'PATCH /api/institution/notifications/read-all returns 200 OK');

    const notifRingRes = await fetch(`${API_BASE}/institution/dashboard`, {
      headers: {
        Authorization: `Bearer ${institutionToken}`,
        'Content-Type': 'application/json',
      },
    });
    const notifRing = await notifRingRes.json();
    assert(notifRing.data?.notifications?.unreadCount === 0, 'After read-all, unread count is genuinely zero');

    // ── 10. Institutions route loads ──────────────────────────
    console.log('\n--- 10. Frontend Institution Route Accessibility ---');
    try {
      const clientRes = await fetch(`${CLIENT_BASE}/institution`);
      assert(clientRes.status === 200, 'Vite dev server returns 200 OK for /institution');
      const html = await clientRes.text();
      assert(html.includes('id="root"') || html.includes('SkillBridge'), 'HTML contains SkillBridge application root container');
    } catch (e) {
      console.log(`  ℹ️ Vite dev server check skipped (not running): ${e.message}`);
    }

    // ── 11. Institution Logout ────────────────────────────────
    console.log('\n--- 11. Institution Logout ---');
    const logoutRes = await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${institutionToken}`,
        'Content-Type': 'application/json',
      },
    });
    assert(logoutRes.status === 200, 'POST /api/auth/logout returns 200 OK');
    const logoutData = await logoutRes.json();
    assert(logoutData.success === true, 'Logout success flag is true');

    // ── 12. Frontend Production Build Artifact ───────────────
    console.log('\n--- 12. Frontend Build Artifact Present ---');
    const clientDist = path.resolve(__dirname, '../client/dist');
    const indexHtml = path.join(clientDist, 'index.html');
    assert(fs.existsSync(indexHtml), 'client/dist/index.html exists (production build artifact)');

  } catch (err) {
    console.error('Unexpected test error:', err);
    failed++;
  }

  // ── Cleanup: remove the temporary second institution ────────
  console.log('\n--- Cleanup ---');
  await cleanupTempInstitution();

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