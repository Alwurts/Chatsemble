import type { ChatRoomDbServices } from "@server/organization-do/db/services";
import { type WorkflowPartial, workflowStepSchema } from "@shared/types";
import { tool } from "ai";
import { CronExpressionParser } from "cron-parser";
import { z } from "zod";

const scheduleWorkflowInputSchema = z.object({
	scheduleExpression: z
		.string()
		.describe(
			"The schedule (e.g., Date string ending with 'Z' like '2025-04-06T12:00:00Z' for one-off, CRON string like '0 9 * * 1' for recurring).",
		),
	goal: z
		.string()
		.describe(
			"The goal of the workflow, In this goal DO NOT include information about schedule like 'every Monday at 9am'.",
		),
	steps: z
		.array(workflowStepSchema)
		.describe("The JSON object defining the steps of the workflow."),
});

const scheduleWorkflowOutputSchema = z
	.object({
		success: z.literal(true),
		workflowId: z.string(),
		nextRun: z.string().optional(),
	})
	.or(
		z.object({
			success: z.literal(false),
			error: z.string(),
		}),
	);

export type ScheduleWorkflowOutput = z.infer<
	typeof scheduleWorkflowOutputSchema
>;

export const scheduleWorkflowTool = ({
	createWorkflow,
	chatRoomId,
	agentId,
}: {
	createWorkflow: (
		params: Parameters<ChatRoomDbServices["createAgentWorkflow"]>[0],
	) => Promise<WorkflowPartial>;
	chatRoomId: string;
	agentId: string;
}) =>
	tool({
		description:
			"Schedules a multi-step workflow to be executed at a specified time or recurring interval.",
		inputSchema: scheduleWorkflowInputSchema,
		outputSchema: scheduleWorkflowOutputSchema,
		execute: async ({
			scheduleExpression,
			goal,
			steps,
		}): Promise<ScheduleWorkflowOutput> => {
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

				const workflow = await createWorkflow({
					agentId,
					goal,
					steps: {
						version: 1,
						type: "workflowSteps",
						data: steps,
					},
					scheduleExpression,
					isRecurring,
					nextExecutionTime,
					chatRoomId,
				});

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
