"use client";

import { Button } from "@client/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@client/components/ui/card";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@client/components/ui/form";
import { Input } from "@client/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@client/components/ui/select";
import { Textarea } from "@client/components/ui/textarea";
import { useMCPServers } from "@client/hooks/queries/use-mcp-servers";
import { honoClient } from "@client/lib/api-client";
import { zodResolver } from "@hookform/resolvers/zod";
import { createMcpServerSchema } from "@shared/types/mcp";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import type { SettingsPage } from "../settings-dialog";
import { SettingsHeader } from "../settings-header";

interface MCPServerEditProps {
	serverId: string;
	openedSettings: SettingsPage & { type: "mcp"; view: "edit" };
	setOpenedSettings: Dispatch<SetStateAction<SettingsPage | null>>;
}

type FormValues = z.infer<typeof createMcpServerSchema>;

export function MCPServerEdit({
	serverId,
	openedSettings,
	setOpenedSettings,
}: MCPServerEditProps) {
	const { data: servers, isLoading } = useMCPServers();
	const queryClient = useQueryClient();

	const server = servers?.find((s) => s.id === serverId && s.type === "custom");

	const form = useForm<FormValues>({
		resolver: zodResolver(createMcpServerSchema),
		defaultValues: {
			name: "",
			description: "",
			url: "",
			transport: "streamable-http",
		},
	});

	useEffect(() => {
		if (server && server.type === "custom") {
			form.reset({
				name: server.name,
				description: server.description || "",
				url: server.url,
				transport: server.transport,
			});
		}
	}, [server, form]);

	const updateMutation = useMutation({
		mutationFn: async (data: FormValues) => {
			const response = await honoClient.api.mcp.servers[":id"].$put({
				param: { id: serverId },
				json: data,
			});
			if (!response.ok) {
				throw new Error("Failed to update server");
			}
			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["mcp-servers"] });
			toast.success("Server updated successfully");
			setOpenedSettings({ type: "mcp", view: "list" });
		},
		onError: () => {
			toast.error("Failed to update server");
		},
	});

	const onSubmit = (data: FormValues) => {
		updateMutation.mutate(data);
	};

	if (isLoading) {
		return (
			<div className="flex flex-col h-full">
				<SettingsHeader openedSettings={openedSettings} />
				<div className="flex-1 overflow-y-auto flex items-center justify-center">
					<Loader2 className="h-8 w-8 animate-spin" />
				</div>
			</div>
		);
	}

	if (!server || server.type !== "custom") {
		return (
			<div className="flex flex-col h-full">
				<SettingsHeader openedSettings={openedSettings} />
				<div className="flex-1 overflow-y-auto p-4">
					<Card>
						<CardContent className="flex flex-col items-center justify-center py-12">
							<p className="text-muted-foreground text-center mb-4">
								This server either doesn't exist or is a default server that
								cannot be edited.
							</p>
							<Button
								onClick={() => setOpenedSettings({ type: "mcp", view: "list" })}
							>
								Go Back to Server List
							</Button>
						</CardContent>
					</Card>
				</div>
			</div>
		);
	}

	return (
		<Form {...form}>
			<div className="flex flex-col h-full">
				<SettingsHeader openedSettings={openedSettings}>
					<div className="space-x-2">
						<Button
							type="button"
							size="sm"
							variant="outline"
							onClick={() => setOpenedSettings({ type: "mcp", view: "list" })}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							size="sm"
							form="mcp-server-edit-form"
							disabled={updateMutation.isPending}
						>
							{updateMutation.isPending ? "Updating..." : "Update Server"}
						</Button>
					</div>
				</SettingsHeader>
				<div className="flex-1 overflow-y-auto">
					<form
						id="mcp-server-edit-form"
						onSubmit={form.handleSubmit(onSubmit)}
						className="space-y-6 p-4"
					>
						<Card>
							<CardHeader>
								<CardTitle>Server Configuration</CardTitle>
								<CardDescription>
									Update your MCP server connection details for "{server.name}"
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-6">
								<FormField
									control={form.control}
									name="name"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Name</FormLabel>
											<FormControl>
												<Input placeholder="Analytics Server" {...field} />
											</FormControl>
											<FormDescription>
												A friendly name for this MCP server
											</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="description"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Description (Optional)</FormLabel>
											<FormControl>
												<Textarea
													placeholder="Server for analytics and reporting tools..."
													className="resize-none"
													rows={3}
													{...field}
												/>
											</FormControl>
											<FormDescription>
												A brief description of what this server provides
											</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="url"
									render={({ field }) => (
										<FormItem>
											<FormLabel>URL</FormLabel>
											<FormControl>
												<Input
													placeholder="https://example.com/mcp"
													type="url"
													{...field}
												/>
											</FormControl>
											<FormDescription>
												The endpoint URL for the MCP server
											</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="transport"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Transport</FormLabel>
											<Select
												onValueChange={field.onChange}
												value={field.value}
											>
												<FormControl>
													<SelectTrigger>
														<SelectValue placeholder="Select transport method" />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													<SelectItem value="streamable-http">
														Streamable HTTP
													</SelectItem>
													<SelectItem value="sse">
														Server-Sent Events
													</SelectItem>
												</SelectContent>
											</Select>
											<FormDescription>
												The communication protocol for this server
											</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>
							</CardContent>
						</Card>
					</form>
				</div>
			</div>
		</Form>
	);
}
