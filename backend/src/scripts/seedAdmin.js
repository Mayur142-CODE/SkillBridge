import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { ensureNodeDns } from '../config/dns.js';
import User from '../models/User.js';

dotenv.config();

const seedAdmin = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('❌ MONGODB_URI is not set in environment.');
    process.exit(1);
  }

  try {
    console.log('Connecting to MongoDB for admin seeding...');
    await ensureNodeDns();
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    console.log('Connected to database.');

    const adminName = process.env.ADMIN_NAME || 'Platform Administrator';
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@skillbridge.gov.in').toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@SkillBridge2026!';

    // Check if an admin already exists by email or role
    const existingAdmin = await User.findOne({
      $or: [{ email: adminEmail }, { role: 'admin' }],
    });

    if (existingAdmin) {
      console.log(`ℹ️ Admin account already exists:`);
      console.log(`   ID:     ${existingAdmin._id}`);
      console.log(`   Email:  ${existingAdmin.email}`);
      console.log(`   Role:   ${existingAdmin.role}`);
      console.log(`   Status: ${existingAdmin.status}`);

      if (existingAdmin.status !== 'verified') {
        existingAdmin.status = 'verified';
        existingAdmin.isEmailVerified = true;
        await existingAdmin.save();
        console.log('   Status updated to "verified".');
      }

      await mongoose.disconnect();
      console.log('Admin seed complete.');
      process.exit(0);
    }

    // Create new admin
    const newAdmin = new User({
      name: adminName,
      email: adminEmail,
      password: adminPassword,
      role: 'admin',
      phone: '+91 11 2345 6789',
      status: 'verified',
      isEmailVerified: true,
    });

    await newAdmin.save();

    console.log('═══════════════════════════════════════════════════');
    console.log('✅ Initial Platform Admin created successfully:');
    console.log(`   Name:     ${adminName}`);
    console.log(`   Email:    ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`   Role:     admin`);
    console.log(`   Status:   verified`);
    console.log('═══════════════════════════════════════════════════');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding admin account:', error.message);
    process.exit(1);
  }
};

seedAdmin();
