"use client";

import {
	ChatMessageSkeleton,
	ChatMessagesSkeleton,
	ChatRoomMessage,
} from "@client/components/chat-room/chat-room-message";
import { useAuthSession } from "@client/components/providers/auth-provider";
import { useOrganizationConnectionContext } from "@client/components/providers/organization-connection-provider";
import { ChatMessageArea } from "@client/components/ui/chat-message-area";
import { Separator } from "@client/components/ui/separator";
import {
	ChatInput,
	ChatInputSubmit,
	ChatInputTiptap,
} from "@client/components/ui/tiptap-chat-input";
import type { ChatInputValue } from "@shared/types";
import { useMemo } from "react";

export function ChatRoomThreadDisplay() {
	const {
		mainChatRoomState: { members },
		chatRoomThreadState: { handleSubmit, messages, status, threadMessage },
		connectionStatus,
	} = useOrganizationConnectionContext();

	const { user } = useAuthSession();

	const isLoading = connectionStatus !== "connected" || status !== "success";

	const membersWithoutCurrentUser = useMemo(
		() => members.filter((member) => member.id !== user.id),
		[members, user.id],
	);

	const onSubmit = (value: ChatInputValue) => {
		handleSubmit({ value });
	};

	return (
		<div className="flex-1 flex flex-col overflow-y-auto">
			<ChatMessageArea
				scrollButtonAlignment="center"
				className="overflow-y-auto flex-1"
			>
				<div className="max-w-2xl mx-auto w-full px-8 py-8">
					<div>
						{threadMessage ? (
							<ChatRoomMessage message={threadMessage} />
						) : (
							isLoading && <ChatMessageSkeleton />
						)}
					</div>
					<Separator className="mt-3 mb-6" />
					<div className="space-y-4">
						{isLoading ? (
							<ChatMessagesSkeleton items={2} />
						) : messages.length > 0 ? (
							messages.map((message) => (
								<ChatRoomMessage key={String(message.id)} message={message} />
							))
						) : (
							<div className="text-center text-sm text-muted-foreground">
								Send a message to start the thread
							</div>
						)}
					</div>
				</div>
			</ChatMessageArea>
			<div className="p-4 max-w-2xl mx-auto w-full">
				<ChatInput
					onSubmit={onSubmit}
					chatMembers={membersWithoutCurrentUser}
					disabled={isLoading}
				>
					<ChatInputTiptap />
					<ChatInputSubmit />
				</ChatInput>
			</div>
		</div>
	);
}
