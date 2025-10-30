#!/usr/bin/env ts-node
import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import * as crypto from 'crypto';
import { UserSchema } from '../src/schemas/user.schema';

const {
  MONGODB_URI,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  ADMIN_MOBILE_NUMBER,
  ADMIN_NAME = 'Admin',
} = process.env;

if (!MONGODB_URI) {
  console.error('MONGODB_URI must be set in environment');
  process.exit(1);
}

if (!ADMIN_PASSWORD) {
  console.error('ADMIN_PASSWORD must be set in environment');
  process.exit(1);
}

if (!ADMIN_EMAIL && !ADMIN_MOBILE_NUMBER) {
          console.warn('No ADMIN_EMAIL or ADMIN_MOBILE_NUMBER provided — generating fallback mobile identifier');
        }

function hashPassword(password: string, salt?: string) {
  const s = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, s, 310000, 32, 'sha256').toString('hex');
  return `${s}$${hash}`;
}

async function main() {
  console.log('Connecting to', MONGODB_URI);
  await mongoose.connect(MONGODB_URI as string);

  const UserModel: any = mongoose.model('User', UserSchema);

  let user = null as any;
  if (ADMIN_EMAIL) user = await UserModel.findOne({ 'auth.email': ADMIN_EMAIL });
  if (!user && ADMIN_MOBILE_NUMBER) user = await UserModel.findOne({ 'auth.mobile_number': ADMIN_MOBILE_NUMBER });

  if (user) {
    console.log('Existing user found, promoting to admin:', user._id);
    user.role = 'admin';
    (user as any).is_admin = true;
    user.auth = user.auth || {};
    if (ADMIN_EMAIL) (user.auth as any).email = ADMIN_EMAIL;
    if (ADMIN_MOBILE_NUMBER) (user.auth as any).mobile_number = ADMIN_MOBILE_NUMBER;
    if (ADMIN_PASSWORD) (user.auth as any).password = hashPassword(ADMIN_PASSWORD);
    user.profile = user.profile || {};
    user.profile.name = ADMIN_NAME;
    await user.save();
    console.log('Admin promoted with id:', user._id.toString());
  } else {
    console.log('No existing user, creating a new admin user');
    const clean = (s?: string) => {
      if (!s) return s;
      return String(s).trim().replace(/^['"\s]+|['";\s]+$/g, '');
    };

    const auth: any = { created_at: new Date(), otp_verified: false };
    if (ADMIN_EMAIL) auth.email = clean(ADMIN_EMAIL);
    const fallbackMobile = ADMIN_MOBILE_NUMBER ? clean(ADMIN_MOBILE_NUMBER) : `seed_admin_${Date.now()}`;
    auth.mobile_number = fallbackMobile;
    if (!ADMIN_MOBILE_NUMBER) console.log('Using generated mobile identifier for admin:', fallbackMobile);
    if (ADMIN_PASSWORD) auth.password = hashPassword(String(ADMIN_PASSWORD).trim());

    const doc = await UserModel.create({
      auth,
      profile: { name: ADMIN_NAME },
      role: 'admin',
      is_admin: true,
      credits: { balance: 0, spent: 0 },
      status: { online: false, last_seen: new Date() },
      created_at: new Date(),
    } as any);

    console.log('Admin created with id:', doc._id.toString());
  }

  await mongoose.disconnect();
  console.log('Done');
}

main().catch((err) => {
  console.error('Seed script failed:', err);
  process.exit(1);
});
