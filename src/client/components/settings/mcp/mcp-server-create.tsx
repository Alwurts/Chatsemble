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
import { honoClient } from "@client/lib/api-client";
import { zodResolver } from "@hookform/resolvers/zod";
import { createMcpServerSchema } from "@shared/types/mcp";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import type { SettingsPage } from "../settings-dialog";
import { SettingsHeader } from "../settings-header";

interface MCPServerCreateProps {
	openedSettings: SettingsPage & { type: "mcp"; view: "create" };
	setOpenedSettings: Dispatch<SetStateAction<SettingsPage | null>>;
}

type FormValues = z.infer<typeof createMcpServerSchema>;

export function MCPServerCreate({
	openedSettings,
	setOpenedSettings,
}: MCPServerCreateProps) {
	const queryClient = useQueryClient();
	const [testResult, setTestResult] = useState<{
		tested: boolean;
		success: boolean;
		toolCount?: number;
		error?: string;
	}>({ tested: false, success: false });

	const form = useForm<FormValues>({
		resolver: zodResolver(createMcpServerSchema),
		defaultValues: {
			name: "",
			description: "",
			url: "",
			transport: "streamable-http",
		},
	});

	const testConnectionMutation = useMutation({
		mutationFn: async (data: FormValues) => {
			// First create a temporary server to test
			const createResponse = await honoClient.api.mcp.servers.$post({
				json: data,
			});
			if (!createResponse.ok) {
				throw new Error("Failed to create server for testing");
			}
			const serverData = await createResponse.json();

			// Test the connection
			const testResponse = await honoClient.api.mcp.servers[":id"].test.$post({
				param: { id: serverData.id },
			});

			if (!testResponse.ok) {
				// Delete the server if test fails
				await honoClient.api.mcp.servers[":id"].$delete({
					param: { id: serverData.id },
				});
				throw new Error("Connection test failed");
			}

			const testResult = (await testResponse.json()) as {
				success: boolean;
				toolCount?: number;
				error?: string;
			};

			if (!testResult.success) {
				// Delete the server if test fails
				await honoClient.api.mcp.servers[":id"].$delete({
					param: { id: serverData.id },
				});
				throw new Error(testResult.error || "Connection test failed");
			}

			return { serverData, testResult };
		},
		onSuccess: (result) => {
			setTestResult({
				tested: true,
				success: true,
				toolCount: result.testResult.toolCount,
			});
			queryClient.invalidateQueries({ queryKey: ["mcp-servers"] });
			toast.success(
				`Server created and tested successfully! Found ${result.testResult.toolCount || 0} tools.`,
			);
			setOpenedSettings({ type: "mcp", view: "list" });
		},
		onError: (error) => {
			setTestResult({
				tested: true,
				success: false,
				error:
					error instanceof Error ? error.message : "Connection test failed",
			});
			toast.error("Failed to create or test server connection");
		},
	});

	const onSubmit = (data: FormValues) => {
		testConnectionMutation.mutate(data);
	};

	const handleRetryTest = () => {
		setTestResult({ tested: false, success: false });
	};

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
							form="mcp-server-create-form"
							disabled={testConnectionMutation.isPending}
						>
							{testConnectionMutation.isPending ? (
								<>
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									Testing & Creating...
								</>
							) : (
								"Test & Create Server"
							)}
						</Button>
					</div>
				</SettingsHeader>
				<div className="flex-1 overflow-y-auto">
					<form
						id="mcp-server-create-form"
						onSubmit={form.handleSubmit(onSubmit)}
						className="space-y-6 p-4"
					>
						<Card>
							<CardHeader>
								<CardTitle>Server Configuration</CardTitle>
								<CardDescription>
									Configure your MCP server connection details
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
												defaultValue={field.value}
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

						{/* Test Result Display */}
						{testResult.tested && (
							<Card className="mt-6">
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										{testResult.success ? (
											<>
												<CheckCircle className="h-5 w-5 text-green-500" />
												Connection Test Successful
											</>
										) : (
											<>
												<AlertCircle className="h-5 w-5 text-destructive" />
												Connection Test Failed
											</>
										)}
									</CardTitle>
								</CardHeader>
								<CardContent>
									{testResult.success ? (
										<div className="space-y-2">
											<p className="text-sm text-muted-foreground">
												Successfully connected to the MCP server and found{" "}
												<span className="font-medium">
													{testResult.toolCount || 0} tools
												</span>
												.
											</p>
											<p className="text-sm text-green-600">
												Server has been created and is ready to use.
											</p>
										</div>
									) : (
										<div className="space-y-3">
											<p className="text-sm text-destructive">
												{testResult.error || "Failed to connect to the server"}
											</p>
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={handleRetryTest}
											>
												Try Again
											</Button>
										</div>
									)}
								</CardContent>
							</Card>
						)}
					</form>
				</div>
			</div>
		</Form>
	);
}
