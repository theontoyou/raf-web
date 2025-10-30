import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';

@Injectable()
export class MatchesService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async getTopMatches(query: {
    user_id?: string;
    city?: string;
    age_min?: number;
    age_max?: number;
    gender?: string;
    preset_location_id?: string;
    preset_location_name?: string;
    booking_date?: string;
    booking_hour?: number;
    limit?: number;
    step?: number;
  }) {
    const { user_id, city, age_min, age_max, gender, booking_date, booking_hour, limit = 3, step = 0 } = query;

    // Get current user to understand preferences (if provided)
    let currentUser: any = null;
    if (user_id) {
      currentUser = await this.userModel.findById(user_id);
      if (!currentUser) {
        return {
          status: 'error',
          msg: 'User not found',
          matches: [],
        };
      }
    }

    // Build match criteria
    const matchCriteria: any = {};
    if (user_id) matchCriteria._id = { $ne: user_id };

    // Apply filters
    // escape helper for regex
    const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    if (city) {
      // use case-insensitive exact match so legacy DB values (mixed case) still match
      matchCriteria['profile.city'] = new RegExp(`^${escapeRegex(String(city))}$`, 'i');
    } else if (currentUser && currentUser.profile?.city) {
      matchCriteria['profile.city'] = new RegExp(`^${escapeRegex(String(currentUser.profile.city))}$`, 'i');
    } else {
      // City is mandatory to scope matches if we don't have a user context
      return { status: 'error', msg: 'City is required', matches: [] };
    }

    // If booking_hour and booking_date are provided, filter users by their availability map
    // availability is stored as a map with weekday keys mapping to arrays of hour numbers
    if (booking_date && typeof booking_hour === 'number') {
      // Determine weekday string from booking_date
      const wkday = new Date(booking_date).toLocaleDateString('en-US', { weekday: 'long' });
      // Match users who have this hour in their availability for that weekday
      matchCriteria[`availability.${wkday}`] = booking_hour;
    }

    if (gender) {
      // case-insensitive match for gender
      matchCriteria['profile.gender'] = new RegExp(`^${escapeRegex(String(gender))}$`, 'i');
    } else if (currentUser?.profile?.preferred_gender?.length) {
      // map preferred genders to regex OR condition
      const prefs = currentUser.profile.preferred_gender.map((g: string) => new RegExp(`^${escapeRegex(String(g))}$`, 'i'));
      matchCriteria['profile.gender'] = { $in: prefs } as any;
    }

    if (age_min && age_max) {
      matchCriteria['profile.age'] = { $gte: age_min, $lte: age_max };
    } else if (currentUser?.profile?.age_range) {
      matchCriteria['profile.age'] = {
        $gte: currentUser.profile.age_range.min,
        $lte: currentUser.profile.age_range.max,
      };
    }

    // Find matches. We no longer use geospatial queries; instead filter by preset locations if provided.
    if (query.preset_location_id) {
      matchCriteria['preset_locations.id'] = query.preset_location_id;
    } else if (query.preset_location_name) {
      // case-insensitive match for preset location name
      matchCriteria['preset_locations.name'] = new RegExp(`^${escapeRegex(String(query.preset_location_name))}$`, 'i');
    }

    const skip = Math.max(0, step) * Math.max(0, limit);
    // If booking_date and booking_slot are present, exclude users who already have an active booking for that date+slot
    if (booking_date && typeof booking_hour === 'number') {
      const bookingDateKey = new Date(booking_date).toISOString().slice(0, 10);
      // Exclude users with active_bookings matching this date+hour and active status
      matchCriteria.$nor = matchCriteria.$nor || [];
      matchCriteria.$nor.push({
        active_bookings: {
          $elemMatch: {
            booking_date: bookingDateKey,
            booking_hour: booking_hour,
            status: { $in: ['pending', 'confirmed', 'in-progress'] },
          },
        },
      });
    }

    const matches = await this.userModel
      .find(matchCriteria)
      .sort({ 'status.last_seen': -1 })
      .skip(skip)
      .limit(limit)
      .select('profile.name profile.age profile.images profile.bio interests preset_locations status.last_seen availability is_on_rent active_bookings');

    // Format initial results (no distance calculation)
    const matchResults = matches.map((match) => ({
      user_id: match._id,
      name: match.profile?.name,
      age: match.profile?.age,
      image: match.profile?.images?.[0] || '',
      bio: match.profile?.bio || '',
      interests: match.interests || [],
      availability: match.availability || {},
      is_on_rent: !!match.is_on_rent,
      active_bookings: match.active_bookings || [],
      // return only id/name for preset locations to avoid exposing mongoose _id
      preset_locations: (match.preset_locations || []).map((p: any) => ({ id: p.id, name: p.name })),
      last_seen: match.status?.last_seen,
    }));

    // If we have fewer results than requested, try to fill from city-wide users (excluding already returned ids)
    if (matchResults.length < limit) {
      const needed = limit - matchResults.length;
      const excludedIds = matchResults.map((m) => m.user_id);

  const cityOnlyCriteria: any = { 'profile.city': matchCriteria['profile.city'] };
      if (user_id) cityOnlyCriteria._id = { $ne: user_id };
      if (excludedIds.length) cityOnlyCriteria._id = { ...(cityOnlyCriteria._id || {}), $nin: excludedIds };

      if (booking_date && typeof booking_hour === 'number') {
        const bookingDateKey = new Date(booking_date).toISOString().slice(0, 10);
        cityOnlyCriteria.$nor = cityOnlyCriteria.$nor || [];
        cityOnlyCriteria.$nor.push({
          active_bookings: {
            $elemMatch: {
              booking_date: bookingDateKey,
              booking_hour: booking_hour,
              status: { $in: ['pending', 'confirmed', 'in-progress'] },
            },
          },
        });
      }

      const cityMatches = await this.userModel
        .find(cityOnlyCriteria)
        .sort({ 'status.last_seen': -1 })
        .skip(skip)
        .limit(needed)
        .select('profile.name profile.age profile.images profile.bio interests preset_locations status.last_seen availability is_on_rent active_bookings');

      const supplemental = cityMatches.map((match) => ({
        user_id: match._id,
        name: match.profile?.name,
        age: match.profile?.age,
        image: match.profile?.images?.[0] || '',
        bio: match.profile?.bio || '',
        interests: match.interests || [],
        availability: match.availability || {},
        preset_locations: (match.preset_locations || []).map((p: any) => ({ id: p.id, name: p.name })),
        last_seen: match.status?.last_seen,
      }));

      const combined = [...matchResults, ...supplemental];

      return {
        status: 'success',
        msg: combined.length === 0 ? 'No matches found' : 'Matches returned',
        matches: combined,
      };
    }

    return {
      status: 'success',
      msg: 'Matches returned',
      matches: matchResults,
    };
  }

  // Helper function to calculate distance
  // distance calculation removed - matches are filtered by preset locations
}
