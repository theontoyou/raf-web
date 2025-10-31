import mongoose from 'mongoose';

// Minimal sanitize script to trim and remove stray surrounding quotes/semicolons
// for common string fields across users and locations.
// Usage (powershell):
// $env:MONGODB_URI = "..."; npm run sanitize:db

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ontoyou';

const clean = (v: any) => {
  if (v === undefined || v === null) return v;
  let s = String(v);
  // Trim whitespace
  s = s.trim();
  // Remove surrounding quotes and semicolons that were accidentally stored
  s = s.replace(/^['"\s]+|['";\s]+$/g, '');
  return s;
};

const cleanPhone = (v: any) => {
  if (v === undefined || v === null) return v;
  let s = String(v);
  // Remove everything except digits and plus
  s = s.replace(/[^0-9+]/g, '');
  return s;
};

const lower = (s: any) => {
  if (s === undefined || s === null) return s;
  return String(s).trim().toLowerCase();
};

async function main() {
  console.log('Connecting to', MONGODB_URI);
  await mongoose.connect(MONGODB_URI, { dbName: undefined } as any);

  const db = mongoose.connection.db;

  // Users collection sanitize
  const usersColl = db.collection('users');
  const cursor = usersColl.find({});
  let updated = 0;
  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    const updates: any = {};
    try {
      // auth.mobile_number
      if (doc?.auth?.mobile_number) {
        const cleaned = cleanPhone(doc.auth.mobile_number);
        if (cleaned !== doc.auth.mobile_number) updates['auth.mobile_number'] = cleaned;
      }
      // auth.email
      if (doc?.auth?.email) {
        const cleaned = clean(doc.auth.email).toLowerCase();
        if (cleaned !== doc.auth.email) updates['auth.email'] = cleaned;
      }
      // profile.name
      if (doc?.profile?.name) {
        const cleaned = clean(doc.profile.name);
        if (cleaned !== doc.profile.name) updates['profile.name'] = cleaned;
      }
      // profile.city -> normalize to lowercase
      if (doc?.profile?.city) {
        const cleaned = lower(clean(doc.profile.city));
        if (cleaned !== doc.profile.city) updates['profile.city'] = cleaned;
      }
      // preset_locations array
      if (Array.isArray(doc?.preset_locations)) {
        const pl = doc.preset_locations.map((p: any) => ({
          id: p?.id ? lower(clean(String(p.id))) : p.id,
          name: p?.name ? lower(clean(String(p.name))) : p.name,
        }));
        // Compare as JSON
        if (JSON.stringify(pl) !== JSON.stringify(doc.preset_locations)) updates['preset_locations'] = pl;
      }
      // interests (trim each)
      if (Array.isArray(doc?.interests)) {
        const ints = doc.interests.map((i: any) => (i ? clean(String(i)) : i));
        if (JSON.stringify(ints) !== JSON.stringify(doc.interests)) updates['interests'] = ints;
      }

      if (Object.keys(updates).length) {
        await usersColl.updateOne({ _id: doc._id }, { $set: updates });
        updated++;
        console.log('Updated user', String(doc._id), updates);
      }
    } catch (e) {
      console.warn('Error sanitizing user', doc?._id, e.message || e);
    }
  }

  console.log('Users sanitized:', updated);

  // Locations collection sanitize (if exists)
  const locationsColl = db.collection('locations');
  if (locationsColl) {
    const locCursor = locationsColl.find({});
    let locUpdated = 0;
    while (await locCursor.hasNext()) {
      const doc = await locCursor.next();
      const updates: any = {};
      try {
        if (doc?.place_name) {
          const cleaned = lower(clean(doc.place_name));
          if (cleaned !== doc.place_name) updates['place_name'] = cleaned;
        }
        if (doc?.city) {
          const cleaned = lower(clean(doc.city));
          if (cleaned !== doc.city) updates['city'] = cleaned;
        }
        if (doc?.preset_location_id) {
          const cleaned = lower(clean(doc.preset_location_id));
          if (cleaned !== doc.preset_location_id) updates['preset_location_id'] = cleaned;
        }
        if (Object.keys(updates).length) {
          await locationsColl.updateOne({ _id: doc._id }, { $set: updates });
          locUpdated++;
          console.log('Updated location', String(doc._id), updates);
        }
      } catch (e) {
        console.warn('Error sanitizing location', doc?._id, e.message || e);
      }
    }
    console.log('Locations sanitized:', locUpdated);
  }

  await mongoose.disconnect();
  console.log('Done');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
