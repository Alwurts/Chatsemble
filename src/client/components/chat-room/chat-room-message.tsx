import {
	ChatMessage,
	ChatMessageAvatar,
	ChatMessageContent,
	ChatMessageContentArea,
	ChatMessageMetadata,
} from "@client/components/ui/chat-message";
import { Skeleton } from "@client/components/ui/skeleton";

import { AnnotatedTool } from "@client/components/tools/annotated-tool";
import {
	ToolInvocation,
	ToolInvocationArgs,
	ToolInvocationContent,
	ToolInvocationHeader,
	ToolInvocationName,
	ToolInvocationResult,
} from "@client/components/ui/tool-invocation";
import type { ChatRoomMessage as ChatRoomMessageType } from "@shared/types";
import { CreateDocumentTool } from "../tools/create-document-tool";
import { ScheduledWorkflowTool } from "../tools/scheduled-workflow-tool";
import { ToolInvocationSourcesList } from "../tools/sources-tool";
import { Separator } from "../ui/separator";

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

	return (
		<ChatMessage key={String(message.id)} id={String(message.id)}>
			{actionArea}
			<ChatMessageAvatar imageSrc={message.member.image ?? undefined} />
			<ChatMessageContentArea>
				<ChatMessageMetadata
					username={message.member.name}
					createdAt={message.createdAt}
				/>
				<ChatMessageContent content={message.content}>
					{message.toolUses.map((toolUse) => {
						if (
							toolUse.toolName === "deepResearch" ||
							toolUse.toolName === "webCrawl" ||
							toolUse.toolName === "webSearch"
						) {
							let titleCall = "Running tool";
							let titleResult = "Tool completed";
							switch (toolUse.toolName) {
								case "deepResearch":
									titleCall = "Deep Research";
									titleResult = "Deep Research Completed";
									break;
								case "webCrawl":
									titleCall = "Web Crawl";
									titleResult = "Web Crawl Completed";
									break;
								case "webSearch":
									titleCall = "Web Search";
									titleResult = "Web Search Completed";
									break;
							}
							return (
								<div className="flex flex-col gap-3">
									<AnnotatedTool
										key={toolUse.toolCallId}
										toolUse={toolUse}
										titleCall={titleCall}
										titleResult={titleResult}
									/>

									{toolUse.type === "tool-result" &&
										toolUse.result &&
										"sources" in toolUse.result &&
										toolUse.result.sources.length > 0 && (
											<>
												<Separator />
												<ToolInvocationSourcesList
													sources={toolUse.result.sources}
													maxVisible={5}
													maxHeight="10rem"
												/>
											</>
										)}
								</div>
							);
						}

						if (toolUse.toolName === "scheduleWorkflow") {
							return <ScheduledWorkflowTool toolUse={toolUse} />;
						}

						if (toolUse.toolName === "createDocument") {
							return <CreateDocumentTool toolUse={toolUse} />;
						}

						return (
							<ToolInvocation key={toolUse.toolCallId}>
								<ToolInvocationHeader>
									<ToolInvocationName
										name={`Used ${toolUse.toolName}`}
										type={toolUse.type}
									/>
								</ToolInvocationHeader>
								<ToolInvocationContent>
									{toolUse.args && <ToolInvocationArgs args={toolUse.args} />}
									{toolUse.type === "tool-result" && toolUse.result && (
										<ToolInvocationResult result={toolUse.result} />
									)}
								</ToolInvocationContent>
							</ToolInvocation>
						);
					})}
					{threadAreaComponent}
				</ChatMessageContent>
			</ChatMessageContentArea>
		</ChatMessage>
	);
}

export function ChatMessagesSkeleton({ items = 3 }: { items?: number }) {
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
