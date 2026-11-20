import mongoose from 'mongoose';
import { env } from '../src/config/environment.js';
import { User } from '../src/modules/auth/auth.model.js';

const seedAdmin = async () => {
  if (!env.adminEmail || !env.adminPassword) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env');
  }

  await mongoose.connect(env.mongodbUri);
  console.log('Connected to MongoDB');

  const existing = await User.findOne({ email: env.adminEmail.toLowerCase() });

  if (existing) {
    console.log(`Admin already exists: ${existing.email}`);
  } else {
    const admin = await User.create({
      name: env.adminName,
      email: env.adminEmail.toLowerCase(),
      password: env.adminPassword,
      role: 'admin',
      isActive: true,
    });
    console.log(`Admin created successfully: ${admin.email}`);
  }

  await mongoose.disconnect();
  process.exit(0);
};

seedAdmin().catch(async (error) => {
  console.error('Seed failed:', error.message);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
