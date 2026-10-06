import { Global, Module } from "@nestjs/common";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getConfig } from "@playmate/config";
import * as schema from "./schema";

export const DRIZZLE_DB = Symbol("DRIZZLE_DB");
export type DrizzleDb = PostgresJsDatabase<typeof schema>;

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE_DB,
      useFactory: async (): Promise<DrizzleDb> => {
        const config = getConfig();
        const queryClient = postgres(config.DATABASE_URL, { prepare: false });
        return drizzle(queryClient, { schema });
      },
    },
  ],
  exports: [DRIZZLE_DB],
})
export class DatabaseModule {}
