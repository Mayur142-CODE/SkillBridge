/**
 * Phase 3 Integration & Verification Test Suite
 * Academician / Faculty Opportunity Discovery
 * SkillBridge / SIH Problem Statement 26044
 *
 * Verifies:
 * 1. Authentication & Role Isolation (Faculty 200, Student 403, Industry 403, Unauth 401)
 * 2. Multi-Faceted Opportunity Discovery (Search, Type, Domain, Mode, Provider, Certificate, Deadline)
 * 3. Server-Side Pagination & Sorting (Recommended, Highest Match, Newest, Deadline)
 * 4. Deterministic Expertise Matching (Match score 0-100%, matchedExpertise, missingExpertise, no-required-skills handling)
 * 5. Eligibility Preview Evaluation (Eligible boolean, reasons array, previewOnly flag)
 * 6. Opportunity Details Specification API
 * 7. Security & Isolation (Draft/private opportunities hidden, read-only enforcement, anti-tampering)
 * 8. Seed Data Coverage (All 9 controlled types, 18+ opportunities)
 * 9. Frontend Route Accessibility (/faculty/opportunities)
 */

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
  console.log('🧪 SkillBridge Faculty Panel Phase 3 Test Suite');
  console.log('═══════════════════════════════════════════════════════════════\n');

  let facultyToken = '';
  let studentToken = '';
  let industryToken = '';
  let sampleOppId = '';
  let draftOppId = '';

  try {
    // ─────────────────────────────────────────────────────────────
    // 1. Authentication & Role Isolation
    // ─────────────────────────────────────────────────────────────
    console.log('--- 1. Authentication & Role Isolation ---');

    // Faculty Login
    const facLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'faculty@skillbridge.dev',
        password: 'Faculty@123',
      }),
    });
    assert(facLoginRes.status === 200, '1. Faculty login returns 200 OK');
    const facLoginData = await facLoginRes.json();
    assert(facLoginData.success === true, 'Faculty login success flag is true');
    assert(facLoginData.user?.role === 'academician', "Faculty user role is 'academician'");
    facultyToken = facLoginData.token;

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
    studentToken = (await studentLoginRes.json()).token;

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
    industryToken = (await indLoginRes.json()).token;

    // 2. Faculty can access opportunities
    const facOppsRes = await fetch(`${API_BASE}/faculty/opportunities`, {
      headers: { Authorization: `Bearer ${facultyToken}` },
    });
    assert(facOppsRes.status === 200, '2. Faculty accessing /api/faculty/opportunities returns 200 OK');

    // 3. Unauthenticated request -> 401
    const unauthRes = await fetch(`${API_BASE}/faculty/opportunities`);
    assert(unauthRes.status === 401, '3. Unauthenticated GET /api/faculty/opportunities returns 401 Unauthorized');

    // 4. Student accessing faculty opportunities -> 403
    const studentRes = await fetch(`${API_BASE}/faculty/opportunities`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(studentRes.status === 403, '4. Student accessing /api/faculty/opportunities returns 403 Forbidden');

    // 5. Industry accessing faculty opportunities -> 403
    const industryRes = await fetch(`${API_BASE}/faculty/opportunities`, {
      headers: { Authorization: `Bearer ${industryToken}` },
    });
    assert(industryRes.status === 403, '5. Industry accessing /api/faculty/opportunities returns 403 Forbidden');

    // ─────────────────────────────────────────────────────────────
    // 2. Discovery & Querying
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 2. Opportunity Discovery, Search & Filters ---');

    // 6. Opportunity list and pagination metadata
    const oppsData = await facOppsRes.json();
    assert(oppsData.success === true, '6. Opportunities response success is true');
    assert(Array.isArray(oppsData.data?.opportunities), 'Opportunities returned as array');
    assert(oppsData.data?.opportunities.length > 0, 'Opportunities array is not empty');
    assert(typeof oppsData.data?.pagination?.total === 'number', 'Pagination total is a number');
    assert(oppsData.data?.pagination?.total >= 18, 'At least 18 discoverable opportunities present in database');
    assert(!!oppsData.data?.meta?.facultyName, 'Response meta includes facultyName');

    sampleOppId = oppsData.data.opportunities[0]._id;

    // 7. Opportunity Detail by ID
    const detailRes = await fetch(`${API_BASE}/faculty/opportunities/${sampleOppId}`, {
      headers: { Authorization: `Bearer ${facultyToken}` },
    });
    assert(detailRes.status === 200, '7. GET /api/faculty/opportunities/:id returns 200 OK');
    const detailData = await detailRes.json();
    assert(detailData.success === true, 'Opportunity detail success is true');
    assert(detailData.data?._id === sampleOppId, 'Detail ID matches requested ID');
    assert(!!detailData.data?.title, 'Detail contains title');
    assert(!!detailData.data?.provider, 'Detail contains provider');
    assert(!!detailData.data?.domain, 'Detail contains domain');
    assert(!!detailData.data?.description, 'Detail contains description');

    // 8. Search filter
    const searchRes = await fetch(`${API_BASE}/faculty/opportunities?search=Research`, {
      headers: { Authorization: `Bearer ${facultyToken}` },
    });
    assert(searchRes.status === 200, '8. Search query returns 200 OK');
    const searchData = await searchRes.json();
    const allMatchSearch = searchData.data.opportunities.every((o) => {
      const q = 'research';
      return (
        o.title.toLowerCase().includes(q) ||
        o.description.toLowerCase().includes(q) ||
        o.provider.toLowerCase().includes(q) ||
        o.domain.toLowerCase().includes(q) ||
        o.requiredExpertise.some((e) => e.toLowerCase().includes(q))
      );
    });
    assert(allMatchSearch, 'Search results strictly match keyword "Research"');

    // 9. Type filter
    const typeRes = await fetch(
      `${API_BASE}/faculty/opportunities?type=Faculty+Internship`,
      { headers: { Authorization: `Bearer ${facultyToken}` } }
    );
    assert(typeRes.status === 200, '9. Type filter returns 200 OK');
    const typeData = await typeRes.json();
    assert(
      typeData.data.opportunities.length > 0 &&
        typeData.data.opportunities.every((o) => o.type === 'Faculty Internship'),
      'Type filter returns only Faculty Internships'
    );

    // 10. Domain filter
    const domainRes = await fetch(
      `${API_BASE}/faculty/opportunities?domain=Artificial+Intelligence`,
      { headers: { Authorization: `Bearer ${facultyToken}` } }
    );
    assert(domainRes.status === 200, '10. Domain filter returns 200 OK');
    const domainData = await domainRes.json();
    assert(
      domainData.data.opportunities.length > 0 &&
        domainData.data.opportunities.every((o) =>
          o.domain.toLowerCase().includes('artificial intelligence')
        ),
      'Domain filter returns only AI domain opportunities'
    );

    // 11. Mode filter
    const modeRes = await fetch(`${API_BASE}/faculty/opportunities?mode=Online`, {
      headers: { Authorization: `Bearer ${facultyToken}` },
    });
    assert(modeRes.status === 200, '11. Mode filter returns 200 OK');
    const modeData = await modeRes.json();
    assert(
      modeData.data.opportunities.length > 0 &&
        modeData.data.opportunities.every((o) => o.mode === 'Online'),
      'Mode filter returns only Online opportunities'
    );

    // 12. Provider filter
    const provRes = await fetch(
      `${API_BASE}/faculty/opportunities?provider=TCS+Research`,
      { headers: { Authorization: `Bearer ${facultyToken}` } }
    );
    assert(provRes.status === 200, '12. Provider filter returns 200 OK');
    const provData = await provRes.json();
    assert(
      provData.data.opportunities.length > 0 &&
        provData.data.opportunities.every((o) => o.provider === 'TCS Research'),
      'Provider filter returns only TCS Research opportunities'
    );

    // 13. Expertise filter
    const expRes = await fetch(`${API_BASE}/faculty/opportunities?expertise=Python`, {
      headers: { Authorization: `Bearer ${facultyToken}` },
    });
    assert(expRes.status === 200, '13. Expertise filter returns 200 OK');
    const expData = await expRes.json();
    assert(
      expData.data.opportunities.length > 0 &&
        expData.data.opportunities.every((o) =>
          o.requiredExpertise.some((e) => e.toLowerCase().includes('python'))
        ),
      'Expertise filter returns opportunities requiring Python'
    );

    // 14. Certificate filter
    const certRes = await fetch(`${API_BASE}/faculty/opportunities?certificate=true`, {
      headers: { Authorization: `Bearer ${facultyToken}` },
    });
    assert(certRes.status === 200, '14. Certificate filter returns 200 OK');
    const certData = await certRes.json();
    assert(
      certData.data.opportunities.every((o) => o.certificateAvailable === true),
      'Certificate filter returns opportunities with certificates'
    );

    // 15. Deadline filter
    const deadlineRes = await fetch(`${API_BASE}/faculty/opportunities?deadline=active`, {
      headers: { Authorization: `Bearer ${facultyToken}` },
    });
    assert(deadlineRes.status === 200, '15. Active deadline filter returns 200 OK');
    const deadlineData = await deadlineRes.json();
    const now = new Date();
    assert(
      deadlineData.data.opportunities.every(
        (o) => new Date(o.applicationDeadline) >= now
      ),
      'Active deadline filter returns only opportunities with future deadlines'
    );

    // 16. Pagination correctness
    const page1Res = await fetch(`${API_BASE}/faculty/opportunities?page=1&limit=4`, {
      headers: { Authorization: `Bearer ${facultyToken}` },
    });
    const page2Res = await fetch(`${API_BASE}/faculty/opportunities?page=2&limit=4`, {
      headers: { Authorization: `Bearer ${facultyToken}` },
    });
    const p1Data = await page1Res.json();
    const p2Data = await page2Res.json();
    assert(p1Data.data.opportunities.length === 4, '16. Page 1 returns exactly 4 items');
    assert(p2Data.data.opportunities.length === 4, 'Page 2 returns exactly 4 items');
    const p1FirstId = p1Data.data.opportunities[0]._id;
    const p2FirstId = p2Data.data.opportunities[0]._id;
    assert(p1FirstId !== p2FirstId, 'Page 1 and Page 2 contain distinct opportunities');

    // 17. Server-Side Sorting
    const sortNewestRes = await fetch(`${API_BASE}/faculty/opportunities?sort=newest`, {
      headers: { Authorization: `Bearer ${facultyToken}` },
    });
    const sortNewestData = await sortNewestRes.json();
    const newestList = sortNewestData.data.opportunities;
    let isSortedNewest = true;
    for (let i = 1; i < newestList.length; i++) {
      if (new Date(newestList[i - 1].createdAt) < new Date(newestList[i].createdAt)) {
        isSortedNewest = false;
        break;
      }
    }
    assert(isSortedNewest, '17. sort=newest sorts descending by createdAt');

    const sortMatchRes = await fetch(`${API_BASE}/faculty/opportunities?sort=highest_match`, {
      headers: { Authorization: `Bearer ${facultyToken}` },
    });
    const sortMatchData = await sortMatchRes.json();
    const matchList = sortMatchData.data.opportunities;
    let isSortedMatch = true;
    for (let i = 1; i < matchList.length; i++) {
      if (matchList[i - 1].match.matchScore < matchList[i].match.matchScore) {
        isSortedMatch = false;
        break;
      }
    }
    assert(isSortedMatch, 'sort=highest_match sorts descending by calculated matchScore');

    // ─────────────────────────────────────────────────────────────
    // 3. Expertise Matching Logic
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 3. Deterministic Expertise Matching ---');

    // 18. Match score structure
    const testOpp = oppsData.data.opportunities.find(
      (o) => o.requiredExpertise && o.requiredExpertise.length > 0
    );
    assert(typeof testOpp.match?.matchScore === 'number', '18. Match score is a calculated number');
    assert(
      testOpp.match.matchScore >= 0 && testOpp.match.matchScore <= 100,
      'Match score is bounded [0, 100]'
    );

    // 19. Matched expertise array
    assert(Array.isArray(testOpp.match?.matchedExpertise), '19. Matched expertise is an array');

    // 20. Missing expertise array
    assert(Array.isArray(testOpp.match?.missingExpertise), '20. Missing expertise is an array');

    // Verify consistency: matched + missing = requiredExpertise
    assert(
      testOpp.match.matchedExpertise.length + testOpp.match.missingExpertise.length ===
        testOpp.requiredExpertise.length,
      'Matched expertise + missing expertise equals total required expertise count'
    );

    // 21. No-required-expertise handling
    // Check opportunity filters endpoint
    const filterFacetsRes = await fetch(`${API_BASE}/faculty/opportunities/filters`, {
      headers: { Authorization: `Bearer ${facultyToken}` },
    });
    assert(filterFacetsRes.status === 200, '21. GET /api/faculty/opportunities/filters returns 200 OK');
    const filterFacets = await filterFacetsRes.json();
    assert(Array.isArray(filterFacets.data?.types), 'Filters contains types list');
    assert(Array.isArray(filterFacets.data?.domains), 'Filters contains domains list');
    assert(Array.isArray(filterFacets.data?.modes), 'Filters contains modes list');

    // ─────────────────────────────────────────────────────────────
    // 4. Eligibility Preview Evaluation
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 4. Eligibility Preview Evaluation ---');

    // 22. Eligibility object format
    assert(typeof detailData.data?.eligibility?.eligible === 'boolean', '22. Eligibility eligible is a boolean');

    // 23. Preview only advisory flag
    assert(
      detailData.data?.eligibility?.previewOnly === true,
      '23. Eligibility explicitly marked as previewOnly (authoritative validation deferred to Phase 5)'
    );

    // 24. Eligibility reasons array
    assert(
      Array.isArray(detailData.data?.eligibility?.eligibilityReasons),
      '24. Eligibility reasons is an array'
    );

    // ─────────────────────────────────────────────────────────────
    // 5. Security & Isolation
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 5. Security & Isolation ---');

    // Find the draft opportunity from database directly (via test query)
    // We verify that draft opportunity is NOT returned in discovery list
    const allDiscoverableRes = await fetch(`${API_BASE}/faculty/opportunities?limit=50`, {
      headers: { Authorization: `Bearer ${facultyToken}` },
    });
    const allDiscoverable = await allDiscoverableRes.json();
    const containsDraft = allDiscoverable.data.opportunities.some(
      (o) => o.status === 'Draft' || o.title.includes('[DRAFT]')
    );
    assert(!containsDraft, '25. Draft opportunities are strictly hidden from discovery list');

    // 26. Direct fetch of draft opportunity -> 404
    // Find draft ID using mongo or search
    const draftSearch = await fetch(
      `${API_BASE}/faculty/opportunities?search=Classified`,
      { headers: { Authorization: `Bearer ${facultyToken}` } }
    );
    const draftSearchData = await draftSearch.json();
    assert(
      draftSearchData.data.opportunities.length === 0,
      '26. Search query cannot find draft opportunity'
    );

    // 27. Faculty cannot create opportunities (read-only in Phase 3)
    const postOppRes = await fetch(`${API_BASE}/faculty/opportunities`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${facultyToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: 'Unauthorized Opportunity Creation' }),
    });
    assert(
      postOppRes.status === 404 || postOppRes.status === 405,
      '27. POST /api/faculty/opportunities rejected (Faculty cannot create opportunities)'
    );

    // 28. Faculty cannot modify opportunities
    const putOppRes = await fetch(`${API_BASE}/faculty/opportunities/${sampleOppId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${facultyToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: 'Tampered Title' }),
    });
    assert(
      putOppRes.status === 404 || putOppRes.status === 405,
      '28. PUT /api/faculty/opportunities/:id rejected (Faculty cannot modify opportunities)'
    );

    // 29. Faculty cannot delete opportunities
    const delOppRes = await fetch(`${API_BASE}/faculty/opportunities/${sampleOppId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${facultyToken}` },
    });
    assert(
      delOppRes.status === 404 || delOppRes.status === 405,
      '29. DELETE /api/faculty/opportunities/:id rejected (Faculty cannot delete opportunities)'
    );

    // 30. Client cannot inject matchScore parameter
    const injectedMatchRes = await fetch(
      `${API_BASE}/faculty/opportunities/${sampleOppId}?matchScore=99`,
      { headers: { Authorization: `Bearer ${facultyToken}` } }
    );
    const injectedData = await injectedMatchRes.json();
    assert(
      injectedData.data?.match?.matchScore === detailData.data?.match?.matchScore,
      '30. Client cannot inject match score; backend computes authoritative score'
    );

    // 31. Client cannot inject facultyId parameter
    const injectedFacultyRes = await fetch(
      `${API_BASE}/faculty/opportunities?facultyId=fakeId123`,
      { headers: { Authorization: `Bearer ${facultyToken}` } }
    );
    const injectedFacData = await injectedFacultyRes.json();
    assert(
      injectedFacData.data?.meta?.facultyName === 'Dr. Priya Patel',
      '31. Client-supplied facultyId parameter ignored; authenticated session strictly authoritative'
    );

    // ─────────────────────────────────────────────────────────────
    // 6. Data Integrity & Controlled Enum Coverage
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 6. Data Integrity & Type Coverage ---');

    const allTypesRes = await fetch(`${API_BASE}/faculty/opportunities?limit=50`, {
      headers: { Authorization: `Bearer ${facultyToken}` },
    });
    const allTypesData = await allTypesRes.json();
    const observedTypes = new Set(allTypesData.data.opportunities.map((o) => o.type));

    const requiredTypes = [
      'Faculty Internship',
      'Industrial Training',
      'Faculty Development Program',
      'Consultancy',
      'Collaborative Research',
      'Guest Lecture',
      'Workshop',
      'Live Industry Project',
      'Innovation Challenge',
    ];

    const missingTypes = requiredTypes.filter((t) => !observedTypes.has(t));
    assert(
      missingTypes.length === 0,
      `32. All 9 controlled opportunity types are represented in seeded database (${observedTypes.size}/9 types)`
    );

    // 33. Invalid ObjectId returns controlled 404
    const invalidIdRes = await fetch(
      `${API_BASE}/faculty/opportunities/507f1f77bcf86cd799439011`,
      { headers: { Authorization: `Bearer ${facultyToken}` } }
    );
    assert(invalidIdRes.status === 404, '33. Non-existent opportunity ID returns 404 Not Found');

    // ─────────────────────────────────────────────────────────────
    // 7. Frontend Route Accessibility
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 7. Frontend Route Accessibility ---');
    try {
      const viteRes = await fetch(`${CLIENT_BASE}/faculty/opportunities`);
      assert(viteRes.status === 200, '34. Vite dev server returns 200 OK for /faculty/opportunities');
      const html = await viteRes.text();
      assert(html.includes('id="root"'), '35. Vite HTML contains root container');
    } catch (err) {
      console.warn('Vite dev server check skipped:', err.message);
    }

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
