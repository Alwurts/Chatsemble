import {
	Collapsible,
	CollapsibleContent,
} from "@client/components/ui/collapsible";
import { Separator } from "@client/components/ui/separator";
import {
	ToolInvocation,
	ToolInvocationContent,
	ToolInvocationHeader,
	ToolInvocationName,
	ToolInvocationRawData,
} from "@client/components/ui/tool-invocation";
import type { ToolUIPart } from "ai";
import { useState } from "react";

interface CollapsibleRawDataProps {
	toolUse: ToolUIPart;
}

export function CollapsibleRawData({ toolUse }: CollapsibleRawDataProps) {
	const [isOpen, setIsOpen] = useState(false);
	return (
		<Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
			<ToolInvocation>
				<button
					type="button"
					onClick={() => setIsOpen(!isOpen)}
					className="w-full cursor-pointer"
				>
					<ToolInvocationHeader>
						<ToolInvocationName
							name={`Used ${toolUse.type.slice(5)}`}
							type="tool-result"
						/>

						<span className="text-sm text-muted-foreground text-start">
							{isOpen ? "Collapse" : "Expand to see more"}
						</span>
					</ToolInvocationHeader>
				</button>
				<CollapsibleContent>
					<ToolInvocationContent className="px-0">
						<Separator />
						{!!toolUse.input && <ToolInvocationRawData data={toolUse.input} />}
						{!!toolUse.output && (
							<ToolInvocationRawData data={toolUse.output} />
						)}
					</ToolInvocationContent>
				</CollapsibleContent>
			</ToolInvocation>
		</Collapsible>
	);
}
