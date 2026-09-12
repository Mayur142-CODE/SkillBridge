/**
 * Phase 1 Integration Test Suite — Academician / Faculty Panel Foundation
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Verifies:
 * 1. Faculty login (faculty@skillbridge.dev / Faculty@123)
 * 2. Faculty dashboard retrieval (GET /api/faculty/dashboard)
 * 3. Student cannot access faculty dashboard (403 Forbidden)
 * 4. Industry cannot access faculty dashboard (403 Forbidden)
 * 5. Unauthenticated request → 401 Unauthorized
 * 6. Wrong role rejected (403 Forbidden)
 * 7. Faculty route loads (HTML / route check)
 * 8. Faculty logout (POST /api/auth/logout)
 * 9. Frontend build verification
 */

const { execSync } = require('child_process');
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
  console.log('🧪 SkillBridge Faculty Panel Phase 1 Test Suite');
  console.log('═══════════════════════════════════════════════════════════════\n');

  let facultyToken = '';
  let studentToken = '';
  let industryToken = '';

  try {
    // ── 1. Faculty Login ──────────────────────────────────────
    console.log('--- 1. Faculty Login ---');
    const facLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'faculty@skillbridge.dev',
        password: 'Faculty@123',
      }),
    });

    assert(facLoginRes.status === 200, 'Faculty login returns 200 OK');
    const facLoginData = await facLoginRes.json();
    assert(facLoginData.success === true, 'Faculty login success flag is true');
    assert(!!facLoginData.token, 'Faculty login returns valid JWT token');
    assert(facLoginData.user?.role === 'academician', "Faculty user role is 'academician'");
    assert(facLoginData.user?.email === 'faculty@skillbridge.dev', 'Faculty email matches');
    facultyToken = facLoginData.token;

    // ── 2. Faculty Dashboard ──────────────────────────────────
    console.log('\n--- 2. Faculty Dashboard API ---');
    const dashRes = await fetch(`${API_BASE}/faculty/dashboard`, {
      headers: {
        Authorization: `Bearer ${facultyToken}`,
        'Content-Type': 'application/json',
      },
    });

    assert(dashRes.status === 200, 'GET /api/faculty/dashboard returns 200 OK');
    const dashData = await dashRes.json();
    assert(dashData.success === true, 'Dashboard response success flag is true');
    assert(!!dashData.data?.faculty, 'Dashboard contains faculty profile object');
    assert(dashData.data?.faculty?.name === 'Dr. Priya Patel', 'Faculty name is Dr. Priya Patel');
    assert(dashData.data?.faculty?.institution === 'IIT Bombay', 'Institution affiliation is IIT Bombay');
    assert(dashData.data?.faculty?.department === 'Computer Science & Engineering', 'Department is Computer Science & Engineering');
    assert(dashData.data?.faculty?.designation === 'Associate Professor', 'Designation is Associate Professor');

    // Profile Completeness
    assert(typeof dashData.data?.completeness?.percentage === 'number', 'Completeness score is a number');
    assert(dashData.data?.completeness?.percentage >= 0 && dashData.data?.completeness?.percentage <= 100, 'Completeness percentage is between 0 and 100');
    assert(Array.isArray(dashData.data?.completeness?.fields), 'Completeness fields is an array');

    // Honest zero/empty state metrics (no fake numbers)
    assert(dashData.data?.stats?.activeCollaborations === 0, 'Active collaborations is 0 (honest initial state)');
    assert(dashData.data?.stats?.currentMentees === 0, 'Current mentees is 0 (honest initial state)');
    assert(dashData.data?.stats?.upcomingOpportunities === 0, 'Upcoming opportunities is 0 (honest initial state)');
    assert(dashData.data?.stats?.pendingApplications === 0, 'Pending applications is 0 (honest initial state)');

    // ── 3. Student Cannot Access Faculty Dashboard ────────────
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

    const studentToFacultyRes = await fetch(`${API_BASE}/faculty/dashboard`, {
      headers: {
        Authorization: `Bearer ${studentToken}`,
        'Content-Type': 'application/json',
      },
    });
    assert(studentToFacultyRes.status === 403, 'Student accessing /api/faculty/dashboard returns 403 Forbidden');
    const studentDeniedData = await studentToFacultyRes.json();
    assert(studentDeniedData.success === false, 'Student access denied success is false');

    // ── 4. Industry Cannot Access Faculty Dashboard ───────────
    console.log('\n--- 4. Role Isolation: Industry Access Blocked ---');
    const indLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'industry@skillbridge.dev',
        password: 'Industry@123',
      }),
    });
    assert(indLoginRes.status === 200, 'Industry logs in successfully');
    const indLoginData = await indLoginRes.json();
    industryToken = indLoginData.token;

    const indToFacultyRes = await fetch(`${API_BASE}/faculty/dashboard`, {
      headers: {
        Authorization: `Bearer ${industryToken}`,
        'Content-Type': 'application/json',
      },
    });
    assert(indToFacultyRes.status === 403, 'Industry accessing /api/faculty/dashboard returns 403 Forbidden');
    const indDeniedData = await indToFacultyRes.json();
    assert(indDeniedData.success === false, 'Industry access denied success is false');

    // ── 5. Unauthenticated Request → 401 ──────────────────────
    console.log('\n--- 5. Unauthenticated Request Security ---');
    const unauthRes = await fetch(`${API_BASE}/faculty/dashboard`);
    assert(unauthRes.status === 401, 'Unauthenticated GET /api/faculty/dashboard returns 401 Unauthorized');
    const unauthData = await unauthRes.json();
    assert(unauthData.success === false, 'Unauthenticated response success is false');

    // ── 6. Wrong Role Enforcement Check ───────────────────────
    console.log('\n--- 6. Wrong Role Enforcement Summary ---');
    assert(studentToFacultyRes.status === 403 && indToFacultyRes.status === 403, 'Both unauthorized roles (student & industry) receive 403 Forbidden');

    // ── 7. Faculty Route Loads ────────────────────────────────
    console.log('\n--- 7. Frontend Faculty Route Accessibility ---');
    try {
      const clientRes = await fetch(`${CLIENT_BASE}/faculty`);
      assert(clientRes.status === 200, 'Vite dev server returns 200 OK for /faculty');
      const html = await clientRes.text();
      assert(html.includes('id="root"') || html.includes('SkillBridge'), 'HTML contains SkillBridge application root container');
    } catch (e) {
      console.log('  ℹ️ Vite dev server check skipped if not running directly:', e.message);
    }

    // ── 8. Faculty Logout ─────────────────────────────────────
    console.log('\n--- 8. Faculty Logout ---');
    const logoutRes = await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${facultyToken}`,
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
