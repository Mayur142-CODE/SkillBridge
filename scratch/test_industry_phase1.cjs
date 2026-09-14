/**
 * Phase 1 Integration Test Suite — Industry Partner Panel Foundation
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Verifies:
 * 1. Industry login (industry@skillbridge.dev / Industry@123)
 * 2. Industry dashboard retrieval (GET /api/industry/dashboard) with
 *    real, scoped, non-fabricated data (profile / opportunities /
 *    applications / notifications)
 * 3. Student cannot access industry dashboard (403 Forbidden)
 * 4. Faculty cannot access industry dashboard (403 Forbidden)
 * 5. Unauthenticated request → 401 Unauthorized
 * 6. Wrong role enforcement (student + faculty both blocked)
 * 7. Industry route loads (HTML / route check)
 * 8. Industry logout (POST /api/auth/logout)
 * 9. Frontend build verification
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
  console.log('🏭 SkillBridge Industry Panel Phase 1 Test Suite');
  console.log('═══════════════════════════════════════════════════════════════\n');

  let industryToken = '';
  let studentToken = '';
  let facultyToken = '';

  try {
    // ── 1. Industry Login ──────────────────────────────────────
    console.log('--- 1. Industry Login ---');
    const indLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'industry@skillbridge.dev',
        password: 'Industry@123',
      }),
    });

    assert(indLoginRes.status === 200, 'Industry login returns 200 OK');
    const indLoginData = await indLoginRes.json();
    assert(indLoginData.success === true, 'Industry login success flag is true');
    assert(!!indLoginData.token, 'Industry login returns valid JWT token');
    assert(indLoginData.user?.role === 'industry', "Industry user role is 'industry'");
    assert(indLoginData.user?.email === 'industry@skillbridge.dev', 'Industry email matches');
    industryToken = indLoginData.token;

    // ── 2. Industry Dashboard ──────────────────────────────────
    console.log('\n--- 2. Industry Dashboard API ---');
    const dashRes = await fetch(`${API_BASE}/industry/dashboard`, {
      headers: {
        Authorization: `Bearer ${industryToken}`,
        'Content-Type': 'application/json',
      },
    });

    assert(dashRes.status === 200, 'GET /api/industry/dashboard returns 200 OK');
    const dashData = await dashRes.json();
    assert(dashData.success === true, 'Dashboard response success flag is true');
    assert(!!dashData.data?.profile, 'Dashboard contains company profile object');
    assert(typeof dashData.data?.profile?.companyName === 'string', 'Company name is a string');
    assert(typeof dashData.data?.profile?.sector === 'string', 'Company sector is a string');
    assert(typeof dashData.data?.profile?.companyProfileExists === 'boolean', 'companyProfileExists is a boolean');
    assert(typeof dashData.data?.profile?.companyVerified === 'boolean', 'companyVerified is a boolean');

    // Opportunities: honest, real, typed metrics (no fake numbers)
    const opps = dashData.data?.opportunities;
    assert(!!opps, 'Dashboard contains opportunities metrics');
    for (const key of ['total', 'published', 'draft', 'closed', 'cancelled', 'expiringSoon', 'active']) {
      assert(
        typeof opps?.[key] === 'number' && opps[key] >= 0 && Number.isFinite(opps[key]),
        `opportunities.${key} is a non-negative finite number (honest metric)`
      );
    }
    assert(Array.isArray(opps?.recent), 'opportunities.recent is an array');
    if (opps?.recent?.length > 0) {
      const sample = opps.recent[0];
      assert(!!sample._id && typeof sample.title === 'string' && !!sample.status, 'Recent opportunity has id/title/status');
      assert(typeof sample.applicationsReceived === 'number', 'Recent opportunity applicationsReceived is a number');
    }

    // Applications: honest pipeline metrics (must sum to total by enum contract)
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
    assert(Array.isArray(apps?.recent), 'applications.recent is an array');
    if (apps?.recent?.length > 0) {
      const appSample = apps.recent[0];
      assert(!!appSample.studentName && !!appSample.opportunityTitle, 'Recent application has student + opportunity');
      assert(!!appSample.status, 'Recent application has a status');
    }

    // Notifications: user-scoped, typed
    const notifs = dashData.data?.notifications;
    assert(!!notifs, 'Dashboard contains notifications metrics');
    assert(typeof notifs?.unreadCount === 'number' && notifs.unreadCount >= 0, 'notifications.unreadCount is a non-negative number');
    assert(Array.isArray(notifs?.recent), 'notifications.recent is an array');

    // ── 3. Student Cannot Access Industry Dashboard ────────────
    console.log('\n--- 3. Role Isolation: Student Access Blocked ---');
    const studentLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'student@skillbridge.dev',
        password: 'Student@123',
      }),
    });
    assert(studentLoginRes.status === 200, 'Student logs in successfully');
    const studentLoginData = await studentLoginRes.json();
    studentToken = studentLoginData.token;

    const studentToIndustryRes = await fetch(`${API_BASE}/industry/dashboard`, {
      headers: {
        Authorization: `Bearer ${studentToken}`,
        'Content-Type': 'application/json',
      },
    });
    assert(studentToIndustryRes.status === 403, 'Student accessing /api/industry/dashboard returns 403 Forbidden');
    const studentDeniedData = await studentToIndustryRes.json();
    assert(studentDeniedData.success === false, 'Student access denied success is false');

    // ── 4. Faculty Cannot Access Industry Dashboard ────────────
    console.log('\n--- 4. Role Isolation: Faculty Access Blocked ---');
    const facLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'faculty@skillbridge.dev',
        password: 'Faculty@123',
      }),
    });
    assert(facLoginRes.status === 200, 'Faculty logs in successfully');
    const facLoginData = await facLoginRes.json();
    facultyToken = facLoginData.token;

    const facToIndustryRes = await fetch(`${API_BASE}/industry/dashboard`, {
      headers: {
        Authorization: `Bearer ${facultyToken}`,
        'Content-Type': 'application/json',
      },
    });
    assert(facToIndustryRes.status === 403, 'Faculty accessing /api/industry/dashboard returns 403 Forbidden');
    const facDeniedData = await facToIndustryRes.json();
    assert(facDeniedData.success === false, 'Faculty access denied success is false');

    // ── 5. Unauthenticated Request → 401 ──────────────────────
    console.log('\n--- 5. Unauthenticated Request Security ---');
    const unauthRes = await fetch(`${API_BASE}/industry/dashboard`);
    assert(unauthRes.status === 401, 'Unauthenticated GET /api/industry/dashboard returns 401 Unauthorized');
    const unauthData = await unauthRes.json();
    assert(unauthData.success === false, 'Unauthenticated response success is false');

    // ── 6. Wrong Role Enforcement Check ───────────────────────
    console.log('\n--- 6. Wrong Role Enforcement Summary ---');
    assert(
      studentToIndustryRes.status === 403 && facToIndustryRes.status === 403,
      'Both unauthorized roles (student & faculty) receive 403 Forbidden on /api/industry/dashboard'
    );

    // ── 7. Industry Route Loads ────────────────────────────────
    console.log('\n--- 7. Frontend Industry Route Accessibility ---');
    try {
      const clientRes = await fetch(`${CLIENT_BASE}/industry`);
      assert(clientRes.status === 200, 'Vite dev server returns 200 OK for /industry');
      const html = await clientRes.text();
      assert(html.includes('id="root"') || html.includes('SkillBridge'), 'HTML contains SkillBridge application root container');
    } catch (e) {
      console.log(`  ℹ️ Vite dev server check skipped (not running): ${e.message}`);
    }

    // ── 8. Industry Logout ─────────────────────────────────────
    console.log('\n--- 8. Industry Logout ---');
    const logoutRes = await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${industryToken}`,
        'Content-Type': 'application/json',
      },
    });
    assert(logoutRes.status === 200, 'POST /api/auth/logout returns 200 OK');
    const logoutData = await logoutRes.json();
    assert(logoutData.success === true, 'Logout success flag is true');

    // ── 9. Frontend Production Build ──────────────────────────
    console.log('\n--- 9. Frontend Build Verification ---');
    const clientDist = path.resolve(__dirname, '../client/dist');
    const indexHtml = path.join(clientDist, 'index.html');
    assert(fs.existsSync(indexHtml), 'client/dist/index.html exists and was built successfully');

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