import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User.js';

dotenv.config();

const SEED_USERS = [
  {
    roleKey: 'Student',
    data: {
      name: 'Rahul Sharma',
      email: 'student@skillbridge.dev',
      password: 'Student@123',
      role: 'student',
      status: 'verified',
      isEmailVerified: true,
      phone: '+91 98765 01001',
      studentProfile: {
        university: 'IIT Bombay',
        rollNumber: '21CS049',
        branch: 'Computer Science & Engineering',
        academicYear: '4th Year',
        cgpa: 9.1,
      },
    },
  },
  {
    roleKey: 'Industry',
    data: {
      name: 'SkillBridge Technologies',
      email: 'industry@skillbridge.dev',
      password: 'Industry@123',
      role: 'industry',
      status: 'verified',
      isEmailVerified: true,
      phone: '+91 98765 02002',
      industryProfile: {
        companyName: 'SkillBridge Technologies',
        sector: 'Information Technology',
        contactPerson: 'Rajesh Verma',
        website: 'https://skillbridge.dev',
      },
    },
  },
  {
    roleKey: 'Academician',
    data: {
      name: 'Dr. Priya Patel',
      email: 'faculty@skillbridge.dev',
      password: 'Faculty@123',
      role: 'academician',
      status: 'verified',
      isEmailVerified: true,
      phone: '+91 98765 03003',
      academicianProfile: {
        institution: 'IIT Bombay',
        department: 'Computer Science & Engineering',
        designation: 'Associate Professor',
        expertise: ['Artificial Intelligence', 'Distributed Systems'],
      },
    },
  },
  {
    roleKey: 'Institution',
    data: {
      name: 'ABC Institute of Technology',
      email: 'institution@skillbridge.dev',
      password: 'Institution@123',
      role: 'institution',
      status: 'verified',
      isEmailVerified: true,
      phone: '+91 98765 04004',
      institutionProfile: {
        institutionName: 'ABC Institute of Technology',
        aisheCode: 'C-12345',
        contactPerson: 'Dr. Amit Deshmukh',
        address: 'Tech Campus, Mumbai, Maharashtra 400076',
      },
    },
  },
  {
    roleKey: 'Admin',
    data: {
      name: 'SkillBridge Administrator',
      email: 'admin@skillbridge.dev',
      password: 'Admin@123',
      role: 'admin',
      status: 'verified',
      isEmailVerified: true,
      phone: '+91 11 2345 6789',
    },
  },
];

async function seedUsers() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('❌ MONGODB_URI is not defined in environment variables.');
    process.exit(1);
  }

  try {
    console.log('Seeding development users...\n');
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });

    for (const seedItem of SEED_USERS) {
      const { roleKey, data } = seedItem;
      const normalizedEmail = data.email.toLowerCase().trim();

      const existingUser = await User.findOne({ email: normalizedEmail });

      if (existingUser) {
        let updated = false;
        if (existingUser.status !== 'verified') {
          existingUser.status = 'verified';
          existingUser.isEmailVerified = true;
          updated = true;
        }
        // Ensure name and role are consistent
        if (existingUser.name !== data.name) {
          existingUser.name = data.name;
          updated = true;
        }
        if (updated) {
          await existingUser.save({ validateBeforeSave: false });
        }
        console.log(`○ ${roleKey} already exists\n  ${normalizedEmail}\n`);
      } else {
        // Create new user (User pre-save hook will hash the password with bcrypt)
        const newUser = new User(data);
        await newUser.save();
        console.log(`✓ ${roleKey}\n  ${normalizedEmail}\n`);
      }
    }

    // Safety step: auto-verify any older test accounts that were set to pending
    const pendingUpdate = await User.updateMany(
      { status: 'pending' },
      { $set: { status: 'verified', isEmailVerified: true } }
    );
    if (pendingUpdate.modifiedCount > 0) {
      console.log(`ℹ️ Updated ${pendingUpdate.modifiedCount} existing pending test accounts to 'verified'.\n`);
    }

    console.log('Development users seeded successfully.');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding users:', error.message);
    process.exit(1);
  }
}

seedUsers();
