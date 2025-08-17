import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { createAgentsService } from "./agents";
import { createChatRoomService } from "./chat-room";
import { createChatRoomMemberService } from "./chat-room-members";
import { createChatRoomMessageService } from "./chat-room-message";
import { createDocumentService } from "./document";
import { createMCPServerService } from "./mcp-server";
import { createWorkflowService } from "./workflow";

export function createChatRoomDbServices(db: DrizzleSqliteDODatabase) {
	const chatRoomService = createChatRoomService(db);
	const chatRoomMessageService = createChatRoomMessageService(db);
	const chatRoomMemberService = createChatRoomMemberService(db);
	const agentsService = createAgentsService(db);
	const workflowService = createWorkflowService(db);
	const documentService = createDocumentService(db);
	const mcpServerService = createMCPServerService(db);

	return {
		...chatRoomService,
		...chatRoomMessageService,
		...chatRoomMemberService,
		...agentsService,
		...workflowService,
		...documentService,
		...mcpServerService,
	};
}

export type ChatRoomDbServices = ReturnType<typeof createChatRoomDbServices>;
