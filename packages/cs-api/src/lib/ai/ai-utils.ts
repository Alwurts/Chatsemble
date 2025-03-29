import {
	createChatRoomMessagePartial,
	type AgentToolUse,
	type ChatRoomMessage,
	type ChatRoomMessagePartial,
} from "@/cs-shared";
import type { CoreMessage } from "ai";
import type { AgentMessage } from "@/cs-shared";

export function chatRoomMessagesToAgentMessages(
	messages: ChatRoomMessage[],
): AgentMessage[] {
	const aiMessages: AgentMessage[] = messages.map((msg) => {
		return {
			content: msg.content,
			toolUses: msg.toolUses,
			member: {
				id: msg.member.id,
				name: msg.member.name,
				type: msg.member.type,
			},
		};
	});

	return aiMessages;
}

export function agentMessagesToContextCoreMessages(
	contextMessages: ChatRoomMessage[],
	newMessages: ChatRoomMessage[],
): CoreMessage[] {
	const agentMessagesContext = chatRoomMessagesToAgentMessages(contextMessages);
	const agentMessagesNew = chatRoomMessagesToAgentMessages(newMessages);
	return [
		{
			role: "system",
			content: `
			<conversation_history_context>
			${JSON.stringify(agentMessagesContext)}
			</conversation_history_context>
			`,
		},
		{
			role: "user",
			content: `
			<new_messages_to_process>
			${JSON.stringify(agentMessagesNew)}
			</new_messages_to_process>
			`,
		},
	];
}

const dataStreamTypes = {
	f: "step-start",
	0: "text-delta",
	g: "reasoning-part",
	h: "source-part",
	k: "file-part",
	2: "data-part",
	8: "message-annotation-part",
	9: "tool-call",
	a: "tool-result",
	e: "step-finish",
	d: "finish",
	3: "error",
} as const;

export async function processDataStream({
	response,
	getThreadId,
	omitSendingTool,
	onMessageSend,
}: {
	response: Response;
	getThreadId: () => number | null;
	omitSendingTool: string[];
	onMessageSend: ({
		newMessagePartial,
		existingMessageId,
	}: {
		newMessagePartial: ChatRoomMessagePartial;
		existingMessageId?: number | null;
	}) => Promise<ChatRoomMessage>;
}) {
	const streamedMessages: Omit<ChatRoomMessage, "member">[] = [];
	const decoder = new TextDecoder();

	// @ts-ignore
	// biome-ignore lint/style/noNonNullAssertion: Response body is guaranteed to exist
	for await (const chunk of response.body!) {
		const text = decoder.decode(chunk).trim();

		const type = dataStreamTypes[text[0] as keyof typeof dataStreamTypes];
		if (!type) {
			continue;
		}

		const parsedData = JSON.parse(text.slice(2));

		const currentThreadId = getThreadId();
		console.log("[processDataStream] ", {
			currentThreadId,
			type,
			parsedData: JSON.stringify(parsedData, null, 2),
		});

		switch (type) {
			case "step-start": {
				const newPartialMessage = createChatRoomMessagePartial({
					content: "",
					toolUses: [],
					mentions: [],
					threadId: currentThreadId,
				});
				streamedMessages.push({
					...newPartialMessage,
					threadMetadata: null,
					metadata: {
						optimisticData: {
							id: newPartialMessage.id,
							createdAt: newPartialMessage.createdAt,
						},
					},
				});
				break;
			}
			case "text-delta": {
				const currentMessage = streamedMessages[streamedMessages.length - 1];
				if (!currentMessage) {
					throw new Error("No current message found");
				}

				const haventSentCurrentMessage =
					currentMessage.id === currentMessage.metadata.optimisticData?.id;

				const newContent = currentMessage.content + parsedData;

				const newMessage = await onMessageSend({
					newMessagePartial: {
						id: currentMessage.id,
						mentions: currentMessage.mentions,
						content: newContent,
						toolUses: currentMessage.toolUses,
						threadId: currentThreadId,
						createdAt: currentMessage.createdAt,
					},
					existingMessageId: haventSentCurrentMessage
						? null
						: currentMessage.id,
				});

				streamedMessages[streamedMessages.length - 1] = newMessage;
				break;
			}
			case "tool-call":
			case "tool-result": {
				const dataObject = parsedData as
					| {
							toolCallId: string;
							toolName: string;
							args: Record<string, unknown>;
					  }
					| {
							toolCallId: string;
							result: Record<string, unknown>;
					  };

				const currentMessage = streamedMessages[streamedMessages.length - 1];
				if (!currentMessage) {
					throw new Error("No current message found");
				}

				const toolIsAlreadyInMessageIndex = currentMessage.toolUses.findIndex(
					(toolUse) => toolUse.toolCallId === dataObject.toolCallId,
				);
				const newToolUses = currentMessage.toolUses;

				let parsedToolUse: AgentToolUse | null = null;
				if (toolIsAlreadyInMessageIndex === -1) {
					if (type === "tool-call" && "toolName" in dataObject) {
						parsedToolUse = {
							type: type,
							toolCallId: dataObject.toolCallId,
							toolName: dataObject.toolName,
							args: dataObject.args,
						};
						newToolUses.push(parsedToolUse);
					}
				} else {
					const toolUseObject =
						currentMessage.toolUses[toolIsAlreadyInMessageIndex];

					parsedToolUse = {
						...toolUseObject,
						// biome-ignore lint/suspicious/noExplicitAny: <explanation>
						...(dataObject as any),
						type: type,
					};
					if (!parsedToolUse) {
						throw new Error("No parsedToolUse found");
					}
					newToolUses[toolIsAlreadyInMessageIndex] = parsedToolUse;
				}

				if (!parsedToolUse) {
					break;
				}

				if (omitSendingTool.includes(parsedToolUse.toolName)) {
					streamedMessages[streamedMessages.length - 1] = {
						...currentMessage,
						toolUses: newToolUses,
					};
					break;
				}

				const haventSentCurrentMessage =
					currentMessage.id === currentMessage.metadata.optimisticData?.id;

				const newMessage = await onMessageSend({
					newMessagePartial: {
						id: currentMessage.id,
						mentions: currentMessage.mentions,
						content: currentMessage.content,
						toolUses: newToolUses,
						threadId: currentThreadId,
						createdAt: currentMessage.createdAt,
					},
					existingMessageId: haventSentCurrentMessage
						? null
						: currentMessage.id,
				});

				streamedMessages[streamedMessages.length - 1] = newMessage;
				break;
			}
			/* case "step-finish": {
				console.log("[processDataStream] Step finished", streamedMessages);
				break;
			} */
			case "finish": {
				console.log("[processDataStream] Stream finished", streamedMessages);
				break;
			}
			case "error": {
				console.error("[processDataStream] Stream error", parsedData);
				break;
			}
		}
	}

	response.body?.cancel();

	return streamedMessages;
}
