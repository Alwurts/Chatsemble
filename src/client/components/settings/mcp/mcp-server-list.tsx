"use client";

import { Badge } from "@client/components/ui/badge";
import { Button } from "@client/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@client/components/ui/card";
import { Skeleton } from "@client/components/ui/skeleton";
import { useMCPServers } from "@client/hooks/queries/use-mcp-servers";
import { honoClient } from "@client/lib/api-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
	AlertCircle,
	Edit2,
	Loader2,
	Plus,
	Server,
	Trash2,
	Zap,
} from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import { toast } from "sonner";
import type { SettingsPage } from "../settings-dialog";
import { SettingsHeader } from "../settings-header";

interface MCPServerListProps {
	openedSettings: SettingsPage & { type: "mcp"; view: "list" };
	setOpenedSettings: Dispatch<SetStateAction<SettingsPage | null>>;
}

function MCPServerListSkeleton({
	openedSettings,
}: {
	openedSettings: SettingsPage;
}) {
	return (
		<div className="flex flex-col h-full">
			<SettingsHeader openedSettings={openedSettings} />
			<div className="flex-1 overflow-y-auto p-4">
				<div className="space-y-4">
					<div className="space-y-3">
						<h3 className="text-lg font-semibold flex items-center gap-2">
							<Server className="h-5 w-5" />
							Default Servers
						</h3>
						<div className="space-y-3">
							<Card>
								<CardHeader>
									<div className="flex items-center justify-between">
										<div className="space-y-2">
											<Skeleton className="h-5 w-32" />
											<Skeleton className="h-4 w-48" />
										</div>
										<Skeleton className="h-8 w-16" />
									</div>
								</CardHeader>
							</Card>
							<Card>
								<CardHeader>
									<div className="flex items-center justify-between">
										<div className="space-y-2">
											<Skeleton className="h-5 w-32" />
											<Skeleton className="h-4 w-48" />
										</div>
										<Skeleton className="h-8 w-16" />
									</div>
								</CardHeader>
							</Card>
						</div>
					</div>
					<div className="space-y-3">
						<h3 className="text-lg font-semibold flex items-center gap-2">
							<Server className="h-5 w-5" />
							Custom Servers
						</h3>
						<div className="space-y-3">
							<Card>
								<CardHeader>
									<div className="flex items-center justify-between">
										<div className="space-y-2">
											<Skeleton className="h-5 w-32" />
											<Skeleton className="h-4 w-48" />
										</div>
										<div className="flex items-center gap-2">
											<Skeleton className="h-8 w-16" />
											<Skeleton className="h-8 w-16" />
											<Skeleton className="h-8 w-20" />
										</div>
									</div>
								</CardHeader>
							</Card>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

function MCPServersError({ openedSettings }: { openedSettings: SettingsPage }) {
	return (
		<div className="flex flex-col h-full">
			<SettingsHeader openedSettings={openedSettings} />
			<div className="flex flex-col items-center justify-center py-10 text-sm text-muted-foreground gap-2">
				<AlertCircle className="h-8 w-8" />
				<p className="text-lg">Error fetching MCP servers</p>
				<p>
					Something went wrong while trying to load your MCP servers. Please try
					again later.
				</p>
			</div>
		</div>
	);
}

export function MCPServerList({
	openedSettings,
	setOpenedSettings,
}: MCPServerListProps) {
	const [testingServers, setTestingServers] = useState<Set<string>>(new Set());
	const queryClient = useQueryClient();

	const deleteMutation = useMutation({
		mutationFn: async (serverId: string) => {
			const response = await honoClient.api.mcp.servers[":id"].$delete({
				param: { id: serverId },
			});
			if (!response.ok) {
				throw new Error("Failed to delete server");
			}
			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["mcp-servers"] });
			toast.success("Server deleted successfully");
		},
		onError: () => {
			toast.error("Failed to delete server");
		},
	});

	const testConnection = async (serverId: string) => {
		setTestingServers((prev) => new Set(prev).add(serverId));

		try {
			const response = await honoClient.api.mcp.servers[":id"].test.$post({
				param: { id: serverId },
			});

			if (!response.ok) {
				throw new Error("Failed to test connection");
			}

			const result = (await response.json()) as {
				success: boolean;
				toolCount?: number;
				error?: string;
			};

			if (result.success) {
				toast.success(
					`Connection successful! Found ${result.toolCount || 0} tools.`,
				);
			} else {
				toast.error(`Connection failed: ${result.error || "Unknown error"}`);
			}
		} catch (_error) {
			toast.error("Failed to test connection");
		} finally {
			setTestingServers((prev) => {
				const next = new Set(prev);
				next.delete(serverId);
				return next;
			});
		}
	};

	const handleDelete = (serverId: string) => {
		if (confirm("Are you sure you want to delete this server?")) {
			deleteMutation.mutate(serverId);
		}
	};

	const { data: servers, isLoading, isError } = useMCPServers();

	if (isLoading) {
		return <MCPServerListSkeleton openedSettings={openedSettings} />;
	}

	if (isError) {
		return <MCPServersError openedSettings={openedSettings} />;
	}

	const customServers =
		servers?.filter((server) => server.type === "custom") || [];
	const defaultServers =
		servers?.filter((server) => server.type === "default") || [];

	return (
		<div className="flex flex-col h-full">
			<SettingsHeader openedSettings={openedSettings}>
				<Button
					size="sm"
					onClick={() => setOpenedSettings({ type: "mcp", view: "create" })}
				>
					<Plus className="h-4 w-4 mr-2" />
					New Server
				</Button>
			</SettingsHeader>
			<div className="flex-1 overflow-y-auto p-4">
				<div className="space-y-6">
					{/* Default Servers */}
					{defaultServers.length > 0 && (
						<div className="space-y-4">
							<h3 className="text-lg font-semibold flex items-center gap-2">
								<Server className="h-5 w-5" />
								Default Servers
							</h3>
							<div className="grid gap-4">
								{defaultServers.map((server) => (
									<Card key={server.id}>
										<CardHeader>
											<div className="flex items-center justify-between">
												<div>
													<CardTitle className="flex items-center gap-2">
														{server.name}
														<Badge variant="secondary">Default</Badge>
													</CardTitle>
													<CardDescription>
														{server.transport} • {server.url}
													</CardDescription>
												</div>
												<div className="flex items-center gap-2">
													<Button
														variant="outline"
														size="sm"
														onClick={() => testConnection(server.id)}
														disabled={testingServers.has(server.id)}
													>
														{testingServers.has(server.id) ? (
															<Loader2 className="h-4 w-4 animate-spin" />
														) : (
															<Zap className="h-4 w-4" />
														)}
														Test
													</Button>
												</div>
											</div>
										</CardHeader>
									</Card>
								))}
							</div>
						</div>
					)}

					{/* Custom Servers */}
					<div className="space-y-4">
						<h3 className="text-lg font-semibold flex items-center gap-2">
							<Server className="h-5 w-5" />
							Custom Servers
						</h3>

						{customServers.length === 0 ? (
							<Card>
								<CardContent className="flex flex-col items-center justify-center py-12">
									<Server className="h-12 w-12 text-muted-foreground mb-4" />
									<h3 className="text-lg font-semibold mb-2">
										No custom servers
									</h3>
									<p className="text-muted-foreground text-center mb-4">
										Get started by adding your first MCP server
									</p>
									<Button
										onClick={() =>
											setOpenedSettings({ type: "mcp", view: "create" })
										}
									>
										<Plus className="h-4 w-4 mr-2" />
										Add Server
									</Button>
								</CardContent>
							</Card>
						) : (
							<div className="grid gap-4">
								{customServers.map((server) => (
									<Card key={server.id}>
										<CardHeader>
											<div className="flex items-center justify-between">
												<div>
													<CardTitle>{server.name}</CardTitle>
													<CardDescription>
														{server.transport} • {server.url}
													</CardDescription>
													{server.description && (
														<p className="text-sm text-muted-foreground mt-1">
															{server.description}
														</p>
													)}
												</div>
												<div className="flex items-center gap-2">
													<Button
														variant="outline"
														size="sm"
														onClick={() => testConnection(server.id)}
														disabled={testingServers.has(server.id)}
													>
														{testingServers.has(server.id) ? (
															<Loader2 className="h-4 w-4 animate-spin" />
														) : (
															<Zap className="h-4 w-4" />
														)}
														Test
													</Button>
													<Button
														variant="outline"
														size="sm"
														onClick={() =>
															setOpenedSettings({
																type: "mcp",
																view: "edit",
																id: server.id,
															})
														}
													>
														<Edit2 className="h-4 w-4" />
														Edit
													</Button>
													<Button
														variant="outline"
														size="sm"
														onClick={() => handleDelete(server.id)}
														disabled={deleteMutation.isPending}
													>
														<Trash2 className="h-4 w-4" />
														Delete
													</Button>
												</div>
											</div>
										</CardHeader>
									</Card>
								))}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
