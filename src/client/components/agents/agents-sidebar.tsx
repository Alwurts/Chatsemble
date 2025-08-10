"use client";

import {
	SidebarGroup,
	SidebarGroupAction,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuAction,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@client/components/ui/sidebar";
import { honoClient } from "@client/lib/api-client";
import type { Agent } from "@shared/types";
import { useQuery } from "@tanstack/react-query";
import { getRouteApi, Link } from "@tanstack/react-router";
import {
	AlertCircle,
	MoreHorizontal,
	Plus,
	StarOff,
	Trash2,
} from "lucide-react";
import { useState } from "react";
import { AppSidebarGroupSkeleton } from "../layout/app-sidebar-group-skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { NewAgentDialog } from "./new-agent-dialog";

export function AgentsSidebar() {
	const {
		data: agentsData,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["agents"],
		queryFn: async () => {
			const response = await honoClient.api.agents.$get();

			const data = await response.json();
			return data;
		},
	});

	return (
		<>
			{isLoading ? (
				<AppSidebarGroupSkeleton listLength={2} />
			) : error ? (
				<AgentsError />
			) : (
				agentsData && <AgentGroup agents={agentsData} />
			)}
		</>
	);
}

function AgentGroup({ agents }: { agents: Agent[] }) {
	const route = getRouteApi("/(app)/agents");
	const { agentId } = route.useSearch();
	const { isMobile } = useSidebar();
	const [newAgentDialogOpen, setNewAgentDialogOpen] = useState(false);

	return (
		<>
			<NewAgentDialog
				open={newAgentDialogOpen}
				setOpen={setNewAgentDialogOpen}
			/>
			<SidebarGroup className="group-data-[collapsible=icon]:hidden">
				<SidebarGroupLabel>Agents</SidebarGroupLabel>
				<SidebarGroupAction
					title="Add Agent"
					onClick={() => setNewAgentDialogOpen(true)}
				>
					<Plus /> <span className="sr-only">Add Agent</span>
				</SidebarGroupAction>
				<SidebarMenu>
					{agents.length > 0 ? (
						agents.map((agent) => (
							<SidebarMenuItem key={agent.id}>
								<SidebarMenuButton asChild isActive={agentId === agent.id}>
									<Link
										to="/agents"
										search={{ agentId: agent.id }}
										title={agent.name}
									>
										<Avatar className="size-5">
											<AvatarImage src={agent.image} />
											<AvatarFallback>{agent.name.slice(0, 2)}</AvatarFallback>
										</Avatar>
										<span>{agent.name}</span>
									</Link>
								</SidebarMenuButton>
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<SidebarMenuAction showOnHover>
											<MoreHorizontal />
											<span className="sr-only">More</span>
										</SidebarMenuAction>
									</DropdownMenuTrigger>
									<DropdownMenuContent
										className="w-56 rounded-lg"
										side={isMobile ? "bottom" : "right"}
										align={isMobile ? "end" : "start"}
									>
										<DropdownMenuItem>
											<StarOff className="text-muted-foreground" />
											<span>Remove from Favorites</span>
										</DropdownMenuItem>

										<DropdownMenuSeparator />
										<DropdownMenuItem>
											<Trash2 className="text-muted-foreground" />
											<span>Delete</span>
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</SidebarMenuItem>
						))
					) : (
						<AgentsEmpty />
					)}
				</SidebarMenu>
			</SidebarGroup>
		</>
	);
}

function AgentsEmpty() {
	return (
		<div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
			No agents found
		</div>
	);
}

function AgentsError() {
	return (
		<div className="flex items-center justify-center py-10 text-sm text-muted-foreground gap-2">
			<AlertCircle className="h-4 w-4" />
			Error fetching agents
		</div>
	);
}
