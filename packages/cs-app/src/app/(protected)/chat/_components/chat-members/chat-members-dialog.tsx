import { AddMemberForm } from "@/app/(protected)/chat/_components/chat-members/add-member-form";
import { ChatMembersList } from "@/app/(protected)/chat/_components/chat-members/chat-members-list";
import { useChatWsContext } from "@/app/(protected)/chat/_components/chat-main/chat-ws-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Users } from "lucide-react";
import { useState } from "react";

type DialogView = "members" | "add";

interface ChatMembersDialogProps {
	roomId: string;
}

export function ChatMembersDialog({ roomId }: ChatMembersDialogProps) {
	const [open, setOpen] = useState(false);
	const { members } = useChatWsContext();

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="ghost" size="sm" className="gap-2">
					<Users className="h-4 w-4" />
					<span>{members.length} Members</span>
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[500px]">
				<ChatMembersDialogContent roomId={roomId} />
			</DialogContent>
		</Dialog>
	);
}

function ChatMembersDialogContent({ roomId }: ChatMembersDialogProps) {
	const { members } = useChatWsContext();
	const [view, setView] = useState<DialogView>("members");

	if (view === "members") {
		return (
			<ChatMembersList members={members} onAddMember={() => setView("add")} />
		);
	}

	return (
		<AddMemberForm
			roomId={roomId}
			onBack={() => setView("members")}
			onSuccess={() => setView("members")}
		/>
	);
}
