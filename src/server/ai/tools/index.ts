import type { UIMessageStreamWriter } from "ai";
import { createMessageThreadTool } from "./create-thread-tool";
import { webSearchTool } from "./web-search-tool";

// export type AgentToolSet = {
// 	"web-search": ReturnType<typeof webSearchTool>;
// 	"create-message-thread": ReturnType<typeof createMessageThreadTool>;
// };

export const getAgentTools = (
	uiStreamWriter: UIMessageStreamWriter,
	// TODO: Add removeTools to the tools
) => {
	return {
		"web-search": webSearchTool(uiStreamWriter),
		"create-message-thread": createMessageThreadTool(),
	};
};

export type AgentToolSet = ReturnType<typeof getAgentTools>;

// export const agentToolSetKeys: (keyof AgentToolSet)[] = [
// 	"web-search",
// 	"create-message-thread",
// ];
