import { env } from "cloudflare:workers";
import * as schema from "@server/db/schema";
import { drizzle } from "drizzle-orm/d1";

export const db = drizzle(env.DB, { schema: schema, logger: true });
