import { ChatRoomTypeBadge } from "@client/components/chat-room/common/chat-room-type-badge";
import { useOrganizationConnectionContext } from "@client/components/providers/organization-connection-provider";
import { Separator } from "@client/components/ui/separator";
import { CalendarIcon, UsersIcon } from "lucide-react";

export function ChatDetailsSection() {
	const {
		mainChatRoomState: { room, members },
	} = useOrganizationConnectionContext();

	if (!room) {
		return null;
	}

	return (
		<div className="h-full border rounded-lg p-4 space-y-4">
			<div className="space-y-2">
				<h3 className="text-xl font-semibold tracking-tight">{room.name}</h3>
				<ChatRoomTypeBadge type={room.type} />
			</div>

			<Separator />

			<div className="space-y-3 text-sm">
				<div className="flex items-center gap-3">
					<div className="bg-muted/50 rounded-lg p-2">
						<CalendarIcon className="h-5 w-5" />
					</div>
					<div>
						<p className="text-muted-foreground">Created</p>
						<p className="font-medium">
							{new Date(room.createdAt).toLocaleDateString("en-US", {
								year: "numeric",
								month: "long",
								day: "numeric",
							})}
						</p>
					</div>
				</div>

				<div className="flex items-center gap-3">
					<div className="bg-muted/50 rounded-lg p-2">
						<UsersIcon className="h-5 w-5" />
					</div>
					<div>
						<p className="text-muted-foreground">Members</p>
						<p className="font-medium">{members.length || 0}</p>
					</div>
				</div>
			</div>
		</div>
	);
}
