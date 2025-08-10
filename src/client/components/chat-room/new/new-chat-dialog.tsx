import { NewChatRoomGroupForm } from "@client/components/chat-room/new/new-chat-room-group";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@client/components/ui/dialog";
import { honoClient } from "@client/lib/api-client";
import type { ChatRoomType, createChatRoomSchema } from "@shared/types";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import type { Dispatch, SetStateAction } from "react";
import { toast } from "sonner";
import type { z } from "zod";

type CreateChatRoomFormValues = z.infer<typeof createChatRoomSchema>;

export type NewChatDialogState = {
	type: ChatRoomType;
} | null;

type NewGroupChatDialogProps = {
	dialogState: NewChatDialogState;
	setDialogState: Dispatch<SetStateAction<NewChatDialogState>>;
};

export function NewChatRoomDialog({
	dialogState,
	setDialogState,
}: NewGroupChatDialogProps) {
	return (
		<Dialog
			open={!!dialogState}
			onOpenChange={(open) => {
				if (!open) {
					setDialogState(null);
				}
			}}
		>
			<DialogContent className="sm:max-w-[500px]">
				{dialogState && (
					<NewChatRoomDialogContent
						dialogState={dialogState}
						setDialogState={setDialogState}
					/>
				)}
			</DialogContent>
		</Dialog>
	);
}

function NewChatRoomDialogContent({
	dialogState,
	setDialogState,
}: NewGroupChatDialogProps & {
	dialogState: NonNullable<NewChatDialogState>;
}) {
	const router = useRouter();

	const createChatMutation = useMutation({
		mutationFn: async (values: CreateChatRoomFormValues) => {
			const response = await honoClient.api.chat["chat-rooms"].$post({
				json: values,
			});
			const data = await response.json();
			if ("error" in data) {
				throw new Error(data.error);
			}
			return data;
		},
		onSuccess: (data) => {
			router.navigate({
				to: "/chat",
				search: { roomId: data.roomId },
			});
			setDialogState(null);
			toast.success("Chat room created successfully");
		},
		onError: (error) => {
			console.error(error);
			toast.error("Failed to create chat room");
		},
	});

	const onSubmit = (values: CreateChatRoomFormValues) => {
		createChatMutation.mutate(values);
	};

	return (
		<>
			<DialogHeader>
				<DialogTitle>Create New Chat Room</DialogTitle>
				<DialogDescription>
					Create a new chat room to start conversations with your team.
				</DialogDescription>
			</DialogHeader>

			<NewChatRoomGroupForm
				onSubmit={onSubmit}
				groupChatType={dialogState.type}
				isPending={createChatMutation.isPending}
			/>
		</>
	);
}
