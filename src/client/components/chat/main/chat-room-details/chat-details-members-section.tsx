import { ChatMemberList } from "@/components/chat-member/chat-member-list";
import { useChatWsContext } from "@/components/chat/providers/chat-ws-provider";

export function ChatDetailsMembersSection() {
	const {
		mainChat: { members },
	} = useChatWsContext();

	// TODO: Show or hide the add and remove member button based on the user's permissions

	return <ChatMemberList members={members} showRemoveButton={true} />;
}
