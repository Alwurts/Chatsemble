// packages/cs-api/src/durable-objects/agent/agentDbOperations.ts
import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { createAgentConfigService } from "./agent-config";

export function createAgentDbServices(
	db: DrizzleSqliteDODatabase,
	agentId: string,
) {
	const agentConfigOps = createAgentConfigService(db, agentId);

	return {
		...agentConfigOps,
	};
}
