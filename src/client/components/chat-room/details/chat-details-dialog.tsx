import { useOrganizationConnectionContext } from "@client/components/providers/organization-connection-provider";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@client/components/ui/dialog";
import { Skeleton } from "@client/components/ui/skeleton";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@client/components/ui/tabs";
import { Calendar, FileText, Info, UserPlus } from "lucide-react";
import { ChatDetailsDocumentsSection } from "./chat-details-documents-section";
import { ChatDetailsMembersSection } from "./chat-details-members-section";
import { ChatDetailsSection } from "./chat-details-section";
import { ChatDetailsWorkflowsSection } from "./chat-details-workflows-section";

type ChatDetailsDialogView = "details" | "members" | "workflows" | "documents";

export type ChatDetailsDialogOpen = {
	view: ChatDetailsDialogView;
} | null;

interface ChatDetailsDialogProps {
	open: ChatDetailsDialogOpen;
	onOpenChange: (open: ChatDetailsDialogOpen) => void;
}

export function ChatDetailsDialog({
	open,
	onOpenChange,
}: ChatDetailsDialogProps) {
	const {
		mainChatRoomState: { status },
	} = useOrganizationConnectionContext();
	return (
		<Dialog
			open={!!open}
			onOpenChange={(open) => {
				if (!open) {
					onOpenChange(null);
				}
			}}
		>
			<DialogContent className="max-w-[94vw] max-h-[95vh] rounded-lg sm:max-w-lg 2xl:max-w-2xl h-full sm:max-h-[70vh] flex flex-col p-0">
				<DialogHeader className="p-4">
					<DialogTitle>Chat Details</DialogTitle>
					<DialogDescription>
						Manage your chat room settings and members
					</DialogDescription>
				</DialogHeader>
				{open && status === "success" ? (
					<ChatDetailsDialogContent open={open} onOpenChange={onOpenChange} />
				) : (
					<ChatDetailsDialogContentSkeleton />
				)}
			</DialogContent>
		</Dialog>
	);
}

function ChatDetailsDialogContentSkeleton() {
	return (
		<div className="w-full h-full flex flex-col gap-4">
			<Skeleton className="h-10 w-full" />
			<Skeleton className="h-10 w-full" />
			<Skeleton className="h-10 w-full" />
			<Skeleton className="h-36 w-full" />
		</div>
	);
}

function ChatDetailsDialogContent({
	open,
}: ChatDetailsDialogProps & {
	open: NonNullable<ChatDetailsDialogProps["open"]>;
}) {
	return (
		<Tabs
			defaultValue={open.view}
			className="w-full flex-1 flex flex-col overflow-hidden"
		>
			<div className="px-4">
				<TabsList className="grid w-full grid-cols-4">
					<TabsTrigger value="details" className="flex items-center gap-2">
						<Info className="h-4 w-4" />
						Details
					</TabsTrigger>
					<TabsTrigger value="members" className="flex items-center gap-2">
						<UserPlus className="h-4 w-4" />
						Members
					</TabsTrigger>
					<TabsTrigger value="workflows" className="flex items-center gap-2">
						<Calendar className="h-4 w-4" />
						Workflows
					</TabsTrigger>
					<TabsTrigger value="documents" className="flex items-center gap-2">
						<FileText className="h-4 w-4" />
						Documents
					</TabsTrigger>
				</TabsList>
			</div>
			<TabsContent value="details" className="flex-1 p-4">
				<ChatDetailsSection />
			</TabsContent>
			<TabsContent value="members" className="flex-1 p-4">
				<ChatDetailsMembersSection />
			</TabsContent>
			<TabsContent value="workflows" className="flex-1 overflow-y-auto">
				<ChatDetailsWorkflowsSection />
			</TabsContent>
			<TabsContent value="documents" className="flex-1 overflow-y-auto">
				<ChatDetailsDocumentsSection />
			</TabsContent>
		</Tabs>
	);
}
