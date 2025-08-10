// src/client/hooks/use-web-socket.ts
import type {
	WsChatIncomingMessage,
	WsChatOutgoingMessage,
} from "@shared/types";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export type UseWebSocketConnectionStatus =
	| "disconnected"
	| "connecting"
	| "connected"
	| "reconnecting";

export interface UseWebSocketProps {
	organizationId: string | null;
	onMessage: (message: WsChatOutgoingMessage) => void;
	enabled?: boolean;
}

const RECONNECT_DELAY_MS = 5000;
const MAX_RECONNECT_DELAY_MS = 60000;
const MAX_RECONNECT_ATTEMPTS = 10;

export function useWebSocket({
	organizationId,
	onMessage,
	enabled = true,
}: UseWebSocketProps) {
	const wsRef = useRef<WebSocket | null>(null);
	const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const reconnectAttemptsRef = useRef<number>(0);
	const isIntentionalCloseRef = useRef<boolean>(false);
	const isConnectingRef = useRef<boolean>(false);

	const [connectionStatus, setConnectionStatus] =
		useState<UseWebSocketConnectionStatus>("disconnected");

	const onMessageRef = useRef(onMessage);
	useEffect(() => {
		onMessageRef.current = onMessage;
	}, [onMessage]);

	const buildWebSocketUrl = useCallback((orgId: string): string | null => {
		const appUrl = import.meta.env.VITE_APP_URL;
		if (!appUrl) {
			console.error("VITE_APP_URL is not defined. WebSocket cannot connect.");
			return null;
		}

		if (!appUrl.startsWith("http://") && !appUrl.startsWith("https://")) {
			console.error("VITE_APP_URL seems invalid:", appUrl);
			return null;
		}

		const apiHost = appUrl.replace(/^https?:\/\//, "");
		const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";
		return `${wsProtocol}://${apiHost}/websocket/organization/${orgId}`;
	}, []);

	// biome-ignore lint/correctness/useExhaustiveDependencies: scheduleReconnect is a dependency of connect
	const connect = useCallback(() => {
		if (
			isConnectingRef.current ||
			(wsRef.current && wsRef.current.readyState === WebSocket.OPEN)
		) {
			console.log(
				"WebSocket connection attempt skipped: Already connecting or connected.",
			);
			return;
		}

		if (!organizationId || !enabled) {
			setConnectionStatus("disconnected");
			console.log(
				"WebSocket connection skipped: No organizationId or hook disabled.",
			);
			return;
		}

		const wsUrl = buildWebSocketUrl(organizationId);
		if (!wsUrl) {
			setConnectionStatus("disconnected");
			isConnectingRef.current = false;
			return;
		}

		isConnectingRef.current = true;
		setConnectionStatus(
			reconnectAttemptsRef.current > 0 ? "reconnecting" : "connecting",
		);
		console.log(
			`WebSocket attempting to connect to ${wsUrl}... (Attempt: ${reconnectAttemptsRef.current + 1})`,
		);
		isIntentionalCloseRef.current = false;

		if (reconnectTimeoutRef.current) {
			clearTimeout(reconnectTimeoutRef.current);
			reconnectTimeoutRef.current = null;
		}

		if (wsRef.current) {
			wsRef.current.onopen = null;
			wsRef.current.onmessage = null;
			wsRef.current.onerror = null;
			wsRef.current.onclose = null;
		}

		const ws = new WebSocket(wsUrl);
		wsRef.current = ws;

		ws.onopen = () => {
			console.log("WebSocket connected");
			wsRef.current = ws;
			isConnectingRef.current = false;
			setConnectionStatus("connected");
			reconnectAttemptsRef.current = 0;
			if (reconnectTimeoutRef.current) {
				clearTimeout(reconnectTimeoutRef.current);
				reconnectTimeoutRef.current = null;
			}
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
		};

		ws.onclose = (event) => {
			console.log(
				`WebSocket closed. Code: ${event.code}, Reason: ${event.reason}, WasClean: ${event.wasClean}, Intentional: ${isIntentionalCloseRef.current}`,
			);
			wsRef.current = null;
			isConnectingRef.current = false;

			if (isIntentionalCloseRef.current) {
				console.log("WebSocket closed intentionally.");
				setConnectionStatus("disconnected");
			} else if (enabled) {
				setConnectionStatus("disconnected");
				toast.error("Disconnected. Attempting to reconnect...");
				scheduleReconnect();
			} else {
				setConnectionStatus("disconnected");
			}
		};
	}, [organizationId, enabled, buildWebSocketUrl]); // Add dependencies

	const scheduleReconnect = useCallback(() => {
		if (
			!enabled ||
			isIntentionalCloseRef.current ||
			reconnectTimeoutRef.current ||
			isConnectingRef.current
		) {
			console.log("Reconnect scheduling skipped.");
			return;
		}

		reconnectAttemptsRef.current += 1;

		if (reconnectAttemptsRef.current > MAX_RECONNECT_ATTEMPTS) {
			console.error(
				`WebSocket reconnection failed after ${MAX_RECONNECT_ATTEMPTS} attempts.`,
			);
			toast.error("Failed to reconnect after multiple attempts.");
			setConnectionStatus("disconnected");
			reconnectAttemptsRef.current = 0;
			return;
		}

		const delay = Math.min(
			MAX_RECONNECT_DELAY_MS,
			RECONNECT_DELAY_MS * 2 ** (reconnectAttemptsRef.current - 1),
		);
		const jitterDelay = delay + Math.random() * (delay * 0.2);

		console.log(
			`Scheduling WebSocket reconnect attempt ${reconnectAttemptsRef.current} in ${Math.round(jitterDelay / 1000)}s...`,
		);
		setConnectionStatus("reconnecting");

		reconnectTimeoutRef.current = setTimeout(() => {
			reconnectTimeoutRef.current = null;
			connect();
		}, jitterDelay);
	}, [connect, enabled]);

	useEffect(() => {
		if (enabled && organizationId) {
			console.log("useWebSocket Effect: Starting connection...");
			reconnectAttemptsRef.current = 0;
			connect();
		} else {
			console.log(
				"useWebSocket Effect: Cleaning up connection (disabled or no orgId)...",
			);

			isIntentionalCloseRef.current = true;
			if (reconnectTimeoutRef.current) {
				clearTimeout(reconnectTimeoutRef.current);
				reconnectTimeoutRef.current = null;
			}
			if (wsRef.current) {
				console.log("Closing existing WebSocket due to prop change/disable.");

				wsRef.current.onopen = null;
				wsRef.current.onmessage = null;
				wsRef.current.onerror = null;
				wsRef.current.onclose = null;
				wsRef.current.close();
				wsRef.current = null;
			}
			isConnectingRef.current = false;
			setConnectionStatus("disconnected");
		}

		return () => {
			console.log("useWebSocket Effect Cleanup: Running...");
			isIntentionalCloseRef.current = true;
			if (reconnectTimeoutRef.current) {
				console.log("Clearing reconnect timeout.");
				clearTimeout(reconnectTimeoutRef.current);
				reconnectTimeoutRef.current = null;
			}
			if (wsRef.current) {
				console.log("Closing WebSocket in cleanup.");

				wsRef.current.onopen = null;
				wsRef.current.onmessage = null;
				wsRef.current.onerror = null;
				wsRef.current.onclose = null;
				wsRef.current.close();
				wsRef.current = null;
			}
			isConnectingRef.current = false;
			setConnectionStatus("disconnected");
		};
	}, [organizationId, enabled, connect]);

	const sendMessage = useCallback(
		(message: WsChatIncomingMessage) => {
			if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
				wsRef.current.send(JSON.stringify(message));
			} else {
				console.error(
					"WebSocket is not connected. Cannot send message:",
					message.type,
					"Status:",
					connectionStatus,
					"ReadyState:",
					wsRef.current?.readyState,
				);
				toast.error("Cannot send message: Not connected.");
			}
		},
		[connectionStatus],
	);

	return { sendMessage, connectionStatus };
}
