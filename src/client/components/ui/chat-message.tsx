import { Button } from "@client/components/ui/button";
import { MarkdownContent } from "@client/components/ui/markdown-content";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@client/components/ui/tooltip";
import { dateToPrettyTimeAgo } from "@client/lib/date";
import { cn } from "@client/lib/utils";
import type { ChatMessageThreadMetadata } from "@shared/types";
import { cva, type VariantProps } from "class-variance-authority";
import { ChevronRight, SparklesIcon, UserIcon } from "lucide-react";
import React, { type ReactNode, useEffect, useState } from "react";
import { Card } from "./card";

const chatMessageVariants = cva("flex gap-4 w-full", {
	variants: {
		variant: {
			default: "group relative",
			bubble: "",
			full: "p-5",
		},
		type: {
			incoming: "justify-start mr-auto",
			outgoing: "justify-end ml-auto",
		},
	},
	compoundVariants: [
		{
			variant: "full",
			type: "outgoing",
			className: "bg-muted",
		},
		{
			variant: "full",
			type: "incoming",
			className: "bg-background",
		},
	],
	defaultVariants: {
		variant: "default",
		type: "incoming",
	},
});

interface MessageContextValue extends VariantProps<typeof chatMessageVariants> {
	id: string;
}

const ChatMessageContext = React.createContext<MessageContextValue | null>(
	null,
);

const useChatMessage = () => {
	const context = React.useContext(ChatMessageContext);
	return context;
};

// Root component
interface ChatMessageProps
	extends React.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof chatMessageVariants> {
	children?: React.ReactNode;
	id: string;
	username?: string;
}

const ChatMessage = React.forwardRef<HTMLDivElement, ChatMessageProps>(
	(
		{
			className,
			variant = "default",
			type = "incoming",
			id,
			username,
			children,
			...props
		},
		ref,
	) => {
		return (
			<ChatMessageContext.Provider value={{ variant, type, id }}>
				<div
					ref={ref}
					className={cn(chatMessageVariants({ variant, type, className }))}
					{...props}
				>
					{children}
				</div>
			</ChatMessageContext.Provider>
		);
	},
);
ChatMessage.displayName = "ChatMessage";

// Avatar component

const chatMessageAvatarVariants = cva(
	"w-8 h-8 flex items-center rounded-full justify-center ring-1 shrink-0 bg-transparent overflow-hidden",
	{
		variants: {
			type: {
				incoming: "ring-border",
				outgoing: "ring-muted-foreground/30",
			},
		},
		defaultVariants: {
			type: "incoming",
		},
	},
);

interface ChatMessageAvatarProps extends React.HTMLAttributes<HTMLDivElement> {
	imageSrc?: string;
	icon?: ReactNode;
}

const ChatMessageAvatar = React.forwardRef<
	HTMLDivElement,
	ChatMessageAvatarProps
>(({ className, icon: iconProps, imageSrc, ...props }, ref) => {
	const context = useChatMessage();
	const type = context?.type ?? "incoming";
	const icon =
		iconProps ?? (type === "incoming" ? <SparklesIcon /> : <UserIcon />);
	return (
		<div
			ref={ref}
			className={cn(chatMessageAvatarVariants({ type, className }))}
			{...props}
		>
			{imageSrc ? (
				<img
					src={imageSrc}
					alt="Avatar"
					className="h-full w-full object-cover"
				/>
			) : (
				<div className="translate-y-px [&_svg]:size-4 [&_svg]:shrink-0">
					{icon}
				</div>
			)}
		</div>
	);
});
ChatMessageAvatar.displayName = "ChatMessageAvatar";

// Content component

const chatMessageContentVariants = cva("flex flex-col gap-2 w-full", {
	variants: {
		variant: {
			default: "group-hover:bg-muted p-2 rounded-md",
			bubble: "rounded-xl px-3 py-2",
			full: "",
		},
		type: {
			incoming: "",
			outgoing: "",
		},
	},
	compoundVariants: [
		{
			variant: "bubble",
			type: "incoming",
			className: "bg-secondary text-secondary-foreground",
		},
		{
			variant: "bubble",
			type: "outgoing",
			className: "bg-primary text-primary-foreground",
		},
	],
	defaultVariants: {
		variant: "default",
		type: "incoming",
	},
});

interface ChatMessageContentProps extends React.HTMLAttributes<HTMLDivElement> {
	id?: string;
	content: string;
}

const ChatMessageContent = React.forwardRef<
	HTMLDivElement,
	ChatMessageContentProps
>(({ className, content, id: idProp, children, ...props }, ref) => {
	const context = useChatMessage();

	const variant = context?.variant ?? "default";
	const type = context?.type ?? "incoming";
	const id = idProp ?? context?.id ?? "";

	return (
		<div
			ref={ref}
			className={cn(chatMessageContentVariants({ variant, type, className }))}
			{...props}
		>
			{content.length > 0 && <MarkdownContent id={id} content={content} />}
			{children}
		</div>
	);
});
ChatMessageContent.displayName = "ChatMessageContent";

// Wrapper component for content and username
const chatMessageContentAreaVariants = cva("flex flex-col gap-1 w-full", {
	variants: {
		type: {
			incoming: "items-start",
			outgoing: "items-end",
		},
	},
	defaultVariants: {
		type: "incoming",
	},
});

interface ChatMessageContentAreaProps
	extends React.HTMLAttributes<HTMLDivElement> {}

const ChatMessageContentArea = React.forwardRef<
	HTMLDivElement,
	ChatMessageContentAreaProps
>(({ className, children, ...props }, ref) => {
	const context = useChatMessage();
	const type = context?.type ?? "incoming";

	return (
		<div
			ref={ref}
			className={cn(chatMessageContentAreaVariants({ type, className }))}
			{...props}
		>
			{children}
		</div>
	);
});
ChatMessageContentArea.displayName = "ChatMessageContentArea";

// Metadata component
const chatMessageMetadataVariants = cva("text-sm px-2 flex gap-2", {
	variants: {
		type: {
			incoming: "text-muted-foreground",
			outgoing: "text-muted-foreground",
		},
	},
	defaultVariants: {
		type: "incoming",
	},
});

interface ChatMessageMetadataProps
	extends React.HTMLAttributes<HTMLDivElement> {
	username: string;
	createdAt: number;
}

const ChatMessageMetadata = React.forwardRef<
	HTMLDivElement,
	ChatMessageMetadataProps
>(({ className, username, createdAt, ...props }, ref) => {
	const context = useChatMessage();
	const type = context?.type ?? "incoming";
	const date = new Date(createdAt);

	return (
		<div
			ref={ref}
			className={cn(chatMessageMetadataVariants({ type, className }))}
			{...props}
		>
			<span className="font-medium text-foreground">{username}</span>
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger asChild>
						<span>
							{date.toLocaleString("en-US", {
								hour: "numeric",
								minute: "numeric",
							})}
						</span>
					</TooltipTrigger>
					<TooltipContent>
						<p>{date.toLocaleString()}</p>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
		</div>
	);
});
ChatMessageMetadata.displayName = "ChatMessageMetadata";

// Actions component
interface ChatMessageActionProps
	extends React.HTMLAttributes<HTMLButtonElement> {
	label: string;
}

const ChatMessageAction = React.forwardRef<
	HTMLButtonElement,
	ChatMessageActionProps
>(({ className, children, label, ...props }, ref) => (
	<Tooltip>
		<TooltipTrigger asChild>
			<Button
				variant="ghost"
				size="icon"
				className={cn("h-7 w-7", className)}
				ref={ref}
				{...props}
			>
				{children}
				<span className="sr-only">{label}</span>
			</Button>
		</TooltipTrigger>
		<TooltipContent>
			<p>{label}</p>
		</TooltipContent>
	</Tooltip>
));
ChatMessageAction.displayName = "ChatMessageAction";

interface ChatMessageActionsAreaProps
	extends React.HTMLAttributes<HTMLDivElement> {
	children?: React.ReactNode;
}

const ChatMessageActionsArea = React.forwardRef<
	HTMLDivElement,
	ChatMessageActionsAreaProps
>(({ className, children, ...props }, ref) => (
	<Card
		ref={ref}
		className={cn(
			"absolute right-2 top-1 opacity-0 group-hover:opacity-100 transition-opacity flex flex-row gap-1 p-1",
			className,
		)}
		{...props}
	>
		<TooltipProvider>{children}</TooltipProvider>
	</Card>
));
ChatMessageActionsArea.displayName = "ChatMessageActionsArea";

interface ChatMessageThreadAreaProps
	extends React.ComponentProps<typeof Button> {
	threadMetadata: NonNullable<ChatMessageThreadMetadata>;
}

function ChatMessageThread({
	className,
	threadMetadata,
	...props
}: ChatMessageThreadAreaProps) {
	const [timeAgo, setTimeAgo] = useState(
		dateToPrettyTimeAgo(new Date(threadMetadata.lastMessage.createdAt)),
	);

	useEffect(() => {
		const interval = setInterval(() => {
			setTimeAgo(
				dateToPrettyTimeAgo(new Date(threadMetadata.lastMessage.createdAt)),
			);
		}, 60_000); // Update every minute

		return () => clearInterval(interval);
	}, [threadMetadata.lastMessage.createdAt]);

	return (
		<Button
			variant="ghost"
			className={cn(
				"group/button flex items-center px-1 gap-2 w-full justify-start transition-all",
				"hover:border hover:border-input hover:bg-background hover:shadow-sm",
				className,
			)}
			{...props}
		>
			<ChatMessageAvatar
				className="w-6 h-6"
				imageSrc={threadMetadata.lastMessage.member.image ?? undefined}
			/>
			<span className="text-sm">{threadMetadata.messageCount} replies</span>
			<span className="text-sm text-muted-foreground block group-hover/button:hidden">
				Last reply {timeAgo}
			</span>
			<span className="text-sm text-muted-foreground hidden group-hover/button:flex items-center gap-1 w-full">
				View thread
				<ChevronRight className="ml-auto h-4 w-4" />
			</span>
		</Button>
	);
}
ChatMessageThread.displayName = "ChatMessageThread";

export {
	ChatMessage,
	ChatMessageAvatar,
	ChatMessageContent,
	ChatMessageContentArea,
	ChatMessageMetadata,
	ChatMessageActionsArea,
	ChatMessageAction,
	ChatMessageThread,
};
