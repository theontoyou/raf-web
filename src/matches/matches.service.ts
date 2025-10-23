import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';

@Injectable()
export class MatchesService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async getTopMatches(query: {
    user_id: string;
    city?: string;
    age_min?: number;
    age_max?: number;
    gender?: string;
    preset_location_id?: string;
    preset_location_name?: string;
  }) {
    const { user_id, city, age_min, age_max, gender } = query;

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
    if (city) {
      matchCriteria['profile.city'] = city;
    } else if (currentUser && currentUser.profile?.city) {
      matchCriteria['profile.city'] = currentUser.profile.city;
    } else {
      // City is mandatory to scope matches if we don't have a user context
      return { status: 'error', msg: 'City is required', matches: [] };
    }

    if (gender) {
      matchCriteria['profile.gender'] = gender;
    } else if (currentUser?.profile?.preferred_gender?.length) {
      matchCriteria['profile.gender'] = { $in: currentUser.profile.preferred_gender };
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
      matchCriteria['preset_locations.name'] = query.preset_location_name;
    }

    const matches = await this.userModel
      .find(matchCriteria)
      .limit(20)
      .select('profile.name profile.age profile.images profile.bio interests preset_locations');

    // Format results (no distance calculation)
    const matchResults = matches.map((match) => ({
      user_id: match._id,
      name: match.profile?.name,
      age: match.profile?.age,
      image: match.profile?.images?.[0] || '',
      bio: match.profile?.bio || '',
      interests: match.interests || [],
      preset_locations: match.preset_locations || [],
    }));

    if (matchResults.length === 0) {
      // No exact matches for the given criteria — fall back to returning people from the same city
      const cityOnlyCriteria: any = { 'profile.city': matchCriteria['profile.city'] };
      if (user_id) cityOnlyCriteria._id = { $ne: user_id };

      const cityMatches = await this.userModel
        .find(cityOnlyCriteria)
        .limit(20)
        .select('profile.name profile.age profile.images profile.bio interests preset_locations');

      const fallbackResults = cityMatches.map((match) => ({
        user_id: match._id,
        name: match.profile?.name,
        age: match.profile?.age,
        image: match.profile?.images?.[0] || '',
        bio: match.profile?.bio || '',
        interests: match.interests || [],
        preset_locations: match.preset_locations || [],
      }));

      if (fallbackResults.length === 0) {
        return {
          status: 'error',
          msg: 'No matches found',
          matches: [],
        };
      }

      return {
        status: 'success',
        msg: 'No exact matches — returning users from the same city',
        matches: fallbackResults,
      };
    }

    return {
      status: 'success',
      matches: matchResults,
    };
  }

  // Helper function to calculate distance
  // distance calculation removed - matches are filtered by preset locations
}
