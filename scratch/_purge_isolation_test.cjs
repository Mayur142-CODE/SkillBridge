const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

async function purge() {
  const envFile = fs.readFileSync(path.resolve(__dirname, '../backend/.env'), 'utf8');
  const m = envFile.match(/^\s*MONGODB_URI\s*=\s*(.+)$/m);
  process.env.MONGODB_URI = m[1].trim();

  const fileUrl = (p) => pathToFileURL(path.resolve(__dirname, p)).href;
  const mongoose = (await import(fileUrl('../backend/node_modules/mongoose/lib/index.js'))).default;
  const { default: ensureNodeDns } = await import(fileUrl('../backend/src/config/dns.js'));
  await import(fileUrl('../backend/src/models/User.js'));
  await import(fileUrl('../backend/src/models/Notification.js'));

  await ensureNodeDns();
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 20000 });

  const users = await mongoose.model('User').find({ email: /^isolation-test-.*@skillbridge\.dev$/i }).select('_id email').lean();
  console.log(`Found ${users.length} leftover isolation-test account(s).`);
  for (const u of users) {
    await mongoose.model('Notification').deleteMany({ user: u._id });
    const del = await mongoose.model('User').deleteOne({ _id: u._id });
    console.log(`Removed ${u.email}: deletedCount=${del.deletedCount}`);
  }
  await mongoose.disconnect();
}

purge().catch((e) => { console.error('PURGE ERROR:', e.message); process.exit(1); });