import type { Agent, ChatRoom, ChatRoomMessage } from "@/cs-shared";
import { chatRoomMessagesToAgentMessages } from "../ai-utils";

interface RouterPromptArgs {
	agents: Agent[];
	room: Pick<ChatRoom, "id" | "name" | "type">;
}

export function routeMessageToAgentSystemPrompt({
	agents,
	room,
}: RouterPromptArgs): string {
	const agentList = agents
		.map(
			(a) =>
				`- Agent ID: ${a.id}, Name: ${a.name}${a.description ? `, Description: ${a.description}` : ""}`,
		)
		.join("\n");

	return `You are an AI routing assistant for a chat application.
Your goal is to determine which agent(s), if any, should respond to the latest message(s) in a conversation.

You are in chat room "${room.name}" (ID: ${room.id}, Type: ${room.type}).

The available agents in this room are:
${agentList}

Evaluate the provided messages (including context and the latest message) and decide which agent ID(s) from the list above are the most relevant to respond.
- Consider the content of the messages, mentions, and the likely expertise or role implied by the agent's name or description (if provided).
- If a message explicitly mentions an agent, that agent should likely be chosen.
- If multiple agents seem relevant, you can include multiple IDs.
- If NO agent seems relevant or necessary to respond, return an empty list.
- Only return IDs from the provided list of available agents.
`;
}

export function routeMessageToAgentUserPrompt({
	newMessages,
	contextMessages,
}: {
	newMessages: ChatRoomMessage[];
	contextMessages: ChatRoomMessage[];
}): string {
	// Prepare JSON strings for context and new messages
	const contextMessagesJson = JSON.stringify(
		chatRoomMessagesToAgentMessages(contextMessages),
		null,
		2,
	);
	const newMessagesJson = JSON.stringify(
		chatRoomMessagesToAgentMessages(newMessages),
		null,
		2,
	);

	// Construct the prompt with clear instructions
	return `Evaluate the **new messages** below to decide which agent(s) (if any) should respond.
Use the **context messages** *only* for background understanding. Mentions or requests in the context messages should generally be ignored for routing unless directly relevant to the new messages.
The primary decision should be based on the content and potential agent mentions within the **new messages**.

Context Messages (for background understanding only):
${contextMessagesJson}

New Messages (Primary focus for routing decision):
${newMessagesJson}`;
}
