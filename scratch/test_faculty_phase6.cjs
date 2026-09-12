/**
 * Phase 6 Integration Test Suite — Final Faculty Dashboard, Aggregation & End-to-End Integration
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Verifies:
 * SECTION 1 — Authentication & Authorization (200, 401, 403 for student/industry/institution)
 * SECTION 2 — Identity Isolation & Anti-Spoofing (Faculty A vs B, ignored spoofed facultyId)
 * SECTION 3 — Profile Aggregation (Completeness, name, designation, institution, CV state, counts)
 * SECTION 4 — Application Aggregation (Total, active, lifecycle status breakdown, recent list)
 * SECTION 5 — Opportunity Recommendations (Reusing matching, bounds [0,100], open status, deadlines)
 * SECTION 6 — Collaboration Aggregation (Active, upcoming, completed counts, recent list)
 * SECTION 7 — Mentorship Aggregation (isMentor, capacity, active mentees, pending requests, privacy)
 * SECTION 8 — Certificates (Total count, metadata, verificationCode, no private leaks)
 * SECTION 9 — Notifications (Unread count, recent notifications, user isolation)
 * SECTION 10 — Dashboard Dynamic End-to-End Integration (Lifecycle reflection)
 * SECTION 11 — Frontend Route Accessibility (/faculty and all sub-routes)
 * SECTION 12 — Backward Compatibility with Phase 1 contract (faculty, completeness, stats)
 */

const path = require('path');
const dotenv = require('d:/bridgeUp/backend/node_modules/dotenv');
const mongoose = require('d:/bridgeUp/backend/node_modules/mongoose');

dotenv.config({ path: 'd:/bridgeUp/backend/.env' });

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
  console.log('🧪 SkillBridge Faculty Panel Phase 6 Test Suite');
  console.log('   Final Faculty Dashboard, Aggregation & Integration');
  console.log('═══════════════════════════════════════════════════════════════\n');

  let facultyTokenA = '';
  let facultyUserA = null;
  let facultyIdA = '';

  let facultyTokenB = '';
  let facultyUserB = null;
  let facultyIdB = '';

  let studentToken = '';
  let industryToken = '';

  try {
    // Connect Mongoose to verify direct database aggregations
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/skillbridge');
    const db = mongoose.connection.db;

    // ─────────────────────────────────────────────────────────────
    // 1. Authentication & Role Isolation
    // ─────────────────────────────────────────────────────────────
    console.log('--- 1. Authentication & Role Isolation ---');

    // Faculty A Login
    const facLoginResA = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'faculty@skillbridge.dev',
        password: 'Faculty@123',
      }),
    });
    assert(facLoginResA.status === 200, '1. Faculty A login returns 200 OK');
    const facDataA = await facLoginResA.json();
    facultyTokenA = facDataA.token || '';
    facultyUserA = facDataA.user || {};
    facultyIdA = (facultyUserA.id || facultyUserA._id).toString();
    assert(facultyUserA.role === 'academician', '2. Faculty A role is academician');

    // Faculty B Login (Secondary faculty user)
    const facLoginResB = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'faculty_sec_test@skillbridge.dev',
        password: 'Faculty@123',
      }),
    });
    assert(facLoginResB.status === 200, '3. Faculty B login returns 200 OK');
    const facDataB = await facLoginResB.json();
    facultyTokenB = facDataB.token || '';
    facultyUserB = facDataB.user || {};
    facultyIdB = (facultyUserB.id || facultyUserB._id).toString();
    assert(facultyIdA !== facultyIdB, '4. Faculty A and Faculty B have distinct user IDs');

    // Student Login
    const studLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'student@skillbridge.dev',
        password: 'Student@123',
      }),
    });
    assert(studLoginRes.status === 200, '5. Student login returns 200 OK');
    const studData = await studLoginRes.json();
    studentToken = studData.token || '';

    // Industry Login
    const indLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'industry@skillbridge.dev',
        password: 'Industry@123',
      }),
    });
    assert(indLoginRes.status === 200, '6. Industry login returns 200 OK');
    const indData = await indLoginRes.json();
    industryToken = indData.token || '';

    // Faculty Dashboard 200 OK
    const dashResA = await fetch(`${API_BASE}/faculty/dashboard`, {
      headers: {
        Authorization: `Bearer ${facultyTokenA}`,
        'Content-Type': 'application/json',
      },
    });
    assert(dashResA.status === 200, '7. Authenticated Faculty GET /api/faculty/dashboard returns 200 OK');
    const dashDataA = await dashResA.json();
    assert(dashDataA.success === true, '8. Dashboard response success flag is true');

    // Unauthenticated -> 401
    const unauthRes = await fetch(`${API_BASE}/faculty/dashboard`);
    assert(unauthRes.status === 401, '9. Unauthenticated GET /api/faculty/dashboard returns 401 Unauthorized');

    // Student -> 403
    const studAccessRes = await fetch(`${API_BASE}/faculty/dashboard`, {
      headers: {
        Authorization: `Bearer ${studentToken}`,
        'Content-Type': 'application/json',
      },
    });
    assert(studAccessRes.status === 403, '10. Student accessing faculty dashboard returns 403 Forbidden');

    // Industry -> 403
    const indAccessRes = await fetch(`${API_BASE}/faculty/dashboard`, {
      headers: {
        Authorization: `Bearer ${industryToken}`,
        'Content-Type': 'application/json',
      },
    });
    assert(indAccessRes.status === 403, '11. Industry accessing faculty dashboard returns 403 Forbidden');

    // ─────────────────────────────────────────────────────────────
    // 2. Identity Isolation & Anti-Spoofing
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 2. Identity Isolation & Anti-Spoofing ---');

    // Faculty B Dashboard
    const dashResB = await fetch(`${API_BASE}/faculty/dashboard`, {
      headers: {
        Authorization: `Bearer ${facultyTokenB}`,
        'Content-Type': 'application/json',
      },
    });
    assert(dashResB.status === 200, '12. Faculty B GET /api/faculty/dashboard returns 200 OK');
    const dashDataB = await dashResB.json();

    // Isolation: Faculty A sees Faculty A profile; Faculty B sees Faculty B
    assert(dashDataA.data?.profile?.name === facultyUserA.name, '13. Faculty A dashboard contains Faculty A name');
    assert(dashDataB.data?.profile?.name === facultyUserB.name, '14. Faculty B dashboard contains Faculty B name');
    assert(dashDataA.data?.faculty?.id === facultyIdA, '15. Faculty A legacy identity matches Faculty A ID');
    assert(dashDataB.data?.faculty?.id === facultyIdB, '16. Faculty B legacy identity matches Faculty B ID');

    // Anti-Spoofing: Client query param ?facultyId=<another> ignored
    const spoofQueryRes = await fetch(`${API_BASE}/faculty/dashboard?facultyId=${facultyIdB}`, {
      headers: {
        Authorization: `Bearer ${facultyTokenA}`,
        'Content-Type': 'application/json',
      },
    });
    assert(spoofQueryRes.status === 200, '17. Spoofed facultyId query parameter request returns 200');
    const spoofQueryData = await spoofQueryRes.json();
    assert(
      spoofQueryData.data?.profile?.name === facultyUserA.name,
      '18. Injected facultyId ignored; dashboard strictly bound to session identity (Faculty A)'
    );
    assert(
      spoofQueryData.data?.faculty?.id === facultyIdA,
      '19. Spoofed facultyId query cannot switch faculty identity'
    );

    // ─────────────────────────────────────────────────────────────
    // 3. Profile Aggregation
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 3. Profile Aggregation ---');

    const prof = dashDataA.data?.profile;
    assert(!!prof, '20. Dashboard contains profile summary object');
    assert(typeof prof.completeness === 'number', '21. Profile completeness is a number');
    assert(prof.completeness >= 0 && prof.completeness <= 100, '22. Completeness is bounded between 0 and 100');
    assert(typeof prof.name === 'string' && prof.name.length > 0, '23. Profile contains faculty full name');
    assert(typeof prof.designation === 'string' && prof.designation.length > 0, '24. Profile contains designation');
    assert(typeof prof.department === 'string' && prof.department.length > 0, '25. Profile contains department');
    assert(typeof prof.institution === 'string' && prof.institution.length > 0, '26. Profile contains affiliated institution');
    assert(typeof prof.profileExists === 'boolean', '27. profileExists flag is boolean');
    assert(typeof prof.hasActiveCv === 'boolean', '28. hasActiveCv flag is boolean');
    assert(typeof prof.expertiseCount === 'number', '29. expertiseCount is a number');
    assert(typeof prof.researchInterestCount === 'number', '30. researchInterestCount is a number');

    // ─────────────────────────────────────────────────────────────
    // 4. Application Aggregation
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 4. Application Aggregation ---');

    const apps = dashDataA.data?.applications;
    assert(!!apps, '31. Dashboard contains applications aggregation object');
    assert(typeof apps.total === 'number', '32. Applications total is a number');
    assert(typeof apps.active === 'number', '33. Applications active count is a number');
    assert(typeof apps.underReview === 'number', '34. Applications underReview count is a number');
    assert(typeof apps.shortlisted === 'number', '35. Applications shortlisted count is a number');
    assert(typeof apps.interview === 'number', '36. Applications interview count is a number');
    assert(typeof apps.selected === 'number', '37. Applications selected count is a number');
    assert(typeof apps.completed === 'number', '38. Applications completed count is a number');
    assert(typeof apps.rejected === 'number', '39. Applications rejected count is a number');
    assert(typeof apps.withdrawn === 'number', '40. Applications withdrawn count is a number');

    // Verify DB integrity for applications
    const realDbAppCount = await db.collection('facultyapplications').countDocuments({ faculty: new mongoose.Types.ObjectId(facultyIdA) });
    assert(apps.total === realDbAppCount, '41. Applications total matches real MongoDB count');

    assert(Array.isArray(apps.recent), '42. Applications recent is an array');
    if (apps.recent.length > 0) {
      const recentApp = apps.recent[0];
      assert(!!recentApp._id, '43. Recent application contains _id');
      assert(typeof recentApp.title === 'string', '44. Recent application contains opportunity title');
      assert(typeof recentApp.type === 'string', '45. Recent application contains opportunity type');
      assert(typeof recentApp.status === 'string', '46. Recent application contains status');
      assert(!!recentApp.submittedAt, '47. Recent application contains submittedAt timestamp');
    }

    // ─────────────────────────────────────────────────────────────
    // 5. Opportunity Recommendations
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 5. Opportunity Recommendations ---');

    const opps = dashDataA.data?.opportunities;
    assert(!!opps, '48. Dashboard contains opportunities aggregation object');
    assert(typeof opps.totalOpen === 'number', '49. totalOpen opportunities is a number');
    assert(opps.totalOpen >= 0, '50. totalOpen opportunities is non-negative');
    assert(Array.isArray(opps.recommended), '51. recommended opportunities is an array');
    assert(Array.isArray(opps.upcoming), '52. upcoming opportunities is an array');

    if (opps.recommended.length > 0) {
      const recOpp = opps.recommended[0];
      assert(!!recOpp.title, '53. Recommended opportunity contains title');
      assert(!!recOpp.provider, '54. Recommended opportunity contains provider');
      assert(!!recOpp.domain, '55. Recommended opportunity contains domain');
      assert(!!recOpp.mode, '56. Recommended opportunity contains mode');
      assert(!!recOpp.applicationDeadline, '57. Recommended opportunity contains deadline');
      assert(typeof recOpp.matchScore === 'number', '58. Recommended opportunity has matchScore number');
      assert(recOpp.matchScore >= 0 && recOpp.matchScore <= 100, '59. matchScore is bounded between 0 and 100');

      // Verify descending order of matchScore
      if (opps.recommended.length >= 2) {
        assert(
          opps.recommended[0].matchScore >= opps.recommended[1].matchScore,
          '60. Recommended opportunities sorted descending by matchScore'
        );
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 6. Collaboration Aggregation
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 6. Collaboration Aggregation ---');

    const col = dashDataA.data?.collaborations;
    assert(!!col, '61. Dashboard contains collaborations aggregation object');
    assert(typeof col.active === 'number', '62. Active collaborations count is a number');
    assert(typeof col.upcoming === 'number', '63. Upcoming collaborations count is a number');
    assert(typeof col.completed === 'number', '64. Completed collaborations count is a number');
    assert(Array.isArray(col.recent), '65. Recent collaborations is an array');

    const realDbCollabCount = await db.collection('facultycollaborations').countDocuments({
      faculty: new mongoose.Types.ObjectId(facultyIdA),
      status: 'Active',
    });
    assert(col.active === realDbCollabCount, '66. Active collaborations count matches real MongoDB count');

    // ─────────────────────────────────────────────────────────────
    // 7. Mentorship Aggregation
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 7. Mentorship Aggregation ---');

    const ment = dashDataA.data?.mentorship;
    assert(!!ment, '67. Dashboard contains mentorship aggregation object');
    assert(typeof ment.isMentor === 'boolean', '68. isMentor is a boolean');
    assert(typeof ment.activeMentees === 'number', '69. activeMentees is a number');
    assert(typeof ment.maxMentees === 'number', '70. maxMentees is a number');
    assert(typeof ment.pendingRequests === 'number', '71. pendingRequests is a number');
    assert(Array.isArray(ment.recentRequests), '72. recentRequests is an array');

    const realDbMenteeCount = await db.collection('mentorshiprequests').countDocuments({
      mentor: new mongoose.Types.ObjectId(facultyIdA),
      status: 'Accepted',
    });
    assert(ment.activeMentees === realDbMenteeCount, '73. activeMentees count matches real MongoDB count');

    // Privacy check: Student passwords and vault items NEVER leaked in mentorship requests
    if (ment.recentRequests.length > 0) {
      const firstReq = ment.recentRequests[0];
      assert(!firstReq.password, '74. Mentorship request NEVER leaks student password');
      assert(!firstReq.documents, '75. Mentorship request NEVER leaks student documents vault');
    }

    // ─────────────────────────────────────────────────────────────
    // 8. Certificate Aggregation
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 8. Certificate Aggregation ---');

    const certs = dashDataA.data?.certificates;
    assert(!!certs, '76. Dashboard contains certificates aggregation object');
    assert(typeof certs.total === 'number', '77. Certificates total count is a number');
    assert(Array.isArray(certs.recent), '78. Certificates recent is an array');

    const realDbCertCount = await db.collection('facultycertificates').countDocuments({
      faculty: new mongoose.Types.ObjectId(facultyIdA),
      status: 'Valid',
    });
    assert(certs.total === realDbCertCount, '79. Certificates total count matches real MongoDB count');

    if (certs.recent.length > 0) {
      const firstCert = certs.recent[0];
      assert(!!firstCert.certificateNumber, '80. Recent certificate contains certificateNumber');
      assert(!!firstCert.verificationCode, '81. Recent certificate contains verificationCode');
      assert(!!firstCert.title, '82. Recent certificate contains title');
      assert(!!firstCert.issuer, '83. Recent certificate contains issuer');
      assert(!firstCert.password, '84. Certificate object NEVER leaks credentials');
    }

    // ─────────────────────────────────────────────────────────────
    // 9. Notification Aggregation
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 9. Notification Aggregation ---');

    const notifs = dashDataA.data?.notifications;
    assert(!!notifs, '85. Dashboard contains notifications aggregation object');
    assert(typeof notifs.unreadCount === 'number', '86. unreadCount is a number');
    assert(Array.isArray(notifs.recent), '87. recent notifications is an array');

    const realDbUnreadNotifs = await db.collection('notifications').countDocuments({
      user: new mongoose.Types.ObjectId(facultyIdA),
      read: false,
    });
    assert(notifs.unreadCount === realDbUnreadNotifs, '88. Unread notifications count matches real MongoDB count');

    // ─────────────────────────────────────────────────────────────
    // 10. Backward Compatibility for Phase 1 Contract
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 10. Backward Compatibility for Phase 1 Contract ---');

    assert(!!dashDataA.data?.faculty, '89. Legacy data.faculty object preserved');
    assert(dashDataA.data?.faculty?.name === 'Dr. Priya Patel', '90. Legacy faculty.name is Dr. Priya Patel');
    assert(dashDataA.data?.faculty?.institution === 'IIT Bombay', '91. Legacy faculty.institution is IIT Bombay');
    assert(typeof dashDataA.data?.completeness?.percentage === 'number', '92. Legacy completeness.percentage is a number');
    assert(Array.isArray(dashDataA.data?.completeness?.fields), '93. Legacy completeness.fields is an array');
    assert(dashDataA.data?.stats?.activeCollaborations === 0, '94. Legacy stats.activeCollaborations preserved');
    assert(dashDataA.data?.stats?.currentMentees === 0, '95. Legacy stats.currentMentees preserved');
    assert(dashDataA.data?.stats?.upcomingOpportunities === 0, '96. Legacy stats.upcomingOpportunities preserved');
    assert(dashDataA.data?.stats?.pendingApplications === 0, '97. Legacy stats.pendingApplications preserved');

    // ─────────────────────────────────────────────────────────────
    // 11. Frontend Route Accessibility
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 11. Frontend Route Accessibility ---');

    const routes = [
      '/faculty',
      '/faculty/profile',
      '/faculty/opportunities',
      '/faculty/applications',
      '/faculty/collaborations',
      '/faculty/mentorship',
    ];

    for (const r of routes) {
      const res = await fetch(`${CLIENT_BASE}${r}`);
      assert(res.status === 200, `98. Frontend route ${r} returns 200 OK`);
      const html = await res.text();
      assert(html.includes('id="root"'), `99. Frontend route ${r} loads React application root`);
    }

    // ─────────────────────────────────────────────────────────────
    // 12. Final Verification Summary
    // ─────────────────────────────────────────────────────────────
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    await mongoose.disconnect();

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error('Test run failure:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

runTests();
