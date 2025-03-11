"use client";

import {
	ChatInput,
	ChatInputSubmit,
	ChatInputTiptap,
} from "@/components/ui/tiptap-chat-input";
import {
	ChatMessage,
	ChatMessageAvatar,
	ChatMessageContent,
	ChatMessageContentArea,
	ChatMessageMetadata,
} from "@/components/ui/chat-message";
import { ChatMessageArea } from "@/components/ui/chat-message-area";
import { SidebarContent, SidebarHeader } from "@/components/ui/sidebar";
import { SidebarRight } from "@/components/ui/sidebar-right";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo } from "react";
import { useChatWsContext } from "../chat-main/chat-ws-provider";
import type { User } from "better-auth";

export function ChatRoomThreadSidebar({
	user,
	roomId,
	threadId,
}: { user: User; roomId: string | null; threadId: number | null }) {
	return (
		<SidebarRight>
			{!!roomId && !!threadId && (
				<ChatRoomThreadSidebarContent
					user={user}
					roomId={roomId}
					threadId={threadId}
				/>
			)}
		</SidebarRight>
	);
}

export function ChatRoomThreadSidebarContent({
	user,
	threadId,
}: { user: User; roomId: string; threadId: number }) {
	const { activeThread, handleSubmit, connectionStatus, members } =
		useChatWsContext();

	const isLoading =
		connectionStatus !== "ready" || activeThread.status !== "success";

	const membersWithoutCurrentUser = useMemo(
		() => members.filter((member) => member.id !== user.id),
		[members, user.id],
	);

	//console.log("activeThread", activeThread);

	return (
		<SidebarRight>
			<SidebarHeader className="flex h-16 items-center justify-between border-b px-4">
				<div className="flex flex-col">
					<div className="font-medium">Thread</div>
					<div className="text-xs text-muted-foreground">
						{activeThread.messages.length} messages
					</div>
				</div>
			</SidebarHeader>

			<SidebarContent className="flex-1 flex flex-col h-full overflow-y-auto">
				<ChatMessageArea scrollButtonAlignment="center">
					<div className="w-full p-8 space-y-4">
						{isLoading ? (
							<ChatMessageSkeleton />
						) : activeThread.messages.length > 0 ? (
							activeThread.messages.map((message) => (
								<ChatMessage key={String(message.id)} id={String(message.id)}>
									<ChatMessageAvatar
										imageSrc={message.user.image ?? undefined}
									/>
									<ChatMessageContentArea>
										<ChatMessageMetadata
											username={message.user.name}
											createdAt={message.createdAt}
										/>
										<ChatMessageContent content={message.content} />
									</ChatMessageContentArea>
								</ChatMessage>
							))
						) : (
							<div className="text-center text-sm text-muted-foreground">
								No messages yet
							</div>
						)}
					</div>
				</ChatMessageArea>
				<div className="px-2 py-4 max-w-2xl mx-auto w-full">
					<ChatInput
						onSubmit={(value) => {
							handleSubmit({
								value,
								parentId: threadId,
							});
						}}
						chatMembers={membersWithoutCurrentUser}
						disabled={isLoading}
					>
						<ChatInputTiptap />
						<ChatInputSubmit />
					</ChatInput>
				</div>
			</SidebarContent>
		</SidebarRight>
	);
}

function ChatMessageSkeleton() {
	return (
		<>
			{[1, 2, 3].map((i) => (
				<div key={i} className="flex space-x-3">
					<Skeleton className="h-10 w-10 rounded-full" />
					<div className="space-y-2 flex-1">
						<Skeleton className="h-4 w-[200px]" />
						<Skeleton className="h-4 w-[300px]" />
						<Skeleton className="h-4 w-[250px]" />
					</div>
				</div>
			))}
		</>
	);
}
