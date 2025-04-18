import type {
	WsChatIncomingMessage,
	WsChatOutgoingMessage,
} from "@shared/types";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export type UseWebSocketConnectionStatus =
	| "disconnected"
	| "connecting"
	| "connected";

export interface UseWebSocketProps {
	organizationId: string;
	onMessage: (message: WsChatOutgoingMessage) => void;
}

export function useWebSocket({ organizationId, onMessage }: UseWebSocketProps) {
	const wsRef = useRef<WebSocket | null>(null);
	const [connectionStatus, setConnectionStatus] =
		useState<UseWebSocketConnectionStatus>("disconnected");
	const onMessageRef = useRef(onMessage);

	useEffect(() => {
		onMessageRef.current = onMessage;
	}, [onMessage]);

	const startWebSocket = useCallback((organizationId: string | null) => {
		if (!organizationId) {
			setConnectionStatus("disconnected");
			return;
		}

		setConnectionStatus("connecting");

		const appUrl = import.meta.env.VITE_APP_URL;

		const apiHost = appUrl?.replace(/^https?:\/\//, "") ?? "";
		const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";
		const ws = new WebSocket(
			`${wsProtocol}://${apiHost}/websocket/organization/${organizationId}`,
		);

		ws.onopen = () => {
			console.log("WebSocket connected");
			setConnectionStatus("connected");
			toast.success("Connected to organization");
		};

		ws.onmessage = (event) => {
			try {
				const message: WsChatOutgoingMessage = JSON.parse(event.data);
				onMessageRef.current(message);
			} catch (error) {
				console.error("Failed to parse WebSocket message:", error);
			}
		};

		ws.onerror = (error) => {
			console.error("WebSocket error:", error);
			setConnectionStatus("disconnected");
			toast.error("Failed to connect to organization");
		};

		ws.onclose = () => {
			setConnectionStatus("disconnected");
			console.log("WebSocket closed");
			toast.error("Disconnected from organization");
		};

		wsRef.current = ws;
	}, []);

	useEffect(() => {
		if (wsRef.current) {
			wsRef.current.close();
			wsRef.current = null;
		}

		setConnectionStatus("disconnected");
		startWebSocket(organizationId);

		return () => {
			if (wsRef.current) {
				wsRef.current.close();
				wsRef.current = null;
			}
		};
	}, [organizationId, startWebSocket]);

	const sendMessage = useCallback((message: WsChatIncomingMessage) => {
		if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
			wsRef.current.send(JSON.stringify(message));
		} else {
			console.error("WebSocket is not connected");
		}
	}, []);

	return { sendMessage, connectionStatus };
}
