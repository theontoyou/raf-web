#!/usr/bin/env ts-node
import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import * as crypto from 'crypto';
import { UserSchema } from '../src/schemas/user.schema';

const { MONGODB_URI, ADMIN_EMAIL, PASSWORD } = process.env;

if (!MONGODB_URI) { console.error('MONGODB_URI required'); process.exit(1); }
if (!ADMIN_EMAIL) { console.error('ADMIN_EMAIL required'); process.exit(1); }
if (!PASSWORD) { console.error('PASSWORD required'); process.exit(1); }

function computeHash(password: string, salt: string) {
  return crypto.pbkdf2Sync(password, salt, 310000, 32, 'sha256').toString('hex');
}

function verifyPassword(password: string, stored: string) {
  if (!stored) return false;
  const [salt, hash] = stored.split('$');
  if (!salt || !hash) return false;
  const candidate = computeHash(password, salt);
  try {
    return crypto.timingSafeEqual(Buffer.from(candidate, 'hex'), Buffer.from(hash, 'hex'));
  } catch (e) {
    return false;
  }
}

async function main() {
  await mongoose.connect(MONGODB_URI as string);
  const UserModel: any = mongoose.model('User', UserSchema);
  const users = await UserModel.find({ 'auth.email': ADMIN_EMAIL }).lean();
  console.log('Found users with this email:', users.length);
  for (const u of users) {
    console.log('--- user id:', u._id);
    console.log('stored auth.password:', u.auth && u.auth.password);
    const ok = verifyPassword(String(PASSWORD), u.auth && u.auth.password);
    console.log('verifyPassword(PASSWORD) =>', ok);
    if (u.auth && u.auth.password) {
      const [salt, hash] = (u.auth.password as string).split('$');
      if (salt) {
        const candidate = computeHash(String(PASSWORD), salt);
        console.log('candidate hash equals stored hash?', candidate === hash);
      }
    }
  }
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
