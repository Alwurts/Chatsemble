import {
	ToolInvocation,
	ToolInvocationContent,
	ToolInvocationHeader,
	ToolInvocationName,
} from "@client/components/ui/tool-invocation";
import type {
	ScheduleWorkflowInput,
	ScheduleWorkflowOutput,
} from "@server/ai/tools/schedule-workflow-tool";
import type { AgentToolUse } from "@shared/types";

export function ScheduledWorkflowTool({ toolUse }: { toolUse: AgentToolUse }) {
	const isCall = toolUse.type === "tool-call";
	const isResult = toolUse.type === "tool-result";
	const name =
		toolUse.toolName === "scheduleWorkflow"
			? "Scheduled Workflow"
			: toolUse.toolName;

	const args = toolUse.args as ScheduleWorkflowInput | undefined;
	const result = isResult
		? (toolUse.result as ScheduleWorkflowOutput | undefined)
		: undefined;

	return (
		<ToolInvocation>
			<ToolInvocationHeader>
				<ToolInvocationName name={name} type={toolUse.type} />
			</ToolInvocationHeader>
			<ToolInvocationContent>
				{isCall && <ScheduledWorkflowToolCallView args={args} />}
				{isResult && (
					<ScheduledWorkflowToolResultView args={args} result={result} />
				)}
			</ToolInvocationContent>
		</ToolInvocation>
	);
}

function ScheduledWorkflowToolCallView({
	args,
}: {
	args?: ScheduleWorkflowInput;
}) {
	if (!args) {
		return null;
	}
	return (
		<div className="flex flex-col gap-2">
			<div className="text-muted-foreground text-sm mb-1">
				Scheduling workflow...
			</div>
			<div className="text-sm">
				<div className="mb-1">
					<span className="font-medium">Goal:</span> {args.goal}
				</div>
				<div className="mb-1">
					<span className="font-medium">Schedule:</span>{" "}
					{args.scheduleExpression}
				</div>
				<div className="mb-1">
					<span className="font-medium">Steps ({args.steps.length}):</span>
				</div>
				<ul className="bg-muted/50 rounded-md p-2 space-y-2">
					{args.steps.map((step) => (
						<li
							key={step.stepId}
							className="text-xs border-l-2 border-primary/50 pl-2 py-1"
						>
							{step.description}
						</li>
					))}
				</ul>
			</div>
		</div>
	);
}

function ScheduledWorkflowToolResultView({
	args,
	result,
}: {
	args?: ScheduleWorkflowInput;
	result?: ScheduleWorkflowOutput;
}) {
	return (
		<div className="flex flex-col gap-3">
			{args && <ScheduledWorkflowToolCallView args={args} />}
			<ScheduledWorkflowResultList result={result} />
		</div>
	);
}

function ScheduledWorkflowResultList({
	result,
}: {
	result: ScheduleWorkflowOutput | undefined;
}) {
	if (!result) {
		return null;
	}
	return (
		<ul className="text-sm space-y-1">
			<li>
				<span className="font-medium">Status:</span>{" "}
				{result.success ? (
					<span className="text-green-700">Scheduled</span>
				) : (
					<span className="text-red-700">Failed</span>
				)}
			</li>
			{"nextRun" in result && result.nextRun && (
				<li>
					<span className="font-medium">Next run:</span>{" "}
					<span className="font-mono">{result.nextRun}</span>
				</li>
			)}
			{"error" in result && result.error && (
				<li>
					<span className="font-medium">Error:</span>{" "}
					<span className="font-mono">{result.error}</span>
				</li>
			)}
		</ul>
	);
}
