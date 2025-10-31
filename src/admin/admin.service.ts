import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User, UserDocument } from '../schemas/user.schema';
import { Rental } from '../schemas/rental.schema';
import { TokenBlacklist } from '../schemas/token-blacklist.schema';
import * as crypto from 'crypto';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(TokenBlacklist.name) private tokenBlacklistModel: Model<any>,
    @InjectModel(Rental.name) private rentalModel: Model<any>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // PBKDF2-based password hashing (no external dependency)
  private hashPassword(password: string, salt?: string) {
    const s = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, s, 310000, 32, 'sha256').toString('hex');
    return `${s}$${hash}`;
  }

  private verifyPassword(password: string, stored: string) {
    if (!stored) return false;
    const [salt, hash] = stored.split('$');
    if (!salt || !hash) return false;
    const candidate = crypto.pbkdf2Sync(password, salt, 310000, 32, 'sha256').toString('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(candidate, 'hex'), Buffer.from(hash, 'hex'));
    } catch (e) {
      return false;
    }
  }

  // Create or promote an admin. Accepts mobile_number OR email, and optional password.
  async createAdmin(mobile_number?: string, name?: string, email?: string, password?: string) {
    // sanitize inputs to avoid storing stray quotes/semicolons
    const clean = (s?: string) => {
      if (!s) return s;
      return String(s).trim().replace(/^['"\s]+|['";\s]+$/g, '');
    };

  mobile_number = clean(mobile_number);
  email = clean(email);
  email = email ? String(email).toLowerCase() : email;
    name = clean(name);
    password = password ? String(password).trim() : password;

    // if user exists, promote to admin
    let user = null;
    if (mobile_number) user = await this.userModel.findOne({ 'auth.mobile_number': mobile_number });
    if (!user && email) user = await this.userModel.findOne({ 'auth.email': email });

    if (user) {
      user.role = 'admin';
      (user as any).is_admin = true;
      if (name) {
        user.profile = (user.profile as any) || ({} as any);
        (user.profile as any).name = name;
      }
      if (email) (user.auth as any).email = email;
      if (password) (user.auth as any).password = this.hashPassword(password);
      await user.save();
      return user;
    }

    const auth: any = { created_at: new Date(), otp_verified: false };
    if (mobile_number) auth.mobile_number = mobile_number;
    if (email) auth.email = email;
    if (password) auth.password = this.hashPassword(password);

    user = await this.userModel.create({
      auth,
      profile: { name: name || 'Admin' } as any,
      role: 'admin',
      is_admin: true,
      credits: { balance: 0, spent: 0 },
      status: { online: false, last_seen: new Date() },
      created_at: new Date(),
    } as any);

    return user;
  }

  // Email+password login for admins
  async loginWithEmail(email: string, password: string) {
    const normalized = String(email || '').trim().toLowerCase();
    const user = await this.userModel.findOne({ 'auth.email': normalized });
    if (!user) throw new NotFoundException('Admin not found');
    if (user.role !== 'admin' && (user as any).is_admin !== true) throw new BadRequestException('Not an admin');
    const stored = (user.auth as any).password;
    if (!stored || !this.verifyPassword(password, stored)) throw new BadRequestException('Invalid credentials');

    const payload = { sub: user._id, role: 'admin' } as any;
    const token = this.jwtService.sign(payload);
    return { token, user_id: user._id };
  }

  // Logout: blacklist the token until it naturally expires
  async logout(token: string, adminId?: string) {
    if (!token) return { status: 'success', msg: 'Nothing to do' };
    // decode to get exp
    const decoded: any = this.jwtService.decode(token);
    const expiresAt = decoded && decoded.exp ? new Date((decoded.exp as number) * 1000) : undefined;
    try {
      await this.tokenBlacklistModel.updateOne(
        { token },
        { $set: { token, admin_id: adminId, expires_at: expiresAt } },
        { upsert: true },
      );
    } catch (e) {
      // ignore failures to blacklist; logout is best-effort
    }
    return { status: 'success', msg: 'Logged out' };
  }

  async getUsersByFilter(filters: any, step = 1, limit = 20) {
    const pageIndex = Math.max(1, Math.floor(step));
    const pageLimit = Math.max(1, Math.floor(limit));
    const skip = (pageIndex - 1) * pageLimit;

    const query: any = { is_deleted: { $ne: true } };

    const escapeRegex = (s: string) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (filters.city) {
      query['profile.city'] = new RegExp(`^${escapeRegex(filters.city)}$`, 'i');
    }
    if (filters.preset_location_id) {
      query['preset_locations.id'] = String(filters.preset_location_id);
    }
    if (filters.preset_location_name) {
      query['preset_locations.name'] = new RegExp(`^${escapeRegex(filters.preset_location_name)}$`, 'i');
    }
    if (filters.gender) {
      query['profile.gender'] = new RegExp(`^${escapeRegex(filters.gender)}$`, 'i');
    }
    if (filters.age_min || filters.age_max) {
      const ageQuery: any = {};
      if (filters.age_min) {
        const min = parseInt(String(filters.age_min), 10);
        if (!Number.isNaN(min)) ageQuery.$gte = min;
      }
      if (filters.age_max) {
        const max = parseInt(String(filters.age_max), 10);
        if (!Number.isNaN(max)) ageQuery.$lte = max;
      }
      if (Object.keys(ageQuery).length) query['profile.age'] = ageQuery;
    }
    if (filters.status === 'active') {
      query.$or = [{ is_on_rent: true }, { 'active_bookings.0': { $exists: true } }];
    } else if (filters.status === 'inactive') {
      query.is_on_rent = false;
      query['active_bookings.0'] = { $exists: false };
    }
    if (filters.search) {
      const s = String(filters.search);
      query.$or = query.$or || [];
      query.$or.push({ 'profile.name': new RegExp(s, 'i') }, { 'auth.mobile_number': new RegExp(s, 'i') });
    }

    const [users, total] = await Promise.all([
      this.userModel.find(query).sort({ created_at: -1 }).skip(skip).limit(pageLimit).lean(),
      this.userModel.countDocuments(query),
    ]);

    return { users, total, step: pageIndex, limit: pageLimit };
  }

  async softDeleteUser(userId: string, adminId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    // prevent deleting admins accidentally
    if (user.role === 'admin' || (user as any).is_admin) {
      throw new BadRequestException('Cannot delete admin accounts via this endpoint');
    }
    await this.userModel.updateOne({ _id: userId }, { $set: { is_deleted: true, deleted_at: new Date(), deleted_by: adminId } });
    return { status: 'success', msg: 'User soft-deleted' };
  }

  async getActiveRentals(filters: any, step = 1, limit = 20) {
    const pageIndex = Math.max(1, Math.floor(step));
    const pageLimit = Math.max(1, Math.floor(limit));
    const skip = (pageIndex - 1) * pageLimit;
  const RentalModel = this.rentalModel;

    const query: any = { status: { $in: ['pending', 'confirmed', 'in-progress'] } };
    if (filters.city) query['location.city'] = new RegExp(`^${String(filters.city).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    if (filters.preset_location_id) query['location.preset_location_id'] = String(filters.preset_location_id);

    const [rentals, total] = await Promise.all([
      RentalModel.find(query).sort({ created_at: -1 }).skip(skip).limit(pageLimit).lean(),
      RentalModel.countDocuments(query),
    ]);

    // Enrich rentals with basic user info (name, image, city) for admin UI
    const userIds = new Set<string>();
    for (const r of rentals) {
      try {
        if (r.renter_id) userIds.add(String(r.renter_id));
        if (r.host_id) userIds.add(String(r.host_id));
      } catch (e) {}
    }

    const users = userIds.size
      ? await this.userModel
          .find({ _id: { $in: Array.from(userIds) } })
          .select('profile images preset_locations auth mobile_number status is_on_rent')
          .lean()
      : [];

    const userMap: Record<string, any> = {};
    for (const u of users) {
      const uu: any = u;
      const id = String(uu._id);
      userMap[id] = {
        user_id: id,
        name: uu.profile?.name || '',
        image: (uu.profile && (uu.profile.images?.[0])) || (uu.images && uu.images[0]) || '',
        city: uu.profile?.city || '',
        preset_locations: (uu.preset_locations || []).map((p: any) => ({ id: p.id, name: p.name })),
        mobile_number: (uu.auth && (uu.auth.mobile_number)) || undefined,
        is_on_rent: !!uu.is_on_rent,
        last_seen: uu.status?.last_seen,
      };
    }

    const mapped = rentals.map((r: any) => {
      const renterId = r.renter_id ? String(r.renter_id) : null;
      const hostId = r.host_id ? String(r.host_id) : null;
      const renter = renterId ? userMap[renterId] || { user_id: renterId } : null;
      const host = hostId ? userMap[hostId] || { user_id: hostId } : null;

      const place = (r.location && (r.location.preset_location_name || r.location.preset_location_id))
        ? (r.location.preset_location_name || r.location.preset_location_id)
        : (r.location && r.location.city) || '';

      return {
        rental_id: r._id?.toString(),
        status: r.status,
        booking_date: r.booking_date,
        booking_hour: r.booking_hour,
        scheduled_at: r.scheduled_at,
        duration_hours: r.duration_hours,
        credits_used: r.credits_used,
        place,
        renter,
        host,
        created_at: r.created_at,
      };
    });

    return { rentals: mapped, total, step: pageIndex, limit: pageLimit };
  }

  // Dashboard summary (totals)
  async getDashboardSummary(opts: { since?: string; period?: string } = {}) {
    const { since, period } = opts;
    let sinceDate: Date | undefined;
    if (since) {
      const d = new Date(since);
      if (!isNaN(d.getTime())) sinceDate = d;
    } else if (period) {
      const m = String(period).match(/^(\d+)d$/);
      if (m) {
        const days = parseInt(m[1], 10);
        sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      }
    }

    // Helper: some older records use string timestamps for created_at. If the schema
    // defines created_at as String, convert the Date to ISO string before querying.
    const normalizeDateForModel = (model: any, date: Date) => {
      if (!date) return date;
      try {
        const path: any = model && model.schema ? model.schema.path('created_at') : null;
        if (path && path.instance === 'String') return date.toISOString();
      } catch (e) {
        // ignore and fallback to Date
      }
      return date;
    };

    // Default period days (used to compute previous period) - if period not provided default to 30 days
    const defaultPeriodDays = 30;
    let periodDays = defaultPeriodDays;
    if (period && !since) {
      const m = String(period).match(/^(\d+)d$/);
      if (m) periodDays = parseInt(m[1], 10);
    }

    // current window: sinceDate -> now (or last `periodDays` if sinceDate not provided)
    const now = new Date();
    const currentSince = sinceDate || new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
    const prevSince = new Date(currentSince.getTime() - periodDays * 24 * 60 * 60 * 1000);

    const rentalCurrentMatch: any = { ...(currentSince ? { created_at: { $gte: normalizeDateForModel(this.rentalModel, currentSince) } } : {}) };
    const rentalPrevMatch: any = { created_at: { $gte: normalizeDateForModel(this.rentalModel, prevSince), $lt: normalizeDateForModel(this.rentalModel, currentSince) } };

    const userCurrentMatch: any = { is_deleted: { $ne: true }, ...(currentSince ? { created_at: { $gte: normalizeDateForModel(this.userModel, currentSince) } } : {}) };
    const userPrevMatch: any = { is_deleted: { $ne: true }, created_at: { $gte: normalizeDateForModel(this.userModel, prevSince), $lt: normalizeDateForModel(this.userModel, currentSince) } };

    // Run aggregations in parallel for current and previous windows
    const [
      usersCount,
      usersPrevCount,
      hostsDistinct,
      hostsPrevDistinct,
      activeRentalsCount,
      activeRentalsPrevCount,
      pendingRentalsCount,
      pendingRentalsPrevCount,
      creditsAgg,
      creditsPrevAgg,
      revenueAgg,
      revenuePrevAgg,
    ] = await Promise.all([
      this.userModel.countDocuments(userCurrentMatch),
      this.userModel.countDocuments(userPrevMatch),
      this.rentalModel.distinct('host_id', currentSince ? rentalCurrentMatch : {}).then((arr: any[]) => (arr || []).length),
      this.rentalModel.distinct('host_id', rentalPrevMatch).then((arr: any[]) => (arr || []).length),
  // Ensure created_at/date filters are applied at top-level, not nested inside `status`.
  this.rentalModel.countDocuments({ status: { $in: ['pending', 'confirmed', 'in-progress'] }, ...(currentSince ? rentalCurrentMatch : {}) }),
  this.rentalModel.countDocuments({ status: { $in: ['pending', 'confirmed', 'in-progress'] }, ...(rentalPrevMatch || {}) }),
      this.rentalModel.countDocuments({ status: 'pending', ...(currentSince ? rentalCurrentMatch : {}) }),
      this.rentalModel.countDocuments({ status: 'pending', ...(rentalPrevMatch || {}) }),
      this.userModel.aggregate([{ $match: userCurrentMatch }, { $group: { _id: null, total: { $sum: '$credits.balance' } } }]),
      this.userModel.aggregate([{ $match: userPrevMatch }, { $group: { _id: null, total: { $sum: '$credits.balance' } } }]),
      this.rentalModel.aggregate([{ $match: rentalCurrentMatch }, { $group: { _id: null, total: { $sum: '$credits_used' } } }]),
      this.rentalModel.aggregate([{ $match: rentalPrevMatch }, { $group: { _id: null, total: { $sum: '$credits_used' } } }]),
    ]);

  const credits_balance = creditsAgg && creditsAgg[0] ? creditsAgg[0].total : 0;
  const credits_prev = creditsPrevAgg && creditsPrevAgg[0] ? creditsPrevAgg[0].total : 0;
  const revenue = revenueAgg && revenueAgg[0] ? revenueAgg[0].total : 0;
  const revenue_prev = revenuePrevAgg && revenuePrevAgg[0] ? revenuePrevAgg[0].total : 0;

  // overall/all-time aggregates (run separately to keep the period-based queries compact)
  const [
    usersAllCount,
    hostsAllDistinct,
    activeRentalsAllCount,
    pendingRentalsAllCount,
    creditsAllAgg,
    revenueAllAgg,
  ] = await Promise.all([
    this.userModel.countDocuments({ is_deleted: { $ne: true } }),
    this.rentalModel.distinct('host_id', {}).then((arr: any[]) => (arr || []).length),
    this.rentalModel.countDocuments({ status: { $in: ['pending', 'confirmed', 'in-progress'] } }),
    this.rentalModel.countDocuments({ status: 'pending' }),
    this.userModel.aggregate([{ $group: { _id: null, total: { $sum: '$credits.balance' } } }]),
    this.rentalModel.aggregate([{ $group: { _id: null, total: { $sum: '$credits_used' } } }]),
  ]);

  const users_all = usersAllCount || 0;
  const hosts_all = hostsAllDistinct || 0;
  const active_rentals_all = activeRentalsAllCount || 0;
  const pending_rentals_all = pendingRentalsAllCount || 0;
  const credits_all = creditsAllAgg && creditsAllAgg[0] ? creditsAllAgg[0].total : 0;
  const revenue_all = revenueAllAgg && revenueAllAgg[0] ? revenueAllAgg[0].total : 0;

    const pct = (prev: number, cur: number) => {
      if (!prev && !cur) return 0;
      if (!prev) return 100; // previously zero, now some value -> 100% increase
      return Math.round(((cur - prev) / prev) * 100);
    };

    const totals = {
      // period-based totals (existing behavior)
      users: usersCount,
      hosts: hostsDistinct || 0,
      active_rentals: activeRentalsCount || 0,
      pending_rentals: pendingRentalsCount || 0,
      credits_balance,
      revenue,
      // overall / all-time snapshot (useful for UI showing total users/hosts)
      overall: {
        users: users_all,
        hosts: hosts_all,
        active_rentals: active_rentals_all,
        pending_rentals: pending_rentals_all,
        credits_balance: credits_all,
        revenue: revenue_all,
      },
    };

    const deltas = {
      users: pct(usersPrevCount || 0, usersCount || 0),
      hosts: pct(hostsPrevDistinct || 0, hostsDistinct || 0),
      active_rentals: pct(activeRentalsPrevCount || 0, activeRentalsCount || 0),
      pending_rentals: pct(pendingRentalsPrevCount || 0, pendingRentalsCount || 0),
      credits_balance: pct(credits_prev || 0, credits_balance || 0),
      revenue: pct(revenue_prev || 0, revenue || 0),
    };

    return { totals, deltas };
  }

  async getRecentRentals(filters: any = {}, step = 1, limit = 5) {
    const pageIndex = Math.max(1, Math.floor(step));
    const pageLimit = Math.max(1, Math.floor(limit));
    const skip = (pageIndex - 1) * pageLimit;

    const query: any = {};
    const escapeRegex = (s: string) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (filters.city) query['location.city'] = new RegExp(`^${escapeRegex(filters.city)}$`, 'i');
    if (filters.preset_location_id) query['location.preset_location_id'] = String(filters.preset_location_id);
    if (filters.booking_date) query.booking_date = String(filters.booking_date);
    if (filters.renter_id) query.renter_id = String(filters.renter_id);
    if (filters.host_id) query.host_id = String(filters.host_id);

    // allow searching by renter/host name (resolve to ids)
    if (filters.renter_name) {
      const nameRegex = new RegExp(escapeRegex(String(filters.renter_name).trim()), 'i');
      const matched = await this.userModel.find({ 'profile.name': nameRegex }).select('_id').limit(100).lean();
      if (!matched || matched.length === 0) return [];
      const ids = matched.map((m: any) => String(m._id));
      query.renter_id = { $in: ids };
    }

    if (filters.host_name) {
      const nameRegex = new RegExp(escapeRegex(String(filters.host_name).trim()), 'i');
      const matchedHosts = await this.userModel.find({ 'profile.name': nameRegex }).select('_id').limit(100).lean();
      if (!matchedHosts || matchedHosts.length === 0) return [];
  const hostIds = matchedHosts.map((m: any) => String(m._id));
      query.host_id = { $in: hostIds };
    }

    const rentals = await this.rentalModel.find(query).sort({ created_at: -1 }).skip(skip).limit(pageLimit).lean();
    if (!rentals || !rentals.length) return [];
    const userIds = new Set<string>();
    for (const r of rentals) {
      if (r.renter_id) userIds.add(String(r.renter_id));
      if (r.host_id) userIds.add(String(r.host_id));
    }
    const users = userIds.size
      ? await this.userModel.find({ _id: { $in: Array.from(userIds) } }).select('profile images').lean()
      : [];
    const userMap: Record<string, any> = {};
    for (const u of users) userMap[String(u._id)] = { name: u.profile?.name || '', image: u.profile?.images?.[0] || '' };

    return rentals.map((r: any) => ({
      rental_id: r._id?.toString(),
      status: r.status,
      booking_date: r.booking_date,
      scheduled_at: r.scheduled_at,
      duration_hours: r.duration_hours,
      place: r.location?.preset_location_name || r.location?.preset_location_id || r.location?.city,
      renter: userMap[String(r.renter_id)] || { id: r.renter_id },
      host: userMap[String(r.host_id)] || { id: r.host_id },
      credits_used: r.credits_used,
      created_at: r.created_at,
    }));
  }

  async getPendingRentals(filters: any = {}, step = 1, limit = 20) {
    const pageIndex = Math.max(1, Math.floor(step));
    const pageLimit = Math.max(1, Math.floor(limit));
    const skip = (pageIndex - 1) * pageLimit;

    const query: any = { status: 'pending' };
    const escapeRegex = (s: string) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (filters.city) query['location.city'] = new RegExp(`^${escapeRegex(filters.city)}$`, 'i');
    if (filters.preset_location_id) query['location.preset_location_id'] = String(filters.preset_location_id);
    if (filters.booking_date) query.booking_date = String(filters.booking_date);
    if (filters.renter_id) query.renter_id = String(filters.renter_id);
    if (filters.host_id) query.host_id = String(filters.host_id);

    // allow searching by renter/host name (resolve to ids)
    if (filters.renter_name) {
      const nameRegex = new RegExp(escapeRegex(String(filters.renter_name).trim()), 'i');
      const matched = await this.userModel.find({ 'profile.name': nameRegex }).select('_id').limit(100).lean();
      if (!matched || matched.length === 0) return [];
      const ids = matched.map((m: any) => String(m._id));
      query.renter_id = { $in: ids };
    }

    if (filters.host_name) {
      const nameRegex = new RegExp(escapeRegex(String(filters.host_name).trim()), 'i');
      const matchedHosts = await this.userModel.find({ 'profile.name': nameRegex }).select('_id').limit(100).lean();
      if (!matchedHosts || matchedHosts.length === 0) return [];
      const hostIds = matchedHosts.map((m: any) => String(m._id));
      query.host_id = { $in: hostIds };
    }

    const rentals = await this.rentalModel.find(query).sort({ created_at: -1 }).skip(skip).limit(pageLimit).lean();
    if (!rentals || !rentals.length) return [];
    const userIds = new Set<string>();
    for (const r of rentals) {
      if (r.renter_id) userIds.add(String(r.renter_id));
      if (r.host_id) userIds.add(String(r.host_id));
    }
    const users = userIds.size
      ? await this.userModel.find({ _id: { $in: Array.from(userIds) } }).select('profile images').lean()
      : [];
    const userMap: Record<string, any> = {};
    for (const u of users) userMap[String(u._id)] = { name: u.profile?.name || '', image: u.profile?.images?.[0] || '' };

    return rentals.map((r: any) => ({
      rental_id: r._id?.toString(),
      status: r.status,
      booking_date: r.booking_date,
      scheduled_at: r.scheduled_at,
      duration_hours: r.duration_hours,
      place: r.location?.preset_location_name || r.location?.preset_location_id || r.location?.city,
      renter: userMap[String(r.renter_id)] || { id: r.renter_id },
      host: userMap[String(r.host_id)] || { id: r.host_id },
      credits_used: r.credits_used,
      created_at: r.created_at,
    }));
  }

  async confirmRental(rentalId: string) {
    const rental = await this.rentalModel.findById(rentalId);
    if (!rental) throw new NotFoundException('Rental not found');
    rental.status = 'confirmed';
    await rental.save();
    return rental;
  }

  async cancelRental(rentalId: string, reason?: string) {
    const rental = await this.rentalModel.findById(rentalId);
    if (!rental) throw new NotFoundException('Rental not found');
    rental.status = 'cancelled';
    (rental as any).cancelled_at = new Date();
    if (reason) (rental as any).cancel_reason = reason;
    await rental.save();
    return rental;
  }

  async completeRental(rentalId: string) {
    const rental = await this.rentalModel.findById(rentalId);
    if (!rental) throw new NotFoundException('Rental not found');
    rental.status = 'completed';
    (rental as any).completed_at = new Date();
    await rental.save();
    return rental;
  }

  async getRentalSeries(opts: { range?: string; group_by?: string } = {}) {
    const { range = '30d', group_by = 'day' } = opts;
    const m = String(range).match(/^(\d+)d$/);
    const days = m ? parseInt(m[1], 10) : 30;
    const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Group by day
    const fmt = '%Y-%m-%d';
    const pipeline: any[] = [
      { $match: { created_at: { $gte: sinceDate } } },
      { $group: { _id: { $dateToString: { format: fmt, date: '$created_at' } }, count: { $sum: 1 } } },
      { $project: { date: '$_id', count: 1, _id: 0 } },
      { $sort: { date: 1 } },
    ];

    const series = await this.rentalModel.aggregate(pipeline);
    return series.map((s: any) => ({ date: s.date, count: s.count }));
  }

  async getUserSeries(opts: { range?: string; group_by?: string } = {}) {
    const { range = '30d', group_by = 'day' } = opts;
    const m = String(range).match(/^(\d+)d$/);
    const days = m ? parseInt(m[1], 10) : 30;
    const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const fmt = '%Y-%m-%d';
    const pipeline: any[] = [
      { $match: { created_at: { $gte: sinceDate } } },
      { $group: { _id: { $dateToString: { format: fmt, date: '$created_at' } }, count: { $sum: 1 } } },
      { $project: { date: '$_id', count: 1, _id: 0 } },
      { $sort: { date: 1 } },
    ];
    const series = await this.userModel.aggregate(pipeline as any);
    return series.map((s: any) => ({ date: s.date, count: s.count }));
  }

  /**
   * Get active user counts by city (paginated) or time-series when group_by is provided.
   * Definition of active: user.is_on_rent === true OR status.last_seen within the range window.
   * Params:
   *  - opts.city?: string -> limit to a single city
   *  - opts.range?: string -> e.g. '30d' (used to compute sinceDate)
   *  - opts.group_by?: 'day' -> return series for the given city (or all cities if no city?)
   */
  async getActiveUsers(opts: { city?: string; range?: string; group_by?: string } = {}, step = 1, limit = 20) {
    const { city, range, group_by } = opts;
    // compute sinceDate from range (e.g. 30d)
    let sinceDate: Date | undefined;
    if (range) {
      const m = String(range).match(/^(\d+)d$/);
      if (m) {
        const days = parseInt(m[1], 10);
        sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      }
    } else {
      // default: 30 days
      sinceDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    // If group_by specified, return a time-series of active-user counts (grouped by day)
    if (group_by === 'day') {
      // If city provided, filter by city; else aggregate across all cities
      const match: any = { is_deleted: { $ne: true } };
      // exclude admin accounts from active-user analytics
      match.role = { $ne: 'admin' };
      if (city) {
        match['profile.city'] = new RegExp(`^${String(city).replace(/[.*+?^${}()|[\\]\]/g, '\\$&')}$`, 'i');
      } else {
        // ignore unknown/empty/null city values when no city filter is provided
        match['profile.city'] = { $nin: ['unknown', '', null] };
      }
      // active when is_on_rent true OR status.last_seen >= sinceDate
      match.$or = [{ is_on_rent: true }, { 'status.last_seen': { $gte: sinceDate } }];

      const fmt = '%Y-%m-%d';
      const pipeline: any[] = [
        { $match: match },
        { $group: { _id: { $dateToString: { format: fmt, date: '$status.last_seen' } }, count: { $sum: 1 } } },
        { $project: { date: '$_id', count: 1, _id: 0 } },
        { $sort: { date: 1 } },
      ];

      const series = await this.userModel.aggregate(pipeline as any);
      return series.map((s: any) => ({ date: s.date, count: s.count }));
    }

    // Otherwise return counts grouped by city (paginated)
    const match: any = { is_deleted: { $ne: true } };
    match.$or = [{ is_on_rent: true }];
    if (sinceDate) match.$or.push({ 'status.last_seen': { $gte: sinceDate } });
    // exclude admin accounts
    match.role = { $ne: 'admin' };
    if (city) {
      match['profile.city'] = new RegExp(`^${String(city).replace(/[.*+?^${}()|[\\]\]/g, '\\$&')}$`, 'i');
    } else {
      // ignore unknown/empty/null city values when no city filter is provided
      match['profile.city'] = { $nin: ['unknown', '', null] };
    }

    const pageIndex = Math.max(1, Math.floor(step));
    const pageLimit = Math.max(1, Math.floor(limit));
    const skip = (pageIndex - 1) * pageLimit;

    const pipeline: any[] = [
      { $match: match },
      // group by lowercased city to make grouping case-insensitive
      { $group: { _id: { $toLower: { $ifNull: ['$profile.city', 'unknown'] } }, count: { $sum: 1 } } },
      // produce a display-friendly city (capitalized first letter) from the lowercased key
      {
        $project: {
          _id: 0,
          cityLower: '$_id',
          count: 1,
        },
      },
      {
        $project: {
          city: {
            $concat: [
              { $toUpper: { $substrCP: ['$cityLower', 0, 1] } },
              { $substrCP: ['$cityLower', 1, { $subtract: [{ $strLenCP: '$cityLower' }, 1] }] },
            ],
          },
          count: 1,
        },
      },
      { $sort: { count: -1, city: 1 } },
      { $skip: skip },
      { $limit: pageLimit },
    ];

    const results = await this.userModel.aggregate(pipeline as any);
    // If city provided then return single count
    if (city) {
      const c = results && results[0] ? results[0].count : 0;
      return { city: city, count: c };
    }

    return { page: pageIndex, limit: pageLimit, items: results };
  }
}
