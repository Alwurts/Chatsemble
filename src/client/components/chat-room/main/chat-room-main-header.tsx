import {
	AppHeader,
	AppHeaderIcon,
	AppHeaderSeparator,
} from "@client/components/layout/app-header";
import { useOrganizationConnectionContext } from "@client/components/providers/organization-connection-provider";
import { Button } from "@client/components/ui/button";
import { Skeleton } from "@client/components/ui/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@client/components/ui/tooltip";
import { cn } from "@client/lib/utils";
import { Calendar, MessagesSquare, Users, FileText } from "lucide-react";
import { type Dispatch, type SetStateAction, useState } from "react";
import {
	ChatDetailsDialog,
	type ChatDetailsDialogOpen,
} from "../details/chat-details-dialog";

export function ChatRoomMainHeader() {
	const [openChatDetailsDialog, setOpenChatDetailsDialog] =
		useState<ChatDetailsDialogOpen>(null);

	const {
		mainChatRoomState: { status },
		connectionStatus,
	} = useOrganizationConnectionContext();

	return (
		<AppHeader>
			<AppHeaderIcon className="hidden md:flex">
				<MessagesSquare />
			</AppHeaderIcon>
			<AppHeaderSeparator className="hidden md:block" />
			{connectionStatus === "connected" && status === "success" ? (
				<>
					<ChatRoomName setOpenChatDetailsDialog={setOpenChatDetailsDialog} />
					<div className="ml-auto flex items-center">
						<ChatRoomMembers
							setOpenChatDetailsDialog={setOpenChatDetailsDialog}
						/>
						<AppHeaderSeparator />
						<ChatRoomWorkflows
							setOpenChatDetailsDialog={setOpenChatDetailsDialog}
							className="hidden md:flex"
						/>
						<AppHeaderSeparator />
						<ChatRoomDocuments
							setOpenChatDetailsDialog={setOpenChatDetailsDialog}
							className="hidden md:flex"
						/>
						<AppHeaderSeparator />
						<ChatRoomConnectionStatus />
					</div>
					<ChatDetailsDialog
						open={openChatDetailsDialog}
						onOpenChange={setOpenChatDetailsDialog}
					/>
				</>
			) : (
				<>
					<Skeleton className="ml-2 h-4 w-28" />
					<Skeleton className="ml-auto h-4 w-28" />
				</>
			)}
		</AppHeader>
	);
}

function ChatRoomName({
	setOpenChatDetailsDialog,
}: {
	setOpenChatDetailsDialog: Dispatch<SetStateAction<ChatDetailsDialogOpen>>;
}) {
	const {
		mainChatRoomState: { room },
	} = useOrganizationConnectionContext();

	return (
		<Button
			variant="ghost"
			size="sm"
			className="text-base h-7"
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

function ChatRoomMembers({
	setOpenChatDetailsDialog,
}: {
	setOpenChatDetailsDialog: Dispatch<SetStateAction<ChatDetailsDialogOpen>>;
}) {
	const {
		mainChatRoomState: { members },
	} = useOrganizationConnectionContext();

	return (
		<Button
			variant="ghost"
			size="sm"
			className="gap-2 h-7"
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

function ChatRoomWorkflows({
	setOpenChatDetailsDialog,
	className,
}: {
	setOpenChatDetailsDialog: Dispatch<SetStateAction<ChatDetailsDialogOpen>>;
	className?: string;
}) {
	const {
		mainChatRoomState: { workflows },
	} = useOrganizationConnectionContext();

	return (
		<Button
			variant="ghost"
			size="sm"
			className={cn("gap-2 h-7", className)}
			onClick={() =>
				setOpenChatDetailsDialog({
					view: "workflows",
				})
			}
		>
			<Calendar className="h-4 w-4" />
			<span>{workflows.filter((workflow) => workflow.isActive).length}</span>
			<span className="sr-only">Workflows</span>
		</Button>
	);
}

function ChatRoomDocuments({
	setOpenChatDetailsDialog,
	className,
}: {
	setOpenChatDetailsDialog: Dispatch<SetStateAction<ChatDetailsDialogOpen>>;
	className?: string;
}) {
	const {
		mainChatRoomState: { documents },
	} = useOrganizationConnectionContext();

	return (
		<Button
			variant="ghost"
			size="sm"
			className={cn("gap-2 h-7", className)}
			onClick={() =>
				setOpenChatDetailsDialog({
					view: "documents",
				})
			}
		>
			<FileText className="h-4 w-4" />
			<span>{documents.length}</span>
			<span className="sr-only">Documents</span>
		</Button>
	);
}

function ChatRoomConnectionStatus() {
	const { connectionStatus } = useOrganizationConnectionContext();

	return (
		<Tooltip>
			<TooltipTrigger>
				<div
					className={cn("h-2 w-2 rounded-full transition-colors", {
						"bg-green-500": connectionStatus === "connected",
						"bg-yellow-500": connectionStatus === "connecting",
						"bg-orange-500": connectionStatus === "disconnected",
					})}
				/>
			</TooltipTrigger>
			<TooltipContent side="bottom">
				<p className="capitalize">{connectionStatus}</p>
			</TooltipContent>
		</Tooltip>
	);
}
