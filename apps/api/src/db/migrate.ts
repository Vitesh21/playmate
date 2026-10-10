import * as path from "path";
import { config as loadDotenv } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { getConfig } from "@playmate/config";

loadDotenv({ path: path.resolve(__dirname, "../../../../.env") });
loadDotenv({ path: path.resolve(__dirname, "../../.env") });

async function runMigrations() {
  const config = getConfig();
  const migrationClient = postgres(config.DATABASE_URL, { max: 1 });
  const db = drizzle(migrationClient);

  console.log("Running migrations...");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrations completed successfully.");
  await migrationClient.end();
  process.exit(0);
}

runMigrations().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
