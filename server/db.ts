import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@shared/schema";
import { dbUrl } from "./config";

export const pool = new Pool({ connectionString: dbUrl });

export const db = drizzle(pool, { schema });
