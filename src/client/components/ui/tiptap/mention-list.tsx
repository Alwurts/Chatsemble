import { ChatMemberBadge } from "@client/components/chat-room-member/chat-member-badge";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@client/components/ui/avatar";
import { Button } from "@client/components/ui/button";
import { cn } from "@client/lib/utils";
import type { ChatRoomMember } from "@shared/types";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import type { TiptapMentionItem } from "./tiptap";

interface MentionListProps {
	items: ChatRoomMember[];
	command: (item: TiptapMentionItem) => void;
}

interface MentionListRef {
	onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

export default forwardRef<MentionListRef, MentionListProps>((props, ref) => {
	const [selectedIndex, setSelectedIndex] = useState(0);

	const selectItem = (index: number) => {
		const item = props.items[index];

		if (item) {
			props.command({
				id: item.id,
				label: item.name,
			});
		}
	};

	const upHandler = () => {
		setSelectedIndex(
			(selectedIndex + props.items.length - 1) % props.items.length,
		);
	};

	const downHandler = () => {
		setSelectedIndex((selectedIndex + 1) % props.items.length);
	};

	const enterHandler = () => {
		selectItem(selectedIndex);
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: only depend on items change
	useEffect(() => setSelectedIndex(0), [props.items]);

	useImperativeHandle(ref, () => ({
		onKeyDown: ({ event }: { event: KeyboardEvent }) => {
			if (event.key === "ArrowUp") {
				upHandler();
				return true;
			}

			if (event.key === "ArrowDown") {
				downHandler();
				return true;
			}

			if (event.key === "Enter") {
				enterHandler();
				return true;
			}

			return false;
		},
	}));

	return (
		<div className="relative min-w-48 max-w-64 bg-popover text-popover-foreground border border-border rounded-lg shadow-md flex flex-col gap-1 overflow-auto p-1 ">
			{props.items.length ? (
				props.items.map((item, index) => (
					<Button
						key={item.id}
						variant="ghost"
						size="sm"
						className={cn(
							"flex flex-1 justify-between px-1 py-1 gap-2",
							selectedIndex === index && "bg-muted",
						)}
						onClick={() => selectItem(index)}
					>
						<div className="flex items-center gap-2">
							<Avatar className="h-6 w-6">
								<AvatarImage src={item.image ?? undefined} alt={item.name} />
								<AvatarFallback>
									{item.name[0]?.toUpperCase() ?? "?"}
								</AvatarFallback>
							</Avatar>
							<span
								className="text-sm font-medium truncate max-w-[120px]"
								title={item.name}
							>
								{item.name}
							</span>
						</div>
						<ChatMemberBadge type={item.type} />
					</Button>
				))
			) : (
				<div className="text-sm text-muted-foreground px-2 py-1.5">
					No results found
				</div>
			)}
		</div>
	);
});
