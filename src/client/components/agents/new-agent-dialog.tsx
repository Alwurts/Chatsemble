import { Button } from "@client/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@client/components/ui/dialog";
import { Form } from "@client/components/ui/form";
import { honoClient } from "@client/lib/api-client";
import { zodResolver } from "@hookform/resolvers/zod";
import { type AgentFormValues, createAgentSchema } from "@shared/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { AgentForm } from "./agent-form";

export function NewAgentDialog({
	open,
	setOpen,
}: {
	open: boolean;
	setOpen: (open: boolean) => void;
}) {
	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogContent className="max-w-[96vw] md:max-w-screen-lg w-full max-h-[90vh] flex flex-col p-0">
				{open && <NewAgentDialogContent setOpen={setOpen} />}
			</DialogContent>
		</Dialog>
	);
}

function NewAgentDialogContent({
	setOpen,
}: {
	setOpen: (open: boolean) => void;
}) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const form = useForm<AgentFormValues>({
		resolver: zodResolver(createAgentSchema),
		defaultValues: {
			name: "",
			image: "/notion-avatars/avatar-01.svg",
			description: "",
			tone: "formal",
			verbosity: "concise",
			emojiUsage: "occasional",
			languageStyle: "simple",
		},
	});

	const createChatMutation = useMutation({
		mutationFn: async (values: AgentFormValues) => {
			const response = await honoClient.api.agents.$post({
				json: values,
			});
			const data = await response.json();
			return data;
		},
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: ["agents"] });
			router.navigate({
				to: "/agents",
				search: (prev) => ({
					...prev,
					agentId: data.agentId,
				}),
			});
			setOpen(false);
		},
	});

	const onSubmit = (values: AgentFormValues) => {
		createChatMutation.mutate(values);
	};

	return (
		<>
			<DialogHeader className="p-4 pb-0">
				<DialogTitle>Create New Agent</DialogTitle>
				<DialogDescription>
					Create a new agent to start conversations with your team.
				</DialogDescription>
			</DialogHeader>
			<Form {...form}>
				<form
					onSubmit={form.handleSubmit(onSubmit)}
					className="flex-1 flex flex-col overflow-y-auto"
				>
					<AgentForm className="flex-1 flex flex-col gap-6 p-4 px-6 overflow-y-auto" />

					<DialogFooter className="p-4">
						<Button type="submit" disabled={createChatMutation.isPending}>
							{createChatMutation.isPending ? "Creating..." : "Create Agent"}
						</Button>
					</DialogFooter>
				</form>
			</Form>
		</>
	);
}
