import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq, gte, lte, notInArray, or } from "drizzle-orm";
import { DRIZZLE_DB, type DrizzleDb } from "@/db/database.module";
import { gameInvites, gameParticipants, games } from "@/db/schema/games";
import { userBlocks, users } from "@/db/schema/users";
import type { GameCreateInput, GameSearchInput } from "@playmate/validation";

@Injectable()
export class GamesService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDb) {}

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
    await this.db.insert(gameParticipants).values({ gameId: game.id, userId: hostId, status: "APPROVED" });
    return game;
  }

  async createInvite(inviterId: string, gameId: string, inviteeId: string, message?: string | null) {
    if (inviterId === inviteeId) throw new BadRequestException("You cannot invite yourself");
    return this.db.transaction(async (tx) => {
      const [game] = await tx.select().from(games).where(eq(games.id, gameId)).for("update").limit(1);
      if (!game) throw new NotFoundException("Game not found");
      if (game.hostId !== inviterId) throw new ForbiddenException("Only the host can invite players");
      if (game.visibility !== "PRIVATE") throw new BadRequestException("Invites are for private games");
      if (game.status === "CANCELLED" || game.status === "COMPLETED") throw new BadRequestException("This game is no longer active");
      const [target] = await tx.select({ id: users.id }).from(users).where(eq(users.id, inviteeId)).limit(1);
      if (!target) throw new NotFoundException("Player not found");
      const [blocked] = await tx.select({ id: userBlocks.id }).from(userBlocks).where(and(
        eq(userBlocks.blockerId, inviterId), eq(userBlocks.blockedUserId, inviteeId),
      )).limit(1);
      const [blockedBy] = await tx.select({ id: userBlocks.id }).from(userBlocks).where(and(
        eq(userBlocks.blockerId, inviteeId), eq(userBlocks.blockedUserId, inviterId),
      )).limit(1);
      if (blocked || blockedBy) throw new ForbiddenException("You cannot invite a player who has blocked you or whom you have blocked");
      const [existing] = await tx.select().from(gameInvites).where(and(
        eq(gameInvites.gameId, gameId), eq(gameInvites.inviteeId, inviteeId),
      )).limit(1);
      if (existing?.status === "PENDING" || existing?.status === "ACCEPTED") {
        throw new ConflictException("This player already has an active invite");
      }
      if (existing) {
        const [updated] = await tx.update(gameInvites).set({ inviterId, message: message ?? null, status: "PENDING", updatedAt: new Date() })
          .where(eq(gameInvites.id, existing.id)).returning();
        return updated;
      }
      const [created] = await tx.insert(gameInvites).values({ gameId, inviterId, inviteeId, message: message ?? null }).returning();
      return created;
    });
  }

  async myInvites(userId: string) {
    return this.db.select({ invite: gameInvites, game: games })
      .from(gameInvites).innerJoin(games, eq(games.id, gameInvites.gameId))
      .where(eq(gameInvites.inviteeId, userId)).orderBy(desc(gameInvites.createdAt));
  }

  async decideInvite(inviteId: string, userId: string, accept: boolean) {
    return this.db.transaction(async (tx) => {
      const [invite] = await tx.select().from(gameInvites).where(eq(gameInvites.id, inviteId)).for("update").limit(1);
      if (!invite || invite.inviteeId !== userId) throw new NotFoundException("Invite not found");
      if (invite.status !== "PENDING") throw new ConflictException("This invite has already been handled");
      const [game] = await tx.select().from(games).where(eq(games.id, invite.gameId)).for("update").limit(1);
      if (!game || game.visibility !== "PRIVATE" || game.status === "CANCELLED" || game.status === "COMPLETED") {
        throw new ConflictException("This game is no longer available");
      }
      const [blocked] = await tx.select({ id: userBlocks.id }).from(userBlocks).where(and(
        eq(userBlocks.blockerId, userId), eq(userBlocks.blockedUserId, game.hostId),
      )).limit(1);
      const [blockedBy] = await tx.select({ id: userBlocks.id }).from(userBlocks).where(and(
        eq(userBlocks.blockerId, game.hostId), eq(userBlocks.blockedUserId, userId),
      )).limit(1);
      if (blocked || blockedBy) throw new ForbiddenException("You cannot join this game because one player has blocked the other");

      let participant;
      if (accept) {
        const [existing] = await tx.select().from(gameParticipants).where(and(
          eq(gameParticipants.gameId, game.id), eq(gameParticipants.userId, userId),
        )).limit(1);
        if (existing?.status === "APPROVED") throw new ConflictException("You have already joined this game");
        const approved = await tx.select({ id: gameParticipants.id }).from(gameParticipants).where(and(
          eq(gameParticipants.gameId, game.id), eq(gameParticipants.status, "APPROVED"),
        )).limit(game.maxPlayers);
        const status = approved.length >= game.maxPlayers ? "WAITLISTED" : "APPROVED";
        [participant] = existing
          ? await tx.update(gameParticipants).set({ status, updatedAt: new Date() }).where(eq(gameParticipants.id, existing.id)).returning()
          : await tx.insert(gameParticipants).values({ gameId: game.id, userId, status }).returning();
        if (status === "APPROVED" && approved.length + 1 >= game.maxPlayers) {
          await tx.update(games).set({ status: "FULL", updatedAt: new Date() }).where(eq(games.id, game.id));
        }
      }
      const [updatedInvite] = await tx.update(gameInvites).set({ status: accept ? "ACCEPTED" : "DECLINED", updatedAt: new Date() })
        .where(eq(gameInvites.id, invite.id)).returning();
      return { invite: updatedInvite, participant: participant ?? null };
    });
  }

  async join(gameId: string, userId: string, message?: string) {
    return this.db.transaction(async (tx) => {
      const [game] = await tx.select().from(games).where(eq(games.id, gameId)).for("update").limit(1);
      if (!game || (game.status !== "OPEN" && game.status !== "FULL")) throw new NotFoundException("This game is no longer open to join");
      const blocked = await tx.select().from(userBlocks).where(and(eq(userBlocks.blockedUserId, game.hostId), eq(userBlocks.blockerId, userId))).limit(1);
      const hostBlockedPlayer = await tx.select().from(userBlocks).where(and(eq(userBlocks.blockedUserId, userId), eq(userBlocks.blockerId, game.hostId))).limit(1);
      if (blocked.length || hostBlockedPlayer.length) throw new ForbiddenException("You cannot join this game because one player has blocked the other");
      if (game.visibility === "PRIVATE") throw new ForbiddenException("This game is invite only");
      if (game.hostId === userId) throw new BadRequestException("You are already hosting this game");
      const [existing] = await tx.select().from(gameParticipants).where(and(eq(gameParticipants.gameId, gameId), eq(gameParticipants.userId, userId))).limit(1);
      if (existing && existing.status !== "LEFT" && existing.status !== "DECLINED") throw new BadRequestException("You already have a request for this game");
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
    if (game.hostId !== userId) throw new ForbiddenException("Only the host can view join requests");
    return this.db.select({
      id: gameParticipants.id, gameId: gameParticipants.gameId, userId: gameParticipants.userId,
      status: gameParticipants.status, message: gameParticipants.message,
      createdAt: gameParticipants.createdAt, updatedAt: gameParticipants.updatedAt,
      player: { firstName: users.firstName, lastName: users.lastName, avatarUrl: users.avatarUrl, reliabilityScore: users.reliabilityScore, profile: users.profile },
    }).from(gameParticipants).innerJoin(users, eq(users.id, gameParticipants.userId)).where(eq(gameParticipants.gameId, gameId));
  }

  async decide(gameId: string, participantId: string, userId: string, approve: boolean) {
    return this.db.transaction(async (tx) => {
      const [game] = await tx.select().from(games).where(eq(games.id, gameId)).for("update").limit(1);
      if (!game) throw new NotFoundException("Game not found");
      if (game.hostId !== userId) throw new ForbiddenException("Only the host can manage join requests");
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

  async leave(gameId: string, userId: string) {
    return this.db.transaction(async (tx) => {
      const [game] = await tx.select().from(games).where(eq(games.id, gameId)).for("update").limit(1);
      if (!game) throw new NotFoundException("Game not found");
      if (game.hostId === userId) throw new BadRequestException("As the host, cancel the game to notify everyone.");
      const [existing] = await tx.select().from(gameParticipants).where(and(eq(gameParticipants.gameId, gameId), eq(gameParticipants.userId, userId))).limit(1);
      if (!existing || existing.status === "LEFT" || existing.status === "DECLINED") throw new NotFoundException("Game participation not found");
      const [participant] = await tx.update(gameParticipants).set({ status: "LEFT", updatedAt: new Date() }).where(eq(gameParticipants.id, existing.id)).returning();
      if (!participant) throw new NotFoundException("Game participation not found");
      if (existing.status === "APPROVED" && game.status === "FULL") {
        const [next] = await tx.select().from(gameParticipants).where(and(eq(gameParticipants.gameId, gameId), eq(gameParticipants.status, "WAITLISTED"))).orderBy(gameParticipants.createdAt).limit(1);
        if (next) await tx.update(gameParticipants).set({ status: "APPROVED", updatedAt: new Date() }).where(eq(gameParticipants.id, next.id));
        else await tx.update(games).set({ status: "OPEN", updatedAt: new Date() }).where(eq(games.id, gameId));
      }
      return participant;
    });
  }
}
