import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "@/lib/env";

const client = postgres(env.POSTGRES_URL_NON_POOLING, { max: 1 });
export const db = drizzle(client);

// Use this type for functions that accept either db or a transaction object
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
