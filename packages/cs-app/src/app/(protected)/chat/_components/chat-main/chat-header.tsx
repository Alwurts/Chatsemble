import { useChatWsContext } from "@/app/(protected)/chat/_components/chat-main/chat-ws-provider";

import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ChatDetailsDialog } from "./chat-details/chat-details-dialog";
import type { ChatDetailsDialogOpen } from "./chat-details/chat-details-dialog";
import { type SetStateAction, type Dispatch, useState } from "react";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";

export function ChatHeader() {
	const [openChatDetailsDialog, setOpenChatDetailsDialog] =
		useState<ChatDetailsDialogOpen>(null);

	return (
		<header className="sticky top-0 flex shrink-0 items-center gap-2 border-b bg-background p-4">
			<SidebarTrigger className="-ml-1" />
			<Separator orientation="vertical" className="-mr-1 ml-1 h-4" />
			<ChatName setOpenChatDetailsDialog={setOpenChatDetailsDialog} />
			<div className="ml-auto flex items-center gap-2">
				<ChatMembers setOpenChatDetailsDialog={setOpenChatDetailsDialog} />
				<WsConnectionStatus />
			</div>
			<ChatDetailsDialog
				open={openChatDetailsDialog}
				onOpenChange={setOpenChatDetailsDialog}
			/>
		</header>
	);
}

function ChatName({
	setOpenChatDetailsDialog,
}: {
	setOpenChatDetailsDialog: Dispatch<SetStateAction<ChatDetailsDialogOpen>>;
}) {
	const { room } = useChatWsContext();

	return (
		<Button
			variant="ghost"
			className="text-base"
			onClick={() =>
				setOpenChatDetailsDialog({
					view: "details",
				})
			}
		>
			{room?.name}
		</Button>
	);
}

function ChatMembers({
	setOpenChatDetailsDialog,
}: {
	setOpenChatDetailsDialog: Dispatch<SetStateAction<ChatDetailsDialogOpen>>;
}) {
	const { members } = useChatWsContext();

	return (
		<Button
			variant="ghost"
			size="sm"
			className="gap-2"
			onClick={() =>
				setOpenChatDetailsDialog({
					view: "members",
				})
			}
		>
			<Users className="h-4 w-4" />
			<span>{members.length} Members</span>
		</Button>
	);
}

function WsConnectionStatus() {
	const { connectionStatus } = useChatWsContext();

	return (
		<Tooltip>
			<TooltipTrigger>
				<div
					className={cn("h-2 w-2 rounded-full transition-colors", {
						"bg-green-500": connectionStatus === "ready",
						"bg-yellow-500": connectionStatus === "connected",
						"bg-orange-500": connectionStatus === "connecting",
						"bg-gray-600": connectionStatus === "disconnected",
					})}
				/>
			</TooltipTrigger>
			<TooltipContent side="bottom">
				<p className="capitalize">{connectionStatus}</p>
			</TooltipContent>
		</Tooltip>
	);
}
