import {
	ToolInvocation,
	ToolInvocationContent,
	ToolInvocationHeader,
	ToolInvocationName,
} from "@client/components/ui/tool-invocation";
import type { AgentToolUse } from "@shared/types";
import { FileText } from "lucide-react";
import { DocumentViewerDialog } from "../document/document-viewer-dialog";
import type {
	CreateDocumentResult,
	CreateDocumentArgs,
} from "@server/ai/tools/create-document-tool";

export function CreateDocumentTool({ toolUse }: { toolUse: AgentToolUse }) {
	const isCall = toolUse.type === "tool-call";
	const isResult = toolUse.type === "tool-result";
	const name =
		toolUse.toolName === "createDocument"
			? "Create Document"
			: toolUse.toolName;

	const args = toolUse.args as CreateDocumentArgs | undefined;
	const result = isResult
		? (toolUse.result as CreateDocumentResult | undefined)
		: undefined;

	return (
		<ToolInvocation>
			<ToolInvocationHeader>
				<ToolInvocationName name={name} type={toolUse.type} />
			</ToolInvocationHeader>
			<ToolInvocationContent>
				{isCall && <CreateDocumentToolCallView args={args} />}
				{isResult && (
					<CreateDocumentToolResultView
						result={result}
						content={args?.content ?? ""}
					/>
				)}
			</ToolInvocationContent>
		</ToolInvocation>
	);
}

function CreateDocumentToolCallView({ args }: { args?: CreateDocumentArgs }) {
	return (
		<div className="flex flex-col items-center gap-1 py-2">
			<FileText className="h-7 w-7 text-muted-foreground animate-pulse" />
			<div className="text-muted-foreground text-xs">Creating document...</div>
			{args?.title && (
				<div className="font-medium text-sm mt-1 line-clamp-1 max-w-xs text-center">
					{args.title}
				</div>
			)}
		</div>
	);
}

function CreateDocumentToolResultView({
	result,
	content,
}: { result?: CreateDocumentResult; content: string }) {
	if (!result) {
		return null;
	}
	if (!result.success) {
		return (
			<div className="flex flex-col items-center gap-1 py-2">
				<FileText className="h-7 w-7 text-red-400" />
				<div className="text-red-700 font-medium text-xs">
					Failed to create document
				</div>
				<div className="text-xs text-muted-foreground">{result.error}</div>
			</div>
		);
	}
	return (
		<div className="flex flex-col items-center gap-1 py-2">
			<FileText className="h-7 w-7 text-primary" />
			<div className="font-medium text-sm mt-1 line-clamp-1 max-w-xs text-center">
				{result.title}
			</div>
			<div className="text-xs text-muted-foreground">Document created</div>
			<div className="text-xs text-muted-foreground">
				ID: {result.documentId}
			</div>
			<DocumentViewerDialog
				title={result.title}
				content={content}
				id={result.documentId}
				className="mt-2"
			/>
		</div>
	);
}
