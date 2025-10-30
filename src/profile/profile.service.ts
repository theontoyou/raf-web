import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { CreateProfileDto } from './dto/create-profile.dto';
import { SUCCESS_MESSAGES, ERROR_MESSAGES, STATUS_CODES, createResponse } from '../common/messages';

@Injectable()
export class ProfileService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  getPresets() {
    return createResponse(
      'success',
      SUCCESS_MESSAGES.DATA_FETCHED,
      {
        presets: {
          age_range: { min: 18, max: 60 },
          genders: ['Male', 'Female', 'Non-binary', 'Any'],
          preferred_genders: ['Male', 'Female', 'Non-binary', 'Any'],
          languages: [
            'English',
            'Hindi',
            'Tamil',
            'Telugu',
            'Malayalam',
            'Kannada',
            'Bengali',
            'Any',
          ],
          personality_traits: [
            'Extroversion',
            'Introversion',
            'Agreeableness',
            'Assertiveness',
            'Openness',
            'Emotional Stability',
            'Conscientiousness',
            'Sarcastic Humor',
            'Dry Humor',
            'Playful Humor',
            'Silly Humor',
            'Intellectual Humor',
          ],
          interests: [
            'Movies',
            'Gaming',
            'Travel',
            'Food & Café Hopping',
            'Sports & Fitness',
            'Music & Concerts',
            'Arts & Culture',
            'Books & Reading',
            'Outdoor Activities',
            'Social Meetups',
            'Online Hangouts',
            'Learning & Workshops',
          ],
          availability: [
            { day: 'Monday', time_ranges: ['08:00-12:00', '14:00-18:00'] },
            { day: 'Tuesday', time_ranges: ['08:00-12:00', '14:00-18:00'] },
            { day: 'Wednesday', time_ranges: ['08:00-12:00', '14:00-18:00'] },
            { day: 'Thursday', time_ranges: ['08:00-12:00', '14:00-18:00'] },
            { day: 'Friday', time_ranges: ['08:00-12:00', '14:00-18:00'] },
            { day: 'Saturday', time_ranges: ['10:00-14:00', '16:00-20:00'] },
            { day: 'Sunday', time_ranges: ['10:00-14:00', '16:00-20:00'] },
          ],
          boundaries: {
            talk_intensity: ['Low', 'Moderate', 'High'],
            silence_tolerance: ['Low', 'Medium', 'High'],
            emotional_openness: ['Low', 'Medium', 'High'],
          },
          duration_preferences: ['Short (<1 hr)', 'Medium (1–3 hrs)', 'Long (>3 hrs)'],
          frequency_preferences: ['One-time', 'Occasional', 'Recurring'],
          verification_reliability: [
            'ID verified',
            'Social profile linked',
            'Past ratings',
            'No-show history',
            'Punctuality',
          ],
          custom_note_guidelines:
            'User can write a short note describing plans or preferences, up to 200 characters',
        },
      },
      STATUS_CODES.SUCCESS,
    );
  }

  async createProfile(userId: string, createProfileDto: CreateProfileDto, imageFiles?: string[]) {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    // Calculate age from DOB
    const dob = new Date(createProfileDto.dob);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }

    // Age validation
    if (age < 18) {
      throw new ForbiddenException('User must be at least 18 years old');
    }

    // Build profile object (store preset locations as provided)
    user.profile = {
      name: createProfileDto.name,
      dob: createProfileDto.dob,
      bio: createProfileDto.bio,
      // store gender and city in lowercase for consistent DB-level comparisons
      gender: createProfileDto.gender ? String(createProfileDto.gender).toLowerCase() : createProfileDto.gender,
      age,
      images: imageFiles || [],
      city: createProfileDto.city ? String(createProfileDto.city).toLowerCase() : createProfileDto.city,
      // legacy location/coordinates removed; using preset_locations on user root
    } as any;

    // attach simple fields
    if (createProfileDto.profile_photo) user.profile.images = [createProfileDto.profile_photo, ...(user.profile.images || [])];

  // Store preset locations on user document as a simple array of objects (may be empty)
  // Normalize preset location names to lowercase for DB-level matching consistency
  (user as any).preset_locations = (createProfileDto.preset_locations || []).map((p: any) => ({ id: p.id, name: p.name ? String(p.name).toLowerCase() : p.name }));

    if (createProfileDto.availability) (user as any).availability = createProfileDto.availability;
    if (createProfileDto.preferred_gender) {
      (user as any).preferred_gender = Array.isArray(createProfileDto.preferred_gender)
        ? createProfileDto.preferred_gender.map((g: any) => String(g).toLowerCase())
        : [String(createProfileDto.preferred_gender).toLowerCase()];
    }
    if (createProfileDto.preferred_age_range) (user as any).preferred_age_range = createProfileDto.preferred_age_range;
    if (createProfileDto.personality_traits) (user as any).personality_traits = createProfileDto.personality_traits;
    if (createProfileDto.boundaries) (user as any).boundaries = createProfileDto.boundaries;

    // traits/preferences/verification handled elsewhere; map available fields
    user.interests = createProfileDto.interests;
    user.custom_note = createProfileDto.custom_note;

    await user.save();

    return createResponse(
      'success',
      SUCCESS_MESSAGES.PROFILE_CREATED,
      { user_id: user._id },
      STATUS_CODES.CREATED,
    );
  }

  async getProfile(userId: string) {
    const user = await this.userModel.findById(userId).select('-auth.otp -auth.otp_expiry');
    if (!user) {
      throw new NotFoundException(ERROR_MESSAGES.PROFILE_NOT_FOUND);
    }
    return createResponse(
      'success',
      SUCCESS_MESSAGES.DATA_FETCHED,
      { profile: user },
      STATUS_CODES.SUCCESS,
    );
  }

  async updateProfile(userId: string, updateProfileDto: Partial<CreateProfileDto>) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException(ERROR_MESSAGES.PROFILE_NOT_FOUND);
    }
    // Only update provided fields
  if (updateProfileDto.name) user.profile.name = updateProfileDto.name;
    if (updateProfileDto.dob) user.profile.dob = updateProfileDto.dob;
    if (updateProfileDto.bio) user.profile.bio = updateProfileDto.bio;
  if (updateProfileDto.gender) user.profile.gender = String(updateProfileDto.gender).toLowerCase();
    if (Array.isArray(updateProfileDto['images'])) user.profile.images = updateProfileDto['images'];
    if (updateProfileDto.profile_photo) user.profile.images = [updateProfileDto.profile_photo, ...(user.profile.images || [])];
  if (updateProfileDto.preset_locations) (user as any).preset_locations = (updateProfileDto.preset_locations || []).map((p: any) => ({ id: p.id, name: p.name ? String(p.name).toLowerCase() : p.name }));
    if (updateProfileDto.availability) (user as any).availability = updateProfileDto.availability;
    if (updateProfileDto.preferred_gender) {
      (user as any).preferred_gender = Array.isArray(updateProfileDto.preferred_gender)
        ? updateProfileDto.preferred_gender.map((g: any) => String(g).toLowerCase())
        : [String(updateProfileDto.preferred_gender).toLowerCase()];
    }
    if (updateProfileDto.preferred_age_range) (user as any).preferred_age_range = updateProfileDto.preferred_age_range;
    if (updateProfileDto.personality_traits) (user as any).personality_traits = updateProfileDto.personality_traits;
    if (updateProfileDto.boundaries) (user as any).boundaries = updateProfileDto.boundaries;
    if (updateProfileDto.interests) user.interests = updateProfileDto.interests;
    if (updateProfileDto.custom_note) user.custom_note = updateProfileDto.custom_note;
    await user.save();
    return createResponse(
      'success',
      SUCCESS_MESSAGES.PROFILE_UPDATED,
      { user_id: user._id },
      STATUS_CODES.SUCCESS,
    );
  }

  async deleteProfile(userId: string) {
    const result = await this.userModel.findByIdAndDelete(userId);
    if (!result) {
      throw new NotFoundException(ERROR_MESSAGES.PROFILE_NOT_FOUND);
    }
    return createResponse(
      'success',
      SUCCESS_MESSAGES.PROFILE_DELETED,
      null,
      STATUS_CODES.SUCCESS,
    );
  }
}
