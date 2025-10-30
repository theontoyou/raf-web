#!/usr/bin/env ts-node
import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import * as crypto from 'crypto';
import { UserSchema } from '../src/schemas/user.schema';

const { MONGODB_URI, ADMIN_ID, ADMIN_EMAIL, ADMIN_MOBILE_NUMBER, NEW_ADMIN_PASSWORD } = process.env;

const clean = (s?: string) => {
  if (!s) return s;
  return String(s).trim().replace(/^['"\s]+|['";\s]+$/g, '');
};

if (!MONGODB_URI) {
  console.error('MONGODB_URI must be set');
  process.exit(1);
}
if (!NEW_ADMIN_PASSWORD) {
  console.error('NEW_ADMIN_PASSWORD must be set');
  process.exit(1);
}

function hashPassword(password: string, salt?: string) {
  const s = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, s, 310000, 32, 'sha256').toString('hex');
  return `${s}$${hash}`;
}

async function main() {
  await mongoose.connect(MONGODB_URI as string);
  const UserModel: any = mongoose.model('User', UserSchema);

  let q: any = null;
  const idClean = clean(ADMIN_ID);
  const emailClean = clean(ADMIN_EMAIL);
  const mobileClean = clean(ADMIN_MOBILE_NUMBER);

  if (idClean) {
    // try to build an ObjectId if possible
    try {
      const mongooseLib = require('mongoose');
      q = { _id: mongooseLib.Types.ObjectId(idClean) };
    } catch (e) {
      // fallback to raw value
      q = { _id: idClean };
    }
  } else if (emailClean) q = { 'auth.email': emailClean };
  else if (mobileClean) q = { 'auth.mobile_number': mobileClean };
  else {
    console.error('Provide ADMIN_ID or ADMIN_EMAIL or ADMIN_MOBILE_NUMBER');
    process.exit(1);
  }

  const user = await UserModel.findOne(q);
  if (!user) {
    console.error('Admin user not found for query', q);
    process.exit(1);
  }

  const hashed = hashPassword(String(NEW_ADMIN_PASSWORD));
  await UserModel.updateOne({ _id: user._id }, { $set: { 'auth.password': hashed } });
  console.log('Password updated for user', user._id.toString());
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
