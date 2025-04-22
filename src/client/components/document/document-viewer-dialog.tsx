import { Button } from "@client/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogTrigger,
} from "@client/components/ui/dialog";
import { FileText } from "lucide-react";
import { ScrollArea } from "@client/components/ui/scroll-area";
import { Separator } from "@client/components/ui/separator";
import { MarkdownContent } from "@client/components/ui/markdown-content";
import { CopyButton } from "@client/components/common/copy-button";

export function DocumentViewerDialog({
	title,
	content,
	id,
	className,
}: {
	title: string;
	content: string;
	id: string;
	className?: string;
}) {
	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm" className={className}>
					View document
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-2xl w-full p-0 gap-0">
				<div className="flex flex-col items-start px-4 py-3 border-b bg-muted rounded-t-lg">
					<div className="flex items-center gap-2 mb-1">
						<FileText className="h-5 w-5 text-primary" />
						<span className="font-semibold text-base text-foreground">
							Document Viewer
						</span>
					</div>
					<Separator className="my-1" />
					<div className="w-full flex items-center justify-between gap-1 mt-1">
						<div className="flex flex-col items-start gap-1">
							<span className="break-all">{title}</span>
							<span className="text-xs text-muted-foreground break-all">
								ID: {id}
							</span>
						</div>
						<CopyButton textToCopy={content} />
					</div>
				</div>
				<ScrollArea className="w-full max-h-[50vh]">
					<div className="px-6 py-6">
						{/* <h2 className="text-2xl font-bold text-center mb-4 tracking-tight">
							{title}
						</h2>
						<Separator className="my-4" /> */}
						<div className="px-1">
							<MarkdownContent content={content} id={id} />
						</div>
					</div>
				</ScrollArea>
			</DialogContent>
		</Dialog>
	);
}
