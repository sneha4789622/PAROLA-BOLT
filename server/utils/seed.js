require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Post = require('../models/Post');
const Reel = require('../models/Reel');
const connectDB = require('../config/db');

const SAMPLE_USERS = [
  {
    fullName: 'Admin Parola',
    username: 'admin',
    email: 'admin@parolabolt.com',
    mobileNumber: '+919876543200',
    dateOfBirth: new Date('1990-01-15'),
    password: 'Admin@PB2025!',
    role: 'admin',
    isIdentityVerified: true,
    verificationStatus: 'verified',
    isAgeVerified: true,
    biometric: {
      // No real face on file for seed data — first login will prompt
      // this account to complete real face enrollment.
      isRegistered: false,
    },
    bio: 'Platform administrator for Parola Bolt.',
  },
  {
    fullName: 'Priyanka Das',
    username: 'priyanka.d',
    email: 'priyanka@gmail.com',
    mobileNumber: '+919474235170',
    dateOfBirth: new Date('2003-12-16'),
    password: 'Priyanka@Test2025!',
    role: 'user',
    isIdentityVerified: true,
    verificationStatus: 'verified',
    isAgeVerified: true,
    biometric: {
      // No real face on file for seed data — first login will prompt
      // this account to complete real face enrollment.
      isRegistered: false,
    },
    bio: 'Passionate about tech & travel ✈️ | Verified on Parola Bolt',
    location: 'Mumbai, India',
  },
  {
    fullName: 'Gufran Ansari',
    username: 'gufran.a',
    email: 'gufran@gmail.com',
    mobileNumber: '+919830632874',
    dateOfBirth: new Date('2001-11-08'),
    password: 'Gufran@Test2025!',
    role: 'moderator',
    isIdentityVerified: false,
    verificationStatus: 'pending',
    isAgeVerified: true,
    biometric: {
      // No real face on file for seed data — first login will prompt
      // this account to complete real face enrollment.
      isRegistered: false,
    },
    bio: 'Content moderator & photography enthusiast 📷',
    location: 'Bangalore, India',
  },
  {
    fullName: 'Priya Nair',
    username: 'priya.n',
    email: 'priya@gmail.com',
    mobileNumber: '+919876543203',
    dateOfBirth: new Date('1998-07-30'),
    password: 'Priya@Test2025!',
    role: 'user',
    isIdentityVerified: true,
    verificationStatus: 'verified',
    isAgeVerified: true,
    biometric: {
      // No real face on file for seed data — first login will prompt
      // this account to complete real face enrollment.
      isRegistered: false,
    },
    bio: 'Yoga instructor & wellness advocate 🧘',
    location: 'Kerala, India',
    website: 'https://priya-yoga.example.com',
  },
];

const SAMPLE_POSTS = (authorId) => [
  {
    author: authorId,
    type: 'text',
    caption: 'Excited to be on Parola Bolt — a platform where everyone is verified and real! 🙌 #parolabolt #verified #realconnections',
    hashtags: ['parolabolt', 'verified', 'realconnections'],
    moderation: { status: 'approved', isPositive: true },
  },
  {
    author: authorId,
    type: 'text',
    caption: 'Grateful for every day and every genuine connection. Thank you all for the love! ❤️ #grateful #positivevibes',
    hashtags: ['grateful', 'positivevibes'],
    moderation: { status: 'approved', isPositive: true },
  },
];

const seed = async () => {
  try {
    await connectDB();
    console.log('🌱 Seeding database…');

    // Clear existing data
    await User.deleteMany({});
    await Post.deleteMany({});
    await Reel.deleteMany({});
    console.log('  ✓ Cleared existing data');

    // Create users one by one so the pre-save password hash hook runs
    const created = [];
    for (const userData of SAMPLE_USERS) {
      // Use User.create() — this triggers the pre-save hook which
      // correctly hashes the plain-text password ONCE
      const user = await User.create(userData);
      created.push(user);
      console.log(`  ✓ Created user: ${user.username} (${user.role}) — password hashed OK`);
    }

    // Verify the hash actually works before finishing
    console.log('\n  Verifying password hashes…');
    for (const userData of SAMPLE_USERS) {
      const found = await User.findOne({ username: userData.username }).select('+password');
      const ok = await found.comparePassword(userData.password);
      console.log(`  ${ok ? '✓' : '✗'} ${userData.username}: password check ${ok ? 'PASSED' : 'FAILED'}`);
      if (!ok) throw new Error(`Password hash verification failed for ${userData.username}!`);
    }

    // Create sample posts
    for (let i = 0; i < 2; i++) {
      const posts = SAMPLE_POSTS(created[i]._id);
      await Post.insertMany(posts);
      await User.findByIdAndUpdate(created[i]._id, { postsCount: posts.length });
      console.log(`  ✓ Created ${posts.length} posts for @${created[i].username}`);
    }

    // Follow relationship: admin follows aanya
    await User.findByIdAndUpdate(created[0]._id, { $push: { following: created[1]._id } });
    await User.findByIdAndUpdate(created[1]._id, { $push: { followers: created[0]._id } });
    console.log('  ✓ Created follow relationships');

    console.log('\n🎉 Seed complete! All password hashes verified.\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Login credentials (use these exactly):');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    SAMPLE_USERS.forEach((u) => {
      console.log(`  Username : ${u.username}`);
      console.log(`  Password : ${u.password}`);
      console.log(`  Role     : ${u.role}`);
      console.log('  ─────────────────────────────────');
    });

  } catch (err) {
    console.error('\n❌ Seed error:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Database connection closed.');
  }
};

seed();
