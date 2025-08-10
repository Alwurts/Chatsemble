import {
	ChatMessage,
	ChatMessageAvatar,
	ChatMessageContent,
	ChatMessageContentArea,
	ChatMessageMetadata,
} from "@client/components/ui/chat-message";
import { Skeleton } from "@client/components/ui/skeleton";
import { cn } from "@client/lib/utils";
import type { ChatRoomMessage as ChatRoomMessageType } from "@shared/types";
import type { ToolUIPart } from "ai";
import { CollapsibleRawData } from "../tools/collapslble-raw-data";

export function ChatRoomMessage({
	message,
	actionArea,
	threadArea,
}: {
	message: ChatRoomMessageType;
	actionArea?: React.ReactNode;
	threadArea?: (
		message: ChatRoomMessageType,
		threadMetadata: NonNullable<ChatRoomMessageType["threadMetadata"]>,
	) => React.ReactNode;
}) {
	const threadAreaComponent =
		threadArea && message.threadMetadata
			? threadArea(message, message.threadMetadata)
			: null;

	const isLoading = message.status === "pending";

	return (
		<ChatMessage
			key={String(message.id)}
			id={String(message.id)}
			className={cn(isLoading && "animate-pulse")}
		>
			{actionArea}
			<ChatMessageAvatar imageSrc={message.member.image ?? undefined} />
			<ChatMessageContentArea>
				<ChatMessageMetadata
					username={message.member.name}
					createdAt={message.createdAt}
				/>
				{message.parts.map((part, index) => {
					if (part.type === "text") {
						// biome-ignore lint/suspicious/noArrayIndexKey: It's ok to use index as key here
						return <ChatMessageContent key={index} content={part.text} />;
					}

					if (
						part.type === "tool-create-message-thread" &&
						part.input &&
						typeof part.input === "object" &&
						"message" in part.input &&
						typeof part.input.message === "string"
					) {
						return (
							<ChatMessageContent
								key={part.toolCallId}
								content={part.input.message}
							/>
						);
					}

					if (part.type.startsWith("tool-")) {
						const toolCall = part as ToolUIPart;
						const toolResult = toolCall.output;
						console.log("[formulateResponseX] tool result", toolResult);

						return (
							<CollapsibleRawData
								key={toolCall.toolCallId}
								toolUse={toolCall}
							/>
						);
					}
				})}
				{threadAreaComponent}
			</ChatMessageContentArea>
		</ChatMessage>
	);
}

export function ChatMessagesSkeleton({ items = 3 }: { items?: number }) {
	// TODO: Add a skeleton for pending ai messages, add a status to message
	return (
		<>
			{[...Array(items)].map((_, i) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
				<ChatMessageSkeleton key={i} />
			))}
		</>
	);
}

export function ChatMessageSkeleton() {
	return (
		<div className="flex gap-4 w-full">
			<Skeleton className="h-8 w-8 rounded-full shrink-0" />
			<div className="flex-1 flex flex-col gap-4">
				<div className="flex gap-2">
					<Skeleton className="h-4 w-[100px]" />
					<Skeleton className="h-4 w-[60px]" />
				</div>
				<div className="space-y-2 flex-1">
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-10/12" />
				</div>
			</div>
		</div>
	);
}
