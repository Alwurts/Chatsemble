import type { WsChatOutgoingMessage } from "@shared/types";
import type { ChatRoomDbServices } from "./db/services";

interface DocumentsDependencies {
	dbServices: ChatRoomDbServices;
	broadcastWebSocketMessageToRoom: (
		message: WsChatOutgoingMessage,
		roomId: string,
	) => void;
}

export class Documents {
	private deps: DocumentsDependencies;

	constructor(deps: DocumentsDependencies) {
		this.deps = deps;
	}

	private broadcastDocumentUpdate = async (roomId: string) => {
		const documents = await this.deps.dbServices.getChatRoomDocuments(roomId);
		this.deps.broadcastWebSocketMessageToRoom(
			{ type: "chat-room-documents-update", roomId, documents },
			roomId,
		);
	};

	createDocument = async (
		params: Parameters<ChatRoomDbServices["createDocument"]>[0],
	) => {
		const document = await this.deps.dbServices.createDocument(params);
		await this.broadcastDocumentUpdate(document.roomId);
		return document;
	};

	deleteDocument = async (documentId: string) => {
		const deletedDocument =
			await this.deps.dbServices.deleteDocument(documentId);
		await this.broadcastDocumentUpdate(deletedDocument.roomId);
		return deletedDocument;
	};
}
