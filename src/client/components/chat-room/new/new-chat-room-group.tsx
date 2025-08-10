import { ChatMemberMultiSelect } from "@client/components/chat-room-member/chat-member-multi-select";
import { Button } from "@client/components/ui/button";
import { DialogFooter } from "@client/components/ui/dialog";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@client/components/ui/form";
import { Input } from "@client/components/ui/input";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@client/components/ui/tabs";
import { zodResolver } from "@hookform/resolvers/zod";
import { type ChatRoomType, createChatRoomSchema } from "@shared/types";
import { Settings, UserPlus } from "lucide-react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

type CreateChatRoomFormValues = z.infer<typeof createChatRoomSchema>;

export function NewChatRoomGroupForm({
	onSubmit,
	isPending,
}: {
	onSubmit: (values: CreateChatRoomFormValues) => void;
	groupChatType: Exclude<ChatRoomType, "oneToOne">;
	isPending: boolean;
}) {
	const form = useForm<CreateChatRoomFormValues>({
		resolver: zodResolver(createChatRoomSchema),
		defaultValues: {
			name: "",
			members: [],
		},
	});

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
				<Tabs defaultValue="configuration" className="w-full">
					<TabsList className="grid w-full grid-cols-2">
						<TabsTrigger
							value="configuration"
							className="flex items-center gap-2"
						>
							<Settings className="h-4 w-4" />
							Configuration
						</TabsTrigger>
						<TabsTrigger value="members" className="flex items-center gap-2">
							<UserPlus className="h-4 w-4" />
							Members
						</TabsTrigger>
					</TabsList>
					<TabsContent value="configuration">
						<div className="space-y-4">
							<FormField
								control={form.control}
								name="name"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Name</FormLabel>
										<FormControl>
											<Input placeholder="Enter chat room name" {...field} />
										</FormControl>
										<FormDescription>
											This is the name that will be displayed for your chat
											room.
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
					</TabsContent>
					<TabsContent value="members" className="space-y-6">
						<FormField
							control={form.control}
							name="members"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Select Members</FormLabel>
									<FormControl>
										<ChatMemberMultiSelect
											selectedMembers={field.value}
											setSelectedMembers={(members) => {
												field.onChange(members);
											}}
										/>
									</FormControl>
									<FormDescription>
										Select members ({field.value.length})
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>
					</TabsContent>
				</Tabs>
				<DialogFooter>
					<Button type="submit" disabled={isPending}>
						{isPending ? "Creating..." : "Create group chat"}
					</Button>
				</DialogFooter>
			</form>
		</Form>
	);
}
