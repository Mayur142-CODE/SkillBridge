const fs = require('fs');
const path = require('path');
const dotenv = require('../backend/node_modules/dotenv');
const jwt = require('../backend/node_modules/jsonwebtoken');
const mongoose = require('../backend/node_modules/mongoose');

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const BASE_URL = 'http://localhost:5000';
const JWT_SECRET = process.env.JWT_SECRET || 'skillbridge_super_secret_jwt_key_2026';

async function runTests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🧪 SkillBridge Quality + Functionality Fix Test Suite');
  console.log('═══════════════════════════════════════════════════════════════\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, title) => {
    if (condition) {
      console.log(`  ✅ PASS: ${title}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${title}`);
      failed++;
    }
  };

  try {
    // ── Connect DB to create/manage real Student B ──
    await mongoose.connect(process.env.MONGODB_URI);
    const userSchema = new mongoose.Schema({
      name: String,
      email: String,
      role: String,
      status: String,
      isEmailVerified: Boolean,
    }, { strict: false });
    const User = mongoose.models.User || mongoose.model('User', userSchema);

    let studentB = await User.findOne({ email: 'student_b_test@skillbridge.dev' });
    if (!studentB) {
      studentB = await User.create({
        name: 'Student B Tester',
        email: 'student_b_test@skillbridge.dev',
        role: 'student',
        status: 'verified',
        isEmailVerified: true,
      });
    }
    const studentBId = studentB._id.toString();
    const tokenB = jwt.sign({ userId: studentBId, role: 'student' }, JWT_SECRET, { expiresIn: '1d' });
    const cookieB = `token=${tokenB}`;

    // ── Setup Student A Auth Cookie ──
    const studentLogin = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student@skillbridge.dev', password: 'Student@123' }),
    });
    assert(studentLogin.status === 200, 'Student login succeeds');
    const cookieA = studentLogin.headers.get('set-cookie');

    const profileResA = await fetch(`${BASE_URL}/api/student/profile`, {
      headers: { Cookie: cookieA },
    });
    const profileJsonA = await profileResA.json();
    const studentAId = profileJsonA.data.user.id;
    const studentAName = profileJsonA.data.user.name;

    // ─────────────────────────────────────────────────────────────
    // 1. Profile Retrieval & Dynamic Completeness
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 1. Profile Retrieval & Completeness ---');
    assert(profileResA.status === 200, '1. Profile retrieval returns 200');
    assert(profileJsonA.data.user.email === 'student@skillbridge.dev', 'Profile email matches student');
    assert(typeof profileJsonA.data.completeness.percentage === 'number', 'Dynamic completeness percentage exists');

    // ─────────────────────────────────────────────────────────────
    // 2. Project CRUD
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 2. Project CRUD ---');
    const createProjRes = await fetch(`${BASE_URL}/api/student/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({
        title: 'E2E Test Project Alpha',
        description: 'A test project for verification',
        technologies: ['React', 'Node.js'],
        githubUrl: 'https://github.com/test/alpha',
      }),
    });
    assert(createProjRes.status === 201, '2. Project creation returns 201');
    const projData = await createProjRes.json();
    const testProjId = projData.data._id;

    const getProjRes = await fetch(`${BASE_URL}/api/student/projects/${testProjId}`, {
      headers: { Cookie: cookieA },
    });
    assert(getProjRes.status === 200, 'Project GET by ID returns 200');

    const updateProjRes = await fetch(`${BASE_URL}/api/student/projects/${testProjId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({ title: 'E2E Test Project Alpha (Updated)' }),
    });
    assert(updateProjRes.status === 200, 'Project update returns 200');

    // ─────────────────────────────────────────────────────────────
    // 3. Project Delete (Direct & Alias Route)
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 3. Project Delete ---');
    const delProjRes = await fetch(`${BASE_URL}/api/student/profile/projects/${testProjId}`, {
      method: 'DELETE',
      headers: { Cookie: cookieA },
    });
    assert(delProjRes.status === 200, '3. Project delete via alias route returns 200');
    const getDeletedProj = await fetch(`${BASE_URL}/api/student/projects/${testProjId}`, {
      headers: { Cookie: cookieA },
    });
    assert(getDeletedProj.status === 404, 'Deleted project no longer exists (404)');

    // ─────────────────────────────────────────────────────────────
    // 4. Certification CRUD
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 4. Certification CRUD ---');
    const createCertRes = await fetch(`${BASE_URL}/api/student/certifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({
        name: 'AWS Certified Cloud Practitioner',
        issuingOrganization: 'Amazon Web Services',
        credentialId: 'AWS-E2E-12345',
        credentialUrl: 'https://aws.amazon.com/verify/12345',
      }),
    });
    assert(createCertRes.status === 201, '4. Certification creation returns 201');
    const certData = await createCertRes.json();
    const testCertId = certData.data._id;

    const updateCertRes = await fetch(`${BASE_URL}/api/student/certifications/${testCertId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({ credentialId: 'AWS-E2E-99999' }),
    });
    assert(updateCertRes.status === 200, 'Certification update returns 200');

    // ─────────────────────────────────────────────────────────────
    // 5. Certification Delete
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 5. Certification Delete ---');
    const delCertRes = await fetch(`${BASE_URL}/api/student/certifications/${testCertId}`, {
      method: 'DELETE',
      headers: { Cookie: cookieA },
    });
    assert(delCertRes.status === 200, '5. Certification delete returns 200');
    const allCertsRes = await fetch(`${BASE_URL}/api/student/certifications`, { headers: { Cookie: cookieA } });
    const allCerts = await allCertsRes.json();
    assert(!allCerts.data.some(c => c._id === testCertId), 'Deleted certification removed from database');

    // ─────────────────────────────────────────────────────────────
    // 6. Achievement CRUD
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 6. Achievement CRUD ---');
    const createAchRes = await fetch(`${BASE_URL}/api/student/achievements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({
        title: '1st Place Hackathon Winner',
        organization: 'National Innovation Council',
        description: 'Built an AI agent system for education',
      }),
    });
    assert(createAchRes.status === 201, '6. Achievement creation returns 201');
    const achData = await createAchRes.json();
    const testAchId = achData.data._id;

    const updateAchRes = await fetch(`${BASE_URL}/api/student/achievements/${testAchId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({ description: 'Updated achievement description' }),
    });
    assert(updateAchRes.status === 200, 'Achievement update returns 200');

    // ─────────────────────────────────────────────────────────────
    // 7. Achievement Delete
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 7. Achievement Delete ---');
    const delAchRes = await fetch(`${BASE_URL}/api/student/profile/achievements/${testAchId}`, {
      method: 'DELETE',
      headers: { Cookie: cookieA },
    });
    assert(delAchRes.status === 200, '7. Achievement delete via alias returns 200');
    const allAchRes = await fetch(`${BASE_URL}/api/student/achievements`, { headers: { Cookie: cookieA } });
    const allAchs = await allAchRes.json();
    assert(!allAchs.data.some(a => a._id === testAchId), 'Deleted achievement removed from database');

    // ─────────────────────────────────────────────────────────────
    // 8. Internship CRUD
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 8. Internship CRUD ---');
    const createInternRes = await fetch(`${BASE_URL}/api/student/internships`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({
        company: 'SkillBridge Labs',
        role: 'Full Stack Intern',
        location: 'Remote',
        startDate: '2024-01-15',
        endDate: '2024-04-15',
        description: 'Assisted in backend REST API design and frontend integration.',
        skills: ['Node.js', 'Express', 'React'],
      }),
    });
    assert(createInternRes.status === 201, '8. Internship creation returns 201');
    const internData = await createInternRes.json();
    const testInternId = internData.data._id;

    const updateInternRes = await fetch(`${BASE_URL}/api/student/internships/${testInternId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({ location: 'Hybrid' }),
    });
    assert(updateInternRes.status === 200, 'Internship update returns 200');

    // ─────────────────────────────────────────────────────────────
    // 9. Internship Delete
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 9. Internship Delete ---');
    const delInternRes = await fetch(`${BASE_URL}/api/student/internships/${testInternId}`, {
      method: 'DELETE',
      headers: { Cookie: cookieA },
    });
    assert(delInternRes.status === 200, '9. Internship delete returns 200');
    const allInternRes = await fetch(`${BASE_URL}/api/student/internships`, { headers: { Cookie: cookieA } });
    const allInterns = await allInternRes.json();
    assert(!allInterns.data.some(i => i._id === testInternId), 'Deleted internship removed from database');

    // ─────────────────────────────────────────────────────────────
    // 10. Document Upload
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 10. Document Upload ---');
    const tempFilePath = path.join(__dirname, 'test_sample_cert.pdf');
    fs.writeFileSync(tempFilePath, '%PDF-1.4\n%Test Document Stream Content for SkillBridge Vault\n%%EOF');

    const formData = new FormData();
    const fileBlob = new Blob([fs.readFileSync(tempFilePath)], { type: 'application/pdf' });
    formData.append('file', fileBlob, 'sample_cert.pdf');
    formData.append('title', 'Verified AWS Cloud Certificate');
    formData.append('category', 'Certificate');

    const uploadDocRes = await fetch(`${BASE_URL}/api/student/documents`, {
      method: 'POST',
      headers: { Cookie: cookieA },
      body: formData,
    });
    assert(uploadDocRes.status === 201, '10. Document upload returns 201');
    const uploadDocJson = await uploadDocRes.json();
    const testDocId = uploadDocJson.data._id;

    // ─────────────────────────────────────────────────────────────
    // 11 & 12. Document View Authorization & Stream
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 11 & 12. Document View Authorization ---');
    const viewDocResA = await fetch(`${BASE_URL}/api/student/documents/${testDocId}/view`, {
      headers: { Cookie: cookieA },
    });
    assert(viewDocResA.status === 200, '12. Owner can securely view document inline (200 OK)');
    assert(viewDocResA.headers.get('content-type') === 'application/pdf', 'Content-Type is application/pdf');
    assert(viewDocResA.headers.get('content-disposition')?.includes('inline'), 'Content-Disposition is inline');

    // Student B attempts to view Student A's private document -> 403
    const viewDocResB = await fetch(`${BASE_URL}/api/student/documents/${testDocId}/view`, {
      headers: { Cookie: cookieB },
    });
    assert(viewDocResB.status === 403, '12. Other student (Student B) cannot view private document (403 Forbidden)');

    // Unauthenticated attempt to view private document -> 401
    const viewDocUnauth = await fetch(`${BASE_URL}/api/student/documents/${testDocId}/view`);
    assert(viewDocUnauth.status === 401, '12. Unauthenticated request to view document returns 401');

    // ─────────────────────────────────────────────────────────────
    // 13. Document Delete (DB + Disk File Unlink)
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 13. Document Delete ---');
    const delDocRes = await fetch(`${BASE_URL}/api/student/documents/${testDocId}`, {
      method: 'DELETE',
      headers: { Cookie: cookieA },
    });
    assert(delDocRes.status === 200, '13. Document deletion returns 200');
    const verifyDocDeleted = await fetch(`${BASE_URL}/api/student/documents/${testDocId}/view`, {
      headers: { Cookie: cookieA },
    });
    assert(verifyDocDeleted.status === 404, 'Deleted document is no longer viewable (404)');

    // ─────────────────────────────────────────────────────────────
    // 14. Certification Limit (Max 10)
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 14. Certification Limit (Max 10) ---');
    const certIds = [];
    const existingCertsRes = await fetch(`${BASE_URL}/api/student/certifications`, { headers: { Cookie: cookieA } });
    const existingCerts = (await existingCertsRes.json()).data;
    for (const c of existingCerts) {
      await fetch(`${BASE_URL}/api/student/certifications/${c._id}`, { method: 'DELETE', headers: { Cookie: cookieA } });
    }

    for (let i = 1; i <= 10; i++) {
      const res = await fetch(`${BASE_URL}/api/student/certifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookieA },
        body: JSON.stringify({
          name: `Certificate #${i}`,
          issuingOrganization: 'SkillBridge Institute',
        }),
      });
      const data = await res.json();
      if (res.status === 201) certIds.push(data.data._id);
    }
    assert(certIds.length === 10, 'Created 10 certifications successfully');

    const cert11Res = await fetch(`${BASE_URL}/api/student/certifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({
        name: 'Certificate #11 (Exceeds Limit)',
        issuingOrganization: 'SkillBridge Institute',
      }),
    });
    assert(cert11Res.status === 400, '14. 11th certification rejected with 400 Bad Request');
    const cert11Json = await cert11Res.json();
    assert(cert11Json.message?.includes('maximum of 10'), 'Error message states: maximum of 10 certifications');

    // Free slot & replacement
    const freeCertId = certIds.pop();
    await fetch(`${BASE_URL}/api/student/certifications/${freeCertId}`, { method: 'DELETE', headers: { Cookie: cookieA } });
    const replacementCertRes = await fetch(`${BASE_URL}/api/student/certifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({
        name: 'Replacement Certificate',
        issuingOrganization: 'SkillBridge Institute',
      }),
    });
    assert(replacementCertRes.status === 201, 'Replacement certification created after freeing slot');
    if (replacementCertRes.status === 201) {
      const repJson = await replacementCertRes.json();
      certIds.push(repJson.data._id);
    }

    for (const id of certIds) {
      await fetch(`${BASE_URL}/api/student/certifications/${id}`, { method: 'DELETE', headers: { Cookie: cookieA } });
    }

    // ─────────────────────────────────────────────────────────────
    // 15. Project Limit (Max 10)
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 15. Project Limit (Max 10) ---');
    const existingProjs = (await (await fetch(`${BASE_URL}/api/student/projects`, { headers: { Cookie: cookieA } })).json()).data;
    for (const p of existingProjs) {
      await fetch(`${BASE_URL}/api/student/projects/${p._id}`, { method: 'DELETE', headers: { Cookie: cookieA } });
    }

    const projIds = [];
    for (let i = 1; i <= 10; i++) {
      const res = await fetch(`${BASE_URL}/api/student/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookieA },
        body: JSON.stringify({
          title: `Project #${i}`,
          description: `Description for project ${i}`,
        }),
      });
      const data = await res.json();
      if (res.status === 201) projIds.push(data.data._id);
    }
    assert(projIds.length === 10, 'Created 10 projects successfully');

    const proj11Res = await fetch(`${BASE_URL}/api/student/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({
        title: 'Project #11 (Exceeds Limit)',
        description: 'Description 11',
      }),
    });
    assert(proj11Res.status === 400, '15. 11th project rejected with 400 Bad Request');
    const proj11Json = await proj11Res.json();
    assert(proj11Json.message?.includes('maximum of 10'), 'Error message states: maximum of 10 projects');

    // Free slot & replacement
    const freeProjId = projIds.pop();
    await fetch(`${BASE_URL}/api/student/projects/${freeProjId}`, { method: 'DELETE', headers: { Cookie: cookieA } });
    const repProjRes = await fetch(`${BASE_URL}/api/student/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({ title: 'Replacement Project', description: 'Replaced description' }),
    });
    assert(repProjRes.status === 201, 'Replacement project created after freeing slot');
    if (repProjRes.status === 201) {
      const r = await repProjRes.json();
      projIds.push(r.data._id);
    }

    while (projIds.length > 2) {
      const id = projIds.pop();
      await fetch(`${BASE_URL}/api/student/projects/${id}`, { method: 'DELETE', headers: { Cookie: cookieA } });
    }

    // ─────────────────────────────────────────────────────────────
    // 16. Achievement Limit (Max 10)
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 16. Achievement Limit (Max 10) ---');
    const existingAchs = (await (await fetch(`${BASE_URL}/api/student/achievements`, { headers: { Cookie: cookieA } })).json()).data;
    for (const a of existingAchs) {
      await fetch(`${BASE_URL}/api/student/achievements/${a._id}`, { method: 'DELETE', headers: { Cookie: cookieA } });
    }

    const achIds = [];
    for (let i = 1; i <= 10; i++) {
      const res = await fetch(`${BASE_URL}/api/student/achievements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookieA },
        body: JSON.stringify({ title: `Achievement #${i}` }),
      });
      const data = await res.json();
      if (res.status === 201) achIds.push(data.data._id);
    }
    assert(achIds.length === 10, 'Created 10 achievements successfully');

    const ach11Res = await fetch(`${BASE_URL}/api/student/achievements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({ title: 'Achievement #11' }),
    });
    assert(ach11Res.status === 400, '16. 11th achievement rejected with 400 Bad Request');

    for (const id of achIds) {
      await fetch(`${BASE_URL}/api/student/achievements/${id}`, { method: 'DELETE', headers: { Cookie: cookieA } });
    }

    // ─────────────────────────────────────────────────────────────
    // 17. Internship Limit (Max 10)
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 17. Internship Limit (Max 10) ---');
    const existingInterns = (await (await fetch(`${BASE_URL}/api/student/internships`, { headers: { Cookie: cookieA } })).json()).data;
    for (const it of existingInterns) {
      await fetch(`${BASE_URL}/api/student/internships/${it._id}`, { method: 'DELETE', headers: { Cookie: cookieA } });
    }

    const internIds = [];
    for (let i = 1; i <= 10; i++) {
      const res = await fetch(`${BASE_URL}/api/student/internships`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookieA },
        body: JSON.stringify({
          company: `Company #${i}`,
          role: `Intern #${i}`,
        }),
      });
      const data = await res.json();
      if (res.status === 201) internIds.push(data.data._id);
    }
    assert(internIds.length === 10, 'Created 10 internships successfully');

    const intern11Res = await fetch(`${BASE_URL}/api/student/internships`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({ company: 'Company #11', role: 'Intern #11' }),
    });
    assert(intern11Res.status === 400, '17. 11th internship rejected with 400 Bad Request');

    for (const id of internIds) {
      await fetch(`${BASE_URL}/api/student/internships/${id}`, { method: 'DELETE', headers: { Cookie: cookieA } });
    }

    // ─────────────────────────────────────────────────────────────
    // 18. Resume Access & Deletion
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 18. Resume Access & Deletion ---');
    const resumeForm = new FormData();
    const resumeBlob = new Blob([fs.readFileSync(tempFilePath)], { type: 'application/pdf' });
    resumeForm.append('resume', resumeBlob, 'student_resume.pdf');

    const uploadResumeRes = await fetch(`${BASE_URL}/api/student/profile/resume`, {
      method: 'POST',
      headers: { Cookie: cookieA },
      body: resumeForm,
    });
    assert(uploadResumeRes.status === 200, '18. Resume uploaded successfully (200 OK)');

    const downloadResumeRes = await fetch(`${BASE_URL}/api/student/profile/resume/download`, {
      headers: { Cookie: cookieA },
    });
    assert(downloadResumeRes.status === 200, 'Resume download works (200 OK)');

    const delResumeRes = await fetch(`${BASE_URL}/api/student/profile/resume`, {
      method: 'DELETE',
      headers: { Cookie: cookieA },
    });
    assert(delResumeRes.status === 200, 'Resume deletion succeeds (200 OK)');

    const checkResumeAfterDel = await fetch(`${BASE_URL}/api/student/profile/resume/download`, {
      headers: { Cookie: cookieA },
    });
    assert(checkResumeAfterDel.status === 404, 'Deleted resume returns 404 on download');

    const reUploadResume = await fetch(`${BASE_URL}/api/student/profile/resume`, {
      method: 'POST',
      headers: { Cookie: cookieA },
      body: resumeForm,
    });
    assert(reUploadResume.status === 200, 'Resume re-uploaded for portfolio presentation');

    // ─────────────────────────────────────────────────────────────
    // 19. Ownership Protection Across Resources
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 19. Cross-Student Ownership Protection ---');
    const pRes = await fetch(`${BASE_URL}/api/student/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({ title: 'Student A Project', description: 'Owned by A' }),
    });
    const pOwnerId = (await pRes.json()).data._id;

    // Student B attempts to delete Student A's project -> 403 Forbidden
    const crossDeleteProj = await fetch(`${BASE_URL}/api/student/projects/${pOwnerId}`, {
      method: 'DELETE',
      headers: { Cookie: cookieB },
    });
    assert(crossDeleteProj.status === 403, '19. Student B cannot delete Student A project (403 Forbidden)');

    // Student B attempts to modify Student A's project -> 403 Forbidden
    const crossUpdateProj = await fetch(`${BASE_URL}/api/student/projects/${pOwnerId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookieB },
      body: JSON.stringify({ title: 'Hacked title' }),
    });
    assert(crossUpdateProj.status === 403, '19. Student B cannot modify Student A project (403 Forbidden)');

    // Unauthenticated deletion attempt -> 401
    const unauthDelProj = await fetch(`${BASE_URL}/api/student/projects/${pOwnerId}`, { method: 'DELETE' });
    assert(unauthDelProj.status === 401, '19. Unauthenticated deletion returns 401 Unauthorized');

    // Invalid ObjectId handling -> controlled 404
    const invalidIdDel = await fetch(`${BASE_URL}/api/student/projects/not-a-valid-objectid`, {
      method: 'DELETE',
      headers: { Cookie: cookieA },
    });
    assert(invalidIdDel.status === 404, '19. Invalid ObjectId returns controlled 404 (not 500)');

    // Nonexistent valid ObjectId -> 404
    const fakeId = new mongoose.Types.ObjectId().toString();
    const fakeIdDel = await fetch(`${BASE_URL}/api/student/projects/${fakeId}`, {
      method: 'DELETE',
      headers: { Cookie: cookieA },
    });
    assert(fakeIdDel.status === 404, '19. Nonexistent ID returns controlled 404');

    // Clean up project
    await fetch(`${BASE_URL}/api/student/projects/${pOwnerId}`, { method: 'DELETE', headers: { Cookie: cookieA } });

    // Re-seed baseline cert, achievement, internship, and restore student name
    await fetch(`${BASE_URL}/api/student/certifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({
        name: 'AWS Certified Cloud Practitioner',
        issuingOrganization: 'Amazon Web Services',
        credentialId: 'AWS-99001',
        credentialUrl: 'https://aws.amazon.com/verify/99001',
      }),
    });

    await fetch(`${BASE_URL}/api/student/achievements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({
        title: 'Smart India Hackathon Finalist',
        organization: 'Ministry of Education',
        description: 'National finalist for academia-industry portal',
      }),
    });

    await fetch(`${BASE_URL}/api/student/internships`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({
        company: 'SkillBridge Technologies',
        role: 'Software Engineering Intern',
        location: 'Mumbai, India',
        startDate: '2024-01-01',
        endDate: '2024-04-01',
        description: 'Developed full stack microservices using MERN.',
        skills: ['Node.js', 'React', 'MongoDB'],
      }),
    });

    await fetch(`${BASE_URL}/api/student/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({ name: 'Rahul Sharma', portfolioSlug: 'rahul-sharma' }),
    });

    // ─────────────────────────────────────────────────────────────
    // 20. Public Portfolio (Sanitized, No Login Required)
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 20 & 21. Public Portfolio & Privacy Protection ---');
    await fetch(`${BASE_URL}/api/student/profile/portfolio-visibility`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({ portfolioPublic: true }),
    });

    const profNow = await (await fetch(`${BASE_URL}/api/student/profile`, { headers: { Cookie: cookieA } })).json();
    const slug = profNow.data.profile.portfolioSlug;

    const publicRes = await fetch(`${BASE_URL}/api/portfolio/${slug}`);
    assert(publicRes.status === 200, '20. Public portfolio loads without login (200 OK)');
    const publicJson = await publicRes.json();
    assert(publicJson.success === true, 'Public portfolio success is true');
    assert(publicJson.data.student.name === profNow.data.user.name, 'Public portfolio student name matches');
    assert(publicJson.data.student.hasResume === true, 'Public portfolio indicates resume available');
    assert(publicJson.data.student.resumeUrl !== undefined, 'Public portfolio has public resume URL');

    // Public resume view endpoint
    const publicResumeRes = await fetch(`${BASE_URL}${publicJson.data.student.resumeUrl}`);
    assert(publicResumeRes.status === 200, 'Public resume streams inline without authentication (200 OK)');
    assert(publicResumeRes.headers.get('content-type') === 'application/pdf', 'Public resume MIME is application/pdf');

    // ─────────────────────────────────────────────────────────────
    // 21. Private Document Protection in Public Portfolio
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 21. Private Data Isolation ---');
    assert(publicJson.data.documents === undefined, '21. Documents vault is NOT exposed in public portfolio');
    assert(publicJson.data.student.phone === undefined, '21. Private phone is NOT exposed in public portfolio');
    assert(publicJson.data.student.email === undefined, '21. Private email is NOT exposed in public portfolio');
    assert(publicJson.data.student.rollNumber === undefined, '21. Private rollNumber is NOT exposed in public portfolio');

    // Ensure projects in public response do not expose internal database _id
    if (publicJson.data.projects?.length > 0) {
      assert(publicJson.data.projects[0]._id === undefined, '21. Internal MongoDB _id is stripped from public project cards');
    }

    // ─────────────────────────────────────────────────────────────
    // 22. Profile Completeness After Mutations
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 22. Profile Completeness Dynamic Updates ---');
    const finalProfileRes = await fetch(`${BASE_URL}/api/student/profile`, { headers: { Cookie: cookieA } });
    const finalProfileJson = await finalProfileRes.json();
    const finalCompleteness = finalProfileJson.data.completeness.percentage;
    assert(typeof finalCompleteness === 'number', '22. Profile completeness calculated dynamically');
    assert(finalProfileJson.data.completeness.details.resume === true, 'Completeness details reflect active resume');

    // Clean up sample file and student B
    if (fs.existsSync(tempFilePath)) {
      try { fs.unlinkSync(tempFilePath); } catch (_) {}
    }
    await User.deleteOne({ email: 'student_b_test@skillbridge.dev' });
    await mongoose.disconnect();

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('═══════════════════════════════════════════════════════════════');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  }
}

runTests();
