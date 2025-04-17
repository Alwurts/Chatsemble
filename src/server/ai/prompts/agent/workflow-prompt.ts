import type { Agent } from "@shared/types";
import type { WorkflowPartial } from "@shared/types/workflow";
import {
	getAssistantPersonaPrompt,
	getChatRoomContextPrompt,
	getCoreAssistantInstructionsPrompt,
	getResponseFormattingRulesPrompt,
	getWorkflowExecutionRulesPrompt,
} from "./prompt-parts";

export function getWorkflowAgentSystemPrompt({
	agentConfig,
	chatRoomId,
}: {
	agentConfig: Agent;
	chatRoomId: string;
}): string {
	const coreContext = getCoreAssistantInstructionsPrompt();
	const persona = getAssistantPersonaPrompt(agentConfig);
	const responseRules = getResponseFormattingRulesPrompt();
	const workflowRules = getWorkflowExecutionRulesPrompt();
	const dynamicContext = getChatRoomContextPrompt(chatRoomId, null);

	return `
${coreContext}

${persona}

${responseRules}

${workflowRules}

${dynamicContext}

`.trim();
}

export function getWorkflowAgentUserPrompt({
	workflow,
}: {
	workflow: WorkflowPartial;
}) {
	return `
	## Scheduled Workflow
	
	### Workflow ID
		${workflow.id}
	
	### Overall Goal
		${workflow.goal}
	
	### Steps
		${JSON.stringify(workflow.steps.data, null, 2)}
	`.trim();
}
