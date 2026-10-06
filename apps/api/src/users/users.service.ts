import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DRIZZLE_DB, type DrizzleDb } from "@/db/database.module";
import { users, type NewUser } from "@/db/schema/users";
import type { UserUpdateInput } from "@playmate/validation";

@Injectable()
export class UsersService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDb) {}

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

  async upsertByAuth(authUser: { id: string; email?: string; user_metadata?: Record<string, any> }) {
    const existing = await this.findById(authUser.id).catch(() => null);
    if (existing) return existing;

    const newUser: NewUser = {
      id: authUser.id,
      email: authUser.email ?? null,
      firstName: authUser.user_metadata?.firstName ?? null,
      lastName: authUser.user_metadata?.lastName ?? null,
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

  async remove(id: string) {
    const [deleted] = await this.db.delete(users).where(eq(users.id, id)).returning();
    if (!deleted) throw new NotFoundException("User not found");
    return deleted;
  }
}
