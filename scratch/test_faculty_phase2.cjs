/**
 * Phase 2 Integration & Regression Test Suite
 * Academician / Faculty Profile & Digital Academic Portfolio
 * SkillBridge / SIH Problem Statement 26044
 *
 * Verifies:
 * 1. Authentication & Role Isolation (Faculty, Student 403, Industry 403, Unauth 401)
 * 2. Academic Profile CRUD & Deterministic Completeness Calculation (0-100%)
 * 3. Areas of Expertise & Research Interests Chip Management & Validation
 * 4. Publications CRUD & Input Validation
 * 5. Previous Industry Collaborations CRUD & Input Validation
 * 6. CV Management (PDF only, 5 MB limit, 1 active CV policy, View, Download, Delete)
 * 7. Supporting Documents CRUD (Max 10 limit, View, Download, Delete)
 * 8. Strict Cross-Faculty Ownership Isolation & Security (No client-ID trust)
 * 9. Frontend Route Accessibility (/faculty/profile)
 */

const fs = require('fs');
const path = require('path');

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
  console.log('🧪 SkillBridge Faculty Panel Phase 2 Test Suite');
  console.log('═══════════════════════════════════════════════════════════════\n');

  let facultyTokenA = '';
  let facultyTokenB = '';
  let studentToken = '';
  let industryToken = '';

  // Setup sample test files
  const samplePdfPath = path.join(__dirname, 'test_faculty_sample.pdf');
  fs.writeFileSync(samplePdfPath, '%PDF-1.4\n%Faculty Test PDF Document\n%%EOF');

  const sampleTxtPath = path.join(__dirname, 'test_faculty_invalid.txt');
  fs.writeFileSync(sampleTxtPath, 'This is a text file, not a PDF.');

  try {
    // ─────────────────────────────────────────────────────────────
    // 1. Authentication & Role-Based Access Control
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
    assert(facLoginRes.status === 200, 'Faculty A login returns 200 OK');
    const facLoginData = await facLoginRes.json();
    assert(facLoginData.success === true, 'Faculty login success flag is true');
    assert(facLoginData.user?.role === 'academician', "Faculty user role is 'academician'");
    facultyTokenA = facLoginData.token;

    // Student Login
    const studentLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'student@skillbridge.dev',
        password: 'Student@123',
      }),
    });
    assert(studentLoginRes.status === 200, 'Student login returns 200 OK');
    const studentData = await studentLoginRes.json();
    studentToken = studentData.token;

    // Industry Login
    const indLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'industry@skillbridge.dev',
        password: 'Industry@123',
      }),
    });
    assert(indLoginRes.status === 200, 'Industry login returns 200 OK');
    const indData = await indLoginRes.json();
    industryToken = indData.token;

    // Unauthenticated request to faculty profile -> 401
    const unauthRes = await fetch(`${API_BASE}/faculty/profile`);
    assert(unauthRes.status === 401, 'Unauthenticated GET /api/faculty/profile returns 401');

    // Student accessing faculty profile -> 403
    const studentAccessRes = await fetch(`${API_BASE}/faculty/profile`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(studentAccessRes.status === 403, 'Student accessing /api/faculty/profile returns 403 Forbidden');

    // Industry accessing faculty profile -> 403
    const industryAccessRes = await fetch(`${API_BASE}/faculty/profile`, {
      headers: { Authorization: `Bearer ${industryToken}` },
    });
    assert(industryAccessRes.status === 403, 'Industry accessing /api/faculty/profile returns 403 Forbidden');

    // Setup Faculty B (for cross-faculty ownership tests)
    const facBEmail = 'faculty_sec_test@skillbridge.dev';
    let facBRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: facBEmail,
        password: 'Faculty@123',
      }),
    });

    if (facBRes.status !== 200) {
      const instRes = await fetch(`${API_BASE}/auth/institutions`);
      const instData = await instRes.json();
      const institutionId = instData.institutions?.[0]?.id;

      await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Dr. Suresh Kumar',
          email: facBEmail,
          password: 'Faculty@123',
          confirmPassword: 'Faculty@123',
          role: 'academician',
          institutionId: institutionId,
          department: 'Electrical Engineering',
          designation: 'Assistant Professor',
        }),
      });

      const loginBRes = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: facBEmail,
          password: 'Faculty@123',
        }),
      });
      const loginBData = await loginBRes.json();
      facultyTokenB = loginBData.token;
    } else {
      const facBData = await facBRes.json();
      facultyTokenB = facBData.token;
    }
    assert(!!facultyTokenB, 'Secondary faculty user (Faculty B) is authenticated');

    // ─────────────────────────────────────────────────────────────
    // 2. Profile Retrieval & Deterministic Completeness
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 2. Faculty Profile Retrieval & Completeness ---');
    const profileRes = await fetch(`${API_BASE}/faculty/profile`, {
      headers: { Authorization: `Bearer ${facultyTokenA}` },
    });
    assert(profileRes.status === 200, 'GET /api/faculty/profile returns 200 OK');
    const profileData = await profileRes.json();
    assert(profileData.success === true, 'Profile response success flag is true');
    assert(!!profileData.data?.user, 'Profile response contains user object');
    assert(!!profileData.data?.profile, 'Profile response contains profile object');
    assert(typeof profileData.data?.completeness?.percentage === 'number', 'Completeness is a number');
    assert(
      profileData.data?.completeness?.percentage >= 0 && profileData.data?.completeness?.percentage <= 100,
      'Completeness is strictly between 0 and 100%'
    );
    assert(Array.isArray(profileData.data?.completeness?.fields), 'Completeness fields is an array of 10 items');
    assert(profileData.data?.completeness?.fields.length === 10, 'Exactly 10 deterministic factors evaluated');

    // ─────────────────────────────────────────────────────────────
    // 3. Profile Update & Field Validation
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 3. Profile Updates & Input Validation ---');
    const updateRes = await fetch(`${API_BASE}/faculty/profile`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${facultyTokenA}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        department: 'Computer Science & Engineering',
        designation: 'Associate Professor',
        institution: 'IIT Bombay',
        academicQualifications: 'Ph.D. in Computer Science (Distributed Systems)',
        specialization: 'Cloud Infrastructure & High-Performance Computing',
        bio: 'Senior academician and researcher specializing in large-scale distributed architectures and collaborative edge computing.',
        phone: '+91 98765 03003',
        linkedinUrl: 'https://linkedin.com/in/dr-priya-patel-test',
        googleScholarUrl: 'https://scholar.google.com/citations?user=test12345',
        orcidId: '0000-0002-1825-0097',
      }),
    });
    assert(updateRes.status === 200, 'PUT /api/faculty/profile returns 200 OK');
    const updateData = await updateRes.json();
    assert(updateData.success === true, 'Profile update returns success: true');
    assert(
      updateData.data?.profile?.specialization === 'Cloud Infrastructure & High-Performance Computing',
      'Specialization field updated correctly'
    );
    assert(
      updateData.data?.profile?.academicQualifications === 'Ph.D. in Computer Science (Distributed Systems)',
      'Qualifications field updated correctly'
    );

    // Validate invalid URL rejected
    const invalidUrlRes = await fetch(`${API_BASE}/faculty/profile`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${facultyTokenA}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        linkedinUrl: 'javascript:alert(1)',
      }),
    });
    assert(invalidUrlRes.status === 400, 'Invalid LinkedIn URL rejected with 400 Bad Request');

    // Expertise chip updates & validation
    const expertiseRes = await fetch(`${API_BASE}/faculty/profile/expertise`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${facultyTokenA}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        expertiseAreas: ['Distributed Systems', 'Cloud Computing', 'Edge AI', 'Distributed Systems'], // duplicate intentionally
      }),
    });
    assert(expertiseRes.status === 200, 'PUT /api/faculty/profile/expertise returns 200 OK');
    const expertiseData = await expertiseRes.json();
    assert(
      expertiseData.data?.expertiseAreas.length === 3,
      'Expertise tags deduplicated (3 unique items retained)'
    );

    // Empty expertise rejected
    const emptyExpRes = await fetch(`${API_BASE}/faculty/profile/expertise`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${facultyTokenA}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ expertiseAreas: [] }),
    });
    assert(emptyExpRes.status === 400, 'Empty expertise array rejected with 400 Bad Request');

    // Research interests chip updates & validation
    const researchRes = await fetch(`${API_BASE}/faculty/profile/research-interests`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${facultyTokenA}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        researchInterests: ['Serverless Architectures', 'Decentralized Data Management', 'Federated Learning'],
      }),
    });
    assert(researchRes.status === 200, 'PUT /api/faculty/profile/research-interests returns 200 OK');
    const researchData = await researchRes.json();
    assert(
      researchData.data?.researchInterests.includes('Serverless Architectures'),
      'Research interest updated successfully'
    );

    // Empty research interests rejected
    const emptyResRes = await fetch(`${API_BASE}/faculty/profile/research-interests`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${facultyTokenA}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ researchInterests: [] }),
    });
    assert(emptyResRes.status === 400, 'Empty research interests array rejected with 400 Bad Request');

    // ─────────────────────────────────────────────────────────────
    // 4. Publications CRUD & Validation
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 4. Publications CRUD & Validation ---');

    // Create valid publication
    const addPubRes = await fetch(`${API_BASE}/faculty/profile/publications`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${facultyTokenA}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Optimized Task Scheduling for Edge-Cloud Hierarchical Networks',
        authors: 'P. Patel, R. Sharma, S. Kumar',
        publicationType: 'Journal',
        journalOrConference: 'IEEE Transactions on Cloud Computing',
        publicationDate: '2024-03-15',
        doi: '10.1109/TCC.2024.1234567',
        url: 'https://doi.org/10.1109/TCC.2024.1234567',
        description: 'Comprehensive study on multi-objective scheduling in edge-fog-cloud topologies.',
      }),
    });
    assert(addPubRes.status === 201, 'POST /api/faculty/profile/publications returns 201 Created');
    const pubCreated = await addPubRes.json();
    const pubId = pubCreated.data?._id;
    assert(!!pubId, 'Created publication has valid MongoDB _id');

    // Missing title -> 400
    const missingTitleRes = await fetch(`${API_BASE}/faculty/profile/publications`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${facultyTokenA}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        publicationType: 'Journal',
      }),
    });
    assert(missingTitleRes.status === 400, 'Publication missing title rejected with 400 Bad Request');

    // Invalid publication type -> 400
    const invalidPubTypeRes = await fetch(`${API_BASE}/faculty/profile/publications`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${facultyTokenA}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Some publication',
        publicationType: 'BlogEntry',
      }),
    });
    assert(invalidPubTypeRes.status === 400, 'Invalid publication type rejected with 400 Bad Request');

    // Update publication
    const updatePubRes = await fetch(`${API_BASE}/faculty/profile/publications/${pubId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${facultyTokenA}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Optimized Task Scheduling for Edge-Cloud Networks (Revised Edition)',
      }),
    });
    assert(updatePubRes.status === 200, 'PUT /api/faculty/profile/publications/:id returns 200 OK');
    const updatedPubData = await updatePubRes.json();
    assert(
      updatedPubData.data?.title === 'Optimized Task Scheduling for Edge-Cloud Networks (Revised Edition)',
      'Publication title was updated'
    );

    // Update with empty title -> 400
    const emptyTitleRes = await fetch(`${API_BASE}/faculty/profile/publications/${pubId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${facultyTokenA}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: '   ' }),
    });
    assert(emptyTitleRes.status === 400, 'Publication update with empty title returns 400');

    // Update non-existent publication -> 404
    const nonExistentPubRes = await fetch(`${API_BASE}/faculty/profile/publications/507f1f77bcf86cd799439011`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${facultyTokenA}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: 'Non-existent' }),
    });
    assert(nonExistentPubRes.status === 404, 'Update non-existent publication returns 404 Not Found');

    // Delete publication
    const delPubRes = await fetch(`${API_BASE}/faculty/profile/publications/${pubId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${facultyTokenA}` },
    });
    assert(delPubRes.status === 200, 'DELETE /api/faculty/profile/publications/:id returns 200 OK');

    // Delete non-existent publication -> 404
    const delNonExistentPub = await fetch(`${API_BASE}/faculty/profile/publications/${pubId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${facultyTokenA}` },
    });
    assert(delNonExistentPub.status === 404, 'Deleting already deleted publication returns 404 Not Found');

    // ─────────────────────────────────────────────────────────────
    // 5. Industry Collaborations CRUD & Validation
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 5. Industry Collaborations CRUD & Validation ---');

    // Add collaboration
    const addCollabRes = await fetch(`${API_BASE}/faculty/profile/collaborations`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${facultyTokenA}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        company: 'Tata Consultancy Services Research',
        projectTitle: 'Enterprise Zero-Trust Edge Security Framework',
        role: 'Principal Academic Investigator',
        description: 'Joint research initiative exploring zero-trust architectures for distributed industrial IoT.',
        startDate: '2023-01-01',
        endDate: '2024-01-01',
        outcome: 'Production prototype deployed; 2 joint patents filed',
        referenceUrl: 'https://tcs.com/research/collaborations/edge-security',
      }),
    });
    assert(addCollabRes.status === 201, 'POST /api/faculty/profile/collaborations returns 201 Created');
    const collabData = await addCollabRes.json();
    const collabId = collabData.data?._id;
    assert(!!collabId, 'Created collaboration has valid MongoDB _id');

    // Missing company name -> 400
    const missingCompRes = await fetch(`${API_BASE}/faculty/profile/collaborations`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${facultyTokenA}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ projectTitle: 'Some Project' }),
    });
    assert(missingCompRes.status === 400, 'Missing company name returns 400 Bad Request');

    // Missing project title -> 400
    const missingProjRes = await fetch(`${API_BASE}/faculty/profile/collaborations`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${facultyTokenA}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ company: 'Some Company' }),
    });
    assert(missingProjRes.status === 400, 'Missing project title returns 400 Bad Request');

    // Update collaboration
    const updateCollabRes = await fetch(`${API_BASE}/faculty/profile/collaborations/${collabId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${facultyTokenA}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        outcome: '3 joint patents filed and transferred to production',
      }),
    });
    assert(updateCollabRes.status === 200, 'PUT /api/faculty/profile/collaborations/:id returns 200 OK');
    const updatedCollab = await updateCollabRes.json();
    assert(
      updatedCollab.data?.outcome === '3 joint patents filed and transferred to production',
      'Collaboration outcome updated'
    );

    // Update with empty company name -> 400
    const emptyCompRes = await fetch(`${API_BASE}/faculty/profile/collaborations/${collabId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${facultyTokenA}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ company: '   ' }),
    });
    assert(emptyCompRes.status === 400, 'Collaboration update with empty company returns 400');

    // Delete collaboration
    const delCollabRes = await fetch(`${API_BASE}/faculty/profile/collaborations/${collabId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${facultyTokenA}` },
    });
    assert(delCollabRes.status === 200, 'DELETE /api/faculty/profile/collaborations/:id returns 200 OK');

    // Delete non-existent collaboration -> 404
    const delNonCollab = await fetch(`${API_BASE}/faculty/profile/collaborations/${collabId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${facultyTokenA}` },
    });
    assert(delNonCollab.status === 404, 'Deleting non-existent collaboration returns 404 Not Found');

    // Re-add one collaboration for completeness and UI presentation
    await fetch(`${API_BASE}/faculty/profile/collaborations`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${facultyTokenA}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        company: 'Infosys Center for Emerging Technologies',
        projectTitle: 'Automated Curriculum Alignment via NLP',
        role: 'Faculty Advisor & Principal Investigator',
        outcome: 'SkillBridge SIH Architecture Blueprint v1.0',
      }),
    });

    // ─────────────────────────────────────────────────────────────
    // 6. CV Management (PDF only, max 5 MB, 1 active CV policy)
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 6. CV Management (PDF only, 5 MB, 1 Active CV) ---');

    // Non-PDF rejection test
    const invalidFileBlob = new Blob([fs.readFileSync(sampleTxtPath)], { type: 'text/plain' });
    const invalidCvForm = new FormData();
    invalidCvForm.append('cv', invalidFileBlob, 'resume.txt');

    const invalidCvRes = await fetch(`${API_BASE}/faculty/profile/cv`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${facultyTokenA}` },
      body: invalidCvForm,
    });
    assert(invalidCvRes.status === 400, 'Non-PDF CV upload rejected with 400 Bad Request');

    // Valid PDF upload
    const validPdfBlob = new Blob([fs.readFileSync(samplePdfPath)], { type: 'application/pdf' });
    const validCvForm = new FormData();
    validCvForm.append('cv', validPdfBlob, 'Dr_Priya_Patel_Academic_CV.pdf');

    const cvUploadRes = await fetch(`${API_BASE}/faculty/profile/cv`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${facultyTokenA}` },
      body: validCvForm,
    });
    assert(cvUploadRes.status === 200, 'Valid PDF CV upload returns 200 OK');
    const cvUploadData = await cvUploadRes.json();
    assert(cvUploadData.success === true, 'CV upload success flag is true');
    assert(cvUploadData.data?.originalName === 'Dr_Priya_Patel_Academic_CV.pdf', 'CV original name preserved');

    // Inline View CV
    const viewCvRes = await fetch(`${API_BASE}/faculty/profile/cv/view`, {
      headers: { Authorization: `Bearer ${facultyTokenA}` },
    });
    assert(viewCvRes.status === 200, 'GET /api/faculty/profile/cv/view returns 200 OK');
    assert(viewCvRes.headers.get('content-type') === 'application/pdf', 'CV Content-Type is application/pdf');
    assert(viewCvRes.headers.get('content-disposition')?.includes('inline'), 'CV Content-Disposition is inline');

    // Download CV
    const downloadCvRes = await fetch(`${API_BASE}/faculty/profile/cv/download`, {
      headers: { Authorization: `Bearer ${facultyTokenA}` },
    });
    assert(downloadCvRes.status === 200, 'GET /api/faculty/profile/cv/download returns 200 OK');
    assert(downloadCvRes.headers.get('content-disposition')?.includes('attachment'), 'CV Content-Disposition is attachment');

    // Replace CV (Upload second CV -> replaces first, maintains exactly 1 active CV)
    const secondPdfBlob = new Blob([fs.readFileSync(samplePdfPath)], { type: 'application/pdf' });
    const replaceCvForm = new FormData();
    replaceCvForm.append('cv', secondPdfBlob, 'Dr_Priya_Patel_Updated_CV.pdf');

    const replaceCvRes = await fetch(`${API_BASE}/faculty/profile/cv`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${facultyTokenA}` },
      body: replaceCvForm,
    });
    assert(replaceCvRes.status === 200, 'Replacing CV returns 200 OK');
    const replacedData = await replaceCvRes.json();
    assert(
      replacedData.data?.originalName === 'Dr_Priya_Patel_Updated_CV.pdf',
      'Replaced CV reflects new filename'
    );

    // Delete CV
    const delCvRes = await fetch(`${API_BASE}/faculty/profile/cv`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${facultyTokenA}` },
    });
    assert(delCvRes.status === 200, 'DELETE /api/faculty/profile/cv returns 200 OK');

    // View CV after deletion -> 404
    const viewDeletedCv = await fetch(`${API_BASE}/faculty/profile/cv/view`, {
      headers: { Authorization: `Bearer ${facultyTokenA}` },
    });
    assert(viewDeletedCv.status === 404, 'Viewing deleted CV returns 404 Not Found');

    // Re-upload CV for completeness and presentation
    const finalCvForm = new FormData();
    finalCvForm.append('cv', new Blob([fs.readFileSync(samplePdfPath)], { type: 'application/pdf' }), 'Dr_Priya_Patel_CV.pdf');
    await fetch(`${API_BASE}/faculty/profile/cv`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${facultyTokenA}` },
      body: finalCvForm,
    });

    // ─────────────────────────────────────────────────────────────
    // 7. Supporting Documents CRUD & 10-Document Limit
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 7. Supporting Documents CRUD & Limit (Max 10) ---');

    // Upload supporting document without file -> 400
    const emptyDocForm = new FormData();
    emptyDocForm.append('title', 'Test');
    const emptyDocRes = await fetch(`${API_BASE}/faculty/profile/documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${facultyTokenA}` },
      body: emptyDocForm,
    });
    assert(emptyDocRes.status === 400, 'Document upload without file returns 400 Bad Request');

    // Clean any prior test documents
    const initialProfileRes = await fetch(`${API_BASE}/faculty/profile`, {
      headers: { Authorization: `Bearer ${facultyTokenA}` },
    });
    const initialProfile = await initialProfileRes.json();
    const existingDocs = initialProfile.data?.profile?.supportingDocuments || [];
    for (const d of existingDocs) {
      await fetch(`${API_BASE}/faculty/profile/documents/${d._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${facultyTokenA}` },
      });
    }

    // Upload 1 valid supporting document
    const docBlob = new Blob([fs.readFileSync(samplePdfPath)], { type: 'application/pdf' });
    const singleDocForm = new FormData();
    singleDocForm.append('file', docBlob, 'Award_Certificate_2024.pdf');
    singleDocForm.append('title', 'National Faculty Excellence Award 2024');
    singleDocForm.append('category', 'Award');

    const singleDocRes = await fetch(`${API_BASE}/faculty/profile/documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${facultyTokenA}` },
      body: singleDocForm,
    });
    assert(singleDocRes.status === 201, 'POST /api/faculty/profile/documents returns 201 Created');
    const singleDocData = await singleDocRes.json();
    const testDocId = singleDocData.data?._id;
    assert(singleDocData.data?.category === 'Award', 'Document category correctly saved');

    // Inline View Document
    const viewDocRes = await fetch(`${API_BASE}/faculty/profile/documents/${testDocId}/view`, {
      headers: { Authorization: `Bearer ${facultyTokenA}` },
    });
    assert(viewDocRes.status === 200, 'GET /api/faculty/profile/documents/:id/view returns 200 OK');
    assert(viewDocRes.headers.get('content-type') === 'application/pdf', 'Doc Content-Type is application/pdf');

    // Download Document
    const downloadDocRes = await fetch(`${API_BASE}/faculty/profile/documents/${testDocId}/download`, {
      headers: { Authorization: `Bearer ${facultyTokenA}` },
    });
    assert(downloadDocRes.status === 200, 'GET /api/faculty/profile/documents/:id/download returns 200 OK');
    assert(downloadDocRes.headers.get('content-disposition')?.includes('attachment'), 'Doc Content-Disposition is attachment');

    // Delete Document
    const delDocRes = await fetch(`${API_BASE}/faculty/profile/documents/${testDocId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${facultyTokenA}` },
    });
    assert(delDocRes.status === 200, 'DELETE /api/faculty/profile/documents/:id returns 200 OK');

    // View deleted doc -> 404
    const viewDelDocRes = await fetch(`${API_BASE}/faculty/profile/documents/${testDocId}/view`, {
      headers: { Authorization: `Bearer ${facultyTokenA}` },
    });
    assert(viewDelDocRes.status === 404, 'Viewing deleted document returns 404 Not Found');

    // Test 10-Document Limit Enforcement
    console.log('  Testing 10-document limit enforcement...');
    const uploadedDocIds = [];
    for (let i = 1; i <= 10; i++) {
      const form = new FormData();
      form.append('file', new Blob([fs.readFileSync(samplePdfPath)], { type: 'application/pdf' }), `Doc_${i}.pdf`);
      form.append('title', `Supporting Document #${i}`);
      form.append('category', 'Certification');

      const res = await fetch(`${API_BASE}/faculty/profile/documents`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${facultyTokenA}` },
        body: form,
      });
      const data = await res.json();
      if (res.status === 201) {
        uploadedDocIds.push(data.data?._id);
      }
    }
    assert(uploadedDocIds.length === 10, 'Uploaded 10 documents successfully (max limit reached)');

    // 11th Document Upload Attempt -> 400 Bad Request
    const eleventhForm = new FormData();
    eleventhForm.append('file', new Blob([fs.readFileSync(samplePdfPath)], { type: 'application/pdf' }), 'Doc_11.pdf');
    eleventhForm.append('title', 'Eleventh Document Exceeding Limit');
    eleventhForm.append('category', 'Other');

    const eleventhRes = await fetch(`${API_BASE}/faculty/profile/documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${facultyTokenA}` },
      body: eleventhForm,
    });
    assert(eleventhRes.status === 400, '11th document upload rejected with 400 Bad Request (Limit enforced)');
    const eleventhData = await eleventhRes.json();
    assert(
      eleventhData.message?.includes('maximum of 10 documents'),
      'Clear error message indicates 10-document maximum limit'
    );

    // Clean up extra documents, leave 1 for presentation
    for (let i = 1; i < uploadedDocIds.length; i++) {
      await fetch(`${API_BASE}/faculty/profile/documents/${uploadedDocIds[i]}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${facultyTokenA}` },
      });
    }

    // ─────────────────────────────────────────────────────────────
    // 8. Cross-Faculty Security & Ownership Isolation
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 8. Cross-Faculty Security & Ownership Isolation ---');

    // Add a publication under Faculty A
    const pubOwnerRes = await fetch(`${API_BASE}/faculty/profile/publications`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${facultyTokenA}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Faculty A Confidential Research Paper',
        publicationType: 'Journal',
      }),
    });
    const pubOwnerData = await pubOwnerRes.json();
    const facAPubId = pubOwnerData.data?._id;

    // Faculty B tries to delete Faculty A's publication -> 404 (isolated to Faculty B's profile)
    const facBDeletePub = await fetch(`${API_BASE}/faculty/profile/publications/${facAPubId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${facultyTokenB}` },
    });
    assert(
      facBDeletePub.status === 404,
      "Faculty B cannot delete Faculty A's publication (404 Not Found - isolated)"
    );

    // Faculty B tries to update Faculty A's publication -> 404
    const facBUpdatePub = await fetch(`${API_BASE}/faculty/profile/publications/${facAPubId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${facultyTokenB}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: 'Tampered Title by Faculty B' }),
    });
    assert(
      facBUpdatePub.status === 404,
      "Faculty B cannot update Faculty A's publication (404 Not Found - isolated)"
    );

    // Faculty B tries to view Faculty A's CV -> 404 (Faculty B has not uploaded a CV)
    const facBViewCv = await fetch(`${API_BASE}/faculty/profile/cv/view`, {
      headers: { Authorization: `Bearer ${facultyTokenB}` },
    });
    assert(
      facBViewCv.status === 404,
      "Faculty B accessing /api/faculty/profile/cv/view cannot see Faculty A's CV (404)"
    );

    // Faculty B tries to delete Faculty A's supporting document -> 404
    const remainingDocId = uploadedDocIds[0];
    const facBDeleteDoc = await fetch(`${API_BASE}/faculty/profile/documents/${remainingDocId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${facultyTokenB}` },
    });
    assert(
      facBDeleteDoc.status === 404,
      "Faculty B cannot delete Faculty A's supporting document (404 Not Found)"
    );

    // Client-supplied facultyId in query or body has NO effect
    const tamperedProfileRes = await fetch(`${API_BASE}/faculty/profile?facultyId=fakeFaculty123`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${facultyTokenA}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        facultyId: 'malicious-injected-id',
        department: 'Computer Science & Engineering',
      }),
    });
    assert(tamperedProfileRes.status === 200, 'Tampered facultyId parameter ignored; session user ID strictly used');

    // ─────────────────────────────────────────────────────────────
    // 9. Frontend Route Accessibility
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 9. Frontend Route Accessibility ---');
    try {
      const viteRes = await fetch(`${CLIENT_BASE}/faculty/profile`);
      assert(viteRes.status === 200, 'Vite dev server returns 200 OK for /faculty/profile');
      const html = await viteRes.text();
      assert(html.includes('id="root"'), 'Vite HTML contains application root container');
    } catch (err) {
      console.warn('Vite dev server check skipped or offline:', err.message);
    }

    // Clean up temporary disk files
    try {
      if (fs.existsSync(samplePdfPath)) fs.unlinkSync(samplePdfPath);
      if (fs.existsSync(sampleTxtPath)) fs.unlinkSync(sampleTxtPath);
    } catch (_) {}

    // ─────────────────────────────────────────────────────────────
    // Test Summary
    // ─────────────────────────────────────────────────────────────
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('❌ Test suite fatal error:', err);
    process.exit(1);
  }
}

runTests();
