import type { WorkflowPartial, WsChatOutgoingMessage } from "@shared/types";
import CronExpressionParser from "cron-parser";
import type { ChatRoomDbServices } from "./db/services";

interface WorkflowsDependencies {
	dbServices: ChatRoomDbServices;
	storage: DurableObjectStorage;
	broadcastWebSocketMessageToRoom: (
		message: WsChatOutgoingMessage,
		roomId: string,
	) => void;
	routeWorkflowToRelevantAgent: (params: {
		workflow: WorkflowPartial;
	}) => Promise<void>;
}

export class Workflows {
	private deps: WorkflowsDependencies;

	constructor(deps: WorkflowsDependencies) {
		this.deps = deps;
	}

	scheduleNextWorkflowAlarm = async () => {
		const now = Date.now();
		const nextTime = await this.deps.dbServices.findNextWorkflowTime(now);
		const currentAlarm = await this.deps.storage.getAlarm();
		console.log("[scheduleNextWorkflowAlarm] nextTime", nextTime);
		console.log("[scheduleNextWorkflowAlarm] currentAlarm", currentAlarm);

		if (nextTime) {
			if (currentAlarm !== nextTime) {
				console.log(
					`[Setting next alarm for ${new Date(nextTime).toISOString()}`,
				);
				this.deps.storage.setAlarm(nextTime);
			} else {
				console.log(
					`Alarm already set correctly for ${new Date(nextTime).toISOString()}`,
				);
			}
		} else {
			if (currentAlarm) {
				console.log("No active tasks, deleting alarm.");
				this.deps.storage.deleteAlarm();
			} else {
				console.log("No active tasks, no alarm to delete.");
			}
		}
	};

	handleWorkflowAlarm = async () => {
		console.log(`Alarm triggered at ${new Date().toISOString()}`);
		const now = Date.now();
		const dueWorkflows = await this.deps.dbServices.getDueWorkflows(now);

		console.log(`Found ${dueWorkflows.length} due workflows.`);

		await Promise.all(
			dueWorkflows.map(async (workflow) => {
				console.log(`Processing workflow ${workflow.id}`);
				await this.executeWorkflow(workflow);
			}),
		);

		const chatRoomIds = dueWorkflows.map((workflow) => workflow.chatRoomId);
		const uniqueChatRoomIds = [...new Set(chatRoomIds)];

		await Promise.all(
			uniqueChatRoomIds.map(async (chatRoomId) => {
				await this.broadcastWorkflowUpdate(chatRoomId);
			}),
		);
	};

	private executeWorkflow = async (workflow: WorkflowPartial) => {
		console.log(
			`Executing workflow ${workflow.id} for chatroom ${workflow.chatRoomId} and agent ${workflow.agentId}`,
		);
		try {
			await this.deps.routeWorkflowToRelevantAgent({ workflow });

			if (workflow.isRecurring) {
				try {
					const interval = CronExpressionParser.parse(
						workflow.scheduleExpression,
						{
							tz: "UTC",
							currentDate: new Date(workflow.nextExecutionTime),
						},
					);
					const nextExecutionTime = interval.next().getTime();
					console.log(
						`Rescheduling task ${workflow.id} for ${new Date(nextExecutionTime).toISOString()}`,
					);
					await this.deps.dbServices.updateWorkflow(workflow.id, {
						nextExecutionTime,
						lastExecutionTime: Date.now(),
					});
				} catch (error) {
					console.error(
						`Failed to parse schedule for recurring workflow ${workflow.id}:`,
						error,
					);
					await this.deps.dbServices.updateWorkflow(workflow.id, {
						lastExecutionTime: Date.now(),
					});
				}
			} else {
				await this.deps.dbServices.updateWorkflow(workflow.id, {
					lastExecutionTime: Date.now(),
					isActive: false,
				});
				console.log(`Workflow ${workflow.id} completed.`);
			}
		} catch (error) {
			console.error(`Error executing workflow ${workflow.id}:`, error);
			await this.deps.dbServices.updateWorkflow(workflow.id, {
				lastExecutionTime: Date.now(),
			});
		}
	};

	private broadcastWorkflowUpdate = async (chatRoomId: string) => {
		const workflows =
			await this.deps.dbServices.getChatRoomWorkflows(chatRoomId);
		this.deps.broadcastWebSocketMessageToRoom(
			{
				type: "chat-room-workflows-update",
				roomId: chatRoomId,
				workflows,
			},
			chatRoomId,
		);
	};

	createWorkflow = async (
		params: Parameters<ChatRoomDbServices["createAgentWorkflow"]>[0],
	) => {
		const workflow = await this.deps.dbServices.createAgentWorkflow(params);
		await this.broadcastWorkflowUpdate(workflow.chatRoomId);
		await this.scheduleNextWorkflowAlarm();
		return workflow;
	};

	deleteWorkflow = async (workflowId: string) => {
		const deletedWorkflow =
			await this.deps.dbServices.deleteWorkflow(workflowId);
		await this.broadcastWorkflowUpdate(deletedWorkflow.chatRoomId);
		return deletedWorkflow;
	};
}
