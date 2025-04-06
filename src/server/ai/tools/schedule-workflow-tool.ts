import { tool } from "ai";
import { CronExpressionParser } from "cron-parser";
import { z } from "zod";
import type { AgentDurableObject } from "../../durable-objects/agent/agent-durable-object";
import { workflowStepSchema } from "@shared/types";

export const scheduleWorkflowTool = ({
	agentInstance,
	chatRoomId,
}: {
	agentInstance: AgentDurableObject;
	chatRoomId: string;
}) =>
	tool({
		description:
			"Schedules a multi-step workflow to be executed at a specified time or recurring interval.",
		parameters: z.object({
			scheduleExpression: z
				.string()
				.describe(
					"The schedule (e.g., ISO 8601 for one-off, CRON string like '0 9 * * 1' for recurring).",
				),
			goal: z.string().describe("The goal of the workflow."),
			steps: z
				.array(workflowStepSchema)
				.describe("The JSON object defining the steps of the workflow."),
		}),
		execute: async ({ scheduleExpression, goal, steps }) => {
			try {
				let nextExecutionTime: number;
				let isRecurring: boolean;

				try {
					const interval = CronExpressionParser.parse(scheduleExpression, {
						tz: "UTC",
					});

					nextExecutionTime = interval.next().getTime();
					isRecurring = true;
				} catch (_error) {
					const date = new Date(scheduleExpression);
					if (!Number.isNaN(date.getTime())) {
						nextExecutionTime = date.getTime();
						isRecurring = false;
						if (nextExecutionTime <= Date.now()) {
							throw new Error("Scheduled time must be in the future.");
						}
					} else {
						throw new Error(
							`Invalid scheduleExpression: ${scheduleExpression}`,
						);
					}
				}

				const workflow = await agentInstance.dbServices.createWorkflow({
					goal,
					steps: {
						version: 1,
						type: "workflowSteps",
						steps,
					},
					scheduleExpression,
					isRecurring,
					nextExecutionTime,
					chatRoomId,
				});
				//await agentInstance.scheduleNextAlarm(); // Recalculate and set the DO alarm

				return {
					success: true,
					workflowId: workflow.id,
					nextRun: new Date(nextExecutionTime).toISOString(),
				};
			} catch (error) {
				console.error("Error scheduling workflow:", error);
				return {
					success: false,
					error: error instanceof Error ? error.message : String(error),
				};
			}
		},
	});
