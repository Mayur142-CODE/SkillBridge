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
  await import(fileUrl('../backend/src/models/Notification.js'));
  await ensureNodeDns();
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 20000 });

  const facUsers = await mongoose.model('User').find({
    role: 'academician',
    institutionId: { $ne: null },
  }).lean();

  for (const f of facUsers) {
    const collabs = await mongoose.model('FacultyCollaboration').countDocuments({ faculty: f._id });
    const opps = await mongoose.model('FacultyOpportunity').countDocuments({ createdBy: f._id });
    const notifs = await mongoose.model('Notification').countDocuments({ user: f._id });
    console.log(`${f._id} | ${f.email} | ${f.name} | inst=${f.institutionId} | collabs=${collabs} opps=${opps} notifs=${notifs}`);
  }

  console.log('\n-- Unique collaboration titles for demo faculty --');
  const demoFac = facUsers.find((f) => String(f.institutionId) === String(facUsers[0].institutionId));
  const titles = await mongoose.model('FacultyCollaboration').distinct('title', { faculty: { $in: facUsers.map((f) => f._id) } });
  titles.forEach((t) => console.log('  ', t));

  await mongoose.disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });