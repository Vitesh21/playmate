import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, inArray, or } from "drizzle-orm";
import { DRIZZLE_DB, type DrizzleDb } from "@/db/database.module";
import { friendships, users, userBlocks, type NewUser } from "@/db/schema/users";
import type { UserUpdateInput } from "@playmate/validation";
import { UserRole } from "@playmate/types";
import { SupabaseService } from "@/common/supabase.service";
import { BadRequestException } from "@nestjs/common";
import { groupMembers, groupMessages, playerGroups } from "@/db/schema/community";
import { desc } from "drizzle-orm";
import { gameParticipants, gameRatings, games } from "@/db/schema/games";

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
      // Keep the local role in sync with the token's authoritative role.
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

  async getMyProfile(id: string) {
    const user = await this.findById(id);
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      profile: user.profile ?? {},
      createdAt: user.createdAt,
    };
  }

  async updateMyProfile(id: string, patch: Record<string, unknown>) {
    const existing = await this.findById(id);
    const profile = existing.profile && typeof existing.profile === "object" ? existing.profile as Record<string, unknown> : {};
    const [updated] = await this.db.update(users).set({
      firstName: typeof patch.firstName === "string" ? patch.firstName.trim() : existing.firstName,
      lastName: typeof patch.lastName === "string" ? patch.lastName.trim() : existing.lastName,
      avatarUrl: typeof patch.avatarUrl === "string" ? patch.avatarUrl : existing.avatarUrl,
      profile: { ...profile, ...patch },
      updatedAt: new Date(),
    }).where(eq(users.id, id)).returning();
    if (!updated) throw new NotFoundException("Profile not found");
    return this.getMyProfile(id);
  }

  async publicProfile(id: string, viewerId?: string) {
    const user = await this.findById(id);
    const profile = user.profile && typeof user.profile === "object" ? user.profile as Record<string, any> : {};
    const visibility = profile.privacy?.profileVisibility ?? "PUBLIC";
    if (visibility === "PRIVATE") throw new NotFoundException("Player profile not found");
    if (visibility === "PLAYPALS" && viewerId !== id) {
      if (!viewerId) throw new NotFoundException("Player profile not found");
      const [friendship] = await this.db.select().from(friendships).where(and(
        eq(friendships.status, "ACCEPTED"),
        or(and(eq(friendships.requesterId, id), eq(friendships.addresseeId, viewerId)), and(eq(friendships.requesterId, viewerId), eq(friendships.addresseeId, id))),
      )).limit(1);
      if (!friendship) throw new NotFoundException("Player profile not found");
    }
    const participations = await this.db.select({ attendance: gameParticipants.attendance })
      .from(gameParticipants).innerJoin(games, eq(games.id, gameParticipants.gameId))
      .where(and(eq(gameParticipants.userId, id), eq(gameParticipants.status, "APPROVED"), eq(games.status, "COMPLETED")));
    const gamesPlayed = participations.filter((item) => item.attendance === "PRESENT").length;
    const noShows = participations.filter((item) => item.attendance === "NO_SHOW").length;
    const completedAttendance = gamesPlayed + noShows;
    const reliabilityScore = completedAttendance ? Math.round((gamesPlayed / completedAttendance) * 100) : null;

    const ratingsGivenToPlayer = await this.db.select().from(gameRatings).where(eq(gameRatings.ratedUserId, id));
    const gameIds = [...new Set(ratingsGivenToPlayer.map((rating) => rating.gameId))];
    const ratingsInGames = gameIds.length ? await this.db.select({ gameId: gameRatings.gameId, raterId: gameRatings.raterId, ratedUserId: gameRatings.ratedUserId }).from(gameRatings).where(inArray(gameRatings.gameId, gameIds)) : [];
    const reciprocalKeys = new Set(ratingsInGames.map((rating) => `${rating.gameId}:${rating.raterId}:${rating.ratedUserId}`));
    const visibleRatings = ratingsGivenToPlayer.filter((rating) => reciprocalKeys.has(`${rating.gameId}:${id}:${rating.raterId}`));
    const ratingScoreValues = visibleRatings.flatMap((rating) => [rating.skill, rating.sportsmanship, rating.punctuality]);
    const ratingSummary = {
      average: ratingScoreValues.length ? Number((ratingScoreValues.reduce((sum, value) => sum + value, 0) / ratingScoreValues.length).toFixed(1)) : null,
      count: visibleRatings.length,
      skill: visibleRatings.length ? Number((visibleRatings.reduce((sum, item) => sum + item.skill, 0) / visibleRatings.length).toFixed(1)) : null,
      sportsmanship: visibleRatings.length ? Number((visibleRatings.reduce((sum, item) => sum + item.sportsmanship, 0) / visibleRatings.length).toFixed(1)) : null,
      punctuality: visibleRatings.length ? Number((visibleRatings.reduce((sum, item) => sum + item.punctuality, 0) / visibleRatings.length).toFixed(1)) : null,
    };
    const hostRatings = visibleRatings.filter((rating) => rating.hostRating !== null).map((rating) => rating.hostRating!);
    const hostRating = hostRatings.length ? Number((hostRatings.reduce((sum, value) => sum + value, 0) / hostRatings.length).toFixed(1)) : null;
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      bio: visibility === "PUBLIC" ? profile.bio ?? null : null,
      preferredSports: visibility === "PUBLIC" ? profile.preferredSports ?? [] : [],
      skillLevels: visibility === "PUBLIC" ? profile.skillLevels ?? {} : {},
      homeLocation: profile.privacy?.showHomeArea ? profile.homeLocation ?? null : null,
      gamesPlayed: profile.privacy?.showGames === false ? null : gamesPlayed,
      reliabilityScore,
      reliabilitySampleSize: completedAttendance,
      ratingSummary,
      hostRating,
      visibility,
    };
  }

  async block(blockerId: string, blockedUserId: string) {
    if (blockerId === blockedUserId) throw new BadRequestException("You cannot block your own account");
    const [block] = await this.db.insert(userBlocks).values({ blockerId, blockedUserId }).onConflictDoNothing().returning();
    await this.db.delete(friendships).where(or(
      and(eq(friendships.requesterId, blockerId), eq(friendships.addresseeId, blockedUserId)),
      and(eq(friendships.requesterId, blockedUserId), eq(friendships.addresseeId, blockerId)),
    ));
    return block ?? { blockerId, blockedUserId };
  }

  async unblock(blockerId: string, blockedUserId: string) {
    await this.db.delete(userBlocks).where(and(eq(userBlocks.blockerId, blockerId), eq(userBlocks.blockedUserId, blockedUserId)));
  }

  async requestFriend(requesterId: string, email: string) {
    const recipient = await this.findByEmail(email.trim().toLowerCase());
    if (!recipient) throw new NotFoundException("No Playmate account was found for that email");
    if (recipient.id === requesterId) throw new BadRequestException("You cannot add yourself as a playpal");
    const [blocked] = await this.db.select().from(userBlocks).where(or(
      and(eq(userBlocks.blockerId, requesterId), eq(userBlocks.blockedUserId, recipient.id)),
      and(eq(userBlocks.blockerId, recipient.id), eq(userBlocks.blockedUserId, requesterId)),
    )).limit(1);
    if (blocked) throw new BadRequestException("A player block prevents this friend request");
    const [existing] = await this.db.select().from(friendships).where(or(
      and(eq(friendships.requesterId, requesterId), eq(friendships.addresseeId, recipient.id)),
      and(eq(friendships.requesterId, recipient.id), eq(friendships.addresseeId, requesterId)),
    )).limit(1);
    if (existing?.status === "ACCEPTED") throw new ConflictException("You are already playpals");
    if (existing?.status === "PENDING") throw new ConflictException("A friend request is already pending");
    if (existing) {
      const [updated] = await this.db.update(friendships).set({ requesterId, addresseeId: recipient.id, status: "PENDING", updatedAt: new Date() }).where(eq(friendships.id, existing.id)).returning();
      if (!updated) throw new ConflictException("Could not restore the declined friend request");
      return { id: updated.id, status: updated.status, player: this.publicPlayer(recipient) };
    }
    const [created] = await this.db.insert(friendships).values({ requesterId, addresseeId: recipient.id }).returning();
    if (!created) throw new ConflictException("Could not send the friend request");
    return { id: created.id, status: created.status, player: this.publicPlayer(recipient) };
  }

  async friendRequests(userId: string) {
    const [incomingRows, outgoingRows] = await Promise.all([
      this.db.select().from(friendships).where(and(eq(friendships.addresseeId, userId), eq(friendships.status, "PENDING"))),
      this.db.select().from(friendships).where(and(eq(friendships.requesterId, userId), eq(friendships.status, "PENDING"))),
    ]);
    const playerIds = [...incomingRows.map((row) => row.requesterId), ...outgoingRows.map((row) => row.addresseeId)];
    const players = playerIds.length ? await this.db.select().from(users).where(inArray(users.id, playerIds)) : [];
    const byId = new Map(players.map((player) => [player.id, this.publicPlayer(player)]));
    return {
      incoming: incomingRows.map((row) => ({ id: row.id, createdAt: row.createdAt, player: byId.get(row.requesterId) })),
      outgoing: outgoingRows.map((row) => ({ id: row.id, createdAt: row.createdAt, player: byId.get(row.addresseeId) })),
    };
  }

  async respondFriendRequest(userId: string, requestId: string, accept: boolean) {
    const [updated] = await this.db.update(friendships).set({ status: accept ? "ACCEPTED" : "DECLINED", updatedAt: new Date() })
      .where(and(eq(friendships.id, requestId), eq(friendships.addresseeId, userId), eq(friendships.status, "PENDING"))).returning();
    if (!updated) throw new NotFoundException("Friend request not found");
    return updated;
  }

  async friends(userId: string) {
    const relations = await this.db.select().from(friendships).where(and(
      eq(friendships.status, "ACCEPTED"),
      or(eq(friendships.requesterId, userId), eq(friendships.addresseeId, userId)),
    ));
    const friendIds = relations.map((row) => row.requesterId === userId ? row.addresseeId : row.requesterId);
    if (!friendIds.length) return [];
    const players = await this.db.select().from(users).where(inArray(users.id, friendIds));
    return players.map((player) => this.publicPlayer(player));
  }

  async removeFriend(userId: string, friendId: string) {
    await this.db.delete(friendships).where(and(
      eq(friendships.status, "ACCEPTED"),
      or(
        and(eq(friendships.requesterId, userId), eq(friendships.addresseeId, friendId)),
        and(eq(friendships.requesterId, friendId), eq(friendships.addresseeId, userId)),
      ),
    ));
  }

  private publicPlayer(player: typeof users.$inferSelect) {
    return { id: player.id, firstName: player.firstName, lastName: player.lastName, avatarUrl: player.avatarUrl };
  }

  async listGroups(userId: string) {
    const memberships = await this.db.select().from(groupMembers).where(eq(groupMembers.userId, userId));
    const groupIds = memberships.map(({ groupId }) => groupId);
    if (!groupIds.length) return [];
    const groups = await this.db.select().from(playerGroups).where(inArray(playerGroups.id, groupIds));
    const membershipByGroup = new Map(memberships.map((membership) => [membership.groupId, membership]));
    return groups.map((group) => ({ ...group, membership: membershipByGroup.get(group.id) }));
  }

  async createGroup(userId: string, input: { name: string; rules?: string; photoUrl?: string }) {
    return this.db.transaction(async (tx) => {
      const [group] = await tx.insert(playerGroups).values({ name: input.name.trim(), rules: input.rules?.trim() || null, photoUrl: input.photoUrl ?? null, createdBy: userId }).returning();
      if (!group) throw new BadRequestException("Could not create group");
      await tx.insert(groupMembers).values({ groupId: group.id, userId, role: "ADMIN" });
      return { ...group, membership: { role: "ADMIN" } };
    });
  }

  async addGroupMember(actorId: string, groupId: string, friendId: string) {
    const [admin] = await this.db.select().from(groupMembers).where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, actorId), eq(groupMembers.role, "ADMIN"))).limit(1);
    if (!admin) throw new BadRequestException("Only group admins can add members");
    const [friendship] = await this.db.select().from(friendships).where(and(eq(friendships.status, "ACCEPTED"), or(
      and(eq(friendships.requesterId, actorId), eq(friendships.addresseeId, friendId)),
      and(eq(friendships.requesterId, friendId), eq(friendships.addresseeId, actorId)),
    ))).limit(1);
    if (!friendship) throw new BadRequestException("Groups can only include your accepted playpals");
    const [member] = await this.db.insert(groupMembers).values({ groupId, userId: friendId }).onConflictDoNothing().returning();
    return member ?? { groupId, userId: friendId, role: "MEMBER" };
  }

  async groupMessagesFor(userId: string, groupId: string) {
    await this.requireGroupMember(userId, groupId);
    return this.db.select().from(groupMessages).where(eq(groupMessages.groupId, groupId)).orderBy(desc(groupMessages.createdAt)).limit(100);
  }

  async sendGroupMessage(userId: string, groupId: string, body: string) {
    const membership = await this.requireGroupMember(userId, groupId);
    if (membership.isMuted) throw new BadRequestException("You are muted in this group");
    const [created] = await this.db.insert(groupMessages).values({ groupId, senderId: userId, body: body.trim() }).returning();
    if (!created) throw new BadRequestException("Could not send message");
    return created;
  }

  async leaveGroup(userId: string, groupId: string) {
    const [membership] = await this.db.select().from(groupMembers).where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId))).limit(1);
    if (!membership) throw new NotFoundException("Group membership not found");
    if (membership.role === "ADMIN") {
      const [successor] = await this.db.select().from(groupMembers).where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.role, "MEMBER"))).limit(1);
      if (successor) await this.db.update(groupMembers).set({ role: "ADMIN" }).where(eq(groupMembers.id, successor.id));
      else await this.db.delete(playerGroups).where(eq(playerGroups.id, groupId));
    }
    await this.db.delete(groupMembers).where(eq(groupMembers.id, membership.id));
  }

  private async requireGroupMember(userId: string, groupId: string) {
    const [membership] = await this.db.select().from(groupMembers).where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId))).limit(1);
    if (!membership) throw new NotFoundException("Group not found");
    return membership;
  }

  async remove(id: string) {
    const [user] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!user) throw new NotFoundException("User not found");

    const { error: authError } = await this.supabase.admin.auth.admin.deleteUser(id);
    if (authError) throw new BadRequestException("Could not delete the authentication account");

    // Preserve booking/order/payment history for accounting and dispute handling,
    // while removing direct profile data from the application database.
    const [anonymized] = await this.db.update(users).set({
      email: `deleted+${id}@account.invalid`,
      firstName: "Deleted",
      lastName: "Player",
      phone: null,
      avatarUrl: null,
      profile: {},
      updatedAt: new Date(),
    }).where(eq(users.id, id)).returning();
    if (!anonymized) throw new BadRequestException("The account was removed but its profile could not be anonymized");
    return anonymized;
  }
}
