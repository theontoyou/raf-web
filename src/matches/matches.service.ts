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
  }) {
    const { user_id, city, age_min, age_max, gender } = query;

    // Get current user to understand preferences
    const currentUser = await this.userModel.findById(user_id);
    if (!currentUser) {
      return {
        status: 'error',
        msg: 'User not found',
        matches: [],
      };
    }

    // Build match criteria
    const matchCriteria: any = {
      _id: { $ne: user_id },
    };

    // Apply filters
    if (city) {
      matchCriteria['profile.city'] = city;
    } else if (currentUser.profile?.city) {
      matchCriteria['profile.city'] = currentUser.profile.city;
    }

    if (gender) {
      matchCriteria['profile.gender'] = gender;
    } else if (currentUser.profile?.preferred_gender?.length) {
      matchCriteria['profile.gender'] = { $in: currentUser.profile.preferred_gender };
    }

    if (age_min && age_max) {
      matchCriteria['profile.age'] = { $gte: age_min, $lte: age_max };
    } else if (currentUser.profile?.age_range) {
      matchCriteria['profile.age'] = {
        $gte: currentUser.profile.age_range.min,
        $lte: currentUser.profile.age_range.max,
      };
    }

    // Find matches with geospatial query if location available
    let matches;
    if (currentUser.profile?.location?.coordinates) {
      matches = await this.userModel
        .find({
          ...matchCriteria,
          'profile.location': {
            $near: {
              $geometry: {
                type: 'Point',
                coordinates: currentUser.profile.location.coordinates,
              },
              $maxDistance: (currentUser.profile?.distance_limit_km || 15) * 1000, // Convert to meters
            },
          },
        })
        .limit(20)
        .select('profile.name profile.age profile.images profile.location profile.bio interests');
    } else {
      matches = await this.userModel
        .find(matchCriteria)
        .limit(20)
        .select('profile.name profile.age profile.images profile.location profile.bio interests');
    }

    // Calculate match scores and format results
    const matchResults = matches.map((match) => {
      const distance = currentUser.profile?.location?.coordinates
        ? this.calculateDistance(
            currentUser.profile.location.coordinates,
            match.profile?.location?.coordinates || [0, 0],
          )
        : 0;

      return {
        user_id: match._id,
        name: match.profile?.name,
        age: match.profile?.age,
        distance_km: Math.round(distance),
        image: match.profile?.images?.[0] || '',
        bio: match.profile?.bio || '',
        interests: match.interests || [],
      };
    });

    // Sort by distance
    matchResults.sort((a, b) => a.distance_km - b.distance_km);

    if (matchResults.length === 0) {
      return {
        status: 'error',
        msg: 'No matches found',
        matches: [],
      };
    }

    return {
      status: 'success',
      matches: matchResults,
    };
  }

  // Helper function to calculate distance
  private calculateDistance(coords1: number[], coords2: number[]): number {
    const [lon1, lat1] = coords1;
    const [lon2, lat2] = coords2;

    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(value: number): number {
    return (value * Math.PI) / 180;
  }
}
