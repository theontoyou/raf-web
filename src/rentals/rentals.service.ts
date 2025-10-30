import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Rental, RentalDocument } from '../schemas/rental.schema';
import { User, UserDocument } from '../schemas/user.schema';
import { MatchesService } from '../matches/matches.service';
import { InitiateRentalDto } from './dto/initiate-rental.dto';
import { ConfirmRentalDto } from './dto/confirm-rental.dto';
import { VerifyRentalOtpDto } from './dto/verify-rental-otp.dto';

@Injectable()
export class RentalsService {
  constructor(
    @InjectModel(Rental.name) private rentalModel: Model<RentalDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private matchesService: MatchesService,
  ) {}

  // On startup, attempt to remove any lingering 2dsphere index on the rentals collection
  // that might cause Mongo to expect GeoJSON values for `location`.
  async onModuleInit() {
    try {
      const indexes = await this.rentalModel.collection.indexes();
      for (const idx of indexes) {
        // idx.key is an object like { 'location': '2dsphere' }
        const key = idx.key || {};
        const hasLocation2dsphere = Object.values(key).includes('2dsphere') && Object.keys(key).includes('location');
        if (hasLocation2dsphere) {
          try {
            await this.rentalModel.collection.dropIndex(idx.name);
            console.log(`Dropped lingering index ${idx.name} on rentals collection`);
          } catch (err) {
            console.warn(`Failed to drop index ${idx.name}:`, err.message || err);
          }
        }
      }
    } catch (err) {
      // Non-fatal — log and continue
      console.warn('Could not inspect/drop rental indexes:', err.message || err);
    }
  }

  async initiateRental(userId: string, initiateRentalDto: InitiateRentalDto) {
    const { location, preferred_age, preferred_gender, limit, booking_date, booking_hour, booking_hour_start, booking_hour_end } = initiateRentalDto as any;

    // Load requesting user to check/deduct credits
    const requestingUser = await this.userModel.findById(userId);
    if (!requestingUser) {
      throw new NotFoundException('User not found');
    }

    // Determine how many matches to request (limit). Default 3.
    let requestedLimit = typeof limit === 'number' && limit > 0 ? Math.floor(limit) : 3;
    if (!requestingUser.credits || typeof requestingUser.credits.balance !== 'number') {
      requestingUser.credits = { balance: 0, spent: 0 } as any;
    }
    if (requestingUser.credits.balance <= 0) {
      throw new BadRequestException('Insufficient credits to perform search');
    }
    if (requestingUser.credits.balance < requestedLimit) {
      requestedLimit = requestingUser.credits.balance;
    }

    // Use MatchesService to find top matches with the same algorithm and pagination (limit=3)
    const genderParam = Array.isArray(preferred_gender) && preferred_gender.length === 1 ? preferred_gender[0] : undefined;
    const ageMin = preferred_age?.min;
    const ageMax = preferred_age?.max;
    // We'll attempt to collect matches across the requested hour range (if provided).
    const collectedMap: Map<string, any> = new Map();

    const callMatchesForHour = async (hour: number, limitForCall: number) => {
      const resp: any = await this.matchesService.getTopMatches({
        user_id: userId,
        city: location.city,
        age_min: ageMin,
        age_max: ageMax,
        gender: genderParam,
        preset_location_id: location.preset_location_id,
        preset_location_name: location.preset_location_name,
        booking_date,
        booking_hour: hour,
        limit: limitForCall,
        step: 0,
      });
      if (resp && resp.status === 'success' && Array.isArray(resp.matches)) {
        for (const m of resp.matches) {
          const id = m.user_id?.toString ? m.user_id.toString() : m.user_id;
          if (!collectedMap.has(id) && collectedMap.size < requestedLimit) {
            collectedMap.set(id, m);
          }
        }
      }
    };

    // Back-compat: accept single booking_hour if provided by older clients
    const hasSingleHour = typeof booking_hour === 'number';
    const hasRange = typeof booking_hour_start === 'number' && typeof booking_hour_end === 'number';

    if (booking_date && (hasRange || hasSingleHour)) {
      if (hasRange) {
        const start = Math.max(0, Math.min(23, Math.floor(booking_hour_start)));
        const end = Math.max(0, Math.min(23, Math.floor(booking_hour_end)));
        const from = Math.min(start, end);
        const to = Math.max(start, end);
        // Iterate hours in range until we have enough matches
        for (let h = from; h <= to && collectedMap.size < requestedLimit; h++) {
          const remaining = requestedLimit - collectedMap.size;
          await callMatchesForHour(h, remaining);
        }
      } else if (hasSingleHour) {
        await callMatchesForHour(booking_hour, requestedLimit);
      }
    } else {
      // No booking_date or no hours provided: do a single broad query without hour filter
      const resp: any = await this.matchesService.getTopMatches({
        user_id: userId,
        city: location.city,
        age_min: ageMin,
        age_max: ageMax,
        gender: genderParam,
        preset_location_id: location.preset_location_id,
        preset_location_name: location.preset_location_name,
        limit: requestedLimit,
        step: 0,
      });
      if (resp && resp.status === 'success' && Array.isArray(resp.matches)) {
        for (const m of resp.matches) {
          const id = m.user_id?.toString ? m.user_id.toString() : m.user_id;
          if (!collectedMap.has(id) && collectedMap.size < requestedLimit) {
            collectedMap.set(id, m);
          }
        }
      }
    }

    const returned = Array.from(collectedMap.values());
    if (returned.length > 0) {
      // Deduct credits equal to number of matches returned
      const used = returned.length;
      requestingUser.credits.balance -= used;
      requestingUser.credits.spent += used;
      await requestingUser.save();
      return { status: 'success', msg: 'Top matches fetched', matches: returned };
    }

    // Fallback: if MatchesService returned error, attempt a simple city-based fetch (limit 3)
    const fallback = await this.userModel
      .find({ _id: { $ne: userId }, 'profile.city': location.city })
      .limit(requestedLimit)
      .select('profile.name profile.age profile.images profile.location profile.city preset_locations interests availability status.last_seen');

    const fallbackResults = fallback.map((match) => ({
      user_id: match._id,
      name: match.profile?.name,
      age: match.profile?.age,
      image: match.profile?.images?.[0] || '',
      interests: match.interests || [],
      availability: match.availability || {},
      preset_locations: (match.preset_locations || []).map((p: any) => ({ id: p.id, name: p.name })),
      last_seen: match.status?.last_seen,
    }));

    // Deduct credits for fallback results
    if (fallbackResults.length > 0) {
      requestingUser.credits.balance -= fallbackResults.length;
      requestingUser.credits.spent += fallbackResults.length;
      await requestingUser.save();
    }

    return {
      status: 'success',
      msg: 'Top matches fetched',
      matches: fallbackResults,
    };
  }

  async confirmRental(confirmRentalDto: ConfirmRentalDto) {
    const { renter_id, host_id, scheduled_at, duration_hours, credits_used, location } =
      confirmRentalDto;

  const { booking_date, booking_hour } = confirmRentalDto as any;

  // Normalize booking_date to YYYY-MM-DD for comparison/storage
  const bookingDateKey = booking_date ? new Date(booking_date).toISOString().slice(0, 10) : null;

    // Check renter credits
    const renter = await this.userModel.findById(renter_id);
    if (!renter) {
      throw new NotFoundException('Renter not found');
    }

    if (renter.credits.balance < credits_used) {
      throw new BadRequestException('Insufficient credits');
    }

    // Check host availability
    const host = await this.userModel.findById(host_id);
    if (!host) {
      throw new NotFoundException('Host not found');
    }

    // Ensure neither renter nor host already has an active rental for the same date+hour
    if (bookingDateKey && typeof booking_hour === 'number') {
      const conflicting = await this.rentalModel.findOne({
        $or: [{ renter_id }, { host_id }],
        booking_date: bookingDateKey,
        booking_hour: booking_hour,
        status: { $in: ['pending', 'confirmed', 'in-progress'] },
      });

      if (conflicting) {
        // Determine which party is conflicted
        const conflictFor = conflicting.renter_id?.toString() === renter_id ? 'renter' : 'host';
        throw new BadRequestException(`Booking conflict: ${conflictFor} already has a booking on this date and hour`);
      }
    }

    // Generate OTPs
    const renter_otp = Math.floor(1000 + Math.random() * 9000).toString();
    const host_otp = Math.floor(1000 + Math.random() * 9000).toString();
    const common_otp = Math.floor(1000 + Math.random() * 9000).toString();

    // Create rental
    const rental = await this.rentalModel.create({
      renter_id,
      host_id,
      location: {
        city: location.city,
        preset_location_id: location.preset_location_id,
        preset_location_name: location.preset_location_name,
      },
  booking_date: bookingDateKey,
  booking_hour,
      scheduled_at: new Date(scheduled_at),
      status: 'confirmed',
      otp_stage: {
        renter_otp,
        host_otp,
        common_otp,
        verified: false,
      },
      duration_hours,
      credits_used,
      created_at: new Date(),
    });

    // Deduct credits
    renter.credits.balance -= credits_used;
    renter.credits.spent += credits_used;
    await renter.save();

    // Add active booking entries to both renter and host user documents and set is_on_rent if booking is for today
    try {
      const bookingEntry = {
        booking_date: bookingDateKey,
        booking_hour,
        rental_id: rental._id?.toString(),
        role: 'renter',
        status: 'confirmed',
      };

      const hostBookingEntry = { ...bookingEntry, role: 'host' };

      const todayKey = new Date().toISOString().slice(0, 10);
      const setForToday: any = {};
      if (bookingDateKey === todayKey) {
        setForToday.is_on_rent = true;
      }

      await this.userModel.updateOne({ _id: renter_id }, { $push: { active_bookings: bookingEntry }, ...(Object.keys(setForToday).length ? { $set: setForToday } : {}) });
      await this.userModel.updateOne({ _id: host_id }, { $push: { active_bookings: hostBookingEntry }, ...(Object.keys(setForToday).length ? { $set: setForToday } : {}) });
    } catch (err) {
      console.warn('Failed to add active bookings to user documents:', err.message || err);
    }

    // TODO: Send OTPs to both users via SMS/notification
    console.log(`Renter OTP: ${renter_otp}`);
    console.log(`Host OTP: ${host_otp}`);
    console.log(`Common OTP: ${common_otp}`);

    return {
      status: 'success',
      msg: 'Rental confirmed',
      rental_id: rental._id,
    };
  }

  async verifyRentalOtp(verifyRentalOtpDto: VerifyRentalOtpDto) {
    const { rental_id, user_id, otp } = verifyRentalOtpDto;

    const rental = await this.rentalModel.findById(rental_id);
    if (!rental) {
      throw new NotFoundException('Rental not found');
    }

    // Check if OTP matches renter, host, or common OTP
    const isValidOtp =
      otp === rental.otp_stage.renter_otp ||
      otp === rental.otp_stage.host_otp ||
      otp === rental.otp_stage.common_otp;

    if (!isValidOtp) {
      throw new UnauthorizedException('Invalid OTP');
    }

    // Mark as verified
    rental.otp_stage.verified = true;
    rental.status = 'in-progress';
    await rental.save();

    return {
      status: 'success',
      msg: 'OTP verified',
    };
  }

  /**
   * Get user orders grouped into active, finished and past rentals.
   * Pagination: step (page index starting at 0) and limit (items per page) apply to each group.
   */
  async getUserOrders(userId: string, step = 0, limit = 10) {
    const skip = Math.max(0, Math.floor(step)) * Math.max(1, Math.floor(limit));

    // Define statuses
    const activeStatuses = ['pending', 'confirmed', 'in-progress'];
    const finishedStatuses = ['completed'];
    const pastStatuses = ['cancelled'];

    // Helper to fetch rentals by status set
    const fetchRentals = async (statuses: string[]) => {
      return this.rentalModel
        .find({
          $or: [{ renter_id: userId }, { host_id: userId }],
          status: { $in: statuses },
        })
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(Math.max(1, Math.floor(limit)))
        .lean();
    };

    const [active, finished, past] = await Promise.all([
      fetchRentals(activeStatuses),
      fetchRentals(finishedStatuses),
      fetchRentals(pastStatuses),
    ]);

    // Collect user ids to fetch basic user info for UI (name, image)
    const otherUserIds = new Set<string>();
    const addIdsFrom = (rents: any[]) => rents.forEach((r) => {
      try {
        const renterId = r.renter_id?.toString();
        const hostId = r.host_id?.toString();
        if (renterId && renterId !== userId) otherUserIds.add(renterId);
        if (hostId && hostId !== userId) otherUserIds.add(hostId);
      } catch (e) {}
    });

    addIdsFrom(active); addIdsFrom(finished); addIdsFrom(past);

  const otherUsers = await this.userModel.find({ _id: { $in: Array.from(otherUserIds) } }).select('profile images').lean();
    const userMap: Record<string, any> = {};
    for (const u of otherUsers) {
      const id = u._id?.toString();
      userMap[id] = {
        user_id: id,
        name: (u.profile && u.profile.name) || '',
        image: (u.profile && (u.profile.images?.[0])) || '',
        is_on_rent: u.is_on_rent || false,
      };
    }

    const mapRental = (r: any) => {
      const renterId = r.renter_id?.toString();
      const hostId = r.host_id?.toString();
      const role = renterId === userId ? 'renter' : (hostId === userId ? 'host' : 'other');
      const otherUserId = role === 'renter' ? hostId : renterId;
      const other = otherUserId ? userMap[otherUserId] || { user_id: otherUserId } : null;

      return {
        rental_id: r._id?.toString(),
        role,
        other_user: other,
        booking_date: r.booking_date,
        booking_hour: r.booking_hour,
        scheduled_at: r.scheduled_at,
        status: r.status,
        duration_hours: r.duration_hours,
        credits_used: r.credits_used,
        location: r.location || {},
        otp_verified: !!(r.otp_stage && r.otp_stage.verified),
        created_at: r.created_at,
      };
    };

    const activeMapped = active.map(mapRental);
    const finishedMapped = finished.map(mapRental);
    const pastMapped = past.map(mapRental);

    // Also return counts for UI to show totals (without pagination)
    const [totalActive, totalFinished, totalPast] = await Promise.all([
      this.rentalModel.countDocuments({ $or: [{ renter_id: userId }, { host_id: userId }], status: { $in: activeStatuses } }),
      this.rentalModel.countDocuments({ $or: [{ renter_id: userId }, { host_id: userId }], status: { $in: finishedStatuses } }),
      this.rentalModel.countDocuments({ $or: [{ renter_id: userId }, { host_id: userId }], status: { $in: pastStatuses } }),
    ]);

    return {
      status: 'success',
      msg: 'User orders fetched',
      step,
      limit,
      totals: { active: totalActive, finished: totalFinished, past: totalPast },
      active: activeMapped,
      finished: finishedMapped,
      past: pastMapped,
    };
  }

  // Helper function to calculate distance between two coordinates
  // distance calculation removed - rentals match by preset locations
}
