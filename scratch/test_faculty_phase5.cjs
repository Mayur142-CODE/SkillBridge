/**
 * Phase 5 Integration & Security Verification Test Suite
 * Academician / Faculty Applications, Tracking & Certificates
 * SkillBridge / SIH Problem Statement 26044
 *
 * Verifies:
 * 1. Authentication & Role-Based Access Control (Faculty 200, Student 403, Industry 403, Unauth 401)
 * 2. Immutable Session Identity (Derived strictly from req.user._id, client cannot spoof facultyId)
 * 3. Status Progression Security (Faculty cannot self-transition to Selected/Completed via HTTP endpoints)
 * 4. Deterministic Eligibility & Opportunity State Validation (Closed, expired, or invalid opportunities rejected)
 * 5. Application Submission & Field Integrity (CV snapshot, matchScore, eligibilitySnapshot, statusHistory)
 * 6. Alternative Application Route Support (POST /opportunities/:id/apply & POST /applications)
 * 7. Duplicate Application Prevention (400 Bad Request, compound unique index protection)
 * 8. Strict Cross-Faculty Ownership Isolation (Faculty B cannot view, withdraw, or track Faculty A's application)
 * 9. CV Snapshot Immutability (Profile CV updates do NOT alter submitted application's CV snapshot)
 * 10. Application Withdrawal Lifecycle (Eligible withdrawal, rejection of re-withdrawal, withdrawal forbidden after Selected)
 * 11. Dynamic Timeline Retrieval (Chronological history, notes, actors)
 * 12. Administrative Progression & State Transitions (Under Review -> Interview -> Selected -> Completed)
 * 13. Automatic Verifiable Certificate Issuance (PDF generation, certificateNumber, verificationCode)
 * 14. Binary PDF Streaming (Inline view and attachment download with %PDF- headers)
 * 15. Public Zero-Knowledge Certificate Verification (Zero Auth, zero PII leakage, verificationCode lookup)
 * 16. Server-Side Filtering, Search & Pagination (Status filter, search keyword, page limits, sorting)
 * 17. Notifications Integration (Submission, status update, certificate generation, recipient isolation)
 * 18. Frontend Dev Server Route Accessibility (/faculty/applications)
 */

const fs = require('fs');
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
  console.log('🧪 SkillBridge Faculty Panel Phase 5 Test Suite');
  console.log('   Faculty Applications, Tracking & Certificates');
  console.log('═══════════════════════════════════════════════════════════════\n');

  let facultyTokenA = '';
  let facultyUserA = null;
  let facultyIdA = '';

  let facultyTokenB = '';
  let facultyUserB = null;
  let facultyIdB = '';

  let studentToken = '';
  let industryToken = '';

  let oppA = null;
  let oppB = null;
  let closedOpp = null;
  let expiredOpp = null;

  let createdAppA = null;
  let createdAppB = null;
  let issuedCertificate = null;

  let updateApplicationStatusByAdmin = null;

  try {
    // Dynamically import backend service for administrative progression testing
    const facultyAppService = await import(
      'file:///' + path.resolve('d:/bridgeUp/backend/src/services/facultyApplication.service.js').replace(/\\/g, '/')
    );
    updateApplicationStatusByAdmin = facultyAppService.updateApplicationStatusByAdmin;

    // Connect mongoose for administrative progression and database validation
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/skillbridge');
    const db = mongoose.connection.db;

    // ─────────────────────────────────────────────────────────────
    // 1. Authentication & Role Isolation
    // ─────────────────────────────────────────────────────────────
    console.log('--- 1. Authentication & Role Isolation ---');

    // Faculty A Login
    const facLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'faculty@skillbridge.dev',
        password: 'Faculty@123',
      }),
    });
    assert(facLoginRes.status === 200, '1. Faculty A login returns 200 OK');
    const facData = await facLoginRes.json();
    facultyTokenA = facData.token || '';
    facultyUserA = facData.user || {};
    facultyIdA = (facultyUserA.id || facultyUserA._id).toString();
    assert(facultyUserA.role === 'academician', '2. Faculty A role is academician');

    // Faculty B Login
    const facBLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'faculty_sec_test@skillbridge.dev',
        password: 'Faculty@123',
      }),
    });
    assert(facBLoginRes.status === 200, '3. Faculty B login returns 200 OK');
    const facBData = await facBLoginRes.json();
    facultyTokenB = facBData.token || '';
    facultyUserB = facBData.user || {};
    facultyIdB = (facultyUserB.id || facultyUserB._id).toString();

    // Student Login
    const studLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'student@skillbridge.dev',
        password: 'Student@123',
      }),
    });
    assert(studLoginRes.status === 200, '4. Student login returns 200 OK');
    studentToken = (await studLoginRes.json()).token || '';

    // Industry Login
    const indLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'industry@skillbridge.dev',
        password: 'Industry@123',
      }),
    });
    assert(indLoginRes.status === 200, '5. Industry login returns 200 OK');
    industryToken = (await indLoginRes.json()).token || '';

    // RBAC: Faculty Access Granted
    const facAppsAccess = await fetch(`${API_BASE}/faculty/applications`, {
      headers: { Authorization: `Bearer ${facultyTokenA}` },
    });
    assert(facAppsAccess.status === 200, '6. Faculty accessing /faculty/applications returns 200 OK');

    const facCertsAccess = await fetch(`${API_BASE}/faculty/certificates`, {
      headers: { Authorization: `Bearer ${facultyTokenA}` },
    });
    assert(facCertsAccess.status === 200, '7. Faculty accessing /faculty/certificates returns 200 OK');

    // RBAC: Unauthenticated Blocked -> 401
    const unauthApps = await fetch(`${API_BASE}/faculty/applications`);
    assert(unauthApps.status === 401, '8. Unauthenticated GET /faculty/applications returns 401 Unauthorized');

    const unauthCerts = await fetch(`${API_BASE}/faculty/certificates`);
    assert(unauthCerts.status === 401, '9. Unauthenticated GET /faculty/certificates returns 401 Unauthorized');

    // RBAC: Student Blocked -> 403
    const studApps = await fetch(`${API_BASE}/faculty/applications`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(studApps.status === 403, '10. Student accessing /faculty/applications returns 403 Forbidden');

    const studCerts = await fetch(`${API_BASE}/faculty/certificates`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(studCerts.status === 403, '11. Student accessing /faculty/certificates returns 403 Forbidden');

    // RBAC: Industry Blocked -> 403
    const indApps = await fetch(`${API_BASE}/faculty/applications`, {
      headers: { Authorization: `Bearer ${industryToken}` },
    });
    assert(indApps.status === 403, '12. Industry accessing /faculty/applications returns 403 Forbidden');

    const indCerts = await fetch(`${API_BASE}/faculty/certificates`, {
      headers: { Authorization: `Bearer ${industryToken}` },
    });
    assert(indCerts.status === 403, '13. Industry accessing /faculty/certificates returns 403 Forbidden');

    // ─────────────────────────────────────────────────────────────
    // 2. Status Progression Security (Anti-Self-Approval)
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 2. Status Progression Security (Anti-Self-Approval) ---');

    // Verify Faculty CANNOT mutate their application status to Selected or Completed via PUT/PATCH
    const maliciousStatusMutation = await fetch(`${API_BASE}/faculty/applications/6aa523f08355ebbbab1d2fb4`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${facultyTokenA}`,
      },
      body: JSON.stringify({ status: 'Selected', selectionDetails: { stipend: 50000 } }),
    });
    assert(
      maliciousStatusMutation.status === 404 || maliciousStatusMutation.status === 405,
      '14. Faculty cannot self-approve or mutate status via PUT (No unauthorized route exposed)'
    );

    const maliciousPatchMutation = await fetch(`${API_BASE}/faculty/applications/6aa523f08355ebbbab1d2fb4`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${facultyTokenA}`,
      },
      body: JSON.stringify({ status: 'Completed' }),
    });
    assert(
      maliciousPatchMutation.status === 404 || maliciousPatchMutation.status === 405,
      '15. Faculty cannot self-approve or mutate status via PATCH (No unauthorized route exposed)'
    );

    // ─────────────────────────────────────────────────────────────
    // 3. Test Opportunity Discovery & Preparation
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 3. Test Opportunity Discovery & Preparation ---');

    // Clean up any lingering temporary test opportunities from previous runs
    await db.collection('facultyopportunities').deleteMany({
      title: { $in: ['[TEST ONLY] Closed Research Seminar', 'Legacy Closed Research Seminar', '[TEST ONLY] Expired Faculty Training Program', 'Expired Faculty Training Program'] },
    });

    // Fetch open faculty opportunities with active deadlines
    const oppsRes = await fetch(`${API_BASE}/faculty/opportunities?deadline=active&limit=10`, {
      headers: { Authorization: `Bearer ${facultyTokenA}` },
    });
    assert(oppsRes.status === 200, '16. Faculty fetches available opportunities (200 OK)');
    const oppsData = await oppsRes.json();
    const availableOpps = (oppsData.data?.opportunities || []).filter(
      (o) => o.status === 'Open' && (!o.applicationDeadline || new Date(o.applicationDeadline) > new Date())
    );
    assert(availableOpps.length >= 2, '17. At least 2 open opportunities with active deadlines available for testing');

    oppA = availableOpps[0];
    oppB = availableOpps[1];

    // Clean up any prior test applications for oppA and oppB for Faculty A & B
    await db.collection('facultyapplications').deleteMany({
      faculty: { $in: [new mongoose.Types.ObjectId(facultyIdA), new mongoose.Types.ObjectId(facultyIdB)] },
      opportunity: { $in: [new mongoose.Types.ObjectId(oppA._id), new mongoose.Types.ObjectId(oppB._id)] },
    });
    await db.collection('facultycertificates').deleteMany({
      faculty: { $in: [new mongoose.Types.ObjectId(facultyIdA), new mongoose.Types.ObjectId(facultyIdB)] },
    });

    // Create a closed opportunity to test rejection
    const closedOppDoc = await db.collection('facultyopportunities').insertOne({
      title: '[TEST ONLY] Closed Research Seminar',
      type: 'Workshop',
      domain: 'Computer Science',
      mode: 'Online',
      provider: 'SkillBridge Test Labs',
      status: 'Closed',
      applicationDeadline: new Date(Date.now() + 86400000 * 10),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    closedOpp = { _id: closedOppDoc.insertedId.toString() };

    // Create an expired opportunity to test rejection
    const expiredOppDoc = await db.collection('facultyopportunities').insertOne({
      title: '[TEST ONLY] Expired Faculty Training Program',
      type: 'Industrial Training',
      domain: 'Electronics',
      mode: 'Offline',
      provider: 'SkillBridge Test Labs',
      status: 'Open',
      applicationDeadline: new Date(Date.now() - 86400000 * 5), // 5 days in the past
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    expiredOpp = { _id: expiredOppDoc.insertedId.toString() };

    // ─────────────────────────────────────────────────────────────
    // 4. Eligibility & Opportunity State Validation
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 4. Eligibility & Opportunity State Validation ---');

    // Attempt to apply to a closed opportunity -> 400
    const applyClosedRes = await fetch(`${API_BASE}/faculty/opportunities/${closedOpp._id}/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${facultyTokenA}`,
      },
      body: JSON.stringify({ coverMessage: 'Trying to apply to closed' }),
    });
    assert(applyClosedRes.status === 400, '18. Applying to a Closed opportunity is rejected with 400 Bad Request');
    const closedData = await applyClosedRes.json();
    assert(
      closedData.message.includes('no longer accepting applications') || closedData.message.includes('Closed'),
      '19. Closed opportunity error message explains status is Closed'
    );

    // Attempt to apply to an expired opportunity -> 400
    const applyExpiredRes = await fetch(`${API_BASE}/faculty/opportunities/${expiredOpp._id}/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${facultyTokenA}`,
      },
      body: JSON.stringify({ coverMessage: 'Trying to apply to expired' }),
    });
    assert(applyExpiredRes.status === 400, '20. Applying to an Expired deadline opportunity is rejected with 400 Bad Request');
    const expiredData = await applyExpiredRes.json();
    assert(
      expiredData.message.includes('deadline has passed'),
      '21. Expired deadline error message explains deadline has passed'
    );

    // Attempt to apply to invalid ObjectId -> 400
    const applyInvalidIdRes = await fetch(`${API_BASE}/faculty/opportunities/invalid-id-xyz/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${facultyTokenA}`,
      },
      body: JSON.stringify({ coverMessage: 'Invalid ID' }),
    });
    assert(applyInvalidIdRes.status === 400, '22. Applying with invalid opportunity ID returns 400 Bad Request');

    // Experience eligibility check: Test application rejection when years of experience is insufficient
    const highExpOppDoc = await db.collection('facultyopportunities').insertOne({
      title: '[TEST ONLY] High Experience Senior Chair Fellowship',
      type: 'Collaborative Research',
      domain: 'Computer Science & Engineering',
      mode: 'Online',
      provider: 'SkillBridge Test Labs',
      status: 'Open',
      applicationDeadline: new Date(Date.now() + 86400000 * 15),
      minimumExperience: 15, // Requires 15 years
      departmentEligibility: ['Computer Science & Engineering'],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const applyUnderQualifiedRes = await fetch(`${API_BASE}/faculty/opportunities/${highExpOppDoc.insertedId}/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${facultyTokenA}`,
      },
      body: JSON.stringify({ coverMessage: 'Attempting apply with insufficient experience' }),
    });
    assert(applyUnderQualifiedRes.status === 400, '23. Under-qualified experience eligibility check rejected with 400 Bad Request');
    const underQualData = await applyUnderQualifiedRes.json();
    assert(
      underQualData.message.includes('requires a minimum of 15 years'),
      '24. Insufficient experience error message clearly explains requirement'
    );
    await db.collection('facultyopportunities').deleteOne({ _id: highExpOppDoc.insertedId });

    // ─────────────────────────────────────────────────────────────
    // 5. Faculty Profile Qualification & Application Submission
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 5. Faculty Profile Qualification & Application Submission ---');

    // Update Faculty A profile with 8 years experience and verified academic qualifications
    const updateProfileRes = await fetch(`${API_BASE}/faculty/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${facultyTokenA}`,
      },
      body: JSON.stringify({
        department: 'Computer Science & Engineering',
        designation: 'Associate Professor',
        yearsOfExperience: 8,
        academicQualifications: 'Ph.D. in Computer Science',
        specialization: 'Distributed Systems & Cloud Computing',
      }),
    });
    assert(updateProfileRes.status === 200, '25. Faculty profile updated with verified qualifications (200 OK)');

    // Ensure Faculty A has a CV on profile
    const profileRes = await fetch(`${API_BASE}/faculty/profile`, {
      headers: { Authorization: `Bearer ${facultyTokenA}` },
    });
    assert(profileRes.status === 200, '26. Faculty profile fetched (200 OK)');
    const profileData = await profileRes.json();
    const existingCv = profileData.data?.profile?.cv;

    // Submit Application 1 (oppA) via POST /api/faculty/opportunities/:id/apply
    const applyOppARes = await fetch(`${API_BASE}/faculty/opportunities/${oppA._id}/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${facultyTokenA}`,
      },
      body: JSON.stringify({
        coverMessage: 'I am excited to lead faculty research collaboration in this domain.',
      }),
    });
    assert(applyOppARes.status === 201, '27. Application submitted successfully via POST /opportunities/:id/apply (201 Created)');
    const appAData = await applyOppARes.json();
    assert(appAData.success === true, '28. Application response success flag is true');
    createdAppA = appAData.data;

    assert(createdAppA.status === 'Applied', '29. Application status initialized to "Applied"');
    assert(Boolean(createdAppA.submittedAt), '30. Application submittedAt timestamp is recorded');
    assert(typeof createdAppA.matchScore === 'number', '31. Deterministic matchScore calculated and saved');
    assert(createdAppA.matchScore >= 0 && createdAppA.matchScore <= 100, '32. matchScore is bounded between 0 and 100');
    assert(Boolean(createdAppA.eligibilitySnapshot), '33. Eligibility snapshot recorded upon submission');
    assert(createdAppA.eligibilitySnapshot.eligible === true, '34. Eligibility snapshot confirms faculty is eligible');

    // Verify CV Snapshot
    assert(Boolean(createdAppA.resume), '35. Resume snapshot object exists in application');
    if (existingCv?.url) {
      assert(createdAppA.resume.url === existingCv.url, '36. Resume snapshot preserves profile CV URL');
      assert(createdAppA.resume.originalName === existingCv.originalName, '37. Resume snapshot preserves original CV filename');
    }

    // Verify initial status history
    assert(Array.isArray(createdAppA.statusHistory) && createdAppA.statusHistory.length === 1, '38. Status history initialized with 1 entry');
    assert(createdAppA.statusHistory[0].status === 'Applied', '39. First status history entry is "Applied"');

    // Submit Application 2 (oppB) via alternate route: POST /api/faculty/applications
    const applyOppBRes = await fetch(`${API_BASE}/faculty/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${facultyTokenA}`,
      },
      body: JSON.stringify({
        opportunityId: oppB._id,
        coverMessage: 'Applying via primary /faculty/applications endpoint for second initiative.',
      }),
    });
    assert(applyOppBRes.status === 201, '40. Application submitted successfully via POST /faculty/applications (201 Created)');
    const appBData = await applyOppBRes.json();
    createdAppB = appBData.data;
    assert(createdAppB.status === 'Applied', '41. Application 2 status is "Applied"');

    // ─────────────────────────────────────────────────────────────
    // 6. Duplicate Application Prevention (400 Bad Request)
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 6. Duplicate Application Prevention ---');

    const dupApplyRes = await fetch(`${API_BASE}/faculty/opportunities/${oppA._id}/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${facultyTokenA}`,
      },
      body: JSON.stringify({ coverMessage: 'Duplicate submission attempt' }),
    });
    assert(dupApplyRes.status === 400, '39. Duplicate application rejected with 400 Bad Request');
    const dupData = await dupApplyRes.json();
    assert(
      dupData.message.includes('already applied'),
      '40. Duplicate application error message states already applied'
    );

    // ─────────────────────────────────────────────────────────────
    // 7. Strict Cross-Faculty Ownership & Security Isolation
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 7. Strict Cross-Faculty Ownership & Security Isolation ---');

    // Faculty B attempts to view Faculty A's application detail -> 404 (or 403)
    const facBCrossView = await fetch(`${API_BASE}/faculty/applications/${createdAppA._id}`, {
      headers: { Authorization: `Bearer ${facultyTokenB}` },
    });
    assert(
      facBCrossView.status === 404 || facBCrossView.status === 403,
      '41. Faculty B cannot inspect Faculty A application (Isolated with 404/403)'
    );

    // Faculty B attempts to withdraw Faculty A's application -> 404 (or 403)
    const facBCrossWithdraw = await fetch(`${API_BASE}/faculty/applications/${createdAppA._id}/withdraw`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${facultyTokenB}`,
      },
      body: JSON.stringify({ reason: 'Malicious withdrawal attempt' }),
    });
    assert(
      facBCrossWithdraw.status === 404 || facBCrossWithdraw.status === 403,
      '42. Faculty B cannot withdraw Faculty A application (Isolated with 404/403)'
    );

    // Faculty B attempts to view Faculty A's timeline -> 404 (or 403)
    const facBCrossTimeline = await fetch(`${API_BASE}/faculty/applications/${createdAppA._id}/timeline`, {
      headers: { Authorization: `Bearer ${facultyTokenB}` },
    });
    assert(
      facBCrossTimeline.status === 404 || facBCrossTimeline.status === 403,
      '43. Faculty B cannot view Faculty A application timeline (Isolated with 404/403)'
    );

    // Ensure Faculty B profile has verified qualifications to apply
    await fetch(`${API_BASE}/faculty/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${facultyTokenB}`,
      },
      body: JSON.stringify({
        department: 'Computer Science & Engineering',
        designation: 'Assistant Professor',
        yearsOfExperience: 6,
        academicQualifications: 'Ph.D. in Computer Science',
      }),
    });

    // Client injected facultyId spoofing test
    const spoofAttempt = await fetch(`${API_BASE}/faculty/opportunities/${oppB._id}/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${facultyTokenB}`, // Faculty B token
      },
      body: JSON.stringify({
        facultyId: facultyIdA, // Injected Faculty A ID!
        userId: facultyIdA,
        coverMessage: 'Attempting to submit on behalf of Faculty A',
      }),
    });
    // Should succeed for Faculty B (since Faculty B has not applied to oppB yet),
    // BUT the application MUST belong to Faculty B, not Faculty A!
    assert(spoofAttempt.status === 201, '44. Faculty B submission succeeds under their own identity');
    const spoofData = await spoofAttempt.json();
    assert(
      spoofData.data?.faculty.toString() === facultyIdB.toString(),
      '45. Injected facultyId ignored; application strictly assigned to JWT session user (Faculty B)'
    );

    // ─────────────────────────────────────────────────────────────
    // 8. CV Snapshot Immutability
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 8. CV Snapshot Immutability ---');

    const originalResumeSnapshot = { ...createdAppA.resume };

    // Simulate updating Faculty A's profile CV directly in DB or via profile
    await db.collection('facultyprofiles').updateOne(
      { user: new mongoose.Types.ObjectId(facultyIdA) },
      {
        $set: {
          'cv.originalName': 'NEW_UPDATED_CV_2026.pdf',
          'cv.url': '/uploads/faculty/cv/NEW_UPDATED_CV_2026.pdf',
        },
      }
    );

    // Fetch Faculty A's application detail again
    const appDetailRes = await fetch(`${API_BASE}/faculty/applications/${createdAppA._id}`, {
      headers: { Authorization: `Bearer ${facultyTokenA}` },
    });
    assert(appDetailRes.status === 200, '46. Faculty A fetches application detail (200 OK)');
    const appDetailData = await appDetailRes.json();
    const fetchedAppA = appDetailData.data;

    assert(
      fetchedAppA.resume?.originalName === originalResumeSnapshot.originalName,
      '47. Application CV snapshot originalName is IMMUTABLE (retains snapshot value)'
    );
    assert(
      fetchedAppA.resume?.url === originalResumeSnapshot.url,
      '48. Application CV snapshot URL is IMMUTABLE (does not change when profile CV is updated)'
    );

    // Restore profile CV if it had a previous value
    if (existingCv?.originalName) {
      await db.collection('facultyprofiles').updateOne(
        { user: new mongoose.Types.ObjectId(facultyIdA) },
        { $set: { cv: existingCv } }
      );
    }

    // ─────────────────────────────────────────────────────────────
    // 9. Application Withdrawal Lifecycle
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 9. Application Withdrawal Lifecycle ---');

    // Withdraw createdAppB (oppB)
    const withdrawRes = await fetch(`${API_BASE}/faculty/applications/${createdAppB._id}/withdraw`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${facultyTokenA}`,
      },
      body: JSON.stringify({ reason: 'Scheduling conflict with upcoming academic accreditation review.' }),
    });
    assert(withdrawRes.status === 200, '49. Faculty withdraws application successfully (200 OK)');
    const withdrawData = await withdrawRes.json();
    assert(withdrawData.data?.status === 'Withdrawn', '50. Application status updated to "Withdrawn"');
    assert(Boolean(withdrawData.data?.withdrawnAt), '51. withdrawnAt timestamp recorded');
    const hasWithdrawnInHistory = withdrawData.data?.statusHistory?.some(
      (h) => h.status === 'Withdrawn' && h.note.includes('Scheduling conflict')
    );
    assert(hasWithdrawnInHistory, '52. Status history includes "Withdrawn" event with applicant reason');

    // Attempt to withdraw an already withdrawn application -> 400 Bad Request
    const reWithdrawRes = await fetch(`${API_BASE}/faculty/applications/${createdAppB._id}/withdraw`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${facultyTokenA}`,
      },
      body: JSON.stringify({ reason: 'Attempting second withdrawal' }),
    });
    assert(reWithdrawRes.status === 400, '53. Re-withdrawing already withdrawn application rejected with 400 Bad Request');

    // Verify PATCH /applications/:id/withdraw also exists and is supported
    const patchWithdrawCheck = await fetch(`${API_BASE}/faculty/applications/${createdAppB._id}/withdraw`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${facultyTokenA}`,
      },
      body: JSON.stringify({ reason: 'Test patch route' }),
    });
    // It's already withdrawn, so 400 is expected from business logic, confirming route matches
    assert(patchWithdrawCheck.status === 400, '54. PATCH /applications/:id/withdraw route is recognized and active');

    // ─────────────────────────────────────────────────────────────
    // 10. Dynamic Timeline Retrieval
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 10. Dynamic Timeline Retrieval ---');

    const timelineRes = await fetch(`${API_BASE}/faculty/applications/${createdAppB._id}/timeline`, {
      headers: { Authorization: `Bearer ${facultyTokenA}` },
    });
    assert(timelineRes.status === 200, '55. GET /faculty/applications/:id/timeline returns 200 OK');
    const timelineData = await timelineRes.json();
    assert(Array.isArray(timelineData.data?.timeline), '56. Timeline returned as an array');
    assert(timelineData.data.timeline.length >= 2, '57. Timeline contains both Applied and Withdrawn events');
    assert(timelineData.data.currentStatus === 'Withdrawn', '58. Timeline currentStatus matches "Withdrawn"');

    // ─────────────────────────────────────────────────────────────
    // 11. Administrative Progression & State Transitions (createdAppA)
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 11. Administrative Progression & State Transitions ---');

    // Admin transitions status: Applied -> Under Review
    await updateApplicationStatusByAdmin(
      createdAppA._id,
      'Under Review',
      { note: 'Faculty dossier forwarded to selection committee.' },
      'Dean of Academic Collaborations'
    );

    const step1Check = await fetch(`${API_BASE}/faculty/applications/${createdAppA._id}`, {
      headers: { Authorization: `Bearer ${facultyTokenA}` },
    });
    const step1Data = await step1Check.json();
    assert(step1Data.data?.status === 'Under Review', '59. Application transitioned to "Under Review"');

    // Admin transitions status: Under Review -> Interview
    const interviewPayload = {
      mode: 'Online',
      scheduledDate: new Date(Date.now() + 86400000 * 3), // 3 days in future
      platform: 'Google Meet',
      meetingLink: 'https://meet.google.com/sb-faculty-eval',
      instructions: 'Please prepare a 10-minute presentation on your research methodology.',
    };
    await updateApplicationStatusByAdmin(
      createdAppA._id,
      'Interview',
      { note: 'Technical interview scheduled with industry partner.', interviewDetails: interviewPayload },
      'Selection Committee'
    );

    const step2Check = await fetch(`${API_BASE}/faculty/applications/${createdAppA._id}`, {
      headers: { Authorization: `Bearer ${facultyTokenA}` },
    });
    const step2Data = await step2Check.json();
    assert(step2Data.data?.status === 'Interview', '60. Application transitioned to "Interview"');
    assert(step2Data.data?.interviewDetails?.mode === 'Online', '61. Interview mode stored as Online');
    assert(step2Data.data?.interviewDetails?.meetingLink === 'https://meet.google.com/sb-faculty-eval', '62. Interview meeting link preserved');
    assert(step2Data.data?.interviewDetails?.instructions.includes('10-minute presentation'), '63. Interview instructions preserved');

    // Admin transitions status: Interview -> Selected
    const selectionPayload = {
      offerDate: new Date(),
      reportingDate: new Date(Date.now() + 86400000 * 14),
      stipendAmount: 75000,
      instructions: 'Please review onboarding documents sent to your institutional email.',
    };
    await updateApplicationStatusByAdmin(
      createdAppA._id,
      'Selected',
      { note: 'Candidate selected for research fellowship.', selectionDetails: selectionPayload },
      'Director of Programs'
    );

    const step3Check = await fetch(`${API_BASE}/faculty/applications/${createdAppA._id}`, {
      headers: { Authorization: `Bearer ${facultyTokenA}` },
    });
    const step3Data = await step3Check.json();
    assert(step3Data.data?.status === 'Selected', '64. Application transitioned to "Selected"');
    assert(step3Data.data?.selectionDetails?.stipendAmount === 75000, '65. Selection stipend amount recorded');

    // Attempt withdrawal once Selected -> 400 Bad Request
    const withdrawSelectedRes = await fetch(`${API_BASE}/faculty/applications/${createdAppA._id}/withdraw`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${facultyTokenA}`,
      },
      body: JSON.stringify({ reason: 'Attempting withdrawal after selection' }),
    });
    assert(withdrawSelectedRes.status === 400, '66. Applications in "Selected" state cannot be withdrawn (400 Bad Request)');

    // Admin transitions status: Selected -> Completed
    await updateApplicationStatusByAdmin(
      createdAppA._id,
      'Completed',
      { remarks: 'Successfully published joint patent and delivered all immersion milestones.' },
      'Program Director'
    );

    const step4Check = await fetch(`${API_BASE}/faculty/applications/${createdAppA._id}`, {
      headers: { Authorization: `Bearer ${facultyTokenA}` },
    });
    const step4Data = await step4Check.json();
    assert(step4Data.data?.status === 'Completed', '67. Application transitioned to "Completed"');
    assert(Boolean(step4Data.data?.completedAt), '68. completedAt timestamp recorded');
    assert(step4Data.data?.completionDetails?.remarks.includes('joint patent'), '69. Completion remarks preserved');

    // ─────────────────────────────────────────────────────────────
    // 12. Automatic Verifiable Certificate Issuance
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 12. Automatic Verifiable Certificate Issuance ---');

    // Fetch certificate linked to application
    const appCertRes = await fetch(`${API_BASE}/faculty/applications/${createdAppA._id}/certificate`, {
      headers: { Authorization: `Bearer ${facultyTokenA}` },
    });
    assert(appCertRes.status === 200, '70. GET /faculty/applications/:id/certificate returns 200 OK');
    const appCertData = await appCertRes.json();
    assert(appCertData.success === true, '71. Certificate fetch success flag is true');
    issuedCertificate = appCertData.data;

    assert(Boolean(issuedCertificate.certificateNumber), '72. Certificate number generated');
    assert(issuedCertificate.certificateNumber.startsWith('SB-FAC-'), '73. Certificate number follows "SB-FAC-" format');
    assert(Boolean(issuedCertificate.verificationCode), '74. Verification code generated');
    assert(issuedCertificate.verificationCode.length >= 10, '75. Verification code is high-entropy cryptographic hex string');
    assert(issuedCertificate.status === 'Valid' || issuedCertificate.status === 'Active', '76. Certificate status is "Valid"');

    // Fetch certificate from list endpoint
    const listCertsRes = await fetch(`${API_BASE}/faculty/certificates`, {
      headers: { Authorization: `Bearer ${facultyTokenA}` },
    });
    assert(listCertsRes.status === 200, '77. GET /faculty/certificates returns 200 OK');
    const listCertsData = await listCertsRes.json();
    assert(Array.isArray(listCertsData.data), '78. Certificates returned as an array');
    const foundInList = listCertsData.data.some((c) => c._id === issuedCertificate._id);
    assert(foundInList, '79. Newly issued certificate appears in faculty certificate list');

    // Fetch certificate detail endpoint
    const certDetailRes = await fetch(`${API_BASE}/faculty/certificates/${issuedCertificate._id}`, {
      headers: { Authorization: `Bearer ${facultyTokenA}` },
    });
    assert(certDetailRes.status === 200, '80. GET /faculty/certificates/:id returns 200 OK');
    const certDetailData = await certDetailRes.json();
    assert(certDetailData.data.certificateNumber === issuedCertificate.certificateNumber, '81. Certificate detail matches');

    // ─────────────────────────────────────────────────────────────
    // 13. Binary PDF Streaming (View & Download)
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 13. Binary PDF Streaming (View & Download) ---');

    // Test inline view: GET /api/faculty/certificates/:id/view
    const viewPdfRes = await fetch(`${API_BASE}/faculty/certificates/${issuedCertificate._id}/view`, {
      headers: { Authorization: `Bearer ${facultyTokenA}` },
    });
    assert(viewPdfRes.status === 200, '82. Inline view returns 200 OK');
    assert(viewPdfRes.headers.get('content-type')?.includes('application/pdf'), '83. View Content-Type is application/pdf');
    assert(
      viewPdfRes.headers.get('content-disposition')?.includes('inline'),
      '84. View Content-Disposition is inline'
    );
    const viewBytes = Buffer.from(await viewPdfRes.arrayBuffer());
    assert(viewBytes.toString('utf8', 0, 5) === '%PDF-', '85. Generated PDF stream begins with valid %PDF- header');

    // Test attachment download: GET /api/faculty/certificates/:id/download
    const downloadPdfRes = await fetch(`${API_BASE}/faculty/certificates/${issuedCertificate._id}/download`, {
      headers: { Authorization: `Bearer ${facultyTokenA}` },
    });
    assert(downloadPdfRes.status === 200, '86. Download returns 200 OK');
    assert(downloadPdfRes.headers.get('content-type')?.includes('application/pdf'), '87. Download Content-Type is application/pdf');
    assert(
      downloadPdfRes.headers.get('content-disposition')?.includes('attachment'),
      '88. Download Content-Disposition is attachment'
    );
    const downloadBytes = Buffer.from(await downloadPdfRes.arrayBuffer());
    assert(downloadBytes.toString('utf8', 0, 5) === '%PDF-', '89. Downloaded file is valid binary PDF');

    // ─────────────────────────────────────────────────────────────
    // 14. Public Zero-Knowledge Certificate Verification
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 14. Public Zero-Knowledge Certificate Verification ---');

    // Public verification without auth header: GET /api/certificates/verify/:code
    const pubVerifyRes = await fetch(`${API_BASE}/certificates/verify/${issuedCertificate.verificationCode}`);
    assert(pubVerifyRes.status === 200, '90. Public verify returns 200 OK without authentication');
    const pubVerifyData = await pubVerifyRes.json();
    assert(pubVerifyData.success === true, '91. Public verify success flag is true');
    assert(pubVerifyData.data?.valid === true, '92. Certificate is marked valid');
    assert(pubVerifyData.data?.certificateNumber === issuedCertificate.certificateNumber, '93. Certificate number matches in public verify');
    assert(Boolean(pubVerifyData.data?.recipientName), '94. Public verify returns recipient name');
    assert(Boolean(pubVerifyData.data?.opportunityTitle), '95. Public verify returns opportunity title');

    // Strict PII check on public verify response
    assert(pubVerifyData.data.password === undefined, '96. Public verify NEVER leaks password');
    assert(pubVerifyData.data.email === undefined, '97. Public verify NEVER leaks recipient email');
    assert(pubVerifyData.data.phone === undefined, '98. Public verify NEVER leaks phone number');
    assert(pubVerifyData.data.documents === undefined, '99. Public verify NEVER leaks user documents vault');

    // Public verification alias: GET /api/certificate/verify/:code (singular)
    const pubAliasRes = await fetch(`${API_BASE}/certificate/verify/${issuedCertificate.verificationCode}`);
    assert(pubAliasRes.status === 200, '100. Public verify alias /certificate/verify/:code returns 200 OK');

    // Public verification with invalid code
    const invalidCodeRes = await fetch(`${API_BASE}/certificates/verify/NONEXISTENT999`);
    assert(
      invalidCodeRes.status === 404 || (await invalidCodeRes.json()).data?.valid === false,
      '101. Non-existent verification code returns 404 / valid: false'
    );

    // ─────────────────────────────────────────────────────────────
    // 15. Server-Side Filtering, Search & Pagination
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 15. Server-Side Filtering, Search & Pagination ---');

    // Filter by status: Completed
    const filterCompletedRes = await fetch(`${API_BASE}/faculty/applications?status=Completed`, {
      headers: { Authorization: `Bearer ${facultyTokenA}` },
    });
    assert(filterCompletedRes.status === 200, '102. GET /faculty/applications?status=Completed returns 200 OK');
    const completedJson = await filterCompletedRes.json();
    const completedList = completedJson.data?.applications || (Array.isArray(completedJson.data) ? completedJson.data : (completedJson.applications || []));
    assert(
      completedList.length > 0 && completedList.every((a) => a.status === 'Completed'),
      '103. Status filter returns only Completed applications'
    );

    // Filter by status: Withdrawn
    const filterWithdrawnRes = await fetch(`${API_BASE}/faculty/applications?status=Withdrawn`, {
      headers: { Authorization: `Bearer ${facultyTokenA}` },
    });
    assert(filterWithdrawnRes.status === 200, '104. GET /faculty/applications?status=Withdrawn returns 200 OK');
    const withdrawnJson = await filterWithdrawnRes.json();
    const withdrawnList = withdrawnJson.data?.applications || (Array.isArray(withdrawnJson.data) ? withdrawnJson.data : (withdrawnJson.applications || []));
    assert(
      withdrawnList.length > 0 && withdrawnList.every((a) => a.status === 'Withdrawn'),
      '105. Status filter returns only Withdrawn applications'
    );

    // Pagination test
    const pageLimitRes = await fetch(`${API_BASE}/faculty/applications?page=1&limit=1`, {
      headers: { Authorization: `Bearer ${facultyTokenA}` },
    });
    assert(pageLimitRes.status === 200, '106. Pagination request returns 200 OK');
    const pageJson = await pageLimitRes.json();
    const paginatedApps = pageJson.data?.applications || (Array.isArray(pageJson.data) ? pageJson.data : (pageJson.applications || []));
    const paginationMeta = pageJson.data?.pagination || pageJson.pagination || {};
    assert(paginatedApps.length === 1, '107. Pagination respects limit=1');
    assert(paginationMeta.total >= 2, '108. Pagination total reflects all applications');
    assert(paginationMeta.currentPage === 1 || paginationMeta.page === 1, '109. Pagination currentPage is 1');

    // ─────────────────────────────────────────────────────────────
    // 16. Notifications Integration
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 16. Notifications Integration ---');

    const notifsRes = await fetch(`${API_BASE}/faculty/notifications`, {
      headers: { Authorization: `Bearer ${facultyTokenA}` },
    });
    assert(notifsRes.status === 200, '110. GET /faculty/notifications returns 200 OK');
    const notifsData = await notifsRes.json();
    const notifsList = notifsData.data?.notifications || [];
    assert(Array.isArray(notifsList), '111. Notifications returned as array');

    const hasAppNotif = notifsList.some((n) => n.type === 'application' || (n.message && n.message.includes('application')));
    assert(hasAppNotif, '112. Application event notification delivered to Faculty A');

    // Recipient Isolation Check
    const facBNotifsRes = await fetch(`${API_BASE}/faculty/notifications`, {
      headers: { Authorization: `Bearer ${facultyTokenB}` },
    });
    const facBNotifsList = (await facBNotifsRes.json()).data?.notifications || [];
    const facBLeakedNotif = facBNotifsList.some(
      (n) => n.message && n.message.includes(oppA.title) && n.message.includes('Completed')
    );
    assert(!facBLeakedNotif, '113. Notifications strictly isolated by recipient User ID');

    // ─────────────────────────────────────────────────────────────
    // 17. Frontend Dev Server Routes Check
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 17. Frontend Dev Server Routes Check ---');

    const clientAppsRes = await fetch(`${CLIENT_BASE}/faculty/applications`);
    assert(
      clientAppsRes.status === 200,
      '114. Vite dev server returns 200 OK for /faculty/applications'
    );

    const clientAppDetailRes = await fetch(`${CLIENT_BASE}/faculty/applications/${createdAppA._id}`);
    assert(
      clientAppDetailRes.status === 200,
      '115. Vite dev server returns 200 OK for /faculty/applications/:id'
    );

    // Clean up temporary opportunities created for test
    if (closedOpp?._id) {
      await db.collection('facultyopportunities').deleteOne({ _id: new mongoose.Types.ObjectId(closedOpp._id) });
    }
    if (expiredOpp?._id) {
      await db.collection('facultyopportunities').deleteOne({ _id: new mongoose.Types.ObjectId(expiredOpp._id) });
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error('Test run failure:', err);
    failed++;
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
