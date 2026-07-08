/**
 * One-time migration: normalize all existing mobileNumber values.
 * Run once after deploying the phoneUtils.js fix:
 *   node utils/migrateMobileNumbers.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const { normalizeMobile } = require('./phoneUtils');

const migrate = async () => {
  await connectDB();
  console.log('🔧 Normalizing existing mobile numbers...');

  const users = await User.find({});
  let updated = 0;

  for (const user of users) {
    const normalized = normalizeMobile(user.mobileNumber);
    if (normalized !== user.mobileNumber) {
      console.log(`  ${user.username}: "${user.mobileNumber}" -> "${normalized}"`);
      // Use updateOne to bypass the schema setter re-running unnecessarily
      await User.updateOne({ _id: user._id }, { $set: { mobileNumber: normalized } });
      updated++;
    }
  }

  console.log(`\n✅ Done. ${updated}/${users.length} mobile numbers normalized.`);
  await mongoose.disconnect();
};

migrate().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
