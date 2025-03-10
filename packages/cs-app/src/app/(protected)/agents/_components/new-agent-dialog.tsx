import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { client } from "@/lib/api-client";
import { Plus } from "lucide-react";
import { useState } from "react";
import { AgentAvatarPicker } from "./agent-avatar-picker";
import { Textarea } from "@/components/ui/textarea";

const formSchema = z.object({
	name: z.string().min(1, "Name is required"),
	image: z.string().min(1, "Image is required"),
	systemPrompt: z.string().min(1, "System prompt is required"),
});

export type FormValues = z.infer<typeof formSchema>;

export function NewAgentDialog() {
	const [open, setOpen] = useState(false);
	const router = useRouter();
	const queryClient = useQueryClient();
	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: "",
			image: "/notion-avatars/avatar-01.svg",
		},
	});

	const createChatMutation = useMutation({
		mutationFn: async (values: FormValues) => {
			const response = await client.protected.agent.create.$post({
				json: values,
			});
			const data = await response.json();
			return data;
		},
		onSuccess: (data) => {
			console.log({
				reason: "Creating agent success",
				data,
			});
			queryClient.invalidateQueries({ queryKey: ["agents"] });
			router.push(`/agents?agentId=${data.agentId}`);
			setOpen(false);
		},
	});

	const onSubmit = (values: FormValues) => {
		console.log({
			reason: "Submitting form",
			values,
		});
		createChatMutation.mutate(values);
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm">
					<Plus className="h-4 w-4" />
					New Agent
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[525px]">
				<DialogHeader>
					<DialogTitle>Create New Agent</DialogTitle>
					<DialogDescription>
						Create a new agent to start conversations with your team.
					</DialogDescription>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Name</FormLabel>
									<FormControl>
										<Input placeholder="Enter agent name" {...field} />
									</FormControl>
									<FormDescription>
										This is the name that will be displayed for your agent.
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="systemPrompt"
							render={({ field }) => (
								<FormItem>
									<FormLabel>System Prompt</FormLabel>
									<FormControl>
										<Textarea placeholder="Enter system prompt" {...field} />
									</FormControl>
									<FormDescription>
										This is the s ystem prompt that will be used for your agent.
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>
						<div className="rounded-lg border p-4">
							<AgentAvatarPicker control={form.control} />
						</div>

						<DialogFooter>
							<Button type="submit" disabled={createChatMutation.isPending}>
								{createChatMutation.isPending ? "Creating..." : "Create Agent"}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
