import { ChatRoomNotSelected } from "@client/components/chat-room/chat-room-not-selected";
import { ChatRoomMainDisplay } from "@client/components/chat-room/main/chat-room-main-display";
import { ChatRoomMainHeader } from "@client/components/chat-room/main/chat-room-main-header";
import { ChatRoomThreadHeader } from "@client/components/chat-room/thread/chat-room-thread-header";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@client/components/ui/resizable";
import { useSearch } from "@tanstack/react-router";
import { ChatRoomThreadDisplay } from "./thread/chat-room-thread-display";

export function ChatRoom() {
	const { roomId, threadId } = useSearch({ strict: false });

	if (!roomId) {
		return <ChatRoomNotSelected />;
	}

	return (
		<ResizablePanelGroup direction="horizontal">
			<ResizablePanel
				id="main-panel"
				order={1}
				defaultSize={threadId ? 50 : 100}
				minSize={35}
			>
				<div className="flex-1 flex flex-col h-full">
					<ChatRoomMainHeader />
					<ChatRoomMainDisplay />
				</div>
			</ResizablePanel>
			{threadId && <ResizableHandle className="bg-transparent" />}
			{threadId && (
				<ResizablePanel
					id="thread-panel"
					order={2}
					defaultSize={50}
					minSize={35}
				>
					<div className="flex-1 flex flex-col h-full border-border border-l rounded-l-xl shadow">
						<ChatRoomThreadHeader />
						<ChatRoomThreadDisplay />
					</div>
				</ResizablePanel>
			)}
		</ResizablePanelGroup>
	);
}
