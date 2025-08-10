import { ConfirmationDialog } from "@client/components/common/confirmation-dialog";
import { useOrganizationConnectionContext } from "@client/components/providers/organization-connection-provider";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@client/components/ui/avatar";
import { Badge } from "@client/components/ui/badge";
import { Button } from "@client/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@client/components/ui/card";
import { ScrollArea } from "@client/components/ui/scroll-area";
import { honoClient } from "@client/lib/api-client";
import type { Workflow } from "@shared/types";
import { useMutation } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Calendar, Clock, Goal, Repeat, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function ChatDetailsWorkflowsSection() {
	const {
		mainChatRoomState: { workflows, room },
	} = useOrganizationConnectionContext();

	if (workflows.length === 0 || !room) {
		return (
			<div className="flex flex-col items-center justify-center h-full p-4 text-muted-foreground">
				<Calendar className="h-12 w-12 mb-2" />
				<p>No workflows scheduled yet</p>
				<p className="text-sm">
					You can create agent workflows to perform scheduled tasks
				</p>
			</div>
		);
	}

	return (
		<ScrollArea className="h-full p-4">
			<div className="space-y-4 p-1">
				{workflows.map((workflow) => (
					<WorkflowCard
						key={workflow.id}
						workflow={workflow}
						roomId={room.id}
					/>
				))}
			</div>
		</ScrollArea>
	);
}

function WorkflowCard({ workflow }: { workflow: Workflow; roomId: string }) {
	const [open, setOpen] = useState(false);

	const deleteWorkflowMutation = useMutation({
		mutationFn: async () => {
			const response = await honoClient.api.workflows[":workflowId"].$delete({
				param: {
					workflowId: workflow.id,
				},
			});
			return response.json();
		},
		onSuccess: () => {
			toast.success("Workflow deleted successfully");
			setOpen(false);
		},
	});

	return (
		<Card>
			<CardHeader>
				<div className="flex justify-between items-start">
					<CardTitle className="text-base">{workflow.goal}</CardTitle>
					<div className="flex items-center gap-2">
						{workflow.isActive ? (
							<Badge
								variant="outline"
								className="bg-green-100 text-green-800 border-green-200"
							>
								Active
							</Badge>
						) : (
							<Badge
								variant="outline"
								className="bg-red-100 text-red-800 border-red-200"
							>
								Inactive
							</Badge>
						)}
						{workflow.isRecurring && (
							<Badge
								variant="outline"
								className="bg-blue-100 text-blue-800 border-blue-200"
							>
								<Repeat className="h-3 w-3 mr-1" />
								Recurring
							</Badge>
						)}
						<ConfirmationDialog
							title="Delete Workflow"
							description="Are you sure you want to delete this workflow? This action cannot be undone."
							open={open}
							onOpenChange={setOpen}
							onConfirm={() => {
								deleteWorkflowMutation.mutate();
							}}
						>
							<Button variant="ghost" size="icon">
								<Trash2 className="h-4 w-4" />
							</Button>
						</ConfirmationDialog>
					</div>
				</div>
				<div className="flex items-center gap-2 mt-1">
					<Avatar className="h-5 w-5">
						<AvatarImage
							src={workflow.agent.image || ""}
							alt={workflow.agent.name}
						/>
						<AvatarFallback className="text-[10px]">
							{workflow.agent.name.substring(0, 2).toUpperCase()}
						</AvatarFallback>
					</Avatar>
					<span className="text-xs text-muted-foreground">
						Run by {workflow.agent.name}
					</span>
				</div>
				<CardDescription className="flex items-center gap-1 text-xs mt-1">
					<Clock className="h-3 w-3" />
					{workflow.nextExecutionTime < Date.now() ? (
						<>
							<span>Last run:</span>{" "}
							{formatDistanceToNow(workflow.nextExecutionTime, {
								addSuffix: true,
							})}
						</>
					) : (
						<>
							<span>Next run:</span>{" "}
							{formatDistanceToNow(workflow.nextExecutionTime, {
								addSuffix: true,
							})}
						</>
					)}
				</CardDescription>
			</CardHeader>
			<CardContent className="pb-4">
				<div className="text-sm">
					<div className="flex items-start gap-1 text-xs text-muted-foreground mb-2">
						<Goal className="h-3 w-3 mt-0.5" />
						<span>Workflow Steps ({workflow.steps.data.length})</span>
					</div>
					<div className="bg-muted/50 rounded-md p-2 space-y-2">
						{workflow.steps.data.slice(0, 3).map((step) => (
							<div
								key={step.stepId}
								className="text-xs border-l-2 border-primary/50 pl-2 py-1"
							>
								{step.description.length > 70
									? `${step.description.substring(0, 70)}...`
									: step.description}
							</div>
						))}
						{workflow.steps.data.length > 3 && (
							<div className="text-xs text-muted-foreground text-center italic">
								...and {workflow.steps.data.length - 3} more steps
							</div>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
