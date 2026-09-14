/**
 * Institution Panel MoUs — Focused Integration Test Suite
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Verifies:
 *  a. Institution login + GET /api/institution/mous list shape (mous /
 *     summary / facets / pagination) with no password / path / token leaks
 *  b. Institution can create an MoU (always Draft, owned by the session)
 *  c. Institution can update its own MoU (fields applied, dates validated
 *     server-side: invalid date, expiry < effective → 400 with field errors)
 *  d. Honest derived states are correct: Draft, Active, Expiring Soon,
 *     Expired (a stored-Active MoU whose expiry passes reads as Expired in
 *     list, detail AND summary counts)
 *  e. Document handling: upload PDF (replace), view (inline), download
 *     (attachment), remove; invalid file type → 400
 *  f. Ownership isolation: Institution B cannot read/update/delete/activate/
 *     archive Institution A MoUs (404); spoofed institutionId in create is
 *     ignored — the record is owned by the session user
 *  g. Invalid transitions/data return proper 4xx: activate past-expiry → 400,
 *     activate already-active → 400, archive already-archived → 400,
 *     activate archived → 400, delete missing/invalid id → 404
 *
 * Role & auth isolation: anonymous → 401; student / faculty → 403 across
 * the MoU endpoints.
 *
 * Cleanup: temp Institution B user + all temp MoUs (and their uploaded
 * document files) removed from MongoDB/disk — real demo data is never
 * touched beyond read.
 */

const path = require('path');
const fs = require('fs');

const API_BASE = 'http://127.0.0.1:5000/api';

const TS = Date.now();
const BASE = `mou-${TS}`;
const PASS = 'Mous@123';
const TEMP_INST_B_EMAIL = `instb-${BASE}@skillbridge.dev`;

const DAY = 24 * 60 * 60 * 1000;
const isoInDays = (days) => new Date(Date.now() + days * DAY).toISOString();

function pdfBytes() {
  return Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\nxref\n1 3\ntrailer<</Size 3/Root 1 0 R>>\nstartxref\n0\n%%EOF\n');
}

async function runTests() {
  let passed = 0;
  let failed = 0;

  const tmp = {
    institutionAId: '',
    institutionBId: '',
    bToken: '',
    mousA: [],
    mousB: [],
  };
  let createdAt = null;

  async function connectDb() {
    const { pathToFileURL } = await import('url');
    const envFile = fs.readFileSync(path.resolve(__dirname, '../backend/.env'), 'utf8');
    const uriMatch = envFile.match(/^\s*MONGODB_URI\s*=\s*(.+)$/m);
    if (!uriMatch) throw new Error('MONGODB_URI not found in backend/.env');
    process.env.MONGODB_URI = uriMatch[1].trim();

    const fileUrl = (p) => pathToFileURL(path.resolve(__dirname, p)).href;
    const mongoose = (await import(fileUrl('../backend/node_modules/mongoose/lib/index.js'))).default;
    const { default: ensureNodeDns } = await import(fileUrl('../backend/src/config/dns.js'));
    await import(fileUrl('../backend/src/models/User.js'));
    await import(fileUrl('../backend/src/models/InstitutionMou.js'));

    await ensureNodeDns();
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 20000 });
    db = mongoose;
    return mongoose;
  }

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

  async function register(body) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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
      /* non-JSON (e.g. document bytes) */
    }
    return { status: res.status, data, headers: res.headers };
  }

  async function uploadDocApi(urlPath, token, { name = 'mou-test.pdf', mime = 'application/pdf', content } = {}) {
    const fd = new FormData();
    fd.append('file', new Blob([content || pdfBytes()], { type: mime }), name);
    const res = await fetch(`${API_BASE}${urlPath}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    let data = null;
    try {
      data = await res.json();
    } catch (_) {}
    return { status: res.status, data };
  }

  async function fetchDoc(method, urlPath, token) {
    const res = await fetch(`${API_BASE}${urlPath}`, {
      method,
      headers: { Authorization: `Bearer ${token}` },
    });
    const buf = Buffer.from(await res.arrayBuffer());
    return { status: res.status, contentType: res.headers.get('content-type') || '', disposition: res.headers.get('content-disposition') || '', byteLength: buf.length };
  }

  const mouPayload = (overrides = {}) => ({
    title: `MoU ${BASE}`,
    referenceNumber: `MOU-${BASE}`,
    type: 'Industry Partnership',
    partnerType: 'Company',
    partnerName: 'TestNova Systems',
    partnerContactName: 'R. Kumar',
    partnerContactEmail: 'rkumar@testnova.example',
    partnerContactPhone: '+91 98765 43210',
    scope: 'Internships and on-campus recruitment',
    terms: 'Annual renewal. MoU governed by applicable law.',
    ...overrides,
  });

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🤝  Institution Panel MoUs Test Suite');
  console.log('═══════════════════════════════════════════════════════════════\n');

  let db = null;
  let aToken = '';

  try {
    // ── 0. DB bootstrap ──
    console.log('--- 0. DB bootstrap ---');
    await connectDb();

    // ── 1. Auth & role isolation ──
    console.log('\n--- 1. Auth & role isolation ---');
    const anon = await api('GET', '/institution/mous', null);
    assert(anon.status === 401, 'Anonymous GET /institution/mous → 401');

    const instLogin = await login('institution@skillbridge.dev', 'Institution@123');
    assert(instLogin.status === 200, 'Institution login returns 200');
    aToken = instLogin.data.token;
    tmp.institutionAId = instLogin.data.user?.id || instLogin.data.user?._id || '';
    assert(!!tmp.institutionAId, 'Institution A _id captured from session');

    const studentLogin = await login('student@skillbridge.dev', 'Student@123');
    assert(studentLogin.status === 200, 'Student login returns 200');
    const sList = await api('GET', '/institution/mous', studentLogin.data.token);
    assert(sList.status === 403, 'Student GET /institution/mous → 403');

    const facLogin = await login('faculty@skillbridge.dev', 'Faculty@123');
    assert(facLogin.status === 200, 'Faculty login returns 200');
    const fList = await api('GET', '/institution/mous', facLogin.data.token);
    assert(fList.status === 403, 'Faculty GET /institution/mous → 403');

    // ── 2. List shape (empty-ish) ──
    console.log('\n--- 2. Empty list shape ---');
    const list0 = await api('GET', '/institution/mous?limit=50', aToken);
    assert(list0.status === 200, 'GET /api/institution/mous returns 200');
    assert(list0.data.success === true, 'success flag is true');
    assert(Array.isArray(list0.data.data.mous), 'data.mous is an array');
    assert(typeof list0.data.data.summary?.total === 'number', 'data.summary present');
    assert(Array.isArray(list0.data.data.facets?.types), 'data.facets present');
    assert(typeof list0.data.data.pagination?.page === 'number', 'data.pagination present');

    // ── 3. Create ──
    console.log('\n--- 3. Create MoU -----');
    // MoU A1: future expiry (+90d) → will become Active (not expiring soon)
    const create1 = await api('POST', '/institution/mous', aToken, {
      body: JSON.stringify(mouPayload({ title: `MoU Active ${BASE}`, expiryDate: isoInDays(90) })),
    });
    assert(create1.status === 201, 'Create MoU with future expiry → 201');
    assert(create1.data.data?.status === 'Draft', 'New MoU stored as Draft');
    assert(create1.data.data?.effectiveStatus === 'Draft', 'New MoU surfaces effectiveStatus Draft');
    tmp.mousA.push(create1.data.data);

    // MoU A2: expiry +10d → after activation will be Expiring Soon
    const create2 = await api('POST', '/institution/mous', aToken, {
      body: JSON.stringify(mouPayload({ title: `MoU Soon ${BASE}`, expiryDate: isoInDays(10) })),
    });
    assert(create2.status === 201, 'Second MoU created');
    tmp.mousA.push(create2.data.data);

    // Spoofed institutionId must be IGNORED — ownership comes from the session.
    const spoofed = await api('POST', '/institution/mous', aToken, {
      body: JSON.stringify(
        mouPayload({ title: `MoU Spoof ${BASE}`, expiryDate: isoInDays(30), institutionId: tmp.institutionBId || '507f1f77bcf86cd799439011' })
      ),
    });
    assert(spoofed.status === 201, 'Create with spoofed institutionId still allowed (field ignored)');
    const spoofedDoc = await api('GET', `/institution/mous/${spoofed.data.data._id}`, aToken);
    assert(
      String(spoofedDoc.data.data.institution || '') === '' && spoofedDoc.data.data._id,
      'Spoofed institutionId never attached to the record'
    );
    const dbSpoofed = await db.model('InstitutionMou').findById(spoofed.data.data._id).lean();
    assert(String(dbSpoofed.institution) === String(tmp.institutionAId), 'Record persisted under Institution A (session)');
    tmp.mousA.push(spoofed.data.data);

    // Missing required fields → 400 with field errors
    const badCreate = await api('POST', '/institution/mous', aToken, {
      body: JSON.stringify({ title: '', type: '', partnerType: '', partnerName: '' }),
    });
    assert(badCreate.status === 400, 'Create with missing required fields → 400');
    assert(badCreate.data.errors && Object.keys(badCreate.data.errors).length >= 3, '400 carries per-field errors object');

    // ── 4. Activate + derived states ──
    console.log('\n--- 4. Lifecycle + honest derived states ---');
    const act1 = await api('POST', `/institution/mous/${create1.data.data._id}/activate`, aToken);
    assert(act1.status === 200, 'Activate Draft MoU → 200');
    assert(act1.data.data.effectiveStatus === 'Active' && act1.data.data.expiringSoon === false, 'Activated (+90d) MoU reads Active, not expiring soon');

    const act2 = await api('POST', `/institution/mous/${create2.data.data._id}/activate`, aToken);
    assert(act2.status === 200, 'Activate second MoU → 200');
    assert(act2.data.data.effectiveStatus === 'Active' && act2.data.data.expiringSoon === true, 'Activated (+10d) MoU reads Active AND Expiring Soon');

    const reAct = await api('POST', `/institution/mous/${create1.data.data._id}/activate`, aToken);
    assert(reAct.status === 400, 'Re-activating an active MoU → 400');

    // Expired derived state: activate with past expiry, or lapse an active one.
    const expireId = create1.data.data._id;
    const lapse = await api('PATCH', `/institution/mous/${expireId}`, aToken, {
      body: JSON.stringify(mouPayload({ title: `MoU Active ${BASE}`, expiryDate: isoInDays(-5) })),
    });
    assert(lapse.status === 200, 'Active MoU expiry may be shortened server-side');
    assert(lapse.data.data.effectiveStatus === 'Expired', 'Stored-Active MoU with past expiry reads as Expired in response');
    const detailLapsed = await api('GET', `/institution/mous/${expireId}`, aToken);
    assert(detailLapsed.data.data.effectiveStatus === 'Expired', 'Expired derived state confirmed on GET detail');

    // Enrich the summary from real data.
    const listAfter = await api('GET', '/institution/mous?limit=50', aToken);
    const summary = listAfter.data.data.summary;
    assert(summary.active === 1, `Summary reports 1 Active (got ${summary.active})`);
    assert(summary.expiringSoon === 1, `Summary reports 1 Expiring Soon (got ${summary.expiringSoon})`);
    assert(summary.expired === 1, `Summary reports 1 Expired (got ${summary.expired})`);
    assert(summary.draft >= 1, 'Summary reports drafts for un-activated MoUs');

    // Activate a MoU whose expiry is already past → 400.
    const pastMoU = await api('POST', '/institution/mous', aToken, {
      body: JSON.stringify(mouPayload({ title: `MoU Past ${BASE}`, expiryDate: isoInDays(-3) })),
    });
    assert(pastMoU.status === 201, 'Draft MoU with past expiry may be created');
    tmp.mousA.push(pastMoU.data.data);
    const actPast = await api('POST', `/institution/mous/${pastMoU.data.data._id}/activate`, aToken);
    assert(actPast.status === 400, 'Activating an MoU whose expiry has passed → 400');

    // ── 5. Search / filter / pagination ──
    console.log('\n--- 5. Search / filter / pagination ---');
    const sTitle = await api('GET', `/institution/mous?search=${encodeURIComponent(`Active ${BASE}`)}&limit=50`, aToken);
    assert(sTitle.data.data.mous.every((m) => m.title.includes(`Active ${BASE}`)), 'Search by title returns only matches');
    const sPartner = await api('GET', `/institution/mous?search=${encodeURIComponent('TestNova')}&limit=50`, aToken);
    assert(sPartner.data.data.pagination.total >= 1, 'Search by partner name matches records');
    const fStatus = await api('GET', '/institution/mous?status=Active&limit=50', aToken);
    assert(fStatus.data.data.mous.every((m) => m.effectiveStatus === 'Active'), 'status=Active filter keeps only derived Active');
    const fExpiring = await api('GET', '/institution/mous?expiringSoon=true&limit=50', aToken);
    assert(fExpiring.data.data.mous.every((m) => m.expiringSoon === true), 'expiringSoon filter keeps only expiring-soon');
    const fType = await api('GET', `/institution/mous?type=${encodeURIComponent('Industry Partnership')}&limit=50`, aToken);
    assert(fType.data.data.mous.every((m) => m.type === 'Industry Partnership'), 'type filter applies');
    const page1 = await api('GET', '/institution/mous?limit=2&page=1', aToken);
    assert(page1.data.data.mous.length <= 2, 'Pagination limit honored (<=2 rows)');
    assert(page1.data.data.pagination.pages >= Math.ceil(page1.data.data.pagination.total / 2), 'pagination.pages computed');

    // any pagination page is well-formed
    const big = await api('GET', '/institution/mous?limit=1000', aToken);
    assert(big.data.data.pagination.limit === 100, 'Pagination limit capped at 100');

    // ── 6. Updates ──
    console.log('\n--- 6. Update MoU -----');
    const upd = await api('PATCH', `/institution/mous/${create2.data.data._id}`, aToken, {
      body: JSON.stringify(mouPayload({ title: `MoU Updated ${BASE}`, partnerName: 'Renamed Partner Co' })),
    });
    assert(upd.status === 200, 'Update own MoU → 200');
    assert(upd.data.data.title === `MoU Updated ${BASE}` && upd.data.data.partnerName === 'Renamed Partner Co', 'Updated fields applied');
    const updDetail = await api('GET', `/institution/mous/${create2.data.data._id}`, aToken);
    assert(updDetail.data.data.title === `MoU Updated ${BASE}`, 'Updated title persisted');

    const badDate = await api('PATCH', `/institution/mous/${create2.data.data._id}`, aToken, {
      body: JSON.stringify({ ...mouPayload(), effectiveDate: 'not-a-date', expiryDate: isoInDays(5) }),
    });
    assert(badDate.status === 400, 'Update with invalid date → 400');

    const badRange = await api('PATCH', `/institution/mous/${create2.data.data._id}`, aToken, {
      body: JSON.stringify({ ...mouPayload(), effectiveDate: isoInDays(20), expiryDate: isoInDays(10) }),
    });
    assert(badRange.status === 400, 'Update with expiry before effective → 400');

    const badEnum = await api('PATCH', `/institution/mous/${create2.data.data._id}`, aToken, {
      body: JSON.stringify({ ...mouPayload(), type: 'Not-a-Type', partnerType: 'Alien' }),
    });
    assert(badEnum.status === 400, 'Update with invalid type / partnerType → 400');

    const badEmail = await api('PATCH', `/institution/mous/${create2.data.data._id}`, aToken, {
      body: JSON.stringify({ ...mouPayload(), partnerContactEmail: 'not-an-email' }),
    });
    assert(badEmail.status === 400, 'Update with invalid contact email → 400');

    // ── 7. Document handling ──
    console.log('\n--- 7. Documents -----');
    const up1 = await uploadDocApi(`/institution/mous/${create2.data.data._id}/document`, aToken, {
      name: 'mou-agreement.pdf',
      mime: 'application/pdf',
    });
    assert(up1.status === 200, 'Upload PDF document → 200');
    assert(up1.data.success === true, 'Upload success flag true');
    assert(up1.data.data?.originalName === 'mou-agreement.pdf', 'Upload returns document metadata');
    const docJson = JSON.stringify(up1.data.data || {});
    assert(!docJson.includes('"path"'), 'Uploaded document DTO does not expose disk path');

    const view = await fetchDoc('GET', `/institution/mous/${create2.data.data._id}/document/view`, aToken);
    assert(view.status === 200 && view.contentType.includes('application/pdf'), 'GET document/view streams PDF (200)');
    assert(view.disposition.includes('inline'), 'view uses inline disposition');
    const dl = await fetchDoc('GET', `/institution/mous/${create2.data.data._id}/document/download`, aToken);
    assert(dl.status === 200 && dl.disposition.includes('attachment'), 'GET document/download streams with attachment disposition');

    // Replace
    const up2 = await uploadDocApi(`/institution/mous/${create2.data.data._id}/document`, aToken, {
      name: 'replacement.pdf',
      mime: 'application/pdf',
    });
    assert(up2.status === 200 && up2.data.data?.originalName === 'replacement.pdf', 'Re-upload replaces the document');

    // Invalid type
    const badType = await uploadDocApi(`/institution/mous/${create2.data.data._id}/document`, aToken, {
      name: 'notes.txt',
      mime: 'text/plain',
      content: Buffer.from('hello'),
    });
    assert(badType.status === 400, 'Upload of a .txt file → 400');

    // Cross-institution document access is verified in section 9 after
    // Institution B exists (owner-isolation also covers documents).

    const rm = await api('DELETE', `/institution/mous/${create2.data.data._id}/document`, aToken);
    assert(rm.status === 200, 'Remove document → 200');
    const viewAfter = await fetchDoc('GET', `/institution/mous/${create2.data.data._id}/document/view`, aToken);
    assert(viewAfter.status === 404, 'View after removal → 404');

    // ── 8. Archive lifecycle ──
    console.log('\n--- 8. Archive -----');
    const arch = await api('POST', `/institution/mous/${create2.data.data._id}/archive`, aToken);
    assert(arch.status === 200 && arch.data.data.status === 'Archived', 'Archive → 200, stored status Archived');
    const archAgain = await api('POST', `/institution/mous/${create2.data.data._id}/archive`, aToken);
    assert(archAgain.status === 400, 'Archive an archived MoU → 400');
    const reactivateArch = await api('POST', `/institution/mous/${create2.data.data._id}/activate`, aToken);
    assert(reactivateArch.status === 400, 'Activate an archived MoU → 400');

    // ── 9. Ownership isolation (Institution B) ──
    console.log('\n--- 9. Ownership isolation ---');
    const regB = await register({
      role: 'institution',
      name: 'MOU Isolation Institute',
      email: TEMP_INST_B_EMAIL,
      password: PASS,
      institutionName: 'MOU Isolation Institute',
      aisheCode: `ISO-MOU-${TS}`,
      contactPerson: 'MoU Tester',
      address: 'Isolation Campus, Test City',
    });
    tmp.institutionBId = regB.data.user?.id || regB.data.user?._id || '';
    assert(!!tmp.institutionBId, 'Institution B registered');
    await db.model('User').updateOne({ _id: tmp.institutionBId }, { $set: { status: 'verified', isEmailVerified: true } });

    const bLogin = await login(TEMP_INST_B_EMAIL, PASS);
    assert(!!bLogin.data?.token, 'Institution B authenticates');
    tmp.bToken = bLogin.data.token;

    const bList = await api('GET', '/institution/mous?limit=50', tmp.bToken);
    assert(bList.status === 200 && bList.data.data.summary.total === 0, 'Institution B sees only its own (currently empty) MoUs');

    const bReadA = await api('GET', `/institution/mous/${create2.data.data._id}`, tmp.bToken);
    assert(bReadA.status === 404, 'B reading A MoU detail → 404');
    const bUpdateA = await api('PATCH', `/institution/mous/${create2.data.data._id}`, tmp.bToken, {
      body: JSON.stringify(mouPayload({ title: 'Intruder' })),
    });
    assert(bUpdateA.status === 404, 'B updating A MoU → 404');
    const bActivateA = await api('POST', `/institution/mous/${create1.data.data._id}/activate`, tmp.bToken);
    assert(bActivateA.status === 404, 'B activating A MoU → 404');
    const bArchiveA = await api('POST', `/institution/mous/${create1.data.data._id}/archive`, tmp.bToken);
    assert(bArchiveA.status === 404, 'B archiving A MoU → 404');
    const bDeleteA = await api('DELETE', `/institution/mous/${create1.data.data._id}`, tmp.bToken);
    assert(bDeleteA.status === 404, 'B deleting A MoU → 404');
    const bDocA = await fetchDoc('GET', `/institution/mous/${create1.data.data._id}/document/view`, tmp.bToken);
    assert(bDocA.status === 404, 'B viewing A document → 404');

    // B creates its own MoU → A cannot reach it.
    const bCreate = await api('POST', '/institution/mous', tmp.bToken, {
      body: JSON.stringify(mouPayload({ title: `B MoU ${BASE}`, expiryDate: isoInDays(40) })),
    });
    assert(bCreate.status === 201, 'B creates its own MoU');
    tmp.mousB.push(bCreate.data.data);
    const aReadB = await api('GET', `/institution/mous/${bCreate.data.data._id}`, aToken);
    assert(aReadB.status === 404, 'A reading B MoU → 404');

    // B's list is scoped (only B's own record).
    const bList2 = await api('GET', '/institution/mous?limit=50', tmp.bToken);
    assert(bList2.data.data.summary.total === 1, 'B list contains only B MoU');

    // ── 10. Delete + 404s ──
    console.log('\n--- 10. Delete & ids -----');
    const del = await api('DELETE', `/institution/mous/${spoofed.data.data._id}`, aToken);
    assert(del.status === 200, 'DELETE own MoU → 200');
    const afterDel = await api('GET', `/institution/mous/${spoofed.data.data._id}`, aToken);
    assert(afterDel.status === 404, 'Deleted MoU is gone (404)');
    const badId = await api('GET', '/institution/mous/not-an-objectid', aToken);
    assert(badId.status === 404, 'Malformed MoU id → 404');

    // ── 11. DTO no-leak (whole list payload) ──
    console.log('\n--- 11. DTO safety -----');
    const full = await api('GET', '/institution/mous?limit=100', aToken);
    const raw = JSON.stringify(full.data.data || {});
    assert(!raw.includes('"password') && !raw.includes('passwordHash'), 'List DTO does not leak password / hash');
    assert(!raw.includes('"path"'), 'List DTO does not expose disk paths');
    assert(!raw.includes('"token"'), 'List DTO does not leak tokens');
    assert(!raw.includes('"institution"'), 'List DTO does not expose owning institution id');

    // ── 12. Cleanup ──
    console.log('\n--- 12. Cleanup -----');
    const bIds = new Set(tmp.mousB.map((m) => String(m._id)));
    for (const mou of [...tmp.mousA, ...tmp.mousB]) {
      if (!mou?._id) continue;
      try {
        await api('DELETE', `/institution/mous/${mou._id}`, bIds.has(String(mou._id)) ? tmp.bToken : aToken);
      } catch (_) {}
    }
    const cleanupIds = [...tmp.mousA, ...tmp.mousB].map((m) => m?._id).filter(Boolean);
    const leftoverDocs = await db.model('InstitutionMou').find({ _id: { $in: cleanupIds } }).lean();
    leftoverDocs.forEach((r) => {
      if (r.document?.path && fs.existsSync(r.document.path)) {
        try {
          fs.unlinkSync(r.document.path);
        } catch (_) {}
      }
    });
    await db.model('InstitutionMou').deleteMany({ _id: { $in: cleanupIds } });
    await db.model('InstitutionMou').deleteMany({ institution: tmp.institutionBId });
    await db.model('User').deleteMany({ email: TEMP_INST_B_EMAIL });
    const confB = await db.model('User').findOne({ email: TEMP_INST_B_EMAIL }).lean();
    assert(!confB, 'Temp Institution B user removed');
    const confMou = await db.model('InstitutionMou').countDocuments({ _id: { $in: cleanupIds } });
    assert(confMou === 0, 'All temp MoU records removed');

    await db.disconnect();
  } catch (error) {
    console.error(`\n[FATAL] Test run crashed: ${error.stack || error}`);
    failed++;
    if (db) {
      try { await db.disconnect(); } catch (_) {}
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log(`Outcome: ${failed === 0 ? 'ALL PASS ✅' : 'FAILURES PRESENT ❌'}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  process.exit(failed === 0 ? 0 : 1);
}

runTests();