import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq, gte, inArray, lte, notInArray, or } from "drizzle-orm";
import { DRIZZLE_DB, type DrizzleDb } from "@/db/database.module";
import { gameInvites, gameParticipants, gameRatings, games } from "@/db/schema/games";
import { friendships, userBlocks, users } from "@/db/schema/users";
import { bookings } from "@/db/schema/bookings";
import { courtSlots } from "@/db/schema/court-slots";
import type { GameCreateInput, GameRatingCreateInput, GameSearchInput } from "@playmate/validation";
import { UsersService } from "@/users/users.service";

export function hasTimeConflict(start: Date, end: Date, existing: Array<{ startsAt: Date; endsAt: Date }>) {
  return existing.some((event) => start < event.endsAt && end > event.startsAt);
}

@Injectable()
export class GamesService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDb, private readonly usersService: UsersService) {}

  async search(filters: GameSearchInput, viewerId: string) {
    const conditions = [
      eq(games.visibility, "PUBLIC"),
      or(eq(games.status, "OPEN"), eq(games.status, "FULL"))!,
      gte(games.startsAt, new Date()),
    ];
    if (filters.sportId) conditions.push(eq(games.sportId, filters.sportId));
    if (filters.from) conditions.push(gte(games.startsAt, new Date(filters.from)));
    if (filters.to) conditions.push(lte(games.startsAt, new Date(filters.to)));
    const blockedUsers = await this.db.select({ id: userBlocks.blockedUserId }).from(userBlocks).where(eq(userBlocks.blockerId, viewerId));
    if (blockedUsers.length) conditions.push(notInArray(games.hostId, blockedUsers.map((item) => item.id)));
    return this.db.select().from(games).where(and(...conditions)).orderBy(games.startsAt).limit(100);
  }

  async mine(userId: string) {
    const hosted = await this.db.select().from(games).where(eq(games.hostId, userId)).orderBy(desc(games.startsAt));
    const joined = await this.db.select({ game: games, participation: gameParticipants }).from(gameParticipants)
      .innerJoin(games, eq(games.id, gameParticipants.gameId))
      .where(eq(gameParticipants.userId, userId)).orderBy(desc(games.startsAt));
    return { hosted, joined };
  }

  async create(hostId: string, input: GameCreateInput) {
    if (new Date(input.endsAt) <= new Date(input.startsAt)) throw new BadRequestException("Game end must be after it starts");
    const [game] = await this.db.insert(games).values({ ...input, hostId, startsAt: new Date(input.startsAt), endsAt: new Date(input.endsAt) }).returning();
    if (!game) throw new BadRequestException("Could not create game");
    await this.db.insert(gameParticipants).values({ gameId: game.id, userId: hostId, status: "APPROVED", role: "HOST" });
    return game;
  }

  async createInvite(inviterId: string, gameId: string, inviteeId: string, message?: string | null) {
    if (inviterId === inviteeId) throw new BadRequestException("You cannot invite yourself");
    return this.db.transaction(async (tx) => {
      const [game] = await tx.select().from(games).where(eq(games.id, gameId)).for("update").limit(1);
      if (!game || game.status === "CANCELLED" || game.status === "COMPLETED") throw new NotFoundException("Game not found or closed");
      if (game.hostId !== inviterId) throw new ForbiddenException("Only the host can invite players");
      const [target] = await tx.select({ id: users.id }).from(users).where(eq(users.id, inviteeId)).limit(1);
      if (!target) throw new NotFoundException("Player not found");
      const [friendship] = await tx.select().from(friendships).where(and(
        eq(friendships.status, "ACCEPTED"),
        or(
          and(eq(friendships.requesterId, inviterId), eq(friendships.addresseeId, inviteeId)),
          and(eq(friendships.requesterId, inviteeId), eq(friendships.addresseeId, inviterId)),
        ),
      )).limit(1);
      if (!friendship) throw new ForbiddenException("You can invite Playpals only");
      const [blocked] = await tx.select().from(userBlocks).where(or(
        and(eq(userBlocks.blockerId, inviterId), eq(userBlocks.blockedUserId, inviteeId)),
        and(eq(userBlocks.blockerId, inviteeId), eq(userBlocks.blockedUserId, inviterId)),
      )).limit(1);
      if (blocked) throw new ForbiddenException("An invite cannot be sent because one player has blocked the other");
      const [existing] = await tx.select().from(gameInvites).where(and(eq(gameInvites.gameId, gameId), eq(gameInvites.inviteeId, inviteeId))).limit(1);
      if (existing?.status === "PENDING" || existing?.status === "ACCEPTED") throw new ConflictException("This player already has an active invite");
      if (existing) {
        const [updated] = await tx.update(gameInvites).set({ inviterId, message: message ?? null, status: "PENDING", updatedAt: new Date() }).where(eq(gameInvites.id, existing.id)).returning();
        return updated;
      }
      const [created] = await tx.insert(gameInvites).values({ gameId, inviterId, inviteeId, message: message ?? null }).returning();
      return created;
    });
  }

  async invite(gameId: string, inviterId: string, inviteeId: string, message?: string | null) {
    return this.createInvite(inviterId, gameId, inviteeId, message);
  }

  async myInvites(userId: string) {
    return this.db.select({ invite: gameInvites, game: games }).from(gameInvites)
      .innerJoin(games, eq(games.id, gameInvites.gameId))
      .where(and(eq(gameInvites.inviteeId, userId), eq(gameInvites.status, "PENDING")))
      .orderBy(desc(gameInvites.createdAt));
  }

  async decideInvite(inviteId: string, userId: string, accept: boolean) {
    return this.db.transaction(async (tx) => {
      const [invite] = await tx.select().from(gameInvites).where(and(eq(gameInvites.id, inviteId), eq(gameInvites.inviteeId, userId))).for("update").limit(1);
      if (!invite || invite.status !== "PENDING") throw new NotFoundException("Pending game invite not found");
      const [game] = await tx.select().from(games).where(eq(games.id, invite.gameId)).for("update").limit(1);
      if (!game || game.status === "CANCELLED" || game.status === "COMPLETED" || game.startsAt <= new Date()) throw new BadRequestException("This game is no longer available");
      if (accept) {
        const [blocked] = await tx.select().from(userBlocks).where(or(
          and(eq(userBlocks.blockerId, userId), eq(userBlocks.blockedUserId, game.hostId)),
          and(eq(userBlocks.blockerId, game.hostId), eq(userBlocks.blockedUserId, userId)),
        )).limit(1);
        if (blocked) throw new ForbiddenException("You cannot join because one player has blocked the other");
        const [existing] = await tx.select().from(gameParticipants).where(and(eq(gameParticipants.gameId, game.id), eq(gameParticipants.userId, userId))).limit(1);
        const approved = await tx.select().from(gameParticipants).where(and(eq(gameParticipants.gameId, game.id), eq(gameParticipants.status, "APPROVED"))).limit(game.maxPlayers);
        const full = game.status === "FULL" || approved.length >= game.maxPlayers;
        const participantStatus = full ? "WAITLISTED" : "APPROVED";
        if (existing && !["LEFT", "DECLINED"].includes(existing.status)) throw new ConflictException("You already have a place or request for this game");
        const [participant] = existing
          ? await tx.update(gameParticipants).set({ status: participantStatus, updatedAt: new Date() }).where(eq(gameParticipants.id, existing.id)).returning()
          : await tx.insert(gameParticipants).values({ gameId: game.id, userId, status: participantStatus }).returning();
        if (!full && approved.length + 1 >= game.maxPlayers) await tx.update(games).set({ status: "FULL", updatedAt: new Date() }).where(eq(games.id, game.id));
        const [updatedInvite] = await tx.update(gameInvites).set({ status: "ACCEPTED", updatedAt: new Date() }).where(eq(gameInvites.id, invite.id)).returning();
        return { invite: updatedInvite, participant: participant ?? null };
      }
      const [updated] = await tx.update(gameInvites).set({ status: accept ? "ACCEPTED" : "DECLINED", updatedAt: new Date() }).where(eq(gameInvites.id, invite.id)).returning();
      return { invite: updated, participant: null };
    });
  }

  async join(gameId: string, userId: string, message?: string) {
    return this.db.transaction(async (tx) => {
      const [game] = await tx.select().from(games).where(eq(games.id, gameId)).for("update").limit(1);
      if (!game || (game.status !== "OPEN" && game.status !== "FULL")) throw new NotFoundException("This game is no longer open to join");
      const blocked = await tx.select().from(userBlocks).where(and(
        eq(userBlocks.blockedUserId, game.hostId),
        eq(userBlocks.blockerId, userId),
      )).limit(1);
      const hostBlockedPlayer = await tx.select().from(userBlocks).where(and(
        eq(userBlocks.blockedUserId, userId),
        eq(userBlocks.blockerId, game.hostId),
      )).limit(1);
      if (blocked.length || hostBlockedPlayer.length) throw new ForbiddenException("You cannot join this game because one player has blocked the other");
      if (game.visibility === "PRIVATE") throw new ForbiddenException("This game is invite only");
      if (game.hostId === userId) throw new BadRequestException("You are already hosting this game");
      const [existing] = await tx.select().from(gameParticipants).where(and(eq(gameParticipants.gameId, gameId), eq(gameParticipants.userId, userId))).limit(1);
      if (existing && existing.status !== "LEFT" && existing.status !== "DECLINED") throw new BadRequestException("You already have a request for this game");
      const hostedGames = await tx.select().from(games).where(and(eq(games.hostId, userId), or(eq(games.status, "OPEN"), eq(games.status, "FULL"))!));
      const participations = await tx.select().from(gameParticipants).where(and(
        eq(gameParticipants.userId, userId),
        or(eq(gameParticipants.status, "APPROVED"), eq(gameParticipants.status, "REQUESTED"))!,
      ));
      const participatedGameIds = participations.map(({ gameId: joinedGameId }) => joinedGameId).filter((joinedGameId) => joinedGameId !== gameId);
      const participatedGames = participatedGameIds.length
        ? await tx.select().from(games).where(and(inArray(games.id, participatedGameIds), or(eq(games.status, "OPEN"), eq(games.status, "FULL"))!))
        : [];
      const confirmedBookings = await tx.select({ date: courtSlots.date, startTime: courtSlots.startTime, endTime: courtSlots.endTime })
        .from(bookings)
        .innerJoin(courtSlots, eq(courtSlots.id, bookings.courtSlotId))
        .where(and(eq(bookings.userId, userId), eq(bookings.status, "CONFIRMED")));
      const bookingEvents = confirmedBookings.map(({ date, startTime, endTime }) => ({
        startsAt: new Date(`${date}T${startTime}:00+05:30`),
        endsAt: new Date(`${date}T${endTime}:00+05:30`),
      }));
      if (hasTimeConflict(game.startsAt, game.endsAt, [...hostedGames, ...participatedGames, ...bookingEvents])) {
        throw new ConflictException("This game overlaps with another game on your calendar");
      }
      const approved = await tx.select().from(gameParticipants).where(and(eq(gameParticipants.gameId, gameId), eq(gameParticipants.status, "APPROVED"))).limit(game.maxPlayers);
      const isFull = game.status === "FULL" || approved.length >= game.maxPlayers;
      const status = isFull ? "WAITLISTED" : game.instantJoin ? "APPROVED" : "REQUESTED";
      const [participant] = existing
        ? await tx.update(gameParticipants).set({ status, message: message ?? null, updatedAt: new Date() }).where(eq(gameParticipants.id, existing.id)).returning()
        : await tx.insert(gameParticipants).values({ gameId, userId, status, message }).returning();
      if (!isFull && status === "APPROVED" && approved.length + 1 >= game.maxPlayers) {
        await tx.update(games).set({ status: "FULL", updatedAt: new Date() }).where(eq(games.id, gameId));
      }
      return participant;
    });
  }

  async participants(gameId: string, userId: string) {
    const [game] = await this.db.select().from(games).where(eq(games.id, gameId)).limit(1);
    if (!game) throw new NotFoundException("Game not found");
    if (game.hostId !== userId) {
      const [cohost] = await this.db.select().from(gameParticipants).where(and(eq(gameParticipants.gameId, gameId), eq(gameParticipants.userId, userId), eq(gameParticipants.role, "COHOST"), eq(gameParticipants.status, "APPROVED"))).limit(1);
      if (!cohost) throw new ForbiddenException("Only the host and co-host can view join requests");
    }
    const rows = await this.db.select({
      id: gameParticipants.id,
      gameId: gameParticipants.gameId,
      userId: gameParticipants.userId,
      status: gameParticipants.status,
      role: gameParticipants.role,
      attendance: gameParticipants.attendance,
      message: gameParticipants.message,
      createdAt: gameParticipants.createdAt,
      updatedAt: gameParticipants.updatedAt,
      player: {
        firstName: users.firstName,
        lastName: users.lastName,
        avatarUrl: users.avatarUrl,
      },
    }).from(gameParticipants)
      .innerJoin(users, eq(users.id, gameParticipants.userId))
      .where(eq(gameParticipants.gameId, gameId));
    return Promise.all(rows.map(async (row) => {
      if (row.status !== "REQUESTED") return row;
      const profile = await this.usersService.publicProfile(row.userId, userId).catch(() => null);
      if (!profile) return { ...row, player: { ...row.player, trust: null } };
      const profileSkillLevels = profile.skillLevels as Record<string, string>;
      return {
        ...row,
        player: {
          ...row.player,
          trust: {
            skillLevel: profileSkillLevels[game.sportId] ?? null,
            gamesPlayed: profile.gamesPlayed,
            reliabilityScore: profile.reliabilityScore,
            ratingSummary: profile.ratingSummary,
          },
        },
      };
    }));
  }

  async decide(gameId: string, participantId: string, userId: string, approve: boolean) {
    return this.db.transaction(async (tx) => {
      const [game] = await tx.select().from(games).where(eq(games.id, gameId)).for("update").limit(1);
      if (!game) throw new NotFoundException("Game not found");
      if (game.hostId !== userId) {
        const [cohost] = await tx.select().from(gameParticipants).where(and(eq(gameParticipants.gameId, gameId), eq(gameParticipants.userId, userId), eq(gameParticipants.role, "COHOST"), eq(gameParticipants.status, "APPROVED"))).limit(1);
        if (!cohost) throw new ForbiddenException("Only the host and co-host can manage join requests");
      }
      const [participant] = await tx.select().from(gameParticipants).where(and(eq(gameParticipants.id, participantId), eq(gameParticipants.gameId, gameId))).limit(1);
      if (!participant || participant.status !== "REQUESTED") throw new NotFoundException("Pending join request not found");
      if (approve) {
        const approved = await tx.select().from(gameParticipants).where(and(eq(gameParticipants.gameId, gameId), eq(gameParticipants.status, "APPROVED"))).limit(game.maxPlayers);
        if (approved.length >= game.maxPlayers) throw new BadRequestException("Game is full");
      }
      const [updated] = await tx.update(gameParticipants).set({ status: approve ? "APPROVED" : "DECLINED", updatedAt: new Date() }).where(eq(gameParticipants.id, participantId)).returning();
      if (approve) {
        const approved = await tx.select().from(gameParticipants).where(and(eq(gameParticipants.gameId, gameId), eq(gameParticipants.status, "APPROVED"))).limit(game.maxPlayers);
        if (approved.length >= game.maxPlayers) await tx.update(games).set({ status: "FULL", updatedAt: new Date() }).where(eq(games.id, gameId));
      }
      return updated;
    });
  }

  async makeCohost(gameId: string, participantId: string, hostId: string) {
    const [game] = await this.db.select().from(games).where(eq(games.id, gameId)).limit(1);
    if (!game) throw new NotFoundException("Game not found");
    if (game.hostId !== hostId) throw new ForbiddenException("Only the host can appoint a co-host");
    const [participant] = await this.db.select().from(gameParticipants).where(and(eq(gameParticipants.id, participantId), eq(gameParticipants.gameId, gameId))).limit(1);
    if (!participant || participant.status !== "APPROVED" || participant.role === "HOST") throw new BadRequestException("Choose an approved player to appoint as co-host");
    const [updated] = await this.db.update(gameParticipants).set({ role: "COHOST", updatedAt: new Date() }).where(eq(gameParticipants.id, participantId)).returning();
    return updated;
  }

  async markAttendance(gameId: string, participantId: string, actorId: string, present: boolean) {
    return this.db.transaction(async (tx) => {
      const [game] = await tx.select().from(games).where(eq(games.id, gameId)).for("update").limit(1);
      if (!game) throw new NotFoundException("Game not found");
      const [actor] = await tx.select().from(gameParticipants).where(and(eq(gameParticipants.gameId, gameId), eq(gameParticipants.userId, actorId), eq(gameParticipants.status, "APPROVED"))).limit(1);
      if (game.hostId !== actorId && actor?.role !== "COHOST") throw new ForbiddenException("Only the host or a co-host can record attendance");
      if (game.status === "CANCELLED" || game.status === "COMPLETED" || game.endsAt > new Date()) throw new BadRequestException("Attendance can be recorded after the game ends and before it is completed");
      const [participant] = await tx.select().from(gameParticipants).where(and(eq(gameParticipants.gameId, gameId), eq(gameParticipants.id, participantId), eq(gameParticipants.status, "APPROVED"))).limit(1);
      if (!participant) throw new NotFoundException("Approved game participant not found");
      const [updated] = await tx.update(gameParticipants).set({ attendance: present ? "PRESENT" : "NO_SHOW", updatedAt: new Date() }).where(eq(gameParticipants.id, participantId)).returning();
      return updated;
    });
  }

  async complete(gameId: string, hostId: string) {
    return this.db.transaction(async (tx) => {
      const [game] = await tx.select().from(games).where(eq(games.id, gameId)).for("update").limit(1);
      if (!game) throw new NotFoundException("Game not found");
      if (game.hostId !== hostId) throw new ForbiddenException("Only the host can complete the game");
      if (game.status === "CANCELLED") throw new BadRequestException("A cancelled game cannot be completed");
      if (game.endsAt > new Date()) throw new BadRequestException("A game can be completed after its scheduled end time");
      const participants = await tx.select().from(gameParticipants).where(and(eq(gameParticipants.gameId, gameId), eq(gameParticipants.status, "APPROVED")));
      if (participants.some((participant) => participant.attendance == null)) throw new BadRequestException("Record attendance for every approved player first");
      const [updated] = await tx.update(games).set({ status: "COMPLETED", updatedAt: new Date() }).where(eq(games.id, gameId)).returning();
      return updated;
    });
  }

  async ratePlayer(gameId: string, raterId: string, input: GameRatingCreateInput) {
    const [game] = await this.db.select().from(games).where(eq(games.id, gameId)).limit(1);
    if (!game || game.status !== "COMPLETED") throw new BadRequestException("You can rate players after the game is completed");
    if (new Date() > new Date(game.endsAt.getTime() + 48 * 60 * 60 * 1000)) throw new BadRequestException("The 48-hour rating window has closed");
    if (raterId === input.ratedUserId) throw new BadRequestException("You cannot rate yourself");
    const [rater] = await this.db.select().from(gameParticipants).where(and(eq(gameParticipants.gameId, gameId), eq(gameParticipants.userId, raterId), eq(gameParticipants.status, "APPROVED"), eq(gameParticipants.attendance, "PRESENT"))).limit(1);
    const [rated] = await this.db.select().from(gameParticipants).where(and(eq(gameParticipants.gameId, gameId), eq(gameParticipants.userId, input.ratedUserId), eq(gameParticipants.status, "APPROVED"), eq(gameParticipants.attendance, "PRESENT"))).limit(1);
    if (!rater || !rated) throw new ForbiddenException("Only players recorded as present can rate each other");
    if (input.ratedUserId === game.hostId && input.hostRating === undefined) throw new BadRequestException("Add a separate host rating for the game host");
    if (input.ratedUserId !== game.hostId && input.hostRating !== undefined) throw new BadRequestException("Host rating can only be submitted for the game host");
    const [existing] = await this.db.select().from(gameRatings).where(and(eq(gameRatings.gameId, gameId), eq(gameRatings.raterId, raterId), eq(gameRatings.ratedUserId, input.ratedUserId))).limit(1);
    if (existing) throw new ConflictException("You have already rated this player for this game");
    const [rating] = await this.db.insert(gameRatings).values({ ...input, gameId, raterId, comment: input.comment?.trim() || null }).onConflictDoNothing().returning();
    if (!rating) throw new ConflictException("You have already rated this player for this game");
    return rating;
  }

  async ratingCandidates(gameId: string, userId: string) {
    const [game] = await this.db.select().from(games).where(eq(games.id, gameId)).limit(1);
    if (!game || game.status !== "COMPLETED") throw new BadRequestException("Ratings are available after the game is completed");
    const [rater] = await this.db.select().from(gameParticipants).where(and(eq(gameParticipants.gameId, gameId), eq(gameParticipants.userId, userId), eq(gameParticipants.attendance, "PRESENT"))).limit(1);
    if (!rater) throw new ForbiddenException("Only players marked present can rate this game");
    const attendees = await this.db.select({ userId: gameParticipants.userId, firstName: users.firstName, lastName: users.lastName, avatarUrl: users.avatarUrl })
      .from(gameParticipants).innerJoin(users, eq(users.id, gameParticipants.userId))
      .where(and(eq(gameParticipants.gameId, gameId), eq(gameParticipants.status, "APPROVED"), eq(gameParticipants.attendance, "PRESENT")));
    const submitted = await this.db.select({ ratedUserId: gameRatings.ratedUserId }).from(gameRatings)
      .where(and(eq(gameRatings.gameId, gameId), eq(gameRatings.raterId, userId)));
    const ratedIds = new Set(submitted.map((rating) => rating.ratedUserId));
    return attendees.filter((attendee) => attendee.userId !== userId).map((attendee) => ({ ...attendee, isHost: attendee.userId === game.hostId, alreadyRated: ratedIds.has(attendee.userId) }));
  }

  async leave(gameId: string, userId: string) {
    return this.db.transaction(async (tx) => {
      const [game] = await tx.select().from(games).where(eq(games.id, gameId)).for("update").limit(1);
      if (!game) throw new NotFoundException("Game not found");
      if (game.hostId === userId) throw new BadRequestException("As the host, cancel the game to notify everyone.");
      const [existing] = await tx.select().from(gameParticipants)
        .where(and(eq(gameParticipants.gameId, gameId), eq(gameParticipants.userId, userId))).limit(1);
      if (!existing || existing.status === "LEFT" || existing.status === "DECLINED") {
        throw new NotFoundException("Game participation not found");
      }
      const [participant] = await tx.update(gameParticipants).set({ status: "LEFT", updatedAt: new Date() })
        .where(eq(gameParticipants.id, existing.id)).returning();
      if (!participant) throw new NotFoundException("Game participation not found");
      if (existing.status === "APPROVED" && game.status === "FULL") {
        const [next] = await tx.select().from(gameParticipants)
          .where(and(eq(gameParticipants.gameId, gameId), eq(gameParticipants.status, "WAITLISTED")))
          .orderBy(gameParticipants.createdAt).limit(1);
        if (next) {
          await tx.update(gameParticipants).set({ status: "APPROVED", updatedAt: new Date() }).where(eq(gameParticipants.id, next.id));
        } else {
          await tx.update(games).set({ status: "OPEN", updatedAt: new Date() }).where(eq(games.id, gameId));
        }
      }
      return participant;
    });
  }
}
