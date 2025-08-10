import { ConfirmationDialog } from "@client/components/common/confirmation-dialog";
import { DocumentViewerDialog } from "@client/components/document/document-viewer-dialog";
import { useOrganizationConnectionContext } from "@client/components/providers/organization-connection-provider";
import { Button } from "@client/components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@client/components/ui/card";
import { ScrollArea } from "@client/components/ui/scroll-area";
import { honoClient } from "@client/lib/api-client";
import type { Document } from "@shared/types/document";
import { useMutation } from "@tanstack/react-query";
import { FileText, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function ChatDetailsDocumentsSection() {
	const {
		mainChatRoomState: { documents, room },
	} = useOrganizationConnectionContext();

	if (!room || documents.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center h-full p-4 text-muted-foreground">
				<FileText className="h-12 w-12 mb-2" />
				<p>No documents yet</p>
				<p className="text-sm">
					Documents shared in this chat room will appear here.
				</p>
			</div>
		);
	}

	return (
		<ScrollArea className="h-full p-4">
			<div className="space-y-4 p-1">
				{documents.map((doc) => (
					<DocumentCard key={doc.id} doc={doc} />
				))}
			</div>
		</ScrollArea>
	);
}

function DocumentCard({ doc }: { doc: Document }) {
	const [open, setOpen] = useState(false);

	const deleteDocumentMutation = useMutation({
		mutationFn: async () => {
			const response = await honoClient.api.documents[":documentId"].$delete({
				param: {
					documentId: doc.id,
				},
			});
			return response.json();
		},
		onSuccess: () => {
			toast.success("Document deleted successfully");
			setOpen(false);
		},
	});

	return (
		<Card className="flex flex-col gap-2">
			<CardHeader>
				<div className="flex items-center justify-between">
					<CardTitle className="text-base flex items-center gap-2">
						<FileText className="h-4 w-4 text-primary" />
						{doc.title}
					</CardTitle>
					<ConfirmationDialog
						title="Delete Document"
						description="Are you sure you want to delete this document? This action cannot be undone."
						open={open}
						onOpenChange={setOpen}
						onConfirm={() => {
							deleteDocumentMutation.mutate();
						}}
					>
						<Button variant="ghost" size="icon">
							<Trash2 className="h-4 w-4" />
						</Button>
					</ConfirmationDialog>
				</div>
			</CardHeader>
			<CardContent className="flex items-center justify-between">
				<span className="text-xs text-muted-foreground break-all">
					ID: {doc.id}
				</span>
				<DocumentViewerDialog
					title={doc.title}
					content={doc.content}
					id={doc.id}
				/>
			</CardContent>
		</Card>
	);
}
