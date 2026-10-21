import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

function createDatabase() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is missing. Add it to site/.env.local to use the database.");
  }

  return drizzle({ client: neon(connectionString), schema });
}

type Database = ReturnType<typeof createDatabase>;
let database: Database | undefined;

export function getDatabase() {
  return (database ??= createDatabase());
}
