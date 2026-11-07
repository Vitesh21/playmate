import { Inject, Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { DRIZZLE_DB, type DrizzleDb } from "@/db/database.module";
import { users, userBlocks, type NewUser } from "@/db/schema/users";
import type { UserUpdateInput } from "@playmate/validation";
import { UserRole } from "@playmate/types";
import { SupabaseService } from "@/common/supabase.service";
import { BadRequestException } from "@nestjs/common";

@Injectable()
export class UsersService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDb,
    private readonly supabase: SupabaseService,
  ) {}

  async findAll() {
    return this.db.select().from(users).orderBy(users.createdAt);
  }

  async findById(id: string) {
    const [user] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  async findByEmail(email: string) {
    const [user] = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    return user;
  }

  async create(data: NewUser) {
    const [created] = await this.db.insert(users).values(data).returning();
    return created;
  }

  async upsertByAuth(authUser: {
    id: string;
    email?: string;
    user_metadata?: Record<string, any>;
    app_metadata?: Record<string, any>;
  }) {
    const meta = authUser.user_metadata ?? {};
    const appMeta = authUser.app_metadata ?? {};
    const tokenRole = (appMeta.role as UserRole) ?? undefined;

    const existing = await this.findById(authUser.id).catch(() => null);
    if (existing) {
      if (tokenRole && existing.role !== tokenRole) {
        const [updated] = await this.db
          .update(users)
          .set({ role: tokenRole, updatedAt: new Date() })
          .where(eq(users.id, authUser.id))
          .returning();
        return updated ?? existing;
      }
      return existing;
    }

    const newUser: NewUser = {
      id: authUser.id,
      email: authUser.email ?? null,
      firstName: meta.firstName ?? null,
      lastName: meta.lastName ?? null,
      role: (tokenRole ?? UserRole.USER) as any,
    };
    return this.create(newUser);
  }

  async update(id: string, data: UserUpdateInput) {
    const [updated] = await this.db
      .update(users)
      .set({
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        avatarUrl: data.avatarUrl,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    if (!updated) throw new NotFoundException("User not found");
    return updated;
  }

  async getPlayerProfile(id: string) {
    const [user] = await this.db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      avatarUrl: users.avatarUrl,
      bio: users.bio,
      homeCity: users.homeCity,
      homeState: users.homeState,
      preferredSports: users.preferredSports,
      skillLevels: users.skillLevels,
      preferredTimes: users.preferredTimes,
      profileVisibility: users.profileVisibility,
      gamesVisibility: users.gamesVisibility,
      calendarVisibility: users.calendarVisibility,
      reliabilityScore: users.reliabilityScore,
      completedGames: users.completedGames,
      noShowCount: users.noShowCount,
      lateCancelCount: users.lateCancelCount,
    }).from(users).where(eq(users.id, id)).limit(1);
    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  async updatePlayerProfile(id: string, data: {
    bio?: string | null;
    homeCity?: string | null;
    homeState?: string | null;
    preferredSports?: string[];
    skillLevels?: Record<string, string>;
    preferredTimes?: string[];
    profileVisibility?: "PUBLIC" | "FRIENDS" | "PRIVATE";
    gamesVisibility?: "PUBLIC" | "FRIENDS" | "PRIVATE";
    calendarVisibility?: "PUBLIC" | "FRIENDS" | "PRIVATE";
  }) {
    const [updated] = await this.db.update(users).set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id)).returning({ id: users.id });
    if (!updated) throw new NotFoundException("User not found");
    return this.getPlayerProfile(id);
  }

  async getPublicPlayerProfile(viewerId: string, profileId: string) {
    const [blocked] = await this.db.select({ id: userBlocks.id }).from(userBlocks).where(and(
      eq(userBlocks.blockerId, viewerId), eq(userBlocks.blockedUserId, profileId),
    )).limit(1);
    const [blockedBy] = await this.db.select({ id: userBlocks.id }).from(userBlocks).where(and(
      eq(userBlocks.blockerId, profileId), eq(userBlocks.blockedUserId, viewerId),
    )).limit(1);
    if (blocked || blockedBy) throw new ForbiddenException("This profile is unavailable");

    const profile = await this.getPlayerProfile(profileId);
    if (profileId !== viewerId && profile.profileVisibility !== "PUBLIC") {
      throw new ForbiddenException("This profile is not public");
    }
    const { profileVisibility: _profileVisibility, gamesVisibility: _gamesVisibility,
      calendarVisibility: _calendarVisibility, noShowCount: _noShowCount,
      lateCancelCount: _lateCancelCount, ...publicFields } = profile;
    return publicFields;
  }

  async block(blockerId: string, blockedUserId: string) {
    if (blockerId === blockedUserId) throw new BadRequestException("You cannot block your own account");
    const [block] = await this.db.insert(userBlocks).values({ blockerId, blockedUserId }).onConflictDoNothing().returning();
    return block ?? { blockerId, blockedUserId };
  }

  async unblock(blockerId: string, blockedUserId: string) {
    await this.db.delete(userBlocks).where(and(eq(userBlocks.blockerId, blockerId), eq(userBlocks.blockedUserId, blockedUserId)));
  }

  async remove(id: string) {
    const [user] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!user) throw new NotFoundException("User not found");

    const { error: authError } = await this.supabase.admin.auth.admin.deleteUser(id);
    if (authError) throw new BadRequestException("Could not delete the authentication account");

    const [anonymized] = await this.db.update(users).set({
      email: `deleted+${id}@account.invalid`,
      firstName: "Deleted",
      lastName: "Player",
      phone: null,
      avatarUrl: null,
      profile: {},
      bio: null,
      homeCity: null,
      homeState: null,
      preferredSports: [],
      skillLevels: {},
      preferredTimes: [],
      updatedAt: new Date(),
    }).where(eq(users.id, id)).returning();
    if (!anonymized) throw new BadRequestException("The account was removed but its profile could not be anonymized");
    return anonymized;
  }
}
