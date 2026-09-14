const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

async function main() {
  const envFile = fs.readFileSync(path.resolve(__dirname, '../backend/.env'), 'utf8');
  const uriMatch = envFile.match(/^\s*MONGODB_URI\s*=\s*(.+)$/m);
  process.env.MONGODB_URI = uriMatch[1].trim();
  const fileUrl = (p) => pathToFileURL(path.resolve(__dirname, p)).href;
  const mongoose = (await import(fileUrl('../backend/node_modules/mongoose/lib/index.js'))).default;
  const { default: ensureNodeDns } = await import(fileUrl('../backend/src/config/dns.js'));
  await import(fileUrl('../backend/src/models/User.js'));
  await import(fileUrl('../backend/src/models/FacultyProfile.js'));
  await import(fileUrl('../backend/src/models/FacultyCollaboration.js'));
  await import(fileUrl('../backend/src/models/FacultyOpportunity.js'));
  await ensureNodeDns();
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 20000 });

  const demoInst = await mongoose.model('User').findOne({ email: 'institution@skillbridge.dev' }).lean();
  const demoInstId = demoInst._id;

  // All faculty linked to demo institution
  const facUsers = await mongoose.model('User').find({ institutionId: demoInstId }).lean();
  const facIds = facUsers.map((u) => u._id);

  const collabs = await mongoose.model('FacultyCollaboration')
    .find({ faculty: { $in: facIds } })
    .sort({ createdAt: -1 })
    .limit(30)
    .lean();

  console.log(`Demo institution: ${demoInstId}`);
  console.log(`Faculty count: ${facIds.length}`);
  console.log(`Recent collaborations (<=30): ${collabs.length}`);
  for (const c of collabs) {
    console.log(`  [${c.status}] ${c.title} | faculty=${c.faculty} | ${c.createdAt}`);
  }

  const pending = collabs.filter((c) => ['Proposed', 'Requested'].includes(c.status));
  console.log(`\nReviewable leftover proposals under demo institution: ${pending.length}`);

  const opps = await mongoose.model('FacultyOpportunity')
    .find({ createdBy: { $in: facIds } })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();
  console.log(`Recent opportunities (<=20): ${opps.length}`);
  for (const o of opps) {
    console.log(`  [${o.status}] ${o.title} | createdBy=${o.createdBy} | ${o.createdAt}`);
  }

  await mongoose.disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });